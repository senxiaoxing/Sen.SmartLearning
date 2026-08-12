/**
 * @file 语音缓存自检 —— 数一数浏览器缓存里到底有多少条语音
 * @layer platform  浏览器 API 封装
 * @see src/features/parent/VoiceCacheCheck.tsx  家长区的展示端
 * @see vite.config.ts  Workbox globPatterns（mp3 在预缓存清单里）
 *
 * 「装到主屏幕、断网也能用」依赖 Workbox 把全部 mp3 预缓存完。
 * 预缓存是后台**静默**进行的：首次安装那 10 多 MB 若没下完就断网，
 * 缺的那些片段只会表现成「这句话变成了机器音」，没有任何界面提示。
 * 这里给家长区一个「点一下就知道全不全」的自检。
 */

import { assetUrl } from '@/platform/assetUrl'

export interface VoiceCacheReport {
  /** 已在缓存里的片段数 */
  cached: number
  /** 清单总数 */
  total: number
  /** 还没进缓存的片段 key，交给 {@link repairVoiceCache} 主动补 */
  missing: string[]
  /** 完全没有缓存——多半是 Service Worker 没激活（开发模式 / 首次打开还没装完） */
  unavailable: boolean
}

/**
 * 检查每个语音片段是否已进浏览器缓存（Cache Storage）。
 *
 * ⚠️ 必须 `ignoreSearch`：Workbox 预缓存的条目带 `__WB_REVISION__` 查询参数，
 * 按原始 URL 精确匹配一条都对不上，报出来永远是 0。
 *
 * @param keys - 要检查的片段 key，传 `Object.keys(VOICE_MANIFEST)`
 * @returns 缓存命中统计。不支持 Cache API 的环境返回 `unavailable: true`
 *
 * @example
 * const report = await auditVoiceCache(Object.keys(VOICE_MANIFEST))
 * // → { cached: 764, total: 764, unavailable: false }
 */
export async function auditVoiceCache(keys: readonly string[]): Promise<VoiceCacheReport> {
  if (typeof caches === 'undefined') {
    return { cached: 0, total: keys.length, missing: [...keys], unavailable: true }
  }

  const hits = await Promise.all(
    keys.map(async (key) => {
      try {
        const hit = await caches.match(assetUrl(`audio/voice/${key}.mp3`), { ignoreSearch: true })
        return hit !== undefined
      } catch {
        return false
      }
    }),
  )
  const missing = keys.filter((_, i) => hits[i] !== true)

  // 一条都没有时，几乎可以断定是 SW 没跑（npm run dev 就是这样），而不是缓存真空
  return {
    cached: keys.length - missing.length,
    total: keys.length,
    missing,
    unavailable: missing.length === keys.length,
  }
}

/** 补录的并发数。移动网络上 6 路小文件并发是吞吐与服务器压力的平衡点 */
const REPAIR_CONCURRENCY = 6

/**
 * 把缺失的片段逐条拉回来。
 *
 * 依赖 vite.config.ts 里 `audio-repair` 那条 CacheFirst 运行时路由：
 * 页面 fetch 一条，Service Worker 顺手缓存一条——**fetch 本身就是补录**。
 *
 * ⚠️ 只在 SW 已接管页面（`navigator.serviceWorker.controller` 非空）时有意义：
 * 首次打开 App 时 SW 还没接管，fetch 不经过它、什么也缓存不下来，
 * 那时该做的是等预缓存自己完成（调用方轮询 {@link auditVoiceCache}）。
 *
 * @param missing - 待补的片段 key（取 audit 结果的 `missing`）
 * @param onProgress - 每补完一条回调一次，参数是已处理条数（含失败的）
 *
 * @example
 * const report = await auditVoiceCache(keys)
 * await repairVoiceCache(report.missing, (n) => setDone(n))
 */
export async function repairVoiceCache(
  missing: readonly string[],
  onProgress?: (done: number) => void,
): Promise<void> {
  const queue = [...missing]
  let done = 0

  await Promise.all(
    Array.from({ length: REPAIR_CONCURRENCY }, async () => {
      for (let key = queue.shift(); key !== undefined; key = queue.shift()) {
        try {
          await fetch(assetUrl(`audio/voice/${key}.mp3`))
        } catch {
          // 断网/超时：静默跳过。调用方重新 audit 会发现没补上，据此提示检查网络
        }
        done += 1
        onProgress?.(done)
      }
    }),
  )
}
