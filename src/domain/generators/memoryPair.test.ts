/**
 * @file memoryPair 单测 —— 配对结构与镜像诊断
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { isMirrorMistake } from '@/domain/generators/memoryCards'
import { memoryPair } from '@/domain/generators/memoryPair'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem } from '@/domain/types'

function gen(
  params: Record<string, unknown>,
  seed = 42,
  kpId = 'E1.6',
): GeneratedItem {
  return memoryPair({ kpId, difficulty: 2, params, rng: createRng(seed) })
}

function cardsOf(item: GeneratedItem) {
  return item.visual?.kind === 'memoryPairs' ? item.visual.cards : []
}

describe('memoryPair', () => {
  it('固定种子下输出稳定', () => {
    const a = gen({ pairCount: 4, mode: 'case' })
    const b = gen({ pairCount: 4, mode: 'case' })
    expect(a.signature).toBe(b.signature)
    expect(cardsOf(a).map((c) => c.id)).toEqual(cardsOf(b).map((c) => c.id))
  })

  it('卡片数是对数的两倍', () => {
    expect(cardsOf(gen({ pairCount: 4, mode: 'case' }))).toHaveLength(8)
    expect(cardsOf(gen({ pairCount: 2, mode: 'case' }))).toHaveLength(4)
  })

  it('⭐ 每个 pairId 恰好两张，否则永远配不完', () => {
    const cards = cardsOf(gen({ pairCount: 5, mode: 'case' }))
    const byPair = new Map<string, number>()
    for (const c of cards) byPair.set(c.pairId, (byPair.get(c.pairId) ?? 0) + 1)

    expect(byPair.size).toBe(5)
    for (const [pairId, n] of byPair) {
      expect(n, `${pairId} 有 ${n} 张`).toBe(2)
    }
  })

  it('卡片 id 互不重复——组件靠它区分翻的是哪张', () => {
    const ids = cardsOf(gen({ pairCount: 5, mode: 'case' })).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('对数超过上限时截断，不会出 16 张牌', () => {
    expect(cardsOf(gen({ pairCount: 99, mode: 'case' })).length).toBeLessThanOrEqual(10)
  })

  it('至少两对——一对的翻牌不成其为游戏', () => {
    expect(cardsOf(gen({ pairCount: 1, mode: 'case' }))).toHaveLength(4)
  })

  describe('case 模式：大小写配对', () => {
    it('每对是同一字母的大写与小写', () => {
      const cards = cardsOf(gen({ pairCount: 4, mode: 'case', letters: ['A', 'B', 'C', 'D'] }))
      const byPair = new Map<string, string[]>()
      for (const c of cards) byPair.set(c.pairId, [...(byPair.get(c.pairId) ?? []), c.face])

      for (const [letter, faces] of byPair) {
        expect(faces.sort()).toEqual([letter, letter.toLowerCase()].sort())
      }
    })
  })

  describe('initial 模式：字母配首字母单词', () => {
    const words = { A: ['apple', '苹果', '🍎'], B: ['bird', '小鸟', '🐦'] }

    it('一张是字母，一张是 emoji', () => {
      const cards = cardsOf(gen({ pairCount: 2, mode: 'initial', letters: ['A', 'B'], words }))
      const faces = cards.map((c) => c.face).sort()
      expect(faces).toEqual(['A', 'B', '🍎', '🐦'].sort())
    })

    it('emoji 卡带中文小字，帮孩子确认这个图是什么', () => {
      const cards = cardsOf(gen({ pairCount: 2, mode: 'initial', letters: ['A', 'B'], words }))
      const emojiCard = cards.find((c) => c.face === '🍎')
      expect(emojiCard?.caption).toBe('苹果')
    })

    it('缺 words 表时降级为大小写配对，而不是出空白卡', () => {
      const cards = cardsOf(gen({ pairCount: 2, mode: 'initial', letters: ['A', 'B'] }))
      expect(cards.map((c) => c.face).sort()).toEqual(['A', 'B', 'a', 'b'].sort())
    })
  })

  describe('⭐ 朗读', () => {
    it('每张卡都能出声——孩子不识字，翻开却没声音等于白翻', () => {
      const cards = cardsOf(gen({ pairCount: 4, mode: 'case' }))
      for (const c of cards) {
        expect(c.ttsText, `${c.face} 没有朗读文本`).toBeTruthy()
      }
    })

    it('⭐ 念整句「A is for apple.」而非孤立字母——孤立的 A 有歧义', () => {
      const words = { A: ['apple', '苹果', '🍎'] }
      const cards = cardsOf(gen({ pairCount: 2, mode: 'initial', letters: ['A', 'B'], words }))
      const aCard = cards.find((c) => c.pairId === 'A')
      expect(aCard?.ttsText).toBe('A is for apple.')
    })

    it('必须标 en-US，否则中文引擎念英文会教错发音', () => {
      const cards = cardsOf(gen({ pairCount: 3, mode: 'case' }))
      for (const c of cards) expect(c.ttsLang).toBe('en-US')
    })
  })

  describe('⭐ 诊断性', () => {
    it('选项覆盖两种错法，且都带 misconceptionTag', () => {
      const item = gen({ pairCount: 4, mode: 'case' })
      const wrong = item.options.filter((o) => !o.isCorrect)

      expect(wrong.length).toBeGreaterThanOrEqual(2)
      for (const o of wrong) expect(o.misconceptionTag).toBeDefined()
      expect(wrong.map((o) => o.misconceptionTag)).toContain('letter_mirror')
      expect(wrong.map((o) => o.misconceptionTag)).toContain('letter_pairing_weak')
    })

    it('恰好一个正确选项', () => {
      const item = gen({ pairCount: 3, mode: 'case' })
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
    })

    it('mistakeBudget 传进 visual，供组件判定', () => {
      const item = gen({ pairCount: 3, mode: 'case', mistakeBudget: 5 })
      expect(item.visual?.kind === 'memoryPairs' && item.visual.mistakeBudget).toBe(5)
    })
  })

  describe('isMirrorMistake', () => {
    it.each([
      ['b', 'd'],
      ['D', 'b'],
      ['p', 'q'],
      ['Q', 'p'],
    ])('%s 配 %s 是镜像混淆', (a, b) => {
      expect(isMirrorMistake(a, b)).toBe(true)
    })

    it.each([
      ['A', 'c'],
      ['b', 'p'],
      ['m', 'n'],
    ])('%s 配 %s 不是镜像混淆', (a, b) => {
      expect(isMirrorMistake(a, b)).toBe(false)
    })

    it('同一个字母的大小写不算错配', () => {
      expect(isMirrorMistake('B', 'b')).toBe(false)
    })
  })
})
