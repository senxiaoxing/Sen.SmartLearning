/**
 * @file 单科报告卡 —— 进度、题量、专注时长、最近趋势与薄弱点
 * @layer features
 * @see src/domain/report/subjectReport.ts  这些数字的算法
 *
 * ⚠️ 不显示任何跨科目的比较或排名。三科各自成卡、顺序写死，
 * 理由见 data/seed/subjects.ts 的 SUBJECT_ORDER 注释。
 */

import { SUBJECT_LABEL } from '@/data/seed/subjects'
import type { SubjectSection } from '@/data/repositories/reportRepo'
import { MisconceptionCard } from '@/features/parent/MisconceptionCard'
import type { DayStat } from '@/domain/report/dailyTrend'

/** 毫秒转成家长看得懂的时长 */
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return '不到 1 分钟'
  if (minutes < 60) return `${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}

export function SubjectReportCard({ section }: { section: SubjectSection }) {
  const { report, trend } = section
  const started = report.totalAttempts > 0

  return (
    <section className="flex flex-col gap-4 rounded-blob bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{SUBJECT_LABEL[report.subject]}</h2>
        <span className="text-sm text-ink/50">
          {started ? formatDuration(report.activeDurationMs) : '还没开始'}
        </span>
      </div>

      {started ? (
        <>
          <MasteryBar mastered={report.masteredCount} total={report.answerableCount} />

          <div className="flex gap-6">
            <Stat label="做了" value={`${report.totalAttempts} 题`} />
            <Stat
              label="做对"
              value={
                report.accuracy === null ? '—' : `${Math.round(report.accuracy * 100)}%`
              }
            />
            <Stat label="在学" value={`${report.learningKpIds.length} 个`} />
          </div>

          <TrendBars trend={trend} />

          {report.topMisconceptions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ink/60">最需要留意的地方</h3>
              {report.topMisconceptions.map((stat) => (
                <MisconceptionCard key={stat.tag} stat={stat} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-ink/40">
          这一科还没有练习记录。等她学起来，这里会显示进度和需要留意的地方。
        </p>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-ink/40">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  )
}

/**
 * 掌握进度条。
 *
 * 分母是**当前出得了题的知识点数**，不是图谱总数——
 * 见 reportRepo 的 ANSWERABLE_BY_SUBJECT 注释。
 */
function MasteryBar({ mastered, total }: { mastered: number; total: number }) {
  const ratio = total === 0 ? 0 : Math.min(1, mastered / total)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink/50">已掌握</span>
        <span className="font-bold tabular-nums">
          {mastered} / {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ink/10">
        {/* 静态布局宽度，不是动画——CLAUDE.md 禁的是「动画 width」 */}
        <div className="h-full rounded-full bg-correct" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

/**
 * 最近几天的题量柱状图。
 *
 * 空档（那天没做）保留为一条极矮的底线而不是消失，
 * 家长要看见的正是断档——见 domain/report/dailyTrend.ts。
 */
function TrendBars({ trend }: { trend: readonly DayStat[] }) {
  const max = Math.max(1, ...trend.map((d) => d.total))

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink/40">最近 {trend.length} 天</span>
      <div className="flex h-16 items-end gap-1">
        {trend.map((day) => (
          <div key={day.localDate} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${day.total === 0 ? 'bg-ink/10' : 'bg-primary'}`}
              style={{ height: `${Math.max(4, (day.total / max) * 100)}%` }}
              title={`${day.localDate}：${day.total} 题`}
            />
            <span className="text-[10px] text-ink/30">{day.localDate.slice(8)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
