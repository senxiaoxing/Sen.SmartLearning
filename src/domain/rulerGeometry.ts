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

/**
 * 每厘米占多少画布单位。
 *
 * ⚠️ 这个数**同时决定刻度数字能有多大**：数字必须塞进一格，
 * 而字号是按格宽定的（见 `RulerShape` 的 `TICK_FONT`）。
 * 原来是 20，真机上刻度数字看不清——尺子整体不是不够大，
 * 是一格太窄，字被压到了 10 单位以下。
 */
export const CM_UNIT = 26

/** 尺子左端留白 */
export const RULER_LEFT = 16

/** 尺子上边缘的 y */
export const RULER_TOP = 38

/** 尺子本体的高度。要放得下刻度线和它下面的数字 */
export const RULER_HEIGHT = 34

/** 被量物体画在尺子上方多少 */
const ITEM_OFFSET = 15

/** 画布高度，固定 */
export const RULER_CANVAS_HEIGHT = 88

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

/**
 * 「哪条线段长 N 厘米」的选项要配多长的尺子。
 *
 * ⭐ **四个选项必须共用同一把尺子**，所以取全部长度里最长的那条再留一格。
 * 各自按自己的长度配尺子的话，每个选项的画布宽度都不同，
 * 而选项卡片宽度是固定的——四条线段会被各自缩放到几乎一样长，
 * 那时这道题连「比长短」都做不了，更别说量。
 *
 * @param lengths - 四个选项的长度（厘米）
 * @returns 尺子的总刻度数，至少 3，至多 {@link MAX_TICKS}
 *
 * @example
 * optionRulerTicks([5, 3, 8, 2])   // 9 —— 最长的 8 再留一格
 */
export function optionRulerTicks(lengths: readonly number[]): number {
  const longest = Math.max(0, ...lengths)
  return Math.min(MAX_TICKS, Math.max(3, longest + 1))
}
