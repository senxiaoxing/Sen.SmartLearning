/**
 * @file 语音资源门 —— 启动自检，缺缓存就先补全再放行
 * @layer features
 * @see src/platform/voiceCacheAudit.ts  审计与补录（单位是「包」）
 * @see vite.config.ts                   audio-repair 运行时缓存路由（补录的落点）
 *
 * ## 为什么要挡住
 *
 * 预缓存是 Service Worker 安装期一次性的：首次安装那十几 MB 若中途断网、
 * 或某次更新没下完，缺的语音**不会自己补上**，表现是某些句子降级成机器音——
 * 静默、随机、极难排查。与其让孩子撞见，不如启动时查一遍：
 * 缺了就显示进度条主动补全，补齐才放行（家长的原话：类似版本更新提示）。
 *
 * ## 三种启动路径
 *
 * | 场景 | 行为 |
 * |---|---|
 * | 缓存齐全（绝大多数启动） | 审计 8 个包、几十毫秒，全程不渲染任何东西 |
 * | 有 SW 接管、缺了一部分 | 弹层 + 主动逐个拉包（fetch 即缓存），补齐自动消失 |
 * | 首次打开（SW 还没接管） | 弹层 + 轮询预缓存进度——此时主动 fetch 缓存不下来，等 SW 装完即可 |
 *
 * ⚠️ `npm run dev` 没有 SW，审计永远是 0——开发模式直接放行，否则没法开发。
 *
 * ## 逃生口：卡住时可以「先跳过」
 *
 * 只在 **stalled**（一整轮毫无进展，多半断网）时出现，正常下载中不给——
 * 门的意义就是补齐，不能让「跳过」比「等一分钟」更显眼。
 * 跳过只对本次会话生效（下次启动重新检查），且**后台补录不停**：
 * 网络恢复后静默补齐，缺的句子在此之前由 say() 的 TTS 兜底顶着。
 *
 * ## ⭐ 它还负责首屏预热的时机
 *
 * 预热（`WARMUP_CLIPS`）现在会连带下载整个语音包。若在预缓存还没跑完时就发起，
 * 同一个包会被「页面预取」和「SW 预缓存」各下一遍——首装最慢的时候
 * 恰恰多花一倍流量。所以预热等到审计通过（或跳过）之后再开始。
 */

import { useEffect, useState } from 'react'
import { WARMUP_CLIPS } from '@/data/seed/voiceManifest'
import { auditVoiceCache, repairVoiceCache } from '@/platform/voiceCacheAudit'
import { prefetchClips } from '@/platform/speech'

/** 两轮检查之间歇多久。太密是在断网时空转，太疏让进度条像卡死 */
const RECHECK_DELAY_MS = 2500

interface FillingState {
  cachedBytes: number
  totalBytes: number
  /** 上一轮完全没有进展——多半是断网了，提示家长检查网络 */
  stalled: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}

export function VoiceCacheGate() {
  /** null = 不挡（审计中或已齐全）。只在确认缺缓存后才渲染，正常启动零闪烁 */
  const [filling, setFilling] = useState<FillingState | null>(null)
  /** 家长点了「先跳过」：本次会话放行，但补录循环继续在后台跑 */
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    // 开发模式没有 SW，审计永远 0，不能拦——直接预热了事
    if (import.meta.env.DEV) {
      prefetchClips(WARMUP_CLIPS)
      return
    }

    let cancelled = false

    const run = async () => {
      let report = await auditVoiceCache()

      while (!cancelled && report.cachedBytes < report.totalBytes) {
        const before = report.cachedBytes
        setFilling({ cachedBytes: before, totalBytes: report.totalBytes, stalled: false })

        if (navigator.serviceWorker?.controller != null) {
          // SW 已接管：主动补录。fetch 的进度实时推给进度条，
          // 但以下一轮 audit 的结果为准——fetch 成功不等于真的进了缓存
          await repairVoiceCache(report.missing, (repaired) => {
            if (!cancelled) {
              setFilling({
                cachedBytes: Math.min(report.totalBytes, before + repaired),
                totalBytes: report.totalBytes,
                stalled: false,
              })
            }
          })
        } else {
          // 首次打开：SW 还没接管页面，预缓存正在后台自己下，轮询等它
          await sleep(RECHECK_DELAY_MS)
        }

        report = await auditVoiceCache()
        if (cancelled) return

        if (report.cachedBytes <= before && report.cachedBytes < report.totalBytes) {
          // 一整轮毫无进展：断网，或托管端出了问题。亮出提示后歇一会再试
          setFilling({
            cachedBytes: report.cachedBytes,
            totalBytes: report.totalBytes,
            stalled: true,
          })
          await sleep(RECHECK_DELAY_MS)
          report = await auditVoiceCache()
        }
      }

      if (cancelled) return
      setFilling(null)
      // 语音包已在本机，这时预热只是解码，不会与预缓存抢网络
      prefetchClips(WARMUP_CLIPS)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  // ⚠️ 跳过后只是不渲染，上面的补录 effect 还在跑——联网后静默补齐
  if (filling === null || skipped) return null

  const ratio = filling.totalBytes === 0 ? 0 : filling.cachedBytes / filling.totalBytes

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-blob bg-surface p-8 text-center shadow-card">
        <span className="text-5xl">🔊</span>
        <h2 className="text-2xl font-bold">正在准备声音</h2>
        <p className="text-base leading-relaxed text-ink/60">
          第一次安装或刚更新完，要把语音都下载到本机（约 {mb(filling.totalBytes)} MB）。
          全部就位后，以后离线也能正常出声。
        </p>

        <div className="w-full">
          <div className="h-3 w-full overflow-hidden rounded-full bg-canvas">
            {/* 动画只用 transform（GPU 合成），不动 width */}
            <div
              className="h-full rounded-full bg-primary transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${ratio})`, transformOrigin: 'left' }}
            />
          </div>
          <p className="mt-2 text-sm tabular-nums text-ink/50">
            {mb(filling.cachedBytes)} / {mb(filling.totalBytes)} MB
          </p>
        </div>

        {filling.stalled && (
          <>
            <p className="text-sm leading-relaxed text-primary">
              好像下载不动了——请检查网络连接，联网后会自动继续。
            </p>
            {/* 逃生口刻意做成小字链接而不是按钮：正常路径是等它补齐，
                跳过只留给「现在就要用、网络一时半会好不了」的特殊场景 */}
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="text-sm text-ink/40 underline underline-offset-4"
            >
              先跳过，直接使用（缺的语音会用合成音代替）
            </button>
          </>
        )}
      </div>
    </div>
  )
}
