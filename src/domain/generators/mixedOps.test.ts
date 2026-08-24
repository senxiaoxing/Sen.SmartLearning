/**
 * @file 混合运算生成器测试
 * @layer domain
 *
 * ⭐ 这个生成器最容易出的错是**题目问不出问题**：
 * `(3 + 2) × 4` 无视括号从左往右照样得 20，于是 `paren_ignored` 等于正确答案、
 * 被去重剔除，孩子看到的是一道有三个随机兜底选项的题。
 * 因此每一组测试都全量扫种子，断言「按错误顺序算出来的那个数确实在选项里」。
 */

import { describe, expect, it } from 'vitest'
import { mixedOps } from '@/domain/generators/mixedOps'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 3,
): GeneratorContext {
  return { kpId: 'M2-11.2', difficulty, params, rng: createRng(seed), exclude: [] }
}

function tagged(item: GeneratedItem, tag: string): number | undefined {
  const opt = item.options.find((o) => o.misconceptionTag === tag)
  return opt === undefined ? undefined : Number(opt.text)
}

/** 把题干 `2 + 3 × 4 = ?` 拆成词，供逐题复算 */
function tokens(item: GeneratedItem): string[] {
  return item.stem.text
    .replace(/ = \?$/, '')
    .replace(/\(/g, '( ')
    .replace(/\)/g, ' )')
    .split(/\s+/)
}

describe('同级运算（sameLevel）', () => {
  it('恒为「减在前、加在后」—— 反过来先算后面也对，那道题问不出东西', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mixedOps(ctx({ mode: 'sameLevel' }, seed))
      expect(item.stem.text).toMatch(/^\d+ - \d+ \+ \d+ = \?$/)
    }
  })

  it('⭐ op_order 是「先算了后面那一步」，且不是负数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mixedOps(ctx({ mode: 'sameLevel' }, seed))
      const [a, , b, , c] = tokens(item).map(Number)
      expect(Number(item.answer)).toBe(a! - b! + c!)
      expect(tagged(item, 'op_order'), `${item.stem.text} 缺少 op_order`).toBe(a! - (b! + c!))
    }
  })
})

describe('两级混合（mixed）', () => {
  it('⭐ 两种排法都会出现 —— 只出一种她会把规则记成「先算右边」', () => {
    const shapes = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'mixed' }, seed))
      shapes.add(tokens(item)[1] === '×' ? 'mulFirst' : 'mulLast')
    }
    expect(shapes).toEqual(new Set(['mulFirst', 'mulLast']))
  })

  it('⭐ op_order 恒存在，且不等于正确答案', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'mixed' }, seed))
      const wrong = tagged(item, 'op_order')
      expect(wrong, `${item.stem.text} 缺少 op_order —— 这道题诊断不出任何东西`).toBeDefined()
      expect(wrong).not.toBe(Number(item.answer))
    }
  })

  it('答案与题面一致（先乘除后加减），且非负', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'mixed' }, seed))
      const t = tokens(item)
      const expected =
        t[1] === '×'
          ? t[3] === '+'
            ? Number(t[0]) * Number(t[2]) + Number(t[4])
            : Number(t[0]) * Number(t[2]) - Number(t[4])
          : t[1] === '+'
            ? Number(t[0]) + Number(t[2]) * Number(t[4])
            : Number(t[0]) - Number(t[2]) * Number(t[4])
      expect(Number(item.answer), item.stem.text).toBe(expected)
      expect(Number(item.answer)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('带括号（paren）', () => {
  it('⭐ 括号恒在右边 —— 放左边「无视括号」就等于正确答案了', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'paren' }, seed))
      expect(item.stem.text, '括号不该出现在算式开头').toMatch(/^\d+ [×-] \(\d+ [+-] \d+\) = \?$/)
    }
  })

  it('⭐ paren_ignored 恒存在且不等于答案 —— 这是这一档唯一要诊断的东西', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'paren' }, seed))
      const wrong = tagged(item, 'paren_ignored')
      expect(wrong, `${item.stem.text} 缺少 paren_ignored`).toBeDefined()
      expect(wrong).not.toBe(Number(item.answer))
      expect(wrong).toBeGreaterThanOrEqual(0)
    }
  })

  it('括号里的减法真减得动，且结果不为 0', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mixedOps(ctx({ mode: 'paren' }, seed))
      const m = /\((\d+) ([+-]) (\d+)\)/.exec(item.stem.text)!
      if (m[2] === '-') {
        expect(Number(m[1]), item.stem.text).toBeGreaterThan(Number(m[3]))
      }
    }
  })

  it('括号读作「左括号 / 右括号」，与屏幕上的算式一一对应', () => {
    const item = mixedOps(ctx({ mode: 'paren' }, 5))
    expect(item.stem.ttsParts).toContain('op.parenL')
    expect(item.stem.ttsParts).toContain('op.parenR')
  })
})

describe('通用约束', () => {
  it('每个错误选项都带标签，恰好 4 个，无负数', () => {
    for (const mode of ['sameLevel', 'mixed', 'paren'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = mixedOps(ctx({ mode }, seed))
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
    const a = mixedOps(ctx({ mode: 'paren' }, 33))
    const b = mixedOps(ctx({ mode: 'paren' }, 33))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
