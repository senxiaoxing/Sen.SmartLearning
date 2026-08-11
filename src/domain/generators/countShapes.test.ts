/**
 * @file countShapes 单测 —— 题目变化数是这个生成器存在的理由，必须守住
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { countShapes } from '@/domain/generators/countShapes'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem } from '@/domain/types'

function gen(mode: string, seed: number, kpId = 'M7.1', range = [3, 6]): GeneratedItem {
  return countShapes({
    kpId,
    difficulty: 2,
    params: { mode, countRange: range },
    rng: createRng(seed),
  })
}

function allSeeds(mode: string, kpId = 'M7.1'): GeneratedItem[] {
  return Array.from({ length: 120 }, (_, i) => gen(mode, i + 1, kpId))
}

function piecesOf(item: GeneratedItem) {
  return item.visual?.kind === 'shapeScene' ? item.visual.pieces : []
}

describe('countShapes', () => {
  it('固定种子可复现，摆放位置也一样', () => {
    const a = gen('blocks', 9)
    const b = gen('blocks', 9)
    expect(a.signature).toBe(b.signature)
    expect(piecesOf(a)).toEqual(piecesOf(b))
  })

  describe('⭐ 题量：这是引入这个生成器的全部理由', () => {
    it('数积木至少能出 20 种不同的题', () => {
      // 用模板难度 2 的实际区间，块数 × 摆法两个维度一起数
      const items = Array.from({ length: 200 }, (_, i) => gen('blocks', i + 1, 'M7.1', [4, 8]))
      const variety = new Set(items.map((i) => i.signature))
      expect(variety.size, '变化太少，一轮里就会重复').toBeGreaterThanOrEqual(20)
    })

    it('同样的块数会摆出不同的样子', () => {
      const layouts = new Set(
        Array.from({ length: 200 }, (_, i) => gen('blocks', i + 1, 'M7.1', [5, 5]))
          .map((i) => i.signature),
      )
      expect(layouts.size, '5 块积木只有一种摆法').toBeGreaterThanOrEqual(3)
    })

    it('数图形至少能出 30 种不同的题', () => {
      const variety = new Set(allSeeds('mixed', 'M7.4').map((i) => i.signature))
      expect(variety.size).toBeGreaterThanOrEqual(30)
    })
  })

  describe('blocks：数积木', () => {
    it('画面里的块数等于正确答案', () => {
      for (const item of allSeeds('blocks')) {
        expect(piecesOf(item).length, item.signature).toBe(Number(item.answer))
      }
    })

    it('全是正方体——问「几块积木」时混进球会让题意不清', () => {
      for (const item of allSeeds('blocks')) {
        for (const p of piecesOf(item)) expect(p.shape).toBe('cube')
      }
    })

    it('块数落在参数区间内', () => {
      for (const item of Array.from({ length: 60 }, (_, i) => gen('blocks', i + 1, 'M7.1', [4, 8]))) {
        const n = Number(item.answer)
        expect(n).toBeGreaterThanOrEqual(4)
        expect(n).toBeLessThanOrEqual(8)
      }
    })
  })

  describe('mixed：数某一种图形', () => {
    it('⭐ 图里一定还有别的图形，否则退化成数总数', () => {
      for (const item of allSeeds('mixed', 'M7.4')) {
        const kinds = new Set(piecesOf(item).map((p) => p.shape))
        expect(kinds.size, `${item.signature} 只有一种图形`).toBeGreaterThanOrEqual(2)
      }
    })

    it('答案等于被问那种图形的实际个数', () => {
      for (const item of allSeeds('mixed', 'M7.4')) {
        // 题干形如「有几个三角形？」，从中取出图形名再回查
        const name = item.stem.text.replace(/^有几个/, '').replace(/？$/, '')
        const nameToShape: Record<string, string> = {
          正方形: 'square',
          长方形: 'rect',
          三角形: 'triangle',
          圆: 'circle',
        }
        const shape = nameToShape[name]
        expect(shape, `题干里的图形名认不出：${item.stem.text}`).toBeDefined()

        const actual = piecesOf(item).filter((p) => p.shape === shape).length
        expect(actual, `${item.signature} 答案与画面对不上`).toBe(Number(item.answer))
      }
    })

    it('被问的图形至少有 2 个——只有 1 个时「数一数」没有意义', () => {
      for (const item of allSeeds('mixed', 'M7.4')) {
        expect(Number(item.answer)).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('⭐ 干扰项', () => {
    it('恰好一个正确选项，且每个错误项都带 tag', () => {
      for (const item of [...allSeeds('blocks'), ...allSeeds('mixed', 'M7.4')]) {
        expect(item.options.filter((o) => o.isCorrect), item.signature).toHaveLength(1)
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          // count_skip 是本生成器给的；off_by_one 来自 buildNumericOptions 的兜底
          // （候选去重后不足 4 个时补上，差 1 的失误比笼统的「漏数」更精确）
          expect(
            ['count_skip', 'off_by_one'],
            `${item.signature} 的 tag 是 ${o.misconceptionTag}`,
          ).toContain(o.misconceptionTag)
        }
      }
    })

    it('选项互不重复，且都是正数', () => {
      for (const item of [...allSeeds('blocks'), ...allSeeds('mixed', 'M7.4')]) {
        const values = item.options.map((o) => Number(o.text))
        expect(new Set(values).size, `${item.signature} 有重复选项`).toBe(values.length)
        for (const v of values) expect(v, `${item.signature} 出现非正数`).toBeGreaterThan(0)
      }
    })
  })

  it('画面不越界', () => {
    for (const item of [...allSeeds('blocks'), ...allSeeds('mixed', 'M7.4')]) {
      const visual = item.visual
      if (visual?.kind !== 'shapeScene') continue
      for (const p of visual.pieces) {
        expect(p.x, item.signature).toBeGreaterThanOrEqual(0)
        expect(p.y, item.signature).toBeGreaterThanOrEqual(0)
        expect(p.x + (p.size ?? 24)).toBeLessThanOrEqual(visual.width)
        expect(p.y + (p.size ?? 24)).toBeLessThanOrEqual(visual.height)
      }
    }
  })
})
