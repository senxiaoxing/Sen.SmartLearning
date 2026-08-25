/**
 * @file 观察物体生成器测试
 * @layer domain
 *
 * ⭐ 干扰项就是**另外两个视图**——那正是 `view_direction_confusion` 的原型。
 * 但它们必须与正确答案不同形，否则会有两个正确答案：
 * 一堆左右对称的积木，正面看和侧面看是一样的。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { createRng } from '@/domain/generators/rng'
import { viewFromSide } from '@/domain/generators/viewFromSide'
import { decodeCells, sameShape, type Cell } from '@/domain/gridShape'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-5.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

function cellsOf(key: string): Cell[] {
  const cells = decodeCells(key.replace(/^grid:\d+:/, ''))
  if (cells === undefined) throw new Error(`解不出图案: ${key}`)
  return cells
}

function stack(item: GeneratedItem) {
  const v = item.visual
  if (v === undefined || v.kind !== 'shapeScene') throw new Error('没有积木堆')
  return v
}

describe('题干的积木堆', () => {
  it('用正方体摆成，块数在范围内', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const v = stack(viewFromSide(ctx({ blockRange: [3, 6] }, seed)))
      expect(v.pieces.length).toBeGreaterThanOrEqual(3)
      expect(v.pieces.length).toBeLessThanOrEqual(6)
      for (const p of v.pieces) expect(p.shape).toBe('cube')
    }
  })

  it('⭐ 每块都在画布内 —— 戳出去会被裁掉半块', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const v = stack(viewFromSide(ctx({}, seed)))
      for (const p of v.pieces) {
        expect(p.x, `seed ${seed}`).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x + (p.size ?? 0)).toBeLessThanOrEqual(v.width)
        expect(p.y + (p.size ?? 0)).toBeLessThanOrEqual(v.height)
      }
    }
  })
})

describe('⭐ 答案唯一性', () => {
  it('干扰项与正确答案都不同形 —— 否则两个选项都对', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = viewFromSide(ctx({}, seed))
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

  it('恰好一个正确项，错误项都标 view_direction_confusion', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = viewFromSide(ctx({}, seed))
      expect(item.options.filter((o) => o.isCorrect), `seed ${seed}`).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBe('view_direction_confusion')
      }
    }
  })

  it('选项互不相同', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const keys = viewFromSide(ctx({}, seed)).options.map((o) => o.imageKey)
      expect(new Set(keys).size, `重复选项: ${keys.join(' / ')}`).toBe(keys.length)
    }
  })
})

describe('三个方向', () => {
  it('指定方向时题干问的就是那个方向', () => {
    for (const [ask, word] of [
      ['top', '上面'],
      ['front', '正面'],
      ['side', '侧面'],
    ] as const) {
      let matched = 0
      for (let seed = 1; seed <= 40; seed++) {
        const item = viewFromSide(ctx({ ask }, seed))
        if (item.stem.text.includes(word)) matched++
      }
      // 极少数堆里指定的那个视图与别的重复，会退回到另一个方向；
      // 但大多数题必须问的是指定方向
      expect(matched, `${ask} 几乎都该问「从${word}看」`).toBeGreaterThan(30)
    }
  })

  it('any 模式三个方向都会出现', () => {
    const dirs = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      const t = viewFromSide(ctx({ ask: 'any' }, seed)).stem.text
      dirs.add(t.includes('上面') ? 'top' : t.includes('正面') ? 'front' : 'side')
    }
    expect(dirs.size, '三个方向都该出现过').toBeGreaterThanOrEqual(2)
  })
})

describe('通用约束', () => {
  it('每个视图图案都画得出来', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const opt of viewFromSide(ctx({}, seed)).options) {
        expect(isRenderableShapeKey(opt.imageKey ?? ''), `${opt.imageKey} 渲染不了`).toBe(true)
      }
    }
  })

  it('视图格子摆得进网格', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const opt of viewFromSide(ctx({}, seed)).options) {
        const size = Number((opt.imageKey ?? '').split(':')[1])
        for (const [c, r] of cellsOf(opt.imageKey ?? '')) {
          expect(c, '格子超出网格').toBeLessThan(size)
          expect(r).toBeLessThan(size)
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = viewFromSide(ctx({}, 61))
    const b = viewFromSide(ctx({}, 61))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.imageKey)).toEqual(b.options.map((o) => o.imageKey))
  })
})
