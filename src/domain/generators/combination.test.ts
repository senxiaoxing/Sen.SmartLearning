/**
 * @file 搭配与排列生成器测试
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { combination } from '@/domain/generators/combination'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-7.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

function tagged(item: GeneratedItem, tag: string): number[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => Number(o.text))
}

describe('搭配（outfit）', () => {
  it('答案是两边相乘', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({}, seed))
      const m = /^(\d+) 件上衣和 (\d+) 条裤子/.exec(item.stem.text)!
      expect(Number(item.answer)).toBe(Number(m[1]) * Number(m[2]))
    }
  })

  it('⭐ mul_as_add 恒是两边相加 —— 「一共」听成了「一共几件衣服」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({}, seed))
      const m = /^(\d+) 件上衣和 (\d+) 条裤子/.exec(item.stem.text)!
      const sum = Number(m[1]) + Number(m[2])
      if (sum !== Number(item.answer)) {
        expect(tagged(item, 'mul_as_add'), item.stem.text).toContain(sum)
      }
    }
  })

  it('combination_missed 恒比正确答案小 —— 漏配才会少', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({}, seed))
      for (const v of tagged(item, 'combination_missed')) {
        expect(v, `${item.stem.text} 的「漏配」选项反而更大`).toBeLessThan(Number(item.answer))
      }
    }
  })
})

describe('排列（digits）', () => {
  it('⭐ 数字里没有 0 —— 0 不能站十位，答案就不是 n×(n-1) 了', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({ mode: 'digits' }, seed))
      const digits = /用 (.+)，能组成/.exec(item.stem.text)![1]!.split('、').map(Number)
      expect(digits).not.toContain(0)
      expect(new Set(digits).size, '数字不能重复').toBe(digits.length)
    }
  })

  it('答案是 n × (n-1)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({ mode: 'digits' }, seed))
      const digits = /用 (.+)，能组成/.exec(item.stem.text)![1]!.split('、')
      expect(Number(item.answer)).toBe(digits.length * (digits.length - 1))
    }
  })

  it('⭐ 「每个数字只当一次十位」恒是干扰项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = combination(ctx({ mode: 'digits' }, seed))
      const count = /用 (.+)，能组成/.exec(item.stem.text)![1]!.split('、').length
      expect(tagged(item, 'combination_missed')).toContain(count)
    }
  })
})

describe('通用约束', () => {
  it('恰好 4 个选项，错误项都带标签且非负', () => {
    for (const mode of ['outfit', 'digits'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = combination(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
          expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = combination(ctx({}, 12))
    const b = combination(ctx({}, 12))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
