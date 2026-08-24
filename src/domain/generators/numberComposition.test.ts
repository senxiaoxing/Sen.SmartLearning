/**
 * @file 万以内数读写生成器测试
 * @layer domain
 *
 * ⭐ 头两条是这个生成器全部的意义所在：
 * 数必须含 0（否则 `zero_placeholder_lost` 根本产生不了），
 * 而 `read` 模式绝不能朗读题干里那个数（念出来就是答案）。
 */

import { describe, expect, it } from 'vitest'
import { chineseNumber } from '@/domain/chineseNumber'
import { numberComposition } from '@/domain/generators/numberComposition'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 3,
): GeneratorContext {
  return { kpId: 'M2-13.3', difficulty, params, rng: createRng(seed), exclude: [] }
}

function valueOf(item: GeneratedItem): number {
  const m = /#(?:write|read|compose):(\d+)$/.exec(item.signature)
  if (m === null) throw new Error(`签名格式不对: ${item.signature}`)
  return Number(m[1])
}

function tagged(item: GeneratedItem, tag: string): string[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => o.text ?? '')
}

describe('题目用的数', () => {
  it('⭐ 恒含 0 —— 不含 0 的数问不出「占位」这件事', () => {
    for (const mode of ['write', 'read', 'compose'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const value = valueOf(numberComposition(ctx({ mode }, seed)))
        expect(String(value), `${mode} seed ${seed}: ${value} 不含 0`).toContain('0')
      }
    }
  })

  it('位数符合参数，最高位非 0', () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(String(valueOf(numberComposition(ctx({ digits: 4 }, seed))))).toHaveLength(4)
      expect(String(valueOf(numberComposition(ctx({ digits: 3 }, seed))))).toHaveLength(3)
    }
  })
})

describe('写数（write）', () => {
  it('题干是汉字数字，答案是它对应的阿拉伯数字', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'write' }, seed))
      const value = valueOf(item)
      expect(item.stem.text).toBe(`${chineseNumber(value)} 写作几？`)
      expect(Number(item.answer)).toBe(value)
    }
  })

  it('⭐ zero_placeholder_lost 恒在选项里', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'write' }, seed))
      expect(
        tagged(item, 'zero_placeholder_lost').length,
        `${item.stem.text} 一个占位误区选项都没有`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('读数（read）', () => {
  it('⭐ 题干不朗读那个数 —— 念出来就是答案', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'read' }, seed))
      expect(item.stem.ttsParts, '读数题只能念提示语').toEqual(['phrase.howToReadThis'])
      expect(item.stem.ttsText).toBe('这个数读作什么')
    }
  })

  it('选项是汉字数字，正确项与题面的数对应', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'read' }, seed))
      expect(item.answer).toBe(chineseNumber(valueOf(item)))
      expect(item.options.find((o) => o.isCorrect)?.text).toBe(item.answer)
    }
  })

  it('恰好一个正确选项，错误项都带标签', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'read' }, seed))
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
      }
    }
  })
})

describe('组成（compose）', () => {
  it('题干只说非零的那几位，答案是合起来的数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'compose' }, seed))
      expect(Number(item.answer)).toBe(valueOf(item))
      expect(item.stem.text, '「0 个百」不是人话，也不是教材的问法').not.toContain('0 个')
    }
  })

  it('⭐ 「4 个千 5 个一 写成 45」恒是干扰项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = numberComposition(ctx({ mode: 'compose' }, seed))
      expect(tagged(item, 'zero_placeholder_lost').length).toBeGreaterThan(0)
    }
  })

  it('语音按数位拼，不留裸片段', () => {
    const item = numberComposition(ctx({ mode: 'compose' }, 7))
    expect(item.stem.ttsParts).toContain('phrase.togetherIsWhat')
    expect(
      item.stem.ttsParts?.some((p) => p.startsWith('phrase.count')),
      '应该念出「个千 / 个百 / 个十 / 个一」',
    ).toBe(true)
  })
})

describe('通用约束', () => {
  it('恰好 4 个选项，无重复', () => {
    for (const mode of ['write', 'read', 'compose'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = numberComposition(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        const texts = item.options.map((o) => o.text)
        expect(new Set(texts).size, `重复选项: ${texts.join(' / ')}`).toBe(texts.length)
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = numberComposition(ctx({ mode: 'write' }, 88))
    const b = numberComposition(ctx({ mode: 'write' }, 88))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
