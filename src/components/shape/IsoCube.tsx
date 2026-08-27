/**
 * @file 等轴测正方体 —— 积木堆专用，一块紧挨一块不留缝
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/blockStack.ts  摆放晶格（HALF_W / HALF_H / LAYER_H）在那里
 *
 * ## ⭐ 为什么不能复用 `SolidShape` 的 cube
 *
 * `SolidShape` 画的是**一个孤零零的图形**：100×100 的画布里居中、四周留白、
 * 底下还有一团投影，而且用的是「正面 + 顶面 + 侧面」的斜投影。
 * 把它按等轴测晶格摆成一堆，会同时出三个毛病：
 *
 * ```
 * 块与块之间有缝    投影方式与晶格不匹配，相邻两块的面根本对不上
 * 每块自带一团投影   五块积木底下五团影子，堆成一片脏
 * 实际尺寸偏小      画布里有留白，34px 的框里正方体只占 20px 上下
 * ```
 *
 * 这里的正方体**填满自己那一格**，顶面菱形的对角线正好是 `HALF_W`/`HALF_H` 的两倍，
 * 竖边正好是 `LAYER_H`。因此相邻两块共用一条边、上下两块共用一个面，
 * 摆出来是一整堆而不是几个悬空的方块。
 *
 * ⚠️ 改这里的任何一个尺寸，都要同步 `blockStack.ts` 的晶格常量——
 * 那三个数和这幅图是同一件事的两种写法，对不上就又有缝了。
 */

import { ISO_BOX_H, ISO_BOX_W, ISO_HALF_H, ISO_HALF_W, ISO_LAYER_H } from '@/domain/blockStack'

/** 三个面的明度。与 SolidShape 同一套橙色，孩子认得出是同一种积木 */
const TOP = '#FFD79A'
const LEFT = '#F0A63C'
const RIGHT = '#C97F1C'
const LINE = '#A8681A'

/** 顶面菱形的四个顶点：上、右、下、左 */
const TOP_FACE = [
  [ISO_HALF_W, 0],
  [ISO_BOX_W, ISO_HALF_H],
  [ISO_HALF_W, ISO_HALF_H * 2],
  [0, ISO_HALF_H],
]
  .map((p) => p.join(','))
  .join(' ')

/** 左侧面：顶面左半边往下拉一个层高 */
const LEFT_FACE = [
  [0, ISO_HALF_H],
  [ISO_HALF_W, ISO_HALF_H * 2],
  [ISO_HALF_W, ISO_HALF_H * 2 + ISO_LAYER_H],
  [0, ISO_HALF_H + ISO_LAYER_H],
]
  .map((p) => p.join(','))
  .join(' ')

/** 右侧面：顶面右半边往下拉一个层高 */
const RIGHT_FACE = [
  [ISO_HALF_W, ISO_HALF_H * 2],
  [ISO_BOX_W, ISO_HALF_H],
  [ISO_BOX_W, ISO_HALF_H + ISO_LAYER_H],
  [ISO_HALF_W, ISO_HALF_H * 2 + ISO_LAYER_H],
]
  .map((p) => p.join(','))
  .join(' ')

/**
 * 一块积木。
 *
 * @param size - 渲染宽度（像素）。高度按 {@link ISO_BOX_H} / {@link ISO_BOX_W} 推出来，
 *               ⚠️ 不是正方形——等轴测的正方体画在纸上比它宽的那一格要高
 *
 * @example
 * <IsoCube size={34} />
 */
export function IsoCube({ size = ISO_BOX_W }: { size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${ISO_BOX_W} ${ISO_BOX_H}`}
      width={size}
      height={(size * ISO_BOX_H) / ISO_BOX_W}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* ⚠️ 描边画在**内侧**（strokeLinejoin round + 细线）：
          粗描边会让相邻两块之间出现一条双倍宽的深线，看着又成了缝 */}
      <polygon points={LEFT_FACE} fill={LEFT} stroke={LINE} strokeWidth={1} strokeLinejoin="round" />
      <polygon points={RIGHT_FACE} fill={RIGHT} stroke={LINE} strokeWidth={1} strokeLinejoin="round" />
      <polygon points={TOP_FACE} fill={TOP} stroke={LINE} strokeWidth={1} strokeLinejoin="round" />
    </svg>
  )
}
