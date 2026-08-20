/**
 * @file 10 加几和相应的减法生成器测试
 * @layer domain
 *
 * M1.11 的价值全在 `place_value_swap` 这个标签上：
 * 孩子把 `10 + 3` 算成 4，说明「1 个十」还没建立起来，
 * 补救要回 M1.9 / M1.10 摆小棒，而不是继续练加法。
 * 标签绑错了，补救就会指向错误的方向，因此逐档断言取值。
 */

import { describe, expect, it } from 'vitest'
import { createRng } from '@/domain/generators/rng'
import { teenArithmetic } from '@/domain/generators/teenArithmetic'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M1.11', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从题干 `12 + 3 = ?` 解析出算式三要素 */
function parseEq(text: string): { a: number; op: string; b: number } {
  const m = /^(\d+) ([+-]) (\d+) = \?$/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return { a: Number(m[1]), op: String(m[2]), b: Number(m[3]) }
}

/** 取某个误区标签对应的干扰项数值；该标签未出现时返回 undefined */
function tagged(item: GeneratedItem, tag: string): number | undefined {
  const opt = item.options.find((o) => o.misconceptionTag === tag)
  return opt === undefined ? undefined : Number(opt.text)
}

const MODES = ['tenPlus', 'tenMinus', 'noRegroup'] as const

describe('10 加几（tenPlus，难度 1）', () => {
  it('算式恒为 10 + 几，答案是十几', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = teenArithmetic(ctx({ mode: 'tenPlus' }, seed, 1))
      const { a, op, b } = parseEq(item.stem.text)
      expect(a, '被加数必须是 10').toBe(10)
      expect(op).toBe('+')
      expect(b).toBeGreaterThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(9)
      expect(Number(item.answer)).toBe(10 + b)
    }
  })

  it('⭐ place_value_swap = 1 + 几（把 10 的「1」当成 1 个一）', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = teenArithmetic(ctx({ mode: 'tenPlus' }, seed, 1))
      const { b } = parseEq(item.stem.text)
      expect(tagged(item, 'place_value_swap')).toBe(1 + b)
      expect(tagged(item, 'op_confusion')).toBe(10 - b)
    }
  })
})

describe('相应的减法（tenMinus，难度 2）', () => {
  it('两种考法都会出现，不会只剩一种', () => {
    let minusOnes = 0
    let minusTen = 0
    for (let seed = 1; seed <= 60; seed++) {
      const { b } = parseEq(teenArithmetic(ctx({ mode: 'tenMinus' }, seed)).stem.text)
      if (b === 10) minusTen++
      else minusOnes++
    }
    expect(minusOnes, '缺少「减个位」的考法').toBeGreaterThan(0)
    expect(minusTen, '缺少「减整十」的考法').toBeGreaterThan(0)
  })

  it('减个位得整十，减整十得个位', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = teenArithmetic(ctx({ mode: 'tenMinus' }, seed))
      const { a, op, b } = parseEq(item.stem.text)
      expect(op).toBe('-')
      expect(a).toBeGreaterThanOrEqual(11)
      expect(a).toBeLessThanOrEqual(19)
      expect(Number(item.answer)).toBe(b === 10 ? a - 10 : 10)
    }
  })

  it('干扰项绑定正确的认知误区', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = teenArithmetic(ctx({ mode: 'tenMinus' }, seed))
      const { a, b } = parseEq(item.stem.text)
      if (b === 10) {
        // 13 - 10 把 10 当成 1 来减 → 12
        expect(tagged(item, 'place_value_swap')).toBe(a - 1)
        expect(tagged(item, 'whole_part_confusion'), '没做运算，直接报出被减数').toBe(a)
      } else {
        // 13 - 3 忽略十位，算成 3 - 3 → 0
        expect(tagged(item, 'place_value_swap')).toBe(0)
        expect(tagged(item, 'whole_part_confusion'), '把减数当答案报出来').toBe(b)
      }
    }
  })
})

describe('十几加减几（noRegroup，难度 3）', () => {
  it('加法不进位、减法不退位，十位自始至终不变', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = teenArithmetic(ctx({ mode: 'noRegroup' }, seed, 3))
      const { a, op, b } = parseEq(item.stem.text)
      const ones = a - 10
      expect(a).toBeGreaterThanOrEqual(11)
      expect(a).toBeLessThanOrEqual(18)

      if (op === '+') {
        expect(ones + b, '个位相加不能满 10，否则就成了进位加法').toBeLessThanOrEqual(9)
        expect(Number(item.answer)).toBe(a + b)
      } else {
        expect(b, '减数不能大于个位，否则就成了退位减法').toBeLessThanOrEqual(ones)
        expect(Number(item.answer)).toBe(a - b)
      }
      // 无论加减，结果都还在十几（或恰好 10），十位没被动过
      expect(Number(item.answer)).toBeGreaterThanOrEqual(10)
      expect(Number(item.answer)).toBeLessThanOrEqual(19)
    }
  })

  it('place_value_swap 反映「把两位数拆开算」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = teenArithmetic(ctx({ mode: 'noRegroup' }, seed, 3))
      const { a, op, b } = parseEq(item.stem.text)
      const ones = a - 10
      // 加法：12 + 3 算成 1 + 2 + 3；减法：15 - 2 只算 5 - 2
      expect(tagged(item, 'place_value_swap')).toBe(op === '+' ? 1 + ones + b : ones - b)
    }
  })
})

describe('三种模式共同的硬约束', () => {
  it('恰好 4 个选项，有且只有一个正确答案', () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = teenArithmetic(ctx({ mode }, seed))
        expect(item.options, `${mode} 选项数不对`).toHaveLength(4)
        const correct = item.options.filter((o) => o.isCorrect)
        expect(correct).toHaveLength(1)
        expect(correct[0]?.text).toBe(item.answer)
      }
    }
  })

  it('⭐ 干扰项铁律：每个错误选项都带 misconceptionTag', () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const o of teenArithmetic(ctx({ mode }, seed)).options) {
          if (o.isCorrect) continue
          expect(o.misconceptionTag, `${mode} 存在无诊断标签的干扰项`).toBeDefined()
        }
      }
    }
  })

  it('选项互不重复且非负', () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 40; seed++) {
        const values = teenArithmetic(ctx({ mode }, seed)).options.map((o) => Number(o.text))
        expect(new Set(values).size, `${mode} 出现重复选项`).toBe(4)
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('⭐ 没有超过 20 的选项 —— 否则四选一退化成三选一', () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const o of teenArithmetic(ctx({ mode }, seed)).options) {
          expect(Number(o.text), `${mode} 出现了 ${o.text}，孩子会一眼排除`).toBeLessThanOrEqual(20)
        }
      }
    }
  })

  it('签名含知识点与算式，可用于会话内去重', () => {
    const item = teenArithmetic(ctx({ mode: 'tenPlus' }, 7, 1))
    const { a, op, b } = parseEq(item.stem.text)
    expect(item.signature).toBe(`M1.11#${a}${op}${b}`)
  })

  it('朗读文本用中文而非符号（孩子不识字，全靠听）', () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 20; seed++) {
        const item = teenArithmetic(ctx({ mode }, seed))
        expect(item.stem.ttsText).not.toContain('+')
        expect(item.stem.ttsText).not.toContain('-')
        expect(item.stem.ttsText).toMatch(/[加减]/)
        expect(item.stem.ttsParts?.length, '缺少语音片段会退化成整句 TTS').toBeGreaterThan(0)
      }
    }
  })

  it('固定种子下输出稳定（否则测试与复现都无从谈起）', () => {
    for (const mode of MODES) {
      const first = teenArithmetic(ctx({ mode }, 42))
      const second = teenArithmetic(ctx({ mode }, 42))
      expect(first).toEqual(second)
    }
  })

  it('默认模式是 tenPlus —— 参数缺失时退到最简单那档', () => {
    const item = teenArithmetic(ctx({}, 5, 1))
    expect(parseEq(item.stem.text).a).toBe(10)
  })
})
