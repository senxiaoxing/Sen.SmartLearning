/**
 * @file 积木堆与它的三视图 —— M2-5 观察物体
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/viewFromSide.ts  出题
 * @see src/domain/gridShape.ts  视图就是格子图案，两边共用 `Cell`
 *
 * ## ⭐ 三个视图都是 2D 格子图，因此零新增组件
 *
 * 从上面看是底面的占用格；从正面看是每一列的最高处；从侧面看是每一行的最高处。
 * 三者都能直接喂给 `GridPattern`（M2-10 做的那个），
 * 而立体堆本身用现成的 `ShapeScene` 摆正方体即可。
 *
 * ## 高度图表示
 *
 * `heights[col][row]` = 那个位置堆了几层，0 表示空。
 * 用高度图而不是逐块坐标：三视图全是「取最大值」的投影，
 * 高度图让这三个投影各自只有两行代码。
 */

import type { Cell } from '@/domain/gridShape'
import type { ScenePiece } from '@/domain/types'

/** 一堆积木。`heights[col][row]` 是那一格堆了几层 */
export interface BlockStack {
  heights: number[][]
  cols: number
  rows: number
}

/** 整堆最高几层 */
export function maxHeight(s: BlockStack): number {
  return Math.max(0, ...s.heights.flat())
}

/** 总块数 */
export function blockCount(s: BlockStack): number {
  return s.heights.flat().reduce((a, b) => a + b, 0)
}

/**
 * 从上面看 —— 底面上哪些格子有积木。
 *
 * @example
 * topView({ heights: [[1, 0], [2, 1]], cols: 2, rows: 2 })
 * // [[0,0], [1,0], [1,1]]
 */
export function topView(s: BlockStack): Cell[] {
  const cells: Cell[] = []
  for (let c = 0; c < s.cols; c++) {
    for (let r = 0; r < s.rows; r++) {
      if ((s.heights[c]?.[r] ?? 0) > 0) cells.push([c, r])
    }
  }
  return cells
}

/**
 * 从正面看 —— 每一列取所有行里的最高处，柱子**从底部往上长**。
 *
 * ⚠️ 底部对齐是有意的：正面图里的积木是站在地上的，
 * 贴到顶端会看起来像悬空，孩子对不上实物。
 */
export function frontView(s: BlockStack): Cell[] {
  return columnsToCells(
    Array.from({ length: s.cols }, (_, c) =>
      Math.max(0, ...Array.from({ length: s.rows }, (_, r) => s.heights[c]?.[r] ?? 0)),
    ),
    maxHeight(s),
  )
}

/** 从侧面看 —— 每一行取所有列里的最高处 */
export function sideView(s: BlockStack): Cell[] {
  return columnsToCells(
    Array.from({ length: s.rows }, (_, r) =>
      Math.max(0, ...Array.from({ length: s.cols }, (_, c) => s.heights[c]?.[r] ?? 0)),
    ),
    maxHeight(s),
  )
}

/** 把「每列多高」摊成格子，底部对齐 */
function columnsToCells(columnHeights: number[], gridHeight: number): Cell[] {
  const cells: Cell[] = []
  columnHeights.forEach((h, c) => {
    for (let k = 0; k < h; k++) cells.push([c, gridHeight - 1 - k])
  })
  return cells
}

/** 等轴测投影的半宽、半高与层高 */
const HALF_W = 17
const HALF_H = 9
const LAYER_H = 19
const CUBE = 34

/**
 * 把积木堆摊成 `ShapeScene` 能画的一组正方体。
 *
 * ⭐ **数组顺序即层叠顺序**：先画远的（`col + row` 小的），再画近的；
 * 同一格先画下层再画上层。顺序错了近处的积木会被远处的盖住，
 * 那堆积木看起来就是散的。
 *
 * @param s - 积木堆
 * @param canvas - 画布逻辑尺寸，用来把整堆摆到中间
 * @returns 由远及近排好的正方体
 */
export function isoPieces(s: BlockStack, canvas: { w: number; h: number }): ScenePiece[] {
  const originX = canvas.w / 2 - CUBE / 2 + ((s.rows - s.cols) * HALF_W) / 2
  // ⚠️ 深度跨度要整个减掉，不能只减一半：最远那格的 y 会往下推
  // `(cols + rows - 2) * HALF_H`，少算一半的话 3×3 的堆会戳出画布底部
  const originY = canvas.h - CUBE - (s.cols + s.rows - 2) * HALF_H

  const placed: Array<{ piece: ScenePiece; depth: number; layer: number }> = []
  for (let c = 0; c < s.cols; c++) {
    for (let r = 0; r < s.rows; r++) {
      const h = s.heights[c]?.[r] ?? 0
      for (let k = 0; k < h; k++) {
        placed.push({
          depth: c + r,
          layer: k,
          piece: {
            shape: 'cube',
            x: originX + (c - r) * HALF_W,
            y: originY + (c + r) * HALF_H - k * LAYER_H,
            size: CUBE,
          },
        })
      }
    }
  }

  return placed.sort((a, b) => a.depth - b.depth || a.layer - b.layer).map((p) => p.piece)
}
