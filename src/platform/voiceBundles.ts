/**
 * @file 语音包加载 —— 取整包、按索引切出单条 mp3
 * @layer platform  浏览器 API 封装
 * @see scripts/bundle-voices.mjs           包怎么拼出来的
 * @see src/data/seed/voiceBundleIndex.ts   索引（生成物）
 * @see src/platform/speechClips.ts         使用者：切完就解码
 *
 * ## 为什么要打包：请求数才是首装的瓶颈
 *
 * 764 条片段平均只有 15KB，字节总量 12.6MB 并不大，但拆成 764 个请求后，
 * 时间几乎全花在「发请求、等响应」上——在 GitHub Pages + 高延迟网络下
 * 首次安装要等好几分钟。合并成 8 个包之后请求数降到个位数，
 * 同样的字节量按带宽跑满，首装从几分钟变成几十秒。
 *
 * ## 切片就是完整 mp3
 *
 * 包是若干 mp3 原样首尾相接，索引记着 [包名, 偏移, 长度]。
 * `slice()` 出来的那段本身就是一个完整 mp3 文件，`decodeAudioData` 直接吃。
 *
 * ⚠️ 必须用 `slice()`（复制）而不是 `new Uint8Array(buf, off, len)`（视图）：
 * `decodeAudioData` 会**detach** 传给它的 ArrayBuffer，
 * 传视图会连同整个包的缓冲一起废掉，后面所有片段都取不出来。
 */

import { VOICE_BUNDLE_INDEX } from '@/data/seed/voiceBundleIndex'
import { assetUrl } from '@/platform/assetUrl'

/** 已下载的包。⚠️ 存原始字节（12.6MB 全量上限），解码后的 PCM 另有缓存 */
const bundles = new Map<string, ArrayBuffer>()
/** 同一个包会被同屏多个片段同时请求，共享一次下载 */
const inflight = new Map<string, Promise<ArrayBuffer | null>>()

/** 取一个包，带缓存与并发合并。取不到返回 `null`（调用方回退单文件） */
function loadBundle(file: string): Promise<ArrayBuffer | null> {
  const cached = bundles.get(file)
  if (cached !== undefined) return Promise.resolve(cached)

  const pending = inflight.get(file)
  if (pending !== undefined) return pending

  const task = (async (): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(assetUrl(`audio/bundles/${file}`))
      if (!res.ok) return null
      const buffer = await res.arrayBuffer()
      bundles.set(file, buffer)
      return buffer
    } catch {
      return null
    } finally {
      inflight.delete(file)
    }
  })()

  inflight.set(file, task)
  return task
}

/**
 * 取某个片段的 mp3 字节。
 *
 * @param key - 片段 key，如 `'num.9'`
 * @returns 该片段完整的 mp3 字节；不在索引里或包取不到时返回 `null`，
 *          调用方应回退到单文件 `audio/voice/<key>.mp3`
 *
 * @example
 * const bytes = await loadClipBytes('num.9')
 * if (bytes !== null) await ctx.decodeAudioData(bytes)
 */
export async function loadClipBytes(key: string): Promise<ArrayBuffer | null> {
  const entry = VOICE_BUNDLE_INDEX[key]
  if (entry === undefined) return null

  const [file, offset, length] = entry
  const buffer = await loadBundle(file)
  if (buffer === null) return null

  // slice 是复制：decodeAudioData 会 detach 它，绝不能让整个包跟着废掉
  return buffer.slice(offset, offset + length)
}

/** 这个片段在不在包里。不在的（新加还没重新打包）走单文件路径 */
export function isBundled(key: string): boolean {
  return VOICE_BUNDLE_INDEX[key] !== undefined
}
