/**
 * @file 尺子几何测试
 * @layer domain
 *
 * ⭐ 最要紧的一条：**物体两端必须精确落在刻度上**。
 * 差几个像素在 iPad 上看不出来，但孩子拿着尺子对不齐时会以为是自己数错了。
 */

import { describe, expect, it } from 'vitest'
import {
  CM_UNIT,
  MAX_TICKS,
  RULER_CANVAS_HEIGHT,
  RULER_LEFT,
  rulerGeometry,
  segmentWidth,
  tickX,
} from '@/domain/rulerGeometry'

describe('刻度', () => {
  it('刻度数量 = 厘米数 + 1（含 0）', () => {
    for (const maxTick of [5, 10, MAX_TICKS]) {
      expect(rulerGeometry(maxTick, 0, 3).ticks).toHaveLength(maxTick + 1)
    }
  })

  it('刻度间距相等，且第一格从 RULER_LEFT 开始', () => {
    const g = rulerGeometry(10, 0, 3)
    expect(g.ticks[0]!.x).toBe(RULER_LEFT)
    for (let i = 1; i < g.ticks.length; i++) {
      expect(g.ticks[i]!.x - g.ticks[i - 1]!.x).toBeCloseTo(CM_UNIT, 6)
    }
  })

  it('刻度标的数字就是厘米数', () => {
    const g = rulerGeometry(8, 0, 3)
    expect(g.ticks.map((t) => t.label)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('⭐ 物体与刻度对齐', () => {
  it('两端精确落在起点与终点的刻度上', () => {
    for (let maxTick = 5; maxTick <= MAX_TICKS; maxTick++) {
      for (let start = 0; start < maxTick; start++) {
        for (let end = start + 1; end <= maxTick; end++) {
          const g = rulerGeometry(maxTick, start, end)
          expect(g.item.x1, `${start}~${end} 左端没对齐`).toBeCloseTo(tickX(start), 6)
          expect(g.item.x2, `${start}~${end} 右端没对齐`).toBeCloseTo(tickX(end), 6)
        }
      }
    }
  })

  it('物体长度等于终点减起点', () => {
    for (const [start, end] of [
      [0, 5],
      [1, 6],
      [3, 4],
      [2, 12],
    ]) {
      const g = rulerGeometry(MAX_TICKS, start!, end!)
      expect(g.lengthCm).toBe(end! - start!)
      expect(g.item.x2 - g.item.x1).toBeCloseTo((end! - start!) * CM_UNIT, 6)
    }
  })

  it('物体画在尺子上方，不与尺子重叠', () => {
    const g = rulerGeometry(10, 1, 6)
    expect(g.item.y, '物体该在尺子上边缘之上').toBeLessThan(g.ruler.y)
    expect(g.item.y, '不能跑出画布顶部').toBeGreaterThan(0)
  })
})

describe('画布', () => {
  it('宽度随厘米数变，两端留白对称', () => {
    for (const maxTick of [5, 10, MAX_TICKS]) {
      const g = rulerGeometry(maxTick, 0, 2)
      expect(g.width).toBe(RULER_LEFT * 2 + maxTick * CM_UNIT)
      // 最后一个刻度到右边缘的留白，与左边一样
      expect(g.width - g.ticks[maxTick]!.x).toBeCloseTo(RULER_LEFT, 6)
    }
  })

  it('高度固定，尺子在画布内', () => {
    const g = rulerGeometry(10, 0, 4)
    expect(g.height).toBe(RULER_CANVAS_HEIGHT)
    expect(g.ruler.y + g.ruler.height).toBeLessThanOrEqual(g.height)
  })
})

describe('⭐ 坏参数立刻抛错', () => {
  it('倒置、越界、零长度都不放过', () => {
    // 这些会画出一条负长度或跑到尺子外面的线，
    // 而孩子看到的是「一道没有物体的题」
    expect(() => rulerGeometry(10, 5, 3), '终点在起点左边').toThrow()
    expect(() => rulerGeometry(10, 3, 3), '零长度').toThrow()
    expect(() => rulerGeometry(10, -1, 5), '起点为负').toThrow()
    expect(() => rulerGeometry(10, 2, 11), '超出尺子').toThrow()
  })
})

describe('单独的线段', () => {
  it('宽度与厘米数成正比，且与尺子上的一格一致', () => {
    expect(segmentWidth(1)).toBe(CM_UNIT)
    expect(segmentWidth(5)).toBe(5 * CM_UNIT)
    // ⭐ 与尺子同一个比例尺：孩子在两种图之间能对得上
    const g = rulerGeometry(10, 0, 5)
    expect(g.item.x2 - g.item.x1).toBe(segmentWidth(5))
  })
})
