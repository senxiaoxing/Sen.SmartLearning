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
      const res = await fetch(`/audio/voice/${key}.mp3`)
      if (!res.ok) return null
      const decoded = await ctx.decodeAudioData(await res.arrayBuffer())
      const { start, end } = findSpeechRange(decoded)
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
