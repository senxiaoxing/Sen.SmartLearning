/**
 * @file 100 以内笔算生成器测试
 * @layer domain
 *
 * 「必须进位」这类约束是**构造**出来的而不是重试出来的，因此第一组测试
 * 全量扫种子验证约束恒成立——只要有一个种子漏网，孩子就会在「进位专练」里
 * 遇到一道不进位的题，而那在 iPad 上看起来完全正常。
 */

import { describe, expect, it } from 'vitest'
import { columnArithmetic } from '@/domain/generators/columnArithmetic'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-2.2', difficulty, params, rng: createRng(seed), exclude: [] }
}

function parseEq(text: string): { a: number; op: string; b: number } {
  const m = /^(\d+) ([+-]) (\d+) = \?$/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return { a: Number(m[1]), op: String(m[2]), b: Number(m[3]) }
}

function tagged(item: GeneratedItem, tag: string): number | undefined {
  const opt = item.options.find((o) => o.misconceptionTag === tag)
  return opt === undefined ? undefined : Number(opt.text)
}

describe('加法', () => {
  it('⭐ carry:require 时每一道都真的进位，且结果不超过 100', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { a, b } = parseEq(columnArithmetic(ctx({ op: 'add', carry: 'require' }, seed)).stem.text)
      expect((a % 10) + (b % 10), `${a} + ${b} 没有进位`).toBeGreaterThanOrEqual(10)
      expect(a + b, `${a} + ${b} 超出 100`).toBeLessThanOrEqual(100)
    }
  })

  it('⭐ carry:forbid 时每一道都不进位', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { a, b } = parseEq(columnArithmetic(ctx({ op: 'add', carry: 'forbid' }, seed)).stem.text)
      expect((a % 10) + (b % 10), `${a} + ${b} 进位了`).toBeLessThanOrEqual(9)
      expect(a + b).toBeLessThanOrEqual(100)
    }
  })

  it('进位时 no_carry 干扰项恒为「少了那个 1」', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = columnArithmetic(ctx({ op: 'add', carry: 'require' }, seed))
      const { a, b } = parseEq(item.stem.text)
      expect(tagged(item, 'no_carry'), `${a} + ${b} 缺少 no_carry`).toBe(a + b - 10)
    }
  })

  it('⭐ bDigits:1 才有 column_misaligned —— 把个位的 7 对到了十位', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = columnArithmetic(ctx({ op: 'add', bDigits: 1 }, seed))
      const { a, b } = parseEq(item.stem.text)
      expect(b, '第二个数应是一位数').toBeLessThanOrEqual(9)
      expect(tagged(item, 'column_misaligned')).toBe(a + b * 10)
    }
  })

  it('两位数相加时不出 column_misaligned —— 那个误区在这里没有真实样子', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = columnArithmetic(ctx({ op: 'add', bDigits: 2 }, seed))
      expect(tagged(item, 'column_misaligned')).toBeUndefined()
    }
  })
})

describe('减法', () => {
  it('⭐ 结果恒非负 —— 二年级不学负数', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { a, b } = parseEq(columnArithmetic(ctx({ op: 'sub' }, seed)).stem.text)
      expect(a - b, `${a} - ${b} 是负数`).toBeGreaterThanOrEqual(0)
    }
  })

  it('⭐ carry:require 时每一道都真的退位', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { a, b } = parseEq(
        columnArithmetic(ctx({ op: 'sub', carry: 'require' }, seed)).stem.text,
      )
      expect(a % 10, `${a} - ${b} 个位够减，没有退位`).toBeLessThan(b % 10)
      expect(a).toBeGreaterThan(b)
    }
  })

  it('退位时 no_borrow 干扰项是「掉头用大的减小的」', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = columnArithmetic(ctx({ op: 'sub', carry: 'require' }, seed))
      const { a, b } = parseEq(item.stem.text)
      const faked = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10))
      expect(tagged(item, 'no_borrow'), `${a} - ${b} 缺少 no_borrow`).toBe(faked)
    }
  })
})

describe('通用约束', () => {
  it('每个错误选项都带标签，没有负数，恰好 4 个', () => {
    for (const op of ['add', 'sub', 'mixed'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = columnArithmetic(ctx({ op }, seed))
        expect(item.options).toHaveLength(4)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
          expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('mixed 两种运算都会出现', () => {
    const ops = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      ops.add(parseEq(columnArithmetic(ctx({ op: 'mixed' }, seed)).stem.text).op)
    }
    expect(ops).toEqual(new Set(['+', '-']))
  })

  it('语音全部复用现有片段，零新增', () => {
    const item = columnArithmetic(ctx({ op: 'add' }, 3))
    expect(item.stem.ttsParts).toContain('op.plus')
    expect(item.stem.ttsParts).toContain('phrase.equalsWhat')
  })

  it('同一个种子产出稳定', () => {
    const a = columnArithmetic(ctx({ op: 'add', carry: 'require' }, 21))
    const b = columnArithmetic(ctx({ op: 'add', carry: 'require' }, 21))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
