/**
 * @file 角的几何 —— 顶点、两条边的端点、表示大小的那道弧
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/AngleShape.tsx  拿这些坐标去画
 * @see src/domain/generators/angles.ts      度数与边长从哪来
 *
 * 与 `ShapeScene` 同一条规矩：**坐标由 domain 算好，组件只负责画**。
 * 这里还多一层理由——角画歪了在 App 里是看得出来的，
 * 但二年级没开放之前根本进不去，测试是唯一的防线。
 *
 * ## 为什么弧的半径是固定的
 *
 * 弧不随边长变，它正是「角的大小」的可视化：边推长推短，弧一点不变。
 * 这恰好是 M2-3 要教的那件事（`angle_side_length`），
 * 也是为什么 `arm` 与 `ARC_RADIUS` 必须是两个独立的量。
 */

/** 画布边长。与 `AngleShape` 的 viewBox 一致 */
export const ANGLE_CANVAS = 100

/** 顶点位置。略偏左下是因为角的开口通常朝右上，重心要留出去 */
export const ANGLE_VERTEX = { x: 46, y: 58 } as const

/** 表示角大小的那道弧的半径。⚠️ 固定值——它不能随边长变 */
export const ARC_RADIUS = 17

/** 边长上限。超过它端点会跑出画布，被裁掉半条边 */
export const MAX_ARM = 44

export interface Point {
  x: number
  y: number
}

export interface AngleGeometry {
  vertex: Point
  /** 第一条边的端点 */
  armA: Point
  /** 第二条边的端点 */
  armB: Point
  /** 弧的起点与终点，落在两条边上、距顶点 {@link ARC_RADIUS} */
  arcA: Point
  arcB: Point
  arcRadius: number
}

const rad = (deg: number): number => (deg * Math.PI) / 180

/**
 * 从顶点按角度伸出去的端点。
 *
 * ⚠️ SVG 的 y 轴向下，所以正弦取负——这样 `degrees` 用的是数学里的方向
 * （逆时针为正），读代码和读教材是一套坐标。
 */
function tip(deg: number, distance: number): Point {
  return {
    x: ANGLE_VERTEX.x + distance * Math.cos(rad(deg)),
    y: ANGLE_VERTEX.y - distance * Math.sin(rad(deg)),
  }
}

/**
 * 算出一个角要画的全部坐标。
 *
 * @param degrees - 开口度数，0~180
 * @param arm - 两条边的长度，见 {@link MAX_ARM}
 * @param rotate - 第一条边的朝向，让角不总是同一个姿势
 * @returns 顶点、两个边端点、弧的两端
 *
 * @example
 * angleGeometry(90, 38, 0)
 * // vertex (46, 58)，armA 在正右方 (84, 58)，armB 在正上方 (46, 20)
 */
export function angleGeometry(degrees: number, arm: number, rotate: number): AngleGeometry {
  return {
    vertex: { ...ANGLE_VERTEX },
    armA: tip(rotate, arm),
    armB: tip(rotate + degrees, arm),
    arcA: tip(rotate, ARC_RADIUS),
    arcB: tip(rotate + degrees, ARC_RADIUS),
    arcRadius: ARC_RADIUS,
  }
}

/**
 * 弧的 SVG path。
 *
 * ⚠️ 二年级的角不超过 180°，大弧标志恒为 0；
 * sweep 取 0 是因为度数增加在这套坐标里对应屏幕上的逆时针。
 */
export function arcPath(g: AngleGeometry): string {
  return `M ${g.arcA.x} ${g.arcA.y} A ${g.arcRadius} ${g.arcRadius} 0 0 0 ${g.arcB.x} ${g.arcB.y}`
}

/** 两条边的折线 path */
export function armsPath(g: AngleGeometry): string {
  return `M ${g.armA.x} ${g.armA.y} L ${g.vertex.x} ${g.vertex.y} L ${g.armB.x} ${g.armB.y}`
}
