/**
 * @file 一条薄弱点 —— 她错在哪、什么样、家长可以怎么帮
 * @layer features
 * @see src/data/seed/misconceptionLabels.ts  误区的中文说明与建议
 *
 * ⭐ 这是整个家长报告最有价值的一块，也是本项目区别于普通题库 App 的地方。
 * 普通题库只能告诉家长「正确率 72%」，这里能告诉她
 * 「凑十的时候丢了 1，去练 9 和几凑成 10」。
 */

import { Icon } from '@/components/Icon'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { MISCONCEPTION_LABELS } from '@/data/seed/misconceptionLabels'
import type { MisconceptionStat } from '@/domain/report/subjectReport'

/** 最多列几个来源知识点。列太多会把卡片撑长，反而盖住建议 */
const MAX_SHOWN_KPS = 3

export function MisconceptionCard({ stat }: { stat: MisconceptionStat }) {
  const label = MISCONCEPTION_LABELS[stat.tag]

  const kpNames = stat.kpIds
    .map((id) => KNOWLEDGE_POINT_BY_ID.get(id)?.name ?? id)
    .slice(0, MAX_SHOWN_KPS)
  const moreCount = stat.kpIds.length - kpNames.length

  return (
    <div className="flex flex-col gap-2 rounded-blob bg-primary/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-bold">{label.label}</span>
        <span className="shrink-0 text-sm tabular-nums text-ink/50">{stat.count} 次</span>
      </div>

      <p className="text-sm leading-relaxed text-ink/60">{label.example}</p>

      <p className="flex gap-1.5 text-sm leading-relaxed text-ink/80">
        <Icon name="bulb" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {label.advice}
      </p>

      {kpNames.length > 0 && (
        <p className="text-xs text-ink/40">
          出现在：{kpNames.join(' · ')}
          {moreCount > 0 && ` 等 ${stat.kpIds.length} 处`}
        </p>
      )}
    </div>
  )
}
