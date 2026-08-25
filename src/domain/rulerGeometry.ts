/**
 * @file 尺子的几何 —— 刻度位置、被量物体的两端
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/RulerShape.tsx  拿这些坐标去画
 * @see src/domain/generators/measureLength.ts  起点终点从哪来
 *
 * ## ⭐ 物体的起点是参数，不是恒等于 0
 *
 * 这个单元唯一要诊断的是 `ruler_start_wrong`（把物体左端对在刻度 1 上、
 * 直接读右端的数）。物体若永远从 0 开始量，那个错误根本无从发生——
 * 因此 `start` 从一开始就是几何的一部分，而不是等发现了再补的参数。
 *
 * 与 `angleGeometry` 同一条规矩：坐标由 domain 算好，组件只负责画。
 */

/** 每厘米占多少画布单位。20 是权衡：再小刻度数字会挤在一起 */
export const CM_UNIT = 20

/** 尺子左端留白 */
export const RULER_LEFT = 14

/** 尺子上边缘的 y */
export const RULER_TOP = 34

/** 尺子本体的高度 */
export const RULER_HEIGHT = 26

/** 被量物体画在尺子上方多少 */
const ITEM_OFFSET = 13

/** 画布高度，固定 */
export const RULER_CANVAS_HEIGHT = 74

/**
 * 尺子最多几厘米。
 *
 * ⚠️ 超过它刻度会密到读不出来：画布按厘米数等比变宽，
 * 而显示宽度是固定的，刻度越多每一格越窄。
 */
export const MAX_TICKS = 12

export interface RulerGeometry {
  /** 画布宽度，随刻度数变 */
  width: number
  height: number
  /** 尺子矩形 */
  ruler: { x: number; y: number; width: number; height: number }
  /** 每个刻度：位置与要标的数字 */
  ticks: Array<{ x: number; label: number }>
  /** 被量的物体：一条横线的两端与 y */
  item: { x1: number; x2: number; y: number }
  /** 物体的真实长度（厘米） */
  lengthCm: number
}

/** 某个刻度在画布上的横坐标 */
export function tickX(cm: number): number {
  return RULER_LEFT + cm * CM_UNIT
}

/**
 * 算出一把尺子和它上面那个物体要画的全部坐标。
 *
 * @param maxTick - 尺子有几厘米，见 {@link MAX_TICKS}
 * @param start - 物体左端对准的刻度。⭐ 不为 0 时才考得到 `ruler_start_wrong`
 * @param end - 物体右端对准的刻度
 * @returns 尺子矩形、刻度、物体两端
 * @throws 起点终点不合法（倒置、越界）时抛错——那会画出一条负长度的线，
 *         而孩子看到的是一道没有物体的题
 *
 * @example
 * rulerGeometry(10, 1, 6)   // 物体从刻度 1 到 6，真实长度 5 厘米
 * // 直接读右端会得到 6，那正是 ruler_start_wrong
 */
export function rulerGeometry(maxTick: number, start: number, end: number): RulerGeometry {
  if (start < 0 || end > maxTick || end <= start) {
    throw new Error(`尺子上的物体位置不合法: start=${start} end=${end} maxTick=${maxTick}`)
  }

  return {
    width: RULER_LEFT * 2 + maxTick * CM_UNIT,
    height: RULER_CANVAS_HEIGHT,
    ruler: {
      x: RULER_LEFT,
      y: RULER_TOP,
      width: maxTick * CM_UNIT,
      height: RULER_HEIGHT,
    },
    ticks: Array.from({ length: maxTick + 1 }, (_, cm) => ({ x: tickX(cm), label: cm })),
    item: { x1: tickX(start), x2: tickX(end), y: RULER_TOP - ITEM_OFFSET },
    lengthCm: end - start,
  }
}

/** 一条单独的线段（不配尺子）在画布上的长度 */
export function segmentWidth(lengthCm: number): number {
  return lengthCm * CM_UNIT
}
