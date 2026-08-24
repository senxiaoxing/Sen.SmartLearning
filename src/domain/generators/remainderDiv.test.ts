/**
 * @file 有余数除法生成器测试
 * @layer domain
 *
 * 这个单元最要紧的一条是**余数恒小于除数**——它既是知识点本身
 * （M2-12.2「余数比除数小」），又是干扰项 `remainder_too_big` 的构造依据。
 * 生成器自己产出一道余数超标的题，那就成了拿错误示范当考题。
 */

import { describe, expect, it } from 'vitest'
import { remainderDiv } from '@/domain/generators/remainderDiv'
import { createRng } from '@/domain/generators/rng'
import { answerParts } from '@/domain/speech'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 3,
): GeneratorContext {
  return { kpId: 'M2-12.3', difficulty, params, rng: createRng(seed), exclude: [] }
}

function parseDiv(text: string): { dividend: number; divisor: number } {
  const m = /^(\d+) ÷ (\d+) = \?$/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return { dividend: Number(m[1]), divisor: Number(m[2]) }
}

function parseAnswer(text: string): { quotient: number; remainder: number } {
  const m = /^(\d+) 余 (\d+)$/.exec(text)
  if (m === null) throw new Error(`无法解析答案: ${text}`)
  return { quotient: Number(m[1]), remainder: Number(m[2]) }
}

function tagged(item: GeneratedItem, tag: string): string | undefined {
  return item.options.find((o) => o.misconceptionTag === tag)?.text
}

describe('题目本身', () => {
  it('⭐ 余数恒在 1 到「除数减 1」之间 —— 余数为 0 就成了表内除法', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = remainderDiv(ctx({}, seed))
      const { dividend, divisor } = parseDiv(item.stem.text)
      const { quotient, remainder } = parseAnswer(item.answer)

      expect(remainder, `${dividend} ÷ ${divisor} 的余数为 0`).toBeGreaterThanOrEqual(1)
      expect(remainder, `${dividend} ÷ ${divisor} 的余数不小于除数`).toBeLessThan(divisor)
      expect(divisor * quotient + remainder, '答案与题面对不上').toBe(dividend)
    }
  })

  it('参数能收窄除数与商的范围', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = remainderDiv(ctx({ divisorRange: [4, 4], quotientRange: [3, 5] }, seed))
      const { divisor } = parseDiv(item.stem.text)
      const { quotient } = parseAnswer(item.answer)
      expect(divisor).toBe(4)
      expect(quotient).toBeGreaterThanOrEqual(3)
      expect(quotient).toBeLessThanOrEqual(5)
    }
  })
})

describe('干扰项按误区构造', () => {
  it('⭐ remainder_ignored 只有商，没有余数那一段', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = remainderDiv(ctx({}, seed))
      const { quotient } = parseAnswer(item.answer)
      expect(tagged(item, 'remainder_ignored')).toBe(String(quotient))
    }
  })

  it('quotient_remainder_swap 恰好是商与余数对调', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = remainderDiv(ctx({}, seed))
      const { quotient, remainder } = parseAnswer(item.answer)
      // 商与余数相等时对调后就是正确答案本身，那一题换成了「多分一轮」
      if (quotient === remainder) continue
      expect(tagged(item, 'quotient_remainder_swap')).toBe(`${remainder} 余 ${quotient}`)
    }
  })

  it('⭐ 商与余数相等时补上另一个干扰项，选项不会少一个', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1)
    const equalCases = seeds
      .map((seed) => remainderDiv(ctx({}, seed)))
      .filter((item) => {
        const { quotient, remainder } = parseAnswer(item.answer)
        return quotient === remainder
      })

    expect(equalCases.length, '没扫到商等于余数的样本，这条测试就是空跑').toBeGreaterThan(0)
    for (const item of equalCases) {
      expect(item.options).toHaveLength(4)
      expect(tagged(item, 'off_by_one')).toBeDefined()
    }
  })

  it('⭐ remainder_too_big 的余数确实不小于除数 —— 它就是那个错误本身', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = remainderDiv(ctx({}, seed))
      const { divisor } = parseDiv(item.stem.text)
      const text = tagged(item, 'remainder_too_big')
      expect(text, '缺少 remainder_too_big 干扰项').toBeDefined()
      expect(parseAnswer(text!).remainder).toBeGreaterThanOrEqual(divisor)
    }
  })

  it('每个错误选项都带标签，恰好 4 个选项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = remainderDiv(ctx({}, seed))
      expect(item.options).toHaveLength(4)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
      }
    }
  })
})

describe('语音', () => {
  it('题干用「等于几余几」', () => {
    const item = remainderDiv(ctx({}, 11))
    expect(item.stem.ttsParts).toContain('op.dividedBy')
    expect(item.stem.ttsParts).toContain('phrase.equalsWhatRemainder')
  })

  it('⭐ 答案念得出来，不整句降级 —— 这个单元每道题的答案都长这样', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = remainderDiv(ctx({}, seed))
      const parts = answerParts(item.answer)
      expect(parts, `「${item.answer}」拼不出片段`).toBeDefined()
      expect(parts).toContain('op.remainder')
    }
  })
})

describe('稳定性', () => {
  it('同一个种子产出稳定', () => {
    const a = remainderDiv(ctx({}, 77))
    const b = remainderDiv(ctx({}, 77))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
