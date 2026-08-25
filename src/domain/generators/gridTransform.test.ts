/**
 * @file 平移与旋转生成器测试
 * @layer domain
 *
 * ⭐ 旋转题的图案必须不对称：拿对称图案出，转过来和原来一模一样，
 * 那道题没有答案——而选项里会同时出现两个「看起来对」的图。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { gridTransform } from '@/domain/generators/gridTransform'
import { createRng } from '@/domain/generators/rng'
import { decodeCells, rotate90, sameShape, type Cell } from '@/domain/gridShape'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-10.3', difficulty, params, rng: createRng(seed), exclude: [] }
}

function cellsOf(key: string): Cell[] {
  const cells = decodeCells(key.replace(/^grid:\d+:/, ''))
  if (cells === undefined) throw new Error(`解不出图案: ${key}`)
  return cells
}

/** 从 gridpair key 取出移动前后 */
function pairOf(item: GeneratedItem): { size: number; before: Cell[]; after: Cell[] } {
  const v = item.visual
  if (v === undefined || v.kind !== 'figure') throw new Error('没有配图')
  const [, size, before, after] = v.imageKey.split(':')
  return {
    size: Number(size),
    before: decodeCells(before ?? '')!,
    after: decodeCells(after ?? '')!,
  }
}

describe('平移（translate）', () => {
  it('⭐ 只走横向或纵向，不斜着走', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({}, seed))
      const { before, after } = pairOf(item)
      const dx = after[0]![0] - before[0]![0]
      const dy = after[0]![1] - before[0]![1]
      expect(dx === 0 || dy === 0, `seed ${seed}: 斜着移了 (${dx}, ${dy})`).toBe(true)
    }
  })

  it('答案等于实际移动的格数，且与题干说的方向一致', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({}, seed))
      const { before, after } = pairOf(item)
      const dx = after[0]![0] - before[0]![0]
      const dy = after[0]![1] - before[0]![1]
      const horizontal = item.stem.text.includes('右')
      expect(Number(item.answer), `seed ${seed}`).toBe(horizontal ? dx : dy)
      // 说向右就不能是纵向移动
      expect(horizontal ? dy : dx, '方向说错了').toBe(0)
    }
  })

  it('移动量恒为正 —— 「向右移了 0 格」不成题', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(Number(gridTransform(ctx({}, seed)).answer)).toBeGreaterThan(0)
    }
  })

  it('⭐ 移动后仍在网格里', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { size, after } = pairOf(gridTransform(ctx({}, seed)))
      for (const [c, r] of after) {
        expect(c, `seed ${seed}: 移出网格了`).toBeLessThan(size)
        expect(r).toBeLessThan(size)
        expect(c).toBeGreaterThanOrEqual(0)
        expect(r).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('图案本身没变形，只是挪了位置', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { before, after } = pairOf(gridTransform(ctx({}, seed)))
      expect(sameShape(before, after), '平移不该改变形状').toBe(true)
    }
  })

  it('两个方向都会出现', () => {
    const dirs = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      dirs.add(gridTransform(ctx({}, seed)).stem.text.includes('右') ? 'x' : 'y')
    }
    expect(dirs.size, '向右和向下都该出现').toBe(2)
  })
})

describe('旋转（rotate）', () => {
  it('⭐ 正确答案是题干图案转 90° 的结果', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({ mode: 'rotate' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'figure') throw new Error('没有配图')
      const source = cellsOf(v.imageKey)
      const correct = cellsOf(item.answer)
      expect(sameShape(correct, rotate90(source)), `seed ${seed}`).toBe(true)
    }
  })

  it('⭐ 干扰项与正确答案确实不同形 —— 否则两个选项都对', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({ mode: 'rotate' }, seed))
      const correct = cellsOf(item.answer)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(
          sameShape(cellsOf(opt.imageKey ?? ''), correct),
          `seed ${seed}: ${opt.imageKey} 与答案同形`,
        ).toBe(false)
      }
    }
  })

  it('题干图案不对称 —— 对称图案转过来和原样一致，那道题没有答案', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({ mode: 'rotate' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'figure') continue
      const source = cellsOf(v.imageKey)
      expect(sameShape(rotate90(source), source), `seed ${seed}: 转了等于没转`).toBe(false)
    }
  })

  it('恰好 4 个选项、一个正确项，错误项都带标签', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridTransform(ctx({ mode: 'rotate' }, seed))
      expect(item.options, `seed ${seed}`).toHaveLength(4)
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBeDefined()
      }
    }
  })
})

describe('通用约束', () => {
  it('每张图都画得出来', () => {
    for (const mode of ['translate', 'rotate'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = gridTransform(ctx({ mode }, seed))
        const keys = [
          ...item.options.map((o) => o.imageKey).filter((k): k is string => k !== undefined),
          ...(item.visual !== undefined && item.visual.kind === 'figure'
            ? [item.visual.imageKey]
            : []),
        ]
        for (const k of keys) {
          expect(isRenderableShapeKey(k), `${k} 渲染不了`).toBe(true)
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = gridTransform(ctx({ mode: 'rotate' }, 23))
    const b = gridTransform(ctx({ mode: 'rotate' }, 23))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.imageKey)).toEqual(b.options.map((o) => o.imageKey))
  })
})
