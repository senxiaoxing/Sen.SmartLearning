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

/**
 * 等轴测晶格。⚠️ 这四个数与 `components/shape/IsoCube.tsx` 画的那块积木
 * 是同一件事的两种写法：顶面菱形的对角线是 `ISO_HALF_W`/`ISO_HALF_H` 的两倍，
 * 竖边是 `ISO_LAYER_H`。改一处不改另一处，块与块之间就会出现缝。
 */
export const ISO_HALF_W = 17
export const ISO_HALF_H = 9
export const ISO_LAYER_H = 19

/** 一块积木占的画布宽 */
export const ISO_BOX_W = ISO_HALF_W * 2

/**
 * 一块积木占的画布高。
 *
 * ⚠️ **比宽度大**——等轴测的正方体在纸上不是正方形，
 * 它是顶面菱形（高 `2 × ISO_HALF_H`）压在竖边（`ISO_LAYER_H`）上面。
 * 当成正方形算会让整堆往下超出画布。
 */
export const ISO_BOX_H = ISO_HALF_H * 2 + ISO_LAYER_H

/**
 * 把积木堆摊成 `ShapeScene` 能画的一组正方体。
 *
 * ⭐ **数组顺序即层叠顺序**：先画远的（`col + row` 小的），再画近的；
 * 同一格先画下层再画上层。顺序错了近处的积木会被远处的盖住，
 * 那堆积木看起来就是散的。
 *
 * ⭐ **形状是 `isoCube` 而不是 `cube`。** `cube`（`SolidShape`）画的是一个
 * 孤零零的图形：画布里居中留白、底下带投影、用的还是另一种投影方式。
 * 按这里的等轴测晶格摆一堆，块与块之间会留出明显的缝，
 * 每块底下还各有一团影子——真机上一眼就看出不对。理由详见 `IsoCube` 的文件头。
 *
 * @param s - 积木堆
 * @param canvas - 画布逻辑尺寸，用来把整堆摆到中间
 * @returns 由远及近排好的正方体
 */
export function isoPieces(s: BlockStack, canvas: { w: number; h: number }): ScenePiece[] {
  const originX = canvas.w / 2 - ISO_BOX_W / 2 + ((s.rows - s.cols) * ISO_HALF_W) / 2
  // ⚠️ 深度跨度要整个减掉，不能只减一半：最远那格的 y 会往下推
  // `(cols + rows - 2) * ISO_HALF_H`，少算一半的话 3×3 的堆会戳出画布底部。
  // 减的是 ISO_BOX_H（比宽度大）而不是宽度——等轴测正方体在纸上不是正方形
  const originY = canvas.h - ISO_BOX_H - (s.cols + s.rows - 2) * ISO_HALF_H

  const placed: Array<{ piece: ScenePiece; depth: number; layer: number }> = []
  for (let c = 0; c < s.cols; c++) {
    for (let r = 0; r < s.rows; r++) {
      const h = s.heights[c]?.[r] ?? 0
      for (let k = 0; k < h; k++) {
        placed.push({
          depth: c + r,
          layer: k,
          piece: {
            shape: 'isoCube',
            x: originX + (c - r) * ISO_HALF_W,
            y: originY + (c + r) * ISO_HALF_H - k * ISO_LAYER_H,
            size: ISO_BOX_W,
          },
        })
      }
    }
  }

  return placed.sort((a, b) => a.depth - b.depth || a.layer - b.layer).map((p) => p.piece)
}
