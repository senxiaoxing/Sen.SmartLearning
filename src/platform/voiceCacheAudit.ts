/**
 * @file 语音缓存自检 —— 语音包是否都已下到本机
 * @layer platform  浏览器 API 封装
 * @see src/features/onboarding/VoiceCacheGate.tsx  启动自检门
 * @see src/features/parent/VoiceCacheCheck.tsx     家长区手动自检
 * @see vite.config.ts  Workbox：bin 进预缓存 + audio-repair 运行时路由
 *
 * 「装到主屏幕、断网也能用」依赖 Workbox 把语音包预缓存完。
 * 预缓存是 install 期一次性的、且**静默**：首次安装那十几 MB 若没下完就断网，
 * 缺的部分只会表现成「某些句子变成了机器音」，没有任何界面提示。
 *
 * ⭐ 审计单位是**包**（8 个）而不是片段（764 条）：
 * 打包之后运行时根本不请求单个 mp3，逐条查也没有意义，
 * 而且 764 次 `caches.match` 本身就要跑上一会儿。
 * 进度按**字节**报告——8 个包的计数太粗，进度条会一卡一大跳。
 */

import { VOICE_BUNDLES, VOICE_BUNDLE_TOTAL_BYTES } from '@/data/seed/voiceBundleIndex'
import { assetUrl } from '@/platform/assetUrl'

export interface VoiceCacheReport {
  /** 已在缓存里的字节数 */
  cachedBytes: number
  /** 全部语音包的总字节数 */
  totalBytes: number
  /** 还没进缓存的包文件名，交给 {@link repairVoiceCache} 主动补 */
  missing: string[]
  /** 完全没有缓存——多半是 Service Worker 没激活（开发模式 / 首次打开还没装完） */
  unavailable: boolean
}

/**
 * 检查每个语音包是否已进浏览器缓存（Cache Storage）。
 *
 * ⚠️ 必须 `ignoreSearch`：Workbox 预缓存的条目带 `__WB_REVISION__` 查询参数，
 * 按原始 URL 精确匹配一条都对不上，报出来永远是 0。
 *
 * @returns 缓存命中统计（按字节）。不支持 Cache API 的环境返回 `unavailable: true`
 *
 * @example
 * const report = await auditVoiceCache()
 * // → { cachedBytes: 13212000, totalBytes: 13212000, missing: [], unavailable: false }
 */
export async function auditVoiceCache(): Promise<VoiceCacheReport> {
  if (typeof caches === 'undefined') {
    return {
      cachedBytes: 0,
      totalBytes: VOICE_BUNDLE_TOTAL_BYTES,
      missing: VOICE_BUNDLES.map((b) => b.file),
      unavailable: true,
    }
  }

  const hits = await Promise.all(
    VOICE_BUNDLES.map(async (bundle) => {
      try {
        const hit = await caches.match(assetUrl(`audio/bundles/${bundle.file}`), {
          ignoreSearch: true,
        })
        return hit !== undefined
      } catch {
        return false
      }
    }),
  )

  const missing = VOICE_BUNDLES.filter((_, i) => hits[i] !== true)
  const cachedBytes = VOICE_BUNDLE_TOTAL_BYTES - missing.reduce((sum, b) => sum + b.bytes, 0)

  return {
    cachedBytes,
    totalBytes: VOICE_BUNDLE_TOTAL_BYTES,
    missing: missing.map((b) => b.file),
    unavailable: missing.length === VOICE_BUNDLES.length,
  }
}

/**
 * 把缺失的语音包逐个拉回来。
 *
 * 依赖 vite.config.ts 里 `audio-repair` 那条 CacheFirst 运行时路由：
 * 页面 fetch 一个，Service Worker 顺手缓存一个——**fetch 本身就是补录**。
 *
 * ⚠️ 只在 SW 已接管页面（`navigator.serviceWorker.controller` 非空）时有意义：
 * 首次打开 App 时 SW 还没接管，fetch 不经过它、什么也缓存不下来，
 * 那时该做的是等预缓存自己完成（调用方轮询 {@link auditVoiceCache}）。
 *
 * ⚠️ **串行**下载，不并发：包本身就有 1~3MB，并发只会让每个都变慢、
 * 进度条长时间不动，串行则是一个接一个地跳。
 *
 * @param missing - 待补的包文件名（取 audit 结果的 `missing`）
 * @param onProgress - 每补完一个回调一次，参数是本次已补的字节数
 */
export async function repairVoiceCache(
  missing: readonly string[],
  onProgress?: (repairedBytes: number) => void,
): Promise<void> {
  let repaired = 0

  for (const file of missing) {
    try {
      await fetch(assetUrl(`audio/bundles/${file}`))
    } catch {
      // 断网/超时：静默跳过。调用方重新 audit 会发现没补上，据此提示检查网络
    }
    repaired += VOICE_BUNDLES.find((b) => b.file === file)?.bytes ?? 0
    onProgress?.(repaired)
  }
}
