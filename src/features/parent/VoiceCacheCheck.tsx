/**
 * @file 语音资源自检 —— 家长区里看「离线语音是否全部就位」
 * @layer features
 * @see src/platform/voiceCacheAudit.ts  实际的缓存检查
 *
 * 使用场景只有一个：**刚安装或刚更新完**，想确认十几 MB 语音已经全部
 * 缓存到 iPad 上、出门断网也不会掉成机器音。平时不用管它。
 */

import { useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { auditVoiceCache, type VoiceCacheReport } from '@/platform/voiceCacheAudit'

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}

/** 自检结果的一句话说明。区分「没缓存系统」与「缓存了一半」——处置方式不同 */
function verdict(report: VoiceCacheReport): string {
  if (report.unavailable) {
    return '没有检测到缓存。开发预览（npm run dev）没有 Service Worker，属正常；若这是 iPad 上的正式使用，请联网重新打开一次 App，稍等片刻再查。'
  }
  if (report.cachedBytes >= report.totalBytes) {
    return `全部就位（${mb(report.totalBytes)} MB），断网也能正常出声。`
  }
  return `已缓存 ${mb(report.cachedBytes)} / ${mb(report.totalBytes)} MB，还差 ${report.missing.length} 个语音包。保持联网、停留一会儿再查一次。`
}

export function VoiceCacheCheck() {
  const [report, setReport] = useState<VoiceCacheReport | null>(null)
  const [checking, setChecking] = useState(false)

  const run = async () => {
    setChecking(true)
    setReport(await auditVoiceCache())
    setChecking(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">语音资源自检</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          检查预生成语音是否已全部缓存到这台设备。刚安装或刚更新后跑一次，
          全部就位后离线使用也不会出现机器音。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-blob bg-surface p-5 shadow-card">
        <BigButton
          tone="neutral"
          disabled={checking}
          className="px-5 py-3 text-base"
          onClick={() => void run()}
        >
          {checking ? '检查中…' : report === null ? '开始检查' : '再查一次'}
        </BigButton>
        {report !== null && (
          <p
            className={[
              'min-w-0 flex-1 text-sm leading-relaxed',
              !report.unavailable && report.cachedBytes >= report.totalBytes
                ? 'font-bold text-correct'
                : 'text-ink/60',
            ].join(' ')}
          >
            {verdict(report)}
          </p>
        )}
      </div>
    </section>
  )
}
