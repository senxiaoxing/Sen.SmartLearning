/**
 * @file 尺子 —— M2-1.1 认识厘米 · M2-1.2 用尺子量 · M2-1.5 量线段
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/rulerGeometry.ts  坐标在那里算，这里只负责画
 *
 * ## ⭐ 物体不一定从 0 开始
 *
 * 这个单元唯一要诊断的是 `ruler_start_wrong`——把物体左端对在刻度 1 上、
 * 直接读右端的数。因此物体的起点是画出来的内容，不是恒定值。
 *
 * ## 刻度画法
 *
 * 每厘米一条长刻度加数字，**不画毫米**：二年级只量到厘米，
 * 画上毫米只会让刻度挤成一片，孩子反而数不清格子。
 */

import {
  RULER_HEIGHT,
  rulerGeometry,
  segmentWidth,
  type RulerGeometry,
} from '@/domain/rulerGeometry'

const RULER_FILL = '#FFE9BF'
const RULER_LINE = '#C9A227'
const ITEM_COLOR = '#E4572E'
const TEXT = '#8A6D1F'

interface RulerShapeProps {
  /** 尺子有几厘米 */
  maxTick: number
  /** 物体左端对准的刻度 */
  start: number
  /** 物体右端对准的刻度 */
  end: number
  /** 渲染像素宽度 */
  size?: number
}

/**
 * 一把尺子和它上面被量的物体。
 *
 * @example
 * <RulerShape maxTick={10} start={1} end={6} />   // 物体从 1 到 6，长 5 厘米
 */
export function RulerShape({ maxTick, start, end, size = 300 }: RulerShapeProps) {
  let g: RulerGeometry
  try {
    g = rulerGeometry(maxTick, start, end)
  } catch {
    // 坏参数画不出东西，但不能让整页白屏——真正的防线是生成器的测试
    return null
  }

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      width={size}
      height={(size * g.height) / g.width}
      role="img"
      aria-label="用尺子量一量"
    >
      {/* 尺子本体 */}
      <rect
        x={g.ruler.x}
        y={g.ruler.y}
        width={g.ruler.width}
        height={g.ruler.height}
        rx={3}
        fill={RULER_FILL}
        stroke={RULER_LINE}
        strokeWidth={1.5}
      />

      {/* 刻度线与数字 */}
      {g.ticks.map((t) => (
        <g key={t.label}>
          <line
            x1={t.x}
            y1={g.ruler.y}
            x2={t.x}
            y2={g.ruler.y + RULER_HEIGHT * 0.42}
            stroke={RULER_LINE}
            strokeWidth={1.5}
          />
          <text
            x={t.x}
            y={g.ruler.y + RULER_HEIGHT - 5}
            fontSize={10}
            textAnchor="middle"
            fill={TEXT}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* 被量的物体：一条粗横线，两端各一个小竖档，让「量到哪」一目了然 */}
      <line
        x1={g.item.x1}
        y1={g.item.y}
        x2={g.item.x2}
        y2={g.item.y}
        stroke={ITEM_COLOR}
        strokeWidth={7}
        strokeLinecap="round"
      />
      {[g.item.x1, g.item.x2].map((x) => (
        <line
          key={x}
          x1={x}
          y1={g.item.y - 7}
          x2={x}
          y2={g.ruler.y}
          stroke={ITEM_COLOR}
          strokeWidth={1.5}
          strokeDasharray="3 2"
          opacity={0.75}
        />
      ))}
    </svg>
  )
}

/**
 * 一条单独的线段（不配尺子），用于「哪条线段长 5 厘米」这类选项。
 *
 * 两端画实心点：线段与射线、直线的区别就在**有两个端点**，
 * 这是 M2-1.5 要教的第一件事。
 */
export function SegmentShape({ lengthCm, size = 140 }: { lengthCm: number; size?: number }) {
  const w = segmentWidth(lengthCm)
  const pad = 8
  const height = 24

  return (
    <svg
      viewBox={`0 0 ${w + pad * 2} ${height}`}
      width={size}
      height={(size * height) / (w + pad * 2)}
      role="img"
      aria-label="一条线段"
    >
      <line
        x1={pad}
        y1={height / 2}
        x2={pad + w}
        y2={height / 2}
        stroke={ITEM_COLOR}
        strokeWidth={5}
        strokeLinecap="round"
      />
      {[pad, pad + w].map((x) => (
        <circle key={x} cx={x} cy={height / 2} r={4} fill={RULER_LINE} />
      ))}
    </svg>
  )
}
