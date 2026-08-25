/**
 * @file 积木堆三视图测试
 * @layer domain
 *
 * ⭐ 三视图算错在 App 里**完全看不出来**——四个格子图摆在那儿都像模像样，
 * 只有真拿积木摆一遍才知道对不对。测试是唯一的防线。
 */

import { describe, expect, it } from 'vitest'
import {
  blockCount,
  frontView,
  isoPieces,
  maxHeight,
  sideView,
  topView,
  type BlockStack,
} from '@/domain/blockStack'
import { sameShape, type Cell } from '@/domain/gridShape'

/**
 * 一个 2×2 的堆：
 * ```
 *        row0  row1
 * col0    2     1
 * col1    1     0
 * ```
 */
const L_STACK: BlockStack = {
  heights: [
    [2, 1],
    [1, 0],
  ],
  cols: 2,
  rows: 2,
}

/** 有几格排序无关的比较 */
function has(cells: Cell[], want: Cell[]): boolean {
  return sameShape(cells, want) && cells.length === want.length
}

describe('基本量', () => {
  it('块数与最高层数', () => {
    expect(blockCount(L_STACK)).toBe(4)
    expect(maxHeight(L_STACK)).toBe(2)
  })
})

describe('从上面看', () => {
  it('就是底面上有积木的格子', () => {
    // (0,0) (0,1) (1,0) 有，(1,1) 空
    expect(has(topView(L_STACK), [
      [0, 0],
      [0, 1],
      [1, 0],
    ])).toBe(true)
  })

  it('层数不影响俯视图 —— 堆多高从上面看都一样', () => {
    const taller: BlockStack = {
      heights: [
        [5, 3],
        [9, 0],
      ],
      cols: 2,
      rows: 2,
    }
    expect(sameShape(topView(taller), topView(L_STACK))).toBe(true)
  })
})

describe('⭐ 从正面看：每列取最高，且底部对齐', () => {
  it('列 0 最高 2 层、列 1 最高 1 层', () => {
    const cells = frontView(L_STACK)
    // 网格高 2：列 0 占 row0 与 row1，列 1 只占 row1（底部）
    expect(has(cells, [
      [0, 0],
      [0, 1],
      [1, 1],
    ])).toBe(true)
  })

  it('⭐ 柱子从底部往上长，不悬空', () => {
    const gridH = maxHeight(L_STACK)
    for (const [c] of frontView(L_STACK)) {
      const column = frontView(L_STACK).filter((cell) => cell[0] === c)
      const rows = column.map((cell) => cell[1]).sort((a, b) => a - b)
      // 最底下那格必须贴着地面
      expect(rows.at(-1), `列 ${c} 悬空了`).toBe(gridH - 1)
    }
  })

  it('被挡住的矮块不影响正面轮廓', () => {
    // 同一列里前后各一块，正面看只有一格高
    const stack: BlockStack = { heights: [[1, 1]], cols: 1, rows: 2 }
    expect(frontView(stack)).toHaveLength(1)
  })
})

describe('从侧面看：每行取最高', () => {
  it('行 0 最高 2 层、行 1 最高 1 层', () => {
    expect(has(sideView(L_STACK), [
      [0, 0],
      [0, 1],
      [1, 1],
    ])).toBe(true)
  })

  it('⭐ 正面与侧面在不对称的堆上确实不同', () => {
    // col0 堆了 2 层和 1 层、col1 全空。
    // 正面看只有一根 2 格高的柱子；侧面看是 2 格 + 1 格两根——形状不同
    const stack: BlockStack = {
      heights: [
        [2, 1],
        [0, 0],
      ],
      cols: 2,
      rows: 2,
    }
    expect(frontView(stack), '正面只有一列').toHaveLength(2)
    expect(sideView(stack), '侧面有两列').toHaveLength(3)
    expect(sameShape(frontView(stack), sideView(stack))).toBe(false)
  })

  it('⚠️ 对称的堆两个视图会一样 —— 出题时必须把这种挑掉', () => {
    // 这堆的列轮廓与行轮廓恰好都是 [2, 1]，问「从正面还是侧面看」就没有答案
    const stack: BlockStack = {
      heights: [
        [2, 0],
        [0, 1],
      ],
      cols: 2,
      rows: 2,
    }
    expect(sameShape(frontView(stack), sideView(stack))).toBe(true)
  })
})

describe('⭐ 立体图的层叠顺序', () => {
  it('远的先画、近的后画 —— 顺序错了近处的会被盖住', () => {
    const pieces = isoPieces(L_STACK, { w: 210, h: 150 })
    expect(pieces).toHaveLength(blockCount(L_STACK))

    // 越靠近观察者（x 越大或 y 越大）越应该排在后面。
    // 等轴测下 depth = col + row 决定前后，同格再按层
    for (let i = 1; i < pieces.length; i++) {
      const prev = pieces[i - 1]!
      const cur = pieces[i]!
      // 同一格的上层紧跟下层：y 更小（更高）但 x 相同
      const sameColumn = prev.x === cur.x
      if (sameColumn) {
        expect(cur.y, '同一格应该下层先画').toBeLessThan(prev.y)
      }
    }
  })

  it('每块都在画布内', () => {
    const canvas = { w: 210, h: 150 }
    for (const p of isoPieces(L_STACK, canvas)) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + (p.size ?? 0)).toBeLessThanOrEqual(canvas.w)
      expect(p.y + (p.size ?? 0)).toBeLessThanOrEqual(canvas.h)
    }
  })

  it('3×3×2 的大堆也摆得下', () => {
    const big: BlockStack = {
      heights: [
        [2, 2, 1],
        [1, 2, 2],
        [2, 1, 2],
      ],
      cols: 3,
      rows: 3,
    }
    const canvas = { w: 210, h: 150 }
    for (const p of isoPieces(big, canvas)) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + (p.size ?? 0)).toBeLessThanOrEqual(canvas.w)
      expect(p.y + (p.size ?? 0)).toBeLessThanOrEqual(canvas.h)
    }
  })
})
