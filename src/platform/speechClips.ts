/**
 * @file 语音片段的解码、裁静音与缓存
 * @layer platform  浏览器 API 封装
 * @see src/platform/speech.ts  使用者
 * @see design/07-音频方案.md
 *
 * ⭐⭐ **为什么必须裁静音**
 *
 * Edge TTS 的输出有**固定最小长度**：实测每个短片段都是 1.78 秒，
 * 而其中真正的人声只有 0.24~0.64 秒，**尾部一律拖着约 1.2 秒静音**。
 *
 * 「9 加 5 等于几」是 4 个片段，按原样顺序播放要 **7.3 秒**，
 * 其中 5.8 秒是死气——孩子实测反馈「读得很慢」，根因就在这里。
 * 裁掉静音后同一句约 1.8 秒。
 *
 * 顺带解决另一个问题：原来用 Howler 按需加载，
 * 首次用到某个片段时它还没加载完，而新的朗读会调 `stop()` 取消排队播放，
 * 于是**低频片段（如「15」）经常整个被吞掉**。
 * 现在改为解码后缓存 AudioBuffer，播放时一定是就绪状态。
 */

import { assetUrl } from '@/platform/assetUrl'
import { loadClipBytes } from '@/platform/voiceBundles'

/** 判定为人声的能量门限，相对于整段峰值。3% 能滤掉底噪又不会切掉轻辅音 */
const SPEECH_THRESHOLD = 0.03

/** 分析帧长（秒） */
const FRAME = 0.01

/**
 * 人声前后各保留的余量（秒）。
 * 塞擦音（z c s）的起音很轻，卡着门限切会把字头削掉，听成另一个音。
 */
const MARGIN = 0.03

const cache = new Map<string, AudioBuffer>()
const inflight = new Map<string, Promise<AudioBuffer | null>>()

/**
 * 每个片段的人声区间，由 {@link loadClip} 顺带记下。
 *
 * 正常播放用不到它（裁剪已经烘进 AudioBuffer 了），
 * 但慢速播放走的是 `<audio>` 元素、拿的是**未裁剪**的原始 mp3，
 * 得靠这里的区间自己掐头去尾。见 {@link loadClipMedia}。
 */
const ranges = new Map<string, ClipRange>()

/** 慢速播放要的原始 mp3 与人声区间 */
export interface ClipMedia extends ClipRange {
  /** 原始 mp3 的 Blob URL，可直接喂给 `<audio>` */
  url: string
}

interface ClipRange {
  /** 人声起点（秒），`<audio>` 要 seek 到这里 */
  start: number
  /** 人声终点（秒），播到这里就该停，别放那 1.2 秒尾巴 */
  end: number
}

const urls = new Map<string, string>()

/**
 * 找出音频里人声的起止位置（秒）。
 *
 * 用 RMS 逐帧扫描而不是看单个采样点：单点会被一个尖峰噪声骗到，
 * 而 10ms 的能量均值对这种合成语音足够稳。
 */
function findSpeechRange(buffer: AudioBuffer): { start: number; end: number } {
  const data = buffer.getChannelData(0)
  const win = Math.floor(buffer.sampleRate * FRAME)

  const rms: number[] = []
  let peak = 0
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0
    for (let j = i; j < i + win; j += 1) sum += data[j]! * data[j]!
    const value = Math.sqrt(sum / win)
    rms.push(value)
    if (value > peak) peak = value
  }

  if (peak === 0) return { start: 0, end: buffer.duration }

  const threshold = peak * SPEECH_THRESHOLD
  const first = rms.findIndex((v) => v > threshold)
  let last = -1
  for (let i = rms.length - 1; i >= 0; i -= 1) {
    if (rms[i]! > threshold) {
      last = i
      break
    }
  }
  // 整段都在门限以下：保守起见原样播放，不要静音
  if (first < 0 || last < 0) return { start: 0, end: buffer.duration }

  return {
    start: Math.max(0, first * FRAME - MARGIN),
    end: Math.min(buffer.duration, (last + 1) * FRAME + MARGIN),
  }
}

/** 把 buffer 裁到指定区间，返回新的 AudioBuffer */
function trim(ctx: AudioContext, buffer: AudioBuffer, start: number, end: number): AudioBuffer {
  const from = Math.floor(start * buffer.sampleRate)
  const length = Math.max(1, Math.floor((end - start) * buffer.sampleRate))
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate)

  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(from, from + length))
  }
  return out
}

/**
 * 取片段的 mp3 字节：**先从语音包里切**，包里没有或取不到才退回单文件。
 *
 * 打包是为了把首装的几百个请求压到个位数（见 platform/voiceBundles.ts）。
 * 单文件路径保留为兜底：包缺失/损坏时仍然出得了声，而不是整个 App 哑掉；
 * 新加的片段在重新打包之前也走这条路。
 */
async function fetchClipBytes(key: string): Promise<ArrayBuffer | null> {
  const fromBundle = await loadClipBytes(key)
  if (fromBundle !== null) return fromBundle

  // ⚠️ 必须走 assetUrl：写死 `/audio/...` 在 GitHub Pages 的子路径下会 404，
  //    而且**只在线上错**（dev server 会顺便在根路径伺服 public/）。
  //    后果是每一句都降级成机械的系统合成音。见 platform/assetUrl.ts
  const res = await fetch(assetUrl(`audio/voice/${key}.mp3`))
  return res.ok ? await res.arrayBuffer() : null
}

/**
 * 取一个片段的已裁剪音频，带缓存。
 *
 * @returns 解码好的音频；取不到或解码失败时返回 `null`（调用方降级为 TTS）
 *
 * @example
 * const buf = await loadClip(ctx, 'num.15')
 */
export function loadClip(ctx: AudioContext, key: string): Promise<AudioBuffer | null> {
  const cached = cache.get(key)
  if (cached !== undefined) return Promise.resolve(cached)

  // 同一个片段可能被并发请求（连着两道题都用「9」），共享同一次解码
  const pending = inflight.get(key)
  if (pending !== undefined) return pending

  const task = (async (): Promise<AudioBuffer | null> => {
    try {
      const bytes = await fetchClipBytes(key)
      if (bytes === null) return null
      const decoded = await ctx.decodeAudioData(bytes)
      const { start, end } = findSpeechRange(decoded)
      ranges.set(key, { start, end })
      const trimmed = trim(ctx, decoded, start, end)
      cache.set(key, trimmed)
      return trimmed
    } catch {
      // 解码失败不抛错：调用方会整句降级为 TTS，绝不能让孩子听不到题目
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, task)
  return task
}

/** 这个片段是否已解码好，可以零延迟播放 */
export function isClipReady(key: string): boolean {
  return cache.has(key)
}

/**
 * 取慢速播放要的原始 mp3 与人声区间。
 *
 * ⭐ **为什么不复用 {@link loadClip} 的 AudioBuffer**：慢速走 `<audio>` 元素的
 * `preservesPitch`（变速不变调），而 AudioBuffer 喂不进 `<audio>`。
 * 所以这里另取一份原始字节包成 Blob，裁剪改由播放方按区间 seek/pause 完成。
 *
 * 仍然先调一次 `loadClip`：区间是解码时算出来的，不解码就没有区间；
 * 而它自带缓存，正常播放过的片段在这里是直接命中的。
 *
 * @param ctx - 用于解码的音频上下文
 * @param key - 片段 key
 * @returns Blob URL 与人声区间；片段取不到或解码失败时 `null`（调用方整句降级 TTS）
 *
 * @example
 * const media = await loadClipMedia(ctx, 'pinyin.ma3')
 * // → { url: 'blob:http://…', start: 0.21, end: 0.79 }
 */
export async function loadClipMedia(ctx: AudioContext, key: string): Promise<ClipMedia | null> {
  if ((await loadClip(ctx, key)) === null) return null
  const range = ranges.get(key)
  if (range === undefined) return null

  const cachedUrl = urls.get(key)
  if (cachedUrl !== undefined) return { url: cachedUrl, ...range }

  const bytes = await fetchClipBytes(key)
  if (bytes === null) return null

  // ⚠️ 不回收这些 Blob URL：它们要一直可用（同一个片段会被反复慢放），
  //    而片段本身只有几十 KB、一次会话至多用到上百个。
  //    revoke 之后再播就是一次静默失败，那个代价远大于这点内存。
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
  urls.set(key, url)
  return { url, ...range }
}
