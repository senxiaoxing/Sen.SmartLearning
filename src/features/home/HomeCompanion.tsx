/**
 * @file 首页侧栏 —— 宽屏时才出现的「今天做了什么」面板
 * @layer features
 * @see src/components/AppShell.tsx  侧栏何时出现（xl 及以上）
 *
 * 手机上没地方放这块，桌面端的空白正好用来放它——
 * 这是**增益**而不是把主区内容重复一遍。
 *
 * ⚠️ 只呈现「做了多少」，不呈现正确率。
 * 见 SessionSummary 的文件头：百分比会把注意力引到没做对的那些上，
 * 这个阶段要建立的是「我学了东西」的感觉，不是绩效评估。
 */

interface HomeCompanionProps {
  /** 今日累计。`correct` 用于「答对了几题」，不用来算百分比 */
  today: { total: number; correct: number }
  /** 还没解决的错题数，0 时整块不显示 */
  pendingRetry: number
}

export function HomeCompanion({ today, pendingRetry }: HomeCompanionProps) {
  // 一题没做时整个面板不出现：空面板比没有面板更让人觉得「今天还欠着」
  if (today.total === 0) return null

  return (
    <div className="w-full rounded-blob bg-surface p-6 shadow-card">
      <p className="text-sm font-bold uppercase tracking-widest text-ink/40">今天</p>

      <div className="mt-4 flex flex-col gap-4">
        <Stat value={today.total} unit="题" label="做过的题目" tone="text-primary" />
        <Stat value={today.correct} unit="题" label="一次就答对" tone="text-correct" />
      </div>

      {pendingRetry > 0 && (
        // 措辞是邀请不是催促：「等着你」而不是「还剩 N 题没订正」
        <p className="mt-5 border-t border-ink/10 pt-4 text-sm text-ink/50">
          还有 {pendingRetry} 道题等着你再看一眼
        </p>
      )}
    </div>
  )
}

interface StatProps {
  value: number
  unit: string
  label: string
  /** Tailwind 文字色类。数字用主题色，说明文字保持中性 */
  tone: string
}

function Stat({ value, unit, label, tone }: StatProps) {
  return (
    <div>
      <p className="flex items-baseline gap-1">
        <span className={`text-4xl font-bold tabular-nums ${tone}`}>{value}</span>
        <span className="text-base text-ink/50">{unit}</span>
      </p>
      <p className="text-sm text-ink/50">{label}</p>
    </div>
  )
}
