/**
 * @file 轴对称生成器测试
 * @layer domain
 *
 * ⭐ 两条：正确答案必须真的对称，干扰项必须真的不对称。
 * 干扰项里混进一个对称图案，那道题就有两个正确答案——
 * 孩子选了会被判错，而她其实答对了。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { gridSymmetry } from '@/domain/generators/gridSymmetry'
import { createRng } from '@/domain/generators/rng'
import { decodeCells, isSymmetricX, isSymmetricY } from '@/domain/gridShape'
import type { Difficulty, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-10.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从 imageKey `grid:5:00.10.11` 取出格子 */
function cellsOf(key: string) {
  const cells = decodeCells(key.replace(/^grid:\d+:/, ''))
  if (cells === undefined) throw new Error(`解不出图案: ${key}`)
  return cells
}

describe('哪个是轴对称的（symmetry）', () => {
  it('⭐ 正确答案真的左右对称', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridSymmetry(ctx({}, seed))
      const correct = item.options.find((o) => o.isCorrect)!
      expect(isSymmetricX(cellsOf(correct.imageKey ?? '')), `seed ${seed}`).toBe(true)
    }
  })

  it('⭐ 干扰项一个都不对称 —— 否则有两个正确答案', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridSymmetry(ctx({}, seed))
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(
          isSymmetricX(cellsOf(opt.imageKey ?? '')),
          `seed ${seed}: ${opt.imageKey} 也是对称的`,
        ).toBe(false)
      }
    }
  })

  it('恰好 4 个选项、一个正确项，错误项都带标签', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridSymmetry(ctx({}, seed))
      expect(item.options, `seed ${seed} 选项数不对`).toHaveLength(4)
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBe('symmetry_axis_wrong')
      }
    }
  })

  it('选项互不相同', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const keys = gridSymmetry(ctx({}, seed)).options.map((o) => o.imageKey)
      expect(new Set(keys).size, `重复图案: ${keys.join(' / ')}`).toBe(keys.length)
    }
  })
})

describe('沿哪条线对称（axis）', () => {
  it('⭐ 图案只在一个方向对称 —— 两个方向都对称的话两个选项都是对的', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridSymmetry(ctx({ mode: 'axis' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'figure') throw new Error('没有配图')
      const cells = cellsOf(v.imageKey)
      const x = isSymmetricX(cells)
      const y = isSymmetricY(cells)
      expect(x || y, `seed ${seed}: 图案根本不对称`).toBe(true)
      expect(x && y, `seed ${seed}: 两个方向都对称，答案不唯一`).toBe(false)
    }
  })

  it('答案与图案实际的对称方向一致', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = gridSymmetry(ctx({ mode: 'axis' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'figure') continue
      const cells = cellsOf(v.imageKey)
      expect(item.answer).toBe(isSymmetricX(cells) ? '竖着的线' : '横着的线')
    }
  })

  it('两种答案都会出现', () => {
    const answers = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      answers.add(gridSymmetry(ctx({ mode: 'axis' }, seed)).answer)
    }
    expect(answers.has('竖着的线') && answers.has('横着的线'), '两个方向都该出现').toBe(true)
  })
})

describe('通用约束', () => {
  it('每个图案都画得出来', () => {
    for (const mode of ['symmetry', 'axis'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = gridSymmetry(ctx({ mode }, seed))
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

  it('图案摆得进网格', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const opt of gridSymmetry(ctx({}, seed)).options) {
        const size = Number((opt.imageKey ?? '').split(':')[1])
        for (const [c, r] of cellsOf(opt.imageKey ?? '')) {
          expect(c, '格子超出网格').toBeLessThan(size)
          expect(r).toBeLessThan(size)
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = gridSymmetry(ctx({}, 41))
    const b = gridSymmetry(ctx({}, 41))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.imageKey)).toEqual(b.options.map((o) => o.imageKey))
  })
})
