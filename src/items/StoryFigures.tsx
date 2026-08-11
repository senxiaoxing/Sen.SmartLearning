/**
 * @file 情境类题干配图 —— 几堆物体 · 大括号问号
 * @layer items
 * @see src/items/StemFigure.tsx  分发入口
 * @see src/domain/generators/storyProblem.ts  / braceProblem.ts  数据从哪来
 */

import type { ItemVisual } from '@/domain/types'

type Of<K extends ItemVisual['kind']> = Extract<ItemVisual, { kind: K }>

/**
 * 几堆物体。
 *
 * `remove` 把被拿走的画成半透明而不是删掉——**孩子要能同时看到
 * 「原来有几个」和「拿走了几个」**，两个数都在图里，减法才成立。
 * 直接删掉的话图上只剩结果，这道题就没得算了。
 */
export function StoryGroups({ visual }: { visual: Of<'storyGroups'> }) {
  const { emoji, groups, operation } = visual

  if (operation === 'remove') {
    const [total = 0, taken = 0] = groups
    const kept = Math.max(0, total - taken)
    return (
      <div className="flex max-w-lg flex-wrap items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`text-4xl leading-none ${i >= kept ? 'opacity-25 line-through' : ''}`}
          >
            {emoji}
          </span>
        ))}
      </div>
    )
  }

  // compare 上下两排对齐，一眼看出多几个；add 两堆并排
  const layout = operation === 'compare' ? 'flex-col gap-3' : 'flex-row gap-5'

  return (
    <div className={`flex items-center justify-center ${layout}`}>
      {groups.map((n, gi) => (
        <div key={gi} className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="text-4xl leading-none">
              {emoji}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * 大括号 + 问号（M9.4）。
 *
 * 括号横跨全部物体，下方标注：问号在总数位置就是求和，
 * 在某一组下面就是求那一部分。⚠️ 已知的组必须标出数字，
 * 否则孩子只能靠数图，这道题就退化成了数数题而不是列式题。
 */
export function BraceGroups({ visual }: { visual: Of<'braceGroups'> }) {
  const { emoji, groups, question } = visual

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-6">
        {groups.map((n, gi) => (
          <div key={gi} className="flex flex-col items-center gap-1">
            <div className="flex max-w-[220px] flex-wrap justify-center gap-1">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="text-3xl leading-none">
                  {emoji}
                </span>
              ))}
            </div>
            <span className="text-xl font-bold tabular-nums text-ink/70">
              {question === gi ? '?' : n}
            </span>
          </div>
        ))}
      </div>

      {/* 横向大括号：一条底线加中间的尖角，SVG 比字符 { 旋转更可控 */}
      <svg viewBox="0 0 200 18" width={260} height={24} aria-hidden>
        <path
          d="M4 2 Q4 12 14 12 L92 12 Q100 12 100 17 Q100 12 108 12 L186 12 Q196 12 196 2"
          fill="none"
          stroke="#C9BFA8"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>

      <span className="text-2xl font-bold tabular-nums text-honey">
        {question === 'total' ? '?' : groups.reduce((s, n) => s + n, 0)}
      </span>
    </div>
  )
}
