/**
 * @file 积木摆法 —— 数积木题的坐标计算
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/countShapes.ts  出题逻辑
 *
 * ⭐ **摆法必须进签名**：5 块排成一行和 5 块堆成金字塔，
 * 对孩子是两道不同的题（看起来不一样、数的策略也不一样）。
 * 只按块数编签名的话，整条模板加起来才 4~5 种题，
 * 和它要替代的「认图形」一样容易重复——那就白做了。
 */

import type { ScenePiece } from '@/domain/types'

export const LAYOUTS = ['row', 'twoRows', 'pyramid', 'tower', 'scattered'] as const
export type Layout = (typeof LAYOUTS)[number]

/** 把坐标夹在画布内，抖动不能把积木推出边界 */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * 按摆法算出每块积木的坐标。
 *
 * ⚠️ 全部积木**互不遮挡**：一年级还没有「被挡住的也要数」的空间想象，
 * 藏一块在后面只会让这道题变成猜谜，而且错了也分不清是漏数还是没想到。
 *
 * @param total - 块数
 * @param layout - 摆法
 * @param piece - 每块的边长
 * @param canvas - 画布逻辑尺寸
 * @param rng - `scattered` 需要它做抖动；同种子同结果
 * @returns 数组顺序即层叠顺序（先画的在后面）
 *
 * @example
 * layoutBlocks(5, 'pyramid', 34, { w: 240, h: 130 }, rng)
 */
export function layoutBlocks(
  total: number,
  layout: Layout,
  piece: number,
  canvas: { w: number; h: number },
  rng: () => number,
): ScenePiece[] {
  const { w: W, h: H } = canvas
  const step = piece + 6
  const put = (x: number, y: number): ScenePiece => ({ shape: 'cube', x, y, size: piece })

  if (layout === 'scattered') {
    /**
     * 网格 + 抖动：位置不规则，孩子必须**一个一个点着数**，
     * 而整齐排列一眼扫过去就估出来了——练的就不是数数了。
     * 与 `TapCount` 的散布是同一个道理（design/05 第 4 条）。
     */
    const cols = Math.ceil(total / 2)
    const cellW = (W - piece) / Math.max(1, cols)
    const cellH = (H - piece) / 2
    return Array.from({ length: total }, (_, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      const jitterX = (rng() - 0.5) * Math.min(14, cellW * 0.4)
      const jitterY = (rng() - 0.5) * 12
      return put(
        clamp(c * cellW + jitterX, 0, W - piece),
        clamp(r * cellH + jitterY + 6, 0, H - piece),
      )
    })
  }

  if (layout === 'tower') {
    // 竖着叠一摞，最多 4 层，多出来的另起一摞
    const perCol = Math.min(4, total)
    const cols = Math.ceil(total / perCol)
    const totalW = cols * step
    return Array.from({ length: total }, (_, i) => {
      const c = Math.floor(i / perCol)
      const r = i % perCol
      return put((W - totalW) / 2 + c * step, H - piece - 6 - r * (piece - 10))
    })
  }

  if (layout === 'pyramid') {
    // 底层多、上层少，逐层递减
    const rows: number[] = []
    let left = total
    let width = Math.ceil(Math.sqrt(total)) + 1
    while (left > 0) {
      const n = Math.min(width, left)
      rows.push(n)
      left -= n
      width = Math.max(1, width - 1)
    }
    const pieces: ScenePiece[] = []
    rows.forEach((n, r) => {
      const rowW = n * step
      for (let c = 0; c < n; c++) {
        pieces.push(
          put((W - rowW) / 2 + c * step, H - piece - 6 - (rows.length - 1 - r) * (piece - 10)),
        )
      }
    })
    return pieces
  }

  const perRow = layout === 'row' ? total : Math.ceil(total / 2)
  const rows = Math.ceil(total / perRow)
  return Array.from({ length: total }, (_, i) => {
    const r = Math.floor(i / perRow)
    const c = i % perRow
    const inRow = Math.min(perRow, total - r * perRow)
    const rowW = inRow * step
    return put((W - rowW) / 2 + c * step, H - piece - 6 - (rows - 1 - r) * (piece - 10))
  })
}
