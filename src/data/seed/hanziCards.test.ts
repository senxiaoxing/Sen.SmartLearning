/**
 * @file 识字卡数据的一致性测试
 * @layer data
 * @see src/data/seed/hanziCards.ts
 *
 * ⭐ 这个文件守的是**朗读句式能不能成立**。
 *
 * 每张卡念的是「天。蓝天的天。」——这句话是拿 `char` 和 `word` 拼出来的
 * （见 domain/hanzi.ts）。如果组词里根本没有那个字，拼出来就是
 * 「天。苹果的天。」这种句子，孩子会当场懵掉，而代码不会报任何错。
 */

import { describe, expect, it } from 'vitest'
import { ALL_HANZI_CARDS, HANZI_GROUPS } from '@/data/seed/hanziCards'
import { hasClip } from '@/data/seed/voiceManifest'
import { hanziClipKey, hanziSpokenText } from '@/domain/hanzi'

describe('识字 100', () => {
  it('正好 100 个字，分 10 组', () => {
    expect(ALL_HANZI_CARDS).toHaveLength(100)
    expect(HANZI_GROUPS).toHaveLength(10)
  })

  it('没有重复的字', () => {
    const chars = ALL_HANZI_CARDS.map((card) => card.char)
    expect(new Set(chars).size, `有重复的字：${chars.join('')}`).toBe(chars.length)
  })

  it('每张卡都是单个汉字', () => {
    for (const card of ALL_HANZI_CARDS) {
      expect([...card.char].length, `「${card.char}」不是单字`).toBe(1)
    }
  })

  it('每张卡的 groupId 与它所在的组一致', () => {
    for (const group of HANZI_GROUPS) {
      for (const card of group.cards) {
        expect(card.groupId, `「${card.char}」的 groupId 对不上`).toBe(group.id)
      }
    }
  })
})

describe('⭐ 组词必须包含这个字 —— 否则朗读句式不成立', () => {
  it.each(ALL_HANZI_CARDS.map((card) => [card.char, card] as const))(
    '%s',
    (_char, card) => {
      expect(
        card.word.includes(card.char),
        `「${card.char}」的组词是「${card.word}」，念出来会变成「${hanziSpokenText(card)}」`,
      ).toBe(true)
    },
  )
})

describe('拼音与配图', () => {
  it('每张卡都有带调拼音', () => {
    for (const card of ALL_HANZI_CARDS) {
      expect(card.pinyin.length, `「${card.char}」缺拼音`).toBeGreaterThan(0)
      // 轻声字不在这 100 个里，所以每个拼音都该带调号
      expect(card.pinyin, `「${card.char}」的拼音「${card.pinyin}」没有声调`).toMatch(
        /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/,
      )
    }
  })

  /**
   * ⭐ 不能用 Unicode 13 及以后新增的 emoji。
   *
   * 踩过一次：「石」用 🪨、「木」用 🪵（都是 13.0），在 Windows 的
   * Segoe UI Emoji 上渲染成**空方框**；古诗那边的莲花 🪷（14.0）同样。
   * 而 🪑（12.0）正常——分界线就在这里。
   *
   * 旧版 iOS 同理。孩子看到一个方框既认不出、也不知道那是"没画出来"，
   * 而开发机上的方框会让人以为是代码坏了，反复去查一个不存在的 bug。
   *
   * ⚠️ 这是**启发式**而非完备检查：它只卡住 U+1FA96 之后那一段
   * （13/14 新 emoji 的主要来源，也正是我们踩到的），
   * 别的区块里零星的新字符拦不住，那些只能靠在真机上看一眼。
   */
  it('不含 Unicode 13+ 的新 emoji —— 老系统上会变成空方框', () => {
    /** U+1FA96 起是 Unicode 13 才加入的；U+1FA70–U+1FA95 属于 12.0，可用 */
    const NEW_EMOJI_FLOOR = 0x1fa96

    for (const card of ALL_HANZI_CARDS) {
      for (const ch of card.emoji) {
        const code = ch.codePointAt(0) ?? 0
        expect(
          code,
          `「${card.char}」的图 ${card.emoji}（U+${code.toString(16).toUpperCase()}）太新，老系统上是空方框`,
        ).toBeLessThan(NEW_EMOJI_FLOOR)
      }
    }
  })

  /**
   * ⚠️ 同一面墙上两个字配同一张图，孩子会以为它们是同一个字。
   * 踩过一次：「他」和「哥」都用了 👦，「人」和「站」都用了 🧍。
   */
  it('配图不重复', () => {
    const emojis = ALL_HANZI_CARDS.map((card) => card.emoji).filter((e) => e !== '')
    const seen = new Map<string, string>()
    for (const card of ALL_HANZI_CARDS) {
      if (card.emoji === '') continue
      const owner = seen.get(card.emoji)
      expect(owner, `「${card.char}」与「${owner}」用了同一张图 ${card.emoji}`).toBeUndefined()
      seen.set(card.emoji, card.char)
    }
    expect(seen.size).toBe(emojis.length)
  })
})

describe('⭐ 每个字都必须有语音片段', () => {
  it('片段 key 全部在清单里', () => {
    for (const card of ALL_HANZI_CARDS) {
      expect(hasClip(hanziClipKey(card.char)), `「${card.char}」没有语音片段`).toBe(true)
    }
  })

  it('片段 key 互不相同 —— 同音字不能共用一条音频', () => {
    const keys = ALL_HANZI_CARDS.map((card) => hanziClipKey(card.char))
    expect(new Set(keys).size).toBe(keys.length)
  })
})
