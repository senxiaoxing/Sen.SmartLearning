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

import { CM_UNIT, RULER_HEIGHT, rulerGeometry, type RulerGeometry } from '@/domain/rulerGeometry'

const RULER_FILL = '#FFE9BF'
const RULER_LINE = '#C9A227'
const ITEM_COLOR = '#E4572E'
const TEXT = '#7A5F14'

/**
 * 刻度数字的字号。
 *
 * ⭐ 按**格宽**定而不是写死一个数：数字要塞进一格，格子变宽它就能跟着变大。
 * 0.62 是上限——再大两位数（10 / 11 / 12）会顶到相邻的刻度线上。
 */
const TICK_FONT = CM_UNIT * 0.62

/** 整刻度的长线；半刻度只画线不标数，给「几厘米半」一个视觉参照 */
const TICK_LONG = RULER_HEIGHT * 0.34
const TICK_SHORT = RULER_HEIGHT * 0.18

interface RulerShapeProps {
  /** 尺子有几厘米 */
  maxTick: number
  /** 物体左端对准的刻度 */
  start: number
  /** 物体右端对准的刻度 */
  end: number
  /** 最大渲染像素宽度。窄屏上会自动缩到容器宽度 */
  size?: number
}

/**
 * 一把尺子和它上面被量的物体。
 *
 * ⚠️ 宽度用 `100%` + `maxWidth` 而不是写死 `width={size}`：
 * 尺子是全 App 最宽的一张图，写死宽度会在窄屏上把整页撑出横向滚动条。
 *
 * @example
 * <RulerShape maxTick={10} start={1} end={6} />   // 物体从 1 到 6，长 5 厘米
 */
export function RulerShape({ maxTick, start, end, size = 420 }: RulerShapeProps) {
  let g: RulerGeometry
  try {
    g = rulerGeometry(maxTick, start, end)
  } catch {
    // 坏参数画不出东西，但不能让整页白屏——真正的防线是生成器的测试
    return null
  }

  const baseline = g.ruler.y + g.ruler.height

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      // ⚠️ 必须给出 width/height 属性，只写 `width:100%` 是不够的：
      // 带 viewBox 的 svg 没有内在尺寸，作为 flex 子项时会被压缩到默认的
      // 300×150 甚至更小——真机上尺子反而比改之前更小，就是这么来的。
      // 显式尺寸给出内在大小，`maxWidth:100%` 再让它在窄屏上缩回去
      width={size}
      height={(size * g.height) / g.width}
      style={{ maxWidth: '100%', height: 'auto' }}
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

      {/* 半刻度：只画短线不标数。有它孩子才看得出「一格」有多宽 */}
      {g.ticks.slice(0, -1).map((t) => (
        <line
          key={`h${t.label}`}
          x1={t.x + CM_UNIT / 2}
          y1={g.ruler.y}
          x2={t.x + CM_UNIT / 2}
          y2={g.ruler.y + TICK_SHORT}
          stroke={RULER_LINE}
          strokeWidth={1.4}
          opacity={0.6}
        />
      ))}

      {/* 整刻度与数字 */}
      {g.ticks.map((t) => (
        <g key={t.label}>
          <line
            x1={t.x}
            y1={g.ruler.y}
            x2={t.x}
            y2={g.ruler.y + TICK_LONG}
            stroke={RULER_LINE}
            strokeWidth={2.2}
          />
          <text
            x={t.x}
            y={baseline - RULER_HEIGHT * 0.16}
            fontSize={TICK_FONT}
            fontWeight={700}
            textAnchor="middle"
            fill={TEXT}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* 被量的物体：一条粗横线 + 两端的实心端点。
          ⭐ 端点是内容不是装饰——线段与射线、直线的区别就在**有两个端点**，
          那是 M2-1.5 要教的第一件事 */}
      {[g.item.x1, g.item.x2].map((x) => (
        <line
          key={x}
          x1={x}
          y1={g.item.y}
          x2={x}
          y2={g.ruler.y + TICK_LONG}
          stroke={ITEM_COLOR}
          strokeWidth={1.8}
          strokeDasharray="4 3"
          opacity={0.8}
        />
      ))}
      <line
        x1={g.item.x1}
        y1={g.item.y}
        x2={g.item.x2}
        y2={g.item.y}
        stroke={ITEM_COLOR}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {[g.item.x1, g.item.x2].map((x) => (
        <circle key={`e${x}`} cx={x} cy={g.item.y} r={5.5} fill="#FFF" stroke={ITEM_COLOR} strokeWidth={2.5} />
      ))}
    </svg>
  )
}
