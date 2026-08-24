/**
 * @file 推理生成器测试
 * @layer domain
 *
 * ⭐ 两条断言撑起这个生成器的全部价值：
 * **答案唯一**（线索合起来必须把其他位置排除干净，否则孩子选对了也被判错），
 * 以及 **`logic_first_only` 必须在选项里**（那是「只听了第一条」的诱饵，
 * 没有它这道题就只是三选一的运气游戏）。
 */

import { describe, expect, it } from 'vitest'
import { COUNTABLES } from '@/domain/generators/countables'
import { logicReasoning } from '@/domain/generators/logicReasoning'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-15.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

const ORDINAL_NAMES = ['第一', '第二', '第三', '第四']

/** 从题干解析出「问第几名」和所有线索 */
function parse(item: GeneratedItem): { askRank: number; clues: string[] } {
  const askName = /谁排(第.)？$/.exec(item.stem.text)![1]!
  const clueText = /排成一排。(.+)。谁排/.exec(item.stem.text)![1]!
  return {
    askRank: ORDINAL_NAMES.indexOf(askName),
    clues: clueText.split('，'),
  }
}

describe('题目结构', () => {
  it('⭐ 答案唯一：除正确答案外每只动物各有一条线索', () => {
    for (const animals of [3, 4]) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = logicReasoning(ctx({ animals }, seed))
        const { clues } = parse(item)
        expect(clues, `${animals} 只时线索数不对: ${item.stem.text}`).toHaveLength(animals - 1)
      }
    }
  })

  it('⭐ 线索绝不指向正确答案 —— 那等于把答案说出来', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = logicReasoning(ctx({}, seed))
      const answerName = item.options.find((o) => o.isCorrect)!.caption!
      const { clues } = parse(item)
      for (const clue of clues) {
        expect(clue.startsWith(answerName), `线索「${clue}」说的正是答案`).toBe(false)
      }
    }
  })

  it('每条线索问的都是同一个名次', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = logicReasoning(ctx({}, seed))
      const { askRank, clues } = parse(item)
      for (const clue of clues) {
        expect(clue, `线索与问题不是同一个名次: ${item.stem.text}`).toContain(
          `不排${ORDINAL_NAMES[askRank]}`,
        )
      }
    }
  })

  it('动物各不相同，且都是有语音片段的那些', () => {
    const known = new Set<string>(COUNTABLES.map((c) => c.name))
    for (let seed = 1; seed <= 60; seed++) {
      const captions = logicReasoning(ctx({ animals: 4 }, seed)).options.map((o) => o.caption)
      expect(new Set(captions).size, '队里有重复的动物').toBe(captions.length)
      for (const name of captions) expect(known.has(name!), `${name} 不在词表里`).toBe(true)
    }
  })
})

describe('干扰项', () => {
  it('⭐ logic_first_only 恒占一个选项', () => {
    for (const animals of [3, 4]) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = logicReasoning(ctx({ animals }, seed))
        const first = item.options.filter((o) => o.misconceptionTag === 'logic_first_only')
        expect(first, `${item.stem.text} 缺少「只听了第一条」的诱饵`).toHaveLength(1)
      }
    }
  })

  it('恰好一个正确选项，其余都带标签', () => {
    for (const animals of [3, 4]) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = logicReasoning(ctx({ animals }, seed))
        expect(item.options).toHaveLength(animals)
        expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.caption} 没有误区标签`).toBeDefined()
        }
      }
    }
  })

  it('问的每个名次都会轮到 —— 只问第一会被她背下来', () => {
    const ranks = new Set<number>()
    for (let seed = 1; seed <= 60; seed++) {
      ranks.add(parse(logicReasoning(ctx({}, seed))).askRank)
    }
    expect(ranks.size, '应该问到不止一个名次').toBeGreaterThan(1)
  })
})

describe('语音', () => {
  it('动物名复用现成片段，序数与句式是新加的', () => {
    const item = logicReasoning(ctx({}, 6))
    expect(item.stem.ttsParts).toContain('phrase.animalsLineUp')
    expect(item.stem.ttsParts).toContain('phrase.isNotAt')
    expect(item.stem.ttsParts).toContain('phrase.whoRanksAt')
    expect(item.stem.ttsParts!.some((p) => p.startsWith('word.')), '应复用动物名片段').toBe(true)
    expect(item.stem.ttsParts!.some((p) => p.startsWith('ord.')), '应念出名次').toBe(true)
  })
})

describe('稳定性', () => {
  it('同一个种子产出稳定', () => {
    const a = logicReasoning(ctx({}, 31))
    const b = logicReasoning(ctx({}, 31))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.caption)).toEqual(b.options.map((o) => o.caption))
  })
})
