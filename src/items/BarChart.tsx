/**
 * @file 条形图 —— M2-8 数据收集整理
 * @layer items
 * @see src/domain/generators/barChartRead.ts  数据从哪来
 *
 * ## ⭐ 把「读数」变成「数格子」
 *
 * 每一个单位画一条横向网格线，柱子有多高就等于数几格。
 * 不识字的孩子读不了图例，但她数得清格子——
 * 与 `GridPattern` 是同一个思路。
 *
 * 类别用 emoji 标注（不用文字），纵轴用数字刻度（数字她认得）。
 *
 * ⛔ 柱顶**不标数字**：标了就不用读图了，这道题也就白出。
 */

import type { ItemVisual } from '@/domain/types'

type Of<K extends ItemVisual['kind']> = Extract<ItemVisual, { kind: K }>

/** 一个刻度单位占多高 */
const UNIT = 17
const BAR_W = 26
const GAP = 16
/** 左侧留给刻度数字 */
const AXIS_W = 18
/** 底部留给 emoji */
const FOOT_H = 26
const PAD = 6

const BAR_FILL = '#FFB84D'
const BAR_LINE = '#A8681A'
const GRID_LINE = '#E0D9C8'
const AXIS_LINE = '#B9AE97'
const TEXT = '#8A7A55'

/**
 * 一张条形图。
 *
 * @example
 * <BarChart visual={{ kind: 'barChart', maxScale: 6, bars: [
 *   { emoji: '🍎', name: '苹果', count: 4 },
 * ] }} />
 */
export function BarChart({ visual }: { visual: Of<'barChart'> }) {
  const { bars, maxScale } = visual
  const chartH = maxScale * UNIT
  const width = AXIS_W + bars.length * (BAR_W + GAP) + PAD
  const height = chartH + FOOT_H + PAD

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.min(300, width * 1.6)}
      role="img"
      aria-label="看图回答"
    >
      {/* 横向网格线 + 纵轴刻度数字：柱高等于数几格 */}
      {Array.from({ length: maxScale + 1 }, (_, i) => {
        const y = PAD + chartH - i * UNIT
        return (
          <g key={i}>
            <line
              x1={AXIS_W}
              y1={y}
              x2={width - PAD}
              y2={y}
              stroke={i === 0 ? AXIS_LINE : GRID_LINE}
              strokeWidth={i === 0 ? 1.6 : 1}
            />
            {i > 0 && (
              <text x={AXIS_W - 4} y={y + 3.5} fontSize={9} textAnchor="end" fill={TEXT}>
                {i}
              </text>
            )}
          </g>
        )
      })}

      {/* 柱子与底下的 emoji */}
      {bars.map((b, i) => {
        const x = AXIS_W + GAP / 2 + i * (BAR_W + GAP)
        const h = b.count * UNIT
        return (
          <g key={b.name}>
            <rect
              x={x}
              y={PAD + chartH - h}
              width={BAR_W}
              height={h}
              fill={BAR_FILL}
              stroke={BAR_LINE}
              strokeWidth={1.5}
              rx={2}
            />
            <text
              x={x + BAR_W / 2}
              y={PAD + chartH + 19}
              fontSize={16}
              textAnchor="middle"
            >
              {b.emoji}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
