/**
 * @file 表内乘法生成器测试
 * @layer domain
 *
 * 这个生成器的全部价值在干扰项上。`mul_as_add`（3×4 答 7）说明「几个几」
 * 的概念压根没建立，补救是回去摆小棒；而 `table_confusion` 说明概念是对的、
 * 只是口诀背串了，补救是单练那一句。两者混作一谈会把补救指向错误的方向，
 * 因此逐档断言取值，不只断言「有 4 个选项」。
 */

import { describe, expect, it } from 'vitest'
import { mulTable } from '@/domain/generators/mulTable'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-4.4', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从题干 `3 × 4 = ?` 解析出两个因数 */
function parseProduct(text: string): { a: number; b: number } {
  const m = /^(\d+) × (\d+) = \?$/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return { a: Number(m[1]), b: Number(m[2]) }
}

function tagged(item: GeneratedItem, tag: string): number | undefined {
  const opt = item.options.find((o) => o.misconceptionTag === tag)
  return opt === undefined ? undefined : Number(opt.text)
}

describe('求积（product）', () => {
  it('算式恒由指定口诀产生，答案正确', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [5] }, seed))
      const { a, b } = parseProduct(item.stem.text)
      expect(a === 5 || b === 5, `${a} × ${b} 不属于 5 的口诀`).toBe(true)
      expect(Number(item.answer)).toBe(a * b)
    }
  })

  it('⭐ mul_as_add 恒等于两个因数之和 —— 红线要求它必须占一个选项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [3, 4] }, seed))
      const { a, b } = parseProduct(item.stem.text)
      // 只有当 a+b 恰好等于正确答案时才会被剔除（2×2 这类），此外必须在
      if (a + b !== a * b) {
        expect(tagged(item, 'mul_as_add'), `${a} × ${b} 缺少 mul_as_add`).toBe(a + b)
      }
    }
  })

  it('mul_extra_group 是「多一组或少一组」，不是随便加减', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [6] }, seed))
      const { a, b } = parseProduct(item.stem.text)
      const groups = item.options
        .filter((o) => o.misconceptionTag === 'mul_extra_group')
        .map((o) => Number(o.text))
      for (const v of groups) {
        expect([a * (b + 1), a * (b - 1)], `${v} 不是 ${a} × ${b} 的相邻一组`).toContain(v)
      }
    }
  })

  it('两个因数的位置会对调 —— 只出「5 × 几」会让她背下位置而不是意义', () => {
    const positions = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const { a } = parseProduct(mulTable(ctx({ factors: [5] }, seed)).stem.text)
      positions.add(a === 5 ? 'fixedFirst' : 'fixedSecond')
    }
    expect(positions.size, '固定因数应出现在两个位置上').toBe(2)
  })

  it('每个错误选项都带标签，且没有负数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [2, 3, 4, 5, 6, 7, 8, 9] }, seed))
      expect(item.options).toHaveLength(4)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
        expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('同一个种子产出稳定 —— 测试才固定得住', () => {
    const a = mulTable(ctx({ factors: [7] }, 42))
    const b = mulTable(ctx({ factors: [7] }, 42))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})

describe('求因数（missingFactor）', () => {
  it('题干是「a × ? = 积」，答案是另一个因数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [8], mode: 'missingFactor' }, seed))
      const m = /^(\d+) × \? = (\d+)$/.exec(item.stem.text)
      expect(m, `题干格式不对: ${item.stem.text}`).not.toBeNull()
      const a = Number(m![1])
      const total = Number(m![2])
      expect(a * Number(item.answer)).toBe(total)
    }
  })

  it('⭐ mul_as_add 在这里是「用加法凑总数」 —— 3 × ? = 12 答 9', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulTable(ctx({ factors: [3], mode: 'missingFactor' }, seed))
      const m = /^(\d+) × \? = (\d+)$/.exec(item.stem.text)!
      const a = Number(m[1])
      const total = Number(m[2])
      const byAddition = total - a
      if (byAddition !== Number(item.answer) && byAddition >= 0) {
        expect(tagged(item, 'mul_as_add')).toBe(byAddition)
      }
    }
  })
})

describe('语音', () => {
  it('题干片段拼得出来，且没有孤立的裸符号', () => {
    const item = mulTable(ctx({ factors: [5] }, 7))
    expect(item.stem.ttsParts).toContain('op.times')
    expect(item.stem.ttsParts).toContain('phrase.equalsWhat')
    expect(item.stem.ttsText).toMatch(/^\d+ 乘 \d+ 等于几$/)
  })

  it('求因数题用整句短语，不拆成孤立的「几」', () => {
    const item = mulTable(ctx({ factors: [5], mode: 'missingFactor' }, 7))
    expect(item.stem.ttsParts).toContain('phrase.timesWhatEquals')
  })
})
