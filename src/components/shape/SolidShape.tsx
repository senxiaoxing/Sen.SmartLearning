/**
 * @file 立体图形 —— M7.1 / M7.2 的图形面
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/shape/PlaneShape.tsx  平面图形，**同一套配色**
 * @see design/01-知识点图谱.md §M7 图形认识
 *
 * ## ⭐ 立体感必须靠明暗，不能靠颜色
 *
 * 早先版本用「立体=橙、平面=蓝」区分两族图形，上机后被否掉了——
 * 那是**用颜色代替造型**：孩子学会的会是「蓝的是平面」，
 * 而不是「没有厚度的是平面」。换一套配色她就又不会了。
 *
 * 现在两族共用同一套橙色，区别全部落在造型上：
 * ```
 * 立体   渐变填充 + 可见的顶面/侧面 + 地面投影
 * 平面   纯色平涂 + 无投影
 * ```
 * 球与圆是这条规则最吃紧的一对：都是圆形轮廓，
 * 只能靠**球面渐变 + 高光 + 投影**把体积感做出来。
 */

import { useId } from 'react'
import type { SolidShapeKind } from '@/domain/types'

/** 三个面的明度。对比刻意拉大——差别太小，立体感就散了 */
const TOP = '#FFE0B0'
const FRONT = '#FFB84D'
const SIDE = '#D4881F'
const LINE = '#A8681A'
const HIGHLIGHT = '#FFF6E6'
const DEEP = '#B06E14'

interface SolidShapeProps {
  kind: SolidShapeKind
  size?: number
}

const LABELS: Record<SolidShapeKind, string> = {
  cube: '正方体',
  cuboid: '长方体',
  cylinder: '圆柱',
  sphere: '球',
  cone: '圆锥',
}

/** 立体图形的中文名，生成器与朗读共用 */
export function solidName(kind: SolidShapeKind): string {
  return LABELS[kind]
}

/**
 * 一个立体图形。
 *
 * @example
 * <SolidShape kind="sphere" />   // 球：有高光、有投影，与平面的圆一眼可分
 */
export function SolidShape({ kind, size = 96 }: SolidShapeProps) {
  // 同一页面会同时出现多个实例，渐变 id 必须各自唯一，否则后者覆盖前者
  const uid = useId().replace(/:/g, '')

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={LABELS[kind]}>
      <defs>
        <radialGradient id={`${uid}-ball`} cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor={HIGHLIGHT} />
          <stop offset="45%" stopColor={FRONT} />
          <stop offset="100%" stopColor={DEEP} />
        </radialGradient>
        <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SIDE} />
          <stop offset="35%" stopColor={FRONT} />
          <stop offset="65%" stopColor={TOP} />
          <stop offset="100%" stopColor={SIDE} />
        </linearGradient>
      </defs>

      {/* 地面投影 —— 立体图形共有、平面图形绝对没有的那一笔 */}
      <ellipse cx={52} cy={86} rx={30} ry={6} fill={LINE} opacity={0.18} />

      {render(kind, uid)}
    </svg>
  )
}

/** 等距投影的箱体：`w` 宽、`h` 高、`d` 进深 */
function box(w: number, h: number, d: number) {
  const x = 50 - w / 2 - d / 2
  const y = 78 - h
  const top = `${x},${y} ${x + w},${y} ${x + w + d},${y - d} ${x + d},${y - d}`
  const front = `${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}`
  const side = `${x + w},${y} ${x + w},${y + h} ${x + w + d},${y + h - d} ${x + w + d},${y - d}`
  return (
    <>
      <polygon points={front} fill={FRONT} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={top} fill={TOP} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={side} fill={SIDE} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
    </>
  )
}

function render(kind: SolidShapeKind, uid: string) {
  switch (kind) {
    case 'cube':
      return box(40, 40, 18)
    // 长方体刻意画得明显更长——与正方体的差别只有比例，不夸张就分不出
    case 'cuboid':
      return box(58, 30, 16)

    case 'cylinder':
      return (
        <>
          {/* 侧面用横向渐变模拟圆柱面的转折，这是它区别于长方体的关键 */}
          <path
            d="M28 30 L28 70 A22 10 0 0 0 72 70 L72 30 Z"
            fill={`url(#${uid}-side)`}
            stroke={LINE}
            strokeWidth={2}
          />
          <ellipse cx={50} cy={30} rx={22} ry={10} fill={TOP} stroke={LINE} strokeWidth={2} />
        </>
      )

    case 'sphere':
      return (
        <>
          <circle
            cx={50}
            cy={48}
            r={28}
            fill={`url(#${uid}-ball)`}
            stroke={LINE}
            strokeWidth={2}
          />
          {/* 高光点：球面上的一小块反光，圆绝不会有 */}
          <ellipse
            cx={39}
            cy={35}
            rx={8}
            ry={5}
            fill={HIGHLIGHT}
            opacity={0.9}
            transform="rotate(-28 39 35)"
          />
        </>
      )

    case 'cone':
      return (
        <>
          <path
            d="M50 18 L74 70 A24 10 0 0 1 26 70 Z"
            fill={`url(#${uid}-side)`}
            stroke={LINE}
            strokeWidth={2}
          />
          <ellipse cx={50} cy={70} rx={24} ry={10} fill={SIDE} stroke={LINE} strokeWidth={2} />
        </>
      )
  }
}
