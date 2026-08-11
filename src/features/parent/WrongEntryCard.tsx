/**
 * @file 错题本里的一条错题（家长视角）
 * @layer features
 * @see src/domain/report/wrongBook.ts  为什么这里显示错误答案而小结页不显示
 *
 * ⚠️ 与 `features/learning/WrongItemCard.tsx`（孩子看的错题回顾）是**两个东西**：
 * 那个刻意隐藏她选过的错误选项，这个必须显示。受众不同，结论相反。
 */

import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { MISCONCEPTION_LABELS } from '@/data/seed/misconceptionLabels'
import type { WrongItem } from '@/domain/report/wrongBook'

/** `'2026-08-09'` → `'8月9日'` */
function formatDay(localDate: string): string {
  const [, month, day] = localDate.split('-')
  return `${Number(month)}月${Number(day)}日`
}

export function WrongEntryCard({ item }: { item: WrongItem }) {
  const kpName = KNOWLEDGE_POINT_BY_ID.get(item.kpId)?.name ?? item.kpId
  const misconception =
    item.misconceptionTag === undefined ? undefined : MISCONCEPTION_LABELS[item.misconceptionTag]

  return (
    <div className="flex flex-col gap-2 rounded-blob bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold">{item.stem === '' ? kpName : item.stem}</span>
        <span className="shrink-0 text-xs text-ink/40">{formatDay(item.localDate)}</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base">
        <span>
          <span className="text-ink/40">正确 </span>
          <span className="font-bold text-correct">{item.correctAnswer || '—'}</span>
        </span>
        {item.selectedText !== undefined && (
          <span>
            <span className="text-ink/40">她选了 </span>
            <span className="font-bold text-ink/70">{item.selectedText}</span>
          </span>
        )}
      </div>

      {misconception !== undefined && (
        <p className="text-sm leading-relaxed text-ink/60">
          <span className="font-bold">{misconception.label}</span>
          <span className="text-ink/40"> · </span>
          {misconception.advice}
        </p>
      )}

      <p className="text-xs text-ink/30">
        {kpName}
        {item.difficulty === 3 && ' · 难题'}
      </p>
    </div>
  )
}
