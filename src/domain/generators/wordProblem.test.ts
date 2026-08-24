/**
 * @file 二年级文字应用题生成器测试
 * @layer domain
 *
 * ⭐ 最要紧的两条：
 * **平均分/包含除恒整除**（孩子还没学到「分不完怎么办」），
 * 以及 **`atLeast` 恒除不尽**（除得尽的话商就是答案，
 * 那道题的全部难点就没了，`remainder_ignored` 也会等于正确答案被剔除）。
 */

import { describe, expect, it } from 'vitest'
import { STORY_FRAMES } from '@/data/seed/storyFrames'
import { createRng } from '@/domain/generators/rng'
import { wordProblem } from '@/domain/generators/wordProblem'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 3,
): GeneratorContext {
  return {
    kpId: 'M2-9.6',
    difficulty,
    params: { frames: STORY_FRAMES, ...params },
    rng: createRng(seed),
    exclude: [],
  }
}

function tagged(item: GeneratedItem, tag: string): number[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => Number(o.text))
}

/** 从签名取出这道题用的三个数 */
function values(item: GeneratedItem): { a: number; b: number; c?: number } {
  const m = /#\w+:(\d+)_(\d+)_(\d*):/.exec(item.signature)
  if (m === null) throw new Error(`签名格式不对: ${item.signature}`)
  return {
    a: Number(m[1]),
    b: Number(m[2]),
    ...(m[3] === '' ? {} : { c: Number(m[3]) }),
  }
}

describe('平均分与包含除（share / group）', () => {
  it('⭐ 恒整除 —— 孩子还没学到「分不完怎么办」', () => {
    for (const mode of ['share', 'group'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = wordProblem(ctx({ mode }, seed))
        const { a, b } = values(item)
        expect(a % b, `${mode}: ${a} ÷ ${b} 除不尽`).toBe(0)
        expect(Number(item.answer)).toBe(a / b)
      }
    }
  })

  it('div_as_sub 恒是「总数减每份」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = wordProblem(ctx({ mode: 'share' }, seed))
      const { a, b } = values(item)
      if (a - b !== Number(item.answer)) {
        expect(tagged(item, 'div_as_sub'), item.stem.text).toContain(a - b)
      }
    }
  })

  it('两种说法都会轮到 —— 平均分和包含除想的不是一回事', () => {
    const shapes = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      shapes.add(wordProblem(ctx({ mode: 'share' }, seed)).stem.text.includes('平均分给')
        ? 'giveTo'
        : 'together')
      shapes.add(wordProblem(ctx({ mode: 'group' }, seed)).stem.text.includes('装一盒')
        ? 'box'
        : 'group')
    }
    expect(shapes.size, '每种运算都该有两种说法').toBe(4)
  })
})

describe('求比一个数多几·少几（moreThan / lessThan）', () => {
  it('答案与题干说的方向一致，且非负', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const more = wordProblem(ctx({ mode: 'moreThan' }, seed))
      const mv = values(more)
      expect(Number(more.answer)).toBe(mv.a + mv.b)
      expect(more.stem.text).toContain('比他多')

      const less = wordProblem(ctx({ mode: 'lessThan' }, seed))
      const lv = values(less)
      expect(Number(less.answer)).toBe(lv.a - lv.b)
      expect(Number(less.answer)).toBeGreaterThanOrEqual(0)
      expect(less.stem.text).toContain('比他少')
    }
  })

  it('⭐ wrong_operation 恒是「反着算」的那个数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = wordProblem(ctx({ mode: 'moreThan' }, seed))
      const { a, b } = values(item)
      expect(tagged(item, 'wrong_operation'), item.stem.text).toContain(a - b)
    }
  })
})

describe('两步计算（twoStepLess / twoStepMore）', () => {
  it('先乘后减：答案是 a×b−c，且结果为正', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = wordProblem(ctx({ mode: 'twoStepLess' }, seed))
      const { a, b, c } = values(item)
      expect(c, '两步题必须有第三个数').toBeDefined()
      expect(Number(item.answer)).toBe(a * b - c!)
      expect(Number(item.answer), '「还剩 0 个」是道怪题').toBeGreaterThan(0)
    }
  })

  it('先乘后加：答案是 a×b+c', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = wordProblem(ctx({ mode: 'twoStepMore' }, seed))
      const { a, b, c } = values(item)
      expect(Number(item.answer)).toBe(a * b + c!)
    }
  })

  it('⭐ op_order 恒在选项里 —— 那是两步题的头号误区', () => {
    for (const mode of ['twoStepLess', 'twoStepMore'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = wordProblem(ctx({ mode }, seed))
        expect(
          tagged(item, 'op_order').length,
          `${mode}: ${item.stem.text} 缺少「顺序反了」的选项`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('题干三个数都填进去了，没有留下槽位', () => {
    for (const mode of ['twoStepLess', 'twoStepMore'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = wordProblem(ctx({ mode }, seed))
        expect(item.stem.text, '有槽位没被替换').not.toMatch(/\{[abc]\}|\{thing\}/)
        expect(item.stem.ttsParts, '语音里留了槽位').not.toContain('{c}')
      }
    }
  })
})

describe('⭐ 至少要几个（atLeast）', () => {
  it('恒除不尽 —— 除得尽的话这道题就没难点了', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = wordProblem(ctx({ mode: 'atLeast' }, seed))
      const { a, b } = values(item)
      expect(a % b, `${a} ÷ ${b} 除得尽`).not.toBe(0)
    }
  })

  it('⭐ 答案是「商 + 1」，不是商', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = wordProblem(ctx({ mode: 'atLeast' }, seed))
      const { a, b } = values(item)
      expect(Number(item.answer)).toBe(Math.floor(a / b) + 1)
    }
  })

  it('⭐ remainder_ignored 恒是那个商 —— 剩下的没地方去', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = wordProblem(ctx({ mode: 'atLeast' }, seed))
      const { a, b } = values(item)
      expect(tagged(item, 'remainder_ignored'), item.stem.text).toContain(Math.floor(a / b))
    }
  })
})

describe('通用约束', () => {
  const ALL = [
    'share',
    'group',
    'moreThan',
    'lessThan',
    'twoStepLess',
    'twoStepMore',
    'atLeast',
  ] as const

  it('恰好 4 个选项，错误项都带标签且非负', () => {
    for (const mode of ALL) {
      for (let seed = 1; seed <= 30; seed++) {
        const item = wordProblem(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
          expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('⭐ 不带配图 —— 数值大到画不出来', () => {
    for (const mode of ALL) {
      const item = wordProblem(ctx({ mode }, 5))
      expect(item.visual, `${mode} 不该有配图`).toBeUndefined()
    }
  })

  it('题干念得出来，没有裸槽位', () => {
    for (const mode of ALL) {
      for (let seed = 1; seed <= 20; seed++) {
        const item = wordProblem(ctx({ mode }, seed))
        expect(item.stem.ttsParts!.length).toBeGreaterThan(0)
        for (const part of item.stem.ttsParts!) {
          expect(part, `槽位没展开: ${part}`).not.toMatch(/^\{/)
        }
      }
    }
  })

  it('mode 配错时立刻抛错，不静默出一道别的题', () => {
    expect(() => wordProblem(ctx({ mode: 'nonsense' }, 1))).toThrow()
    expect(() => wordProblem(ctx({}, 1))).toThrow()
  })

  it('同一个种子产出稳定', () => {
    const a = wordProblem(ctx({ mode: 'atLeast' }, 42))
    const b = wordProblem(ctx({ mode: 'atLeast' }, 42))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
