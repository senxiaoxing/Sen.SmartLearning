/**
 * @file 版本检查 —— 家长区里看「这台设备上跑的，是不是线上最新那版」
 * @layer features
 * @see src/platform/checkAppVersion.ts  实际的取数与比对
 * @see src/platform/appUpdate.ts        发现新版本后由谁、在什么时机装上
 *
 * 使用场景只有一个：**刚 `npm run deploy` 完**，想确认更新推到 iPad 上了没有。
 * 进页面自动查一次而不是等家长点按钮——打开家长区多半就是为了看这个。
 */

import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { checkAppVersion, type BuildStamp, type VersionCheckResult } from '@/platform/checkAppVersion'

/**
 * ISO 时间戳 → 「8月20日 14:30」。
 *
 * 只到分钟：秒对于「是不是同一次部署」没有区分意义，反而让两行数字难以对比。
 */
function buildTime(iso: string | null): string {
  if (iso === null) return '时间未知'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '时间未知'
  return at.toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 版本号 + 构建时间的一行。两行并排时靠右对齐，数字才好上下比对 */
function BuildRow({ label, stamp, hint }: { label: string; stamp: BuildStamp; hint?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-sm text-ink/50">{label}</span>
      <span className={hint === true ? 'text-right font-bold text-primary' : 'text-right'}>
        v{stamp.version}
        <span className="ml-2 text-sm text-ink/40">{buildTime(stamp.builtAt)}</span>
      </span>
    </div>
  )
}

/** 结果区。三种状态的处置方式完全不同，因此不共用一句话模板 */
function Verdict({ result }: { result: VersionCheckResult }) {
  if (result.status === 'unreachable') {
    return (
      <p className="text-sm leading-relaxed text-ink/60">
        连不上服务器，无法确认线上版本。开发预览（npm run dev）没有 version.json，属正常；
        若这是 iPad 上的正式使用，请检查网络后再查一次。
      </p>
    )
  }

  if (result.status === 'latest') {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-bold text-correct">已是最新版本</p>
        <BuildRow label="当前" stamp={result.current} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-primary">线上有新版本</p>
      <div className="flex flex-col gap-1">
        <BuildRow label="当前" stamp={result.current} />
        {result.latest !== null && <BuildRow label="线上最新" stamp={result.latest} hint />}
      </div>
      {/* 说清楚「不用做什么」。更新由 App 自己在会话空闲时装上，
          家长这里没有可点的「立即更新」——真给一个按钮反而会诱使人在
          孩子答题途中点它，那会冲掉她这一轮的题目。见 platform/appUpdate.ts */}
      <p className="text-sm leading-relaxed text-ink/50">
        回到首页、不开始答题，停留一会儿就会自动装上并刷新一次。
        若一直没动静：把 App 从后台划掉再点开，保持联网。
      </p>
    </div>
  )
}

export function VersionCheck() {
  const [result, setResult] = useState<VersionCheckResult | null>(null)
  const [checking, setChecking] = useState(false)

  const run = async () => {
    setChecking(true)
    setResult(await checkAppVersion())
    setChecking(false)
  }

  // 进家长区就查，不用等家长点。失败也只是显示「连不上」，没有副作用
  useEffect(() => {
    void run()
  }, [])

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">版本检查</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          确认这台设备上跑的是不是线上最新那一版。刚部署完想验证更新有没有推下来时用它。
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-blob bg-surface p-5 shadow-card">
        {result !== null && <Verdict result={result} />}
        <BigButton
          tone="neutral"
          disabled={checking}
          className="self-start px-5 py-3 text-base"
          onClick={() => void run()}
        >
          {checking ? '检查中…' : result === null ? '开始检查' : '再查一次'}
        </BigButton>
      </div>
    </section>
  )
}
