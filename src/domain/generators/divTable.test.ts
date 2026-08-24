/**
 * @file 表内除法生成器测试
 * @layer domain
 *
 * 除法必须**整除**——出一道 `13 ÷ 4` 给还没学余数的孩子，
 * 她会以为自己算错了。因此第一条断言就是「被除数恒能整除」。
 *
 * 干扰项方面 `div_as_sub`（12÷3 答 9）是求商题的头号误区：
 * 她知道结果变少了，但不知道是平均分。
 */

import { describe, expect, it } from 'vitest'
import { divTable } from '@/domain/generators/divTable'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-9.3', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从题干 `12 ÷ 3 = ?` 解析出被除数与除数 */
function parseDiv(text: string): { dividend: number; divisor: number } {
  const m = /^(\d+) ÷ (\d+) = \?$/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return { dividend: Number(m[1]), divisor: Number(m[2]) }
}

function tagged(item: GeneratedItem, tag: string): number | undefined {
  const opt = item.options.find((o) => o.misconceptionTag === tag)
  return opt === undefined ? undefined : Number(opt.text)
}

describe('求商（quotient）', () => {
  it('⭐ 恒为整除 —— 出一道除不尽的题，孩子会以为自己算错了', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [2, 3, 4, 5, 6] }, seed))
      const { dividend, divisor } = parseDiv(item.stem.text)
      expect(dividend % divisor, `${dividend} ÷ ${divisor} 除不尽`).toBe(0)
      expect(Number(item.answer)).toBe(dividend / divisor)
    }
  })

  it('除数取自指定口诀，商不超出表内范围', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [7, 8, 9] }, seed))
      const { divisor } = parseDiv(item.stem.text)
      expect([7, 8, 9]).toContain(divisor)
      expect(Number(item.answer)).toBeGreaterThanOrEqual(1)
      expect(Number(item.answer)).toBeLessThanOrEqual(9)
    }
  })

  it('⭐ div_as_sub 恒等于「被除数减除数」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [4] }, seed))
      const { dividend, divisor } = parseDiv(item.stem.text)
      const bySub = dividend - divisor
      if (bySub !== Number(item.answer)) {
        expect(tagged(item, 'div_as_sub'), `${dividend} ÷ ${divisor} 缺少 div_as_sub`).toBe(bySub)
      }
    }
  })

  it('div_as_mul 恒等于「被除数乘除数」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [3] }, seed))
      const { dividend, divisor } = parseDiv(item.stem.text)
      expect(tagged(item, 'div_as_mul')).toBe(dividend * divisor)
    }
  })

  it('每个错误选项都带标签，且没有负数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [2, 3, 4, 5, 6, 7, 8, 9] }, seed))
      expect(item.options).toHaveLength(4)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
        expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = divTable(ctx({ divisors: [6] }, 99))
    const b = divTable(ctx({ divisors: [6] }, 99))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})

describe('求除数（divisor）', () => {
  it('题干是「被除数 ÷ ? = 商」，答案乘商等于被除数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = divTable(ctx({ divisors: [5], mode: 'divisor' }, seed))
      const m = /^(\d+) ÷ \? = (\d+)$/.exec(item.stem.text)
      expect(m, `题干格式不对: ${item.stem.text}`).not.toBeNull()
      const dividend = Number(m![1])
      const quotient = Number(m![2])
      expect(Number(item.answer) * quotient).toBe(dividend)
    }
  })
})

describe('语音', () => {
  it('求商题用「除以」+ 复用的「等于几」', () => {
    const item = divTable(ctx({ divisors: [3] }, 5))
    expect(item.stem.ttsParts).toContain('op.dividedBy')
    expect(item.stem.ttsParts).toContain('phrase.equalsWhat')
    expect(item.stem.ttsText).toMatch(/^\d+ 除以 \d+ 等于几$/)
  })

  it('求除数题用整句短语', () => {
    const item = divTable(ctx({ divisors: [3], mode: 'divisor' }, 5))
    expect(item.stem.ttsParts).toContain('phrase.dividedByWhatEquals')
  })
})
