/**
 * @file 平面图形 —— M7.3 / M7.4 的图形面
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/shape/SolidShape.tsx  立体图形，**同一套配色**
 *
 * ⚠️ **配色与立体图形刻意相同**。早先版本把平面画成蓝、立体画成橙，
 * 上机后否掉了——那是用颜色代替造型，孩子学到的会是「蓝的是平面」，
 * 而不是「没有厚度的是平面」，换套配色就又不会了。
 *
 * 现在区别全部落在造型上：平面**纯色平涂、无渐变、无投影**，
 * 立体有明暗面与地面投影。详见 SolidShape 的文件头。
 */

import type { PlaneShapeKind } from '@/domain/types'

const FILL = '#FFB84D'
const LINE = '#A8681A'

interface PlaneShapeProps {
  kind: PlaneShapeKind
  size?: number
}

/**
 * 一个平面图形。**纯色填充、无明暗、无立体感**——
 * 这正是它与 `SolidShape` 的区别所在。
 *
 * @example
 * <PlaneShape kind="triangle" />
 */
export function PlaneShape({ kind, size = 96 }: PlaneShapeProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={LABELS[kind]}>
      {SHAPES[kind]}
    </svg>
  )
}

const LABELS: Record<PlaneShapeKind, string> = {
  square: '正方形',
  rect: '长方形',
  triangle: '三角形',
  circle: '圆',
}

/** 平面图形的中文名，生成器与朗读共用 */
export function planeName(kind: PlaneShapeKind): string {
  return LABELS[kind]
}

const STROKE = { fill: FILL, stroke: LINE, strokeWidth: 3, strokeLinejoin: 'round' as const }

const SHAPES: Record<PlaneShapeKind, JSX.Element> = {
  square: <rect x={26} y={26} width={48} height={48} rx={3} {...STROKE} />,
  // 长宽比拉到 3:2，与正方形的差别才一眼可辨
  rect: <rect x={16} y={32} width={68} height={36} rx={3} {...STROKE} />,
  triangle: <polygon points="50,22 80,74 20,74" {...STROKE} />,
  circle: <circle cx={50} cy={50} r={26} {...STROKE} />,
}
