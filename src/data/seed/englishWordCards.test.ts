/**
 * @file 英语词汇卡数据的一致性测试
 * @layer data
 * @see src/data/seed/englishWordCards.ts
 *
 * ⭐ 这个文件守的是**朗读句式能不能成立**。
 *
 * 每张卡念的是「Apple. A red apple.」——这句话是拿 `word` 和 `example`
 * 拼出来的（见 domain/englishCard.ts）。如果例句里根本没有那个词，
 * 拼出来就是「Apple. I like bananas.」这种句子，
 * 孩子会当场懵掉，而代码不会报任何错。
 *
 * 与 `hanziCards.test.ts` 是同一个位置的同一件事，那边守的是「组词必须包含这个字」。
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_WORD_CARDS,
  WORD_CARD_WORDS,
  WORD_GROUPS,
  WORD_VOLUMES,
} from '@/data/seed/englishWordCards'
import { hasClip } from '@/data/seed/voiceManifest'
import { englishCardClipKey, englishCardSpokenText } from '@/domain/englishCard'

/** 一辑几组、一组几个词。⚠️ 加内容时连同生成脚本的断言一起改 */
const GROUPS_PER_VOLUME = 6
const CARDS_PER_GROUP = 10

describe('英语词汇 180', () => {
  it('正好 180 个词，分 18 组', () => {
    expect(ALL_WORD_CARDS).toHaveLength(180)
    expect(WORD_GROUPS).toHaveLength(18)
  })

  it('没有重复的词', () => {
    const words = ALL_WORD_CARDS.map((card) => card.word.toLowerCase())
    const seen = new Map<string, string>()
    for (const card of ALL_WORD_CARDS) {
      const key = card.word.toLowerCase()
      expect(seen.get(key), `「${card.word}」出现了两次`).toBeUndefined()
      seen.set(key, card.groupId)
    }
    expect(seen.size).toBe(words.length)
  })

  /**
   * ⚠️ 词里不能有空格 —— 它要进语音片段 key（`en.cardIceCream` 这种拼法
   * 没有约定，而且多词条目本来就不是「一个词」，那是短语，归短句页管。
   */
  it('每张卡都是单个词，只含字母', () => {
    for (const card of ALL_WORD_CARDS) {
      expect(card.word, `「${card.word}」不是单个词`).toMatch(/^[A-Za-z]+$/)
    }
  })

  it('每张卡都有中文释义 —— 图可以留空，它不行', () => {
    // 形容词那组几乎整组没有图，中文释义是她唯一的抓手。
    // 见 englishWordCards.ts 文件头「留空的代价比识字小」
    for (const card of ALL_WORD_CARDS) {
      expect(card.zh.trim().length, `「${card.word}」缺中文释义`).toBeGreaterThan(0)
    }
  })

  it('每张卡的 groupId 与它所在的组一致', () => {
    for (const group of WORD_GROUPS) {
      for (const card of group.cards) {
        expect(card.groupId, `「${card.word}」的 groupId 对不上`).toBe(group.id)
      }
    }
  })

  it('组 id 互不相同 —— 撞了会让两组共用同一批 groupId', () => {
    const ids = WORD_GROUPS.map((group) => group.id)
    expect(new Set(ids).size, `重复的组 id：${ids.join(' ')}`).toBe(ids.length)
  })

  it('WORD_CARD_WORDS 与卡片一一对应 —— 英语短文的用词边界靠它', () => {
    expect(WORD_CARD_WORDS.size).toBe(ALL_WORD_CARDS.length)
    for (const card of ALL_WORD_CARDS) {
      expect(WORD_CARD_WORDS.has(card.word.toLowerCase()), `「${card.word}」漏了`).toBe(true)
    }
  })
})

/**
 * ⭐ 分辑守的是**每一辑都摆得满、且长度一致**。
 *
 * 墙顶三个按钮上写着「60 个词」，如果某一辑实际只有 50 个，
 * 页面不会报任何错——她只会觉得第三辑「怎么这么快就到底了」。
 */
describe('分辑', () => {
  it('3 辑，每辑 6 组 60 个词', () => {
    expect(WORD_VOLUMES).toHaveLength(3)
    for (const volume of WORD_VOLUMES) {
      expect(volume.groups.length, `${volume.name}的组数不对`).toBe(GROUPS_PER_VOLUME)
      const cards = volume.groups.flatMap((group) => group.cards)
      expect(cards.length, `${volume.name}的词数不对`).toBe(GROUPS_PER_VOLUME * CARDS_PER_GROUP)
    }
  })

  it('每组正好 10 个词', () => {
    for (const group of WORD_GROUPS) {
      expect(group.cards.length, `${group.name}的词数不对`).toBe(CARDS_PER_GROUP)
    }
  })

  it('每辑都有序号、名字和说明 —— 孩子不识字，认的是那个数字', () => {
    for (const volume of WORD_VOLUMES) {
      expect(volume.badge.length, `${volume.id} 缺序号`).toBeGreaterThan(0)
      expect(volume.name.length, `${volume.id} 缺名字`).toBeGreaterThan(0)
      expect(volume.hint.length, `${volume.id} 缺说明`).toBeGreaterThan(0)
    }
  })

  it('辑 id 互不相同', () => {
    const ids = WORD_VOLUMES.map((volume) => volume.id)
    expect(new Set(ids).size, `重复的辑 id：${ids.join(' ')}`).toBe(ids.length)
  })

  /**
   * ⚠️ 位置记忆全靠第一辑稳定（见 englishWordCards.ts 文件头
   * 「辑的顺序与内容都不要重排」）。新内容只能往后加辑。
   */
  it('第一辑仍从「小动物」的 cat 开头 —— 新内容只能往后加辑', () => {
    expect(WORD_VOLUMES[0]?.groups[0]?.cards[0]?.word).toBe('cat')
  })
})

describe('⭐ 例句必须包含这个词 —— 否则朗读句式不成立', () => {
  /**
   * 例句里出现了这个词吗（**允许词形变化**）。
   *
   * 「Banana. I like bananas.」是完全正常的一张卡，所以不能要求原形精确出现：
   *
   * ```
   * apples / sings / singing / walked   词尾直接加 s / es / ing / ed
   * strawberries / babies               ⚠️ y 结尾要先变 i，光加 s 匹配不上
   * ```
   *
   * ⚠️ 用词边界 `\b` 而不是 `includes`：`an` 会出现在 `banana` 里，
   * 那种假阳性等于这条测试白写。
   */
  const mentionsWord = (word: string, example: string): boolean => {
    const stem = word.toLowerCase()
    const forms = [`${stem}(s|es|ing|ed)?`]
    if (stem.endsWith('y')) forms.push(`${stem.slice(0, -1)}ies`)
    return new RegExp(`\\b(${forms.join('|')})\\b`, 'i').test(example)
  }

  it.each(ALL_WORD_CARDS.map((card) => [card.word, card] as const))('%s', (_word, card) => {
    expect(
      mentionsWord(card.word, card.example),
      `「${card.word}」的例句是「${card.example}」，` +
        `念出来会变成「${englishCardSpokenText(card)}」`,
    ).toBe(true)
  })

  it('例句都以大写开头、以标点收尾 —— 它要当一句话念出来', () => {
    for (const card of ALL_WORD_CARDS) {
      expect(card.example, `「${card.word}」的例句不像一句话：${card.example}`).toMatch(
        /^[A-Z].*[.!?]$/,
      )
    }
  })

  /**
   * ⭐ 例句要短。她听的是这个词怎么用，不是一段话——
   * 超过六个词，那个词本身就淹没在句子里了。
   */
  it('例句不超过六个词', () => {
    for (const card of ALL_WORD_CARDS) {
      const count = card.example.split(/\s+/).filter((t) => t.length > 0).length
      expect(count, `「${card.word}」的例句太长：${card.example}`).toBeLessThanOrEqual(6)
    }
  })

  /**
   * ⛔ 同形异音词不收 —— 这是中文「多音字一律改写」的英语版，
   * 但英语没有换同音字这条路，只能不收。见 englishWordCards.ts 文件头。
   *
   * `close` 是唯一的例外（动词义在孤立朗读时压倒性胜出），
   * 所以它不在这张黑名单里。
   */
  it('不含同形异音词 —— 卡片前半句是孤立的那个词，赌不起', () => {
    const HETERONYMS = ['read', 'live', 'wind', 'bow', 'tear', 'row', 'use', 'lead', 'minute']

    for (const card of ALL_WORD_CARDS) {
      expect(
        HETERONYMS.includes(card.word.toLowerCase()),
        `「${card.word}」有两个读音，而卡片开头正是孤立的它`,
      ).toBe(false)
    }
  })
})

describe('配图', () => {
  /**
   * ⭐ 不能用 Unicode 13 及以后新增的 emoji，老系统上是空方框。
   * 识字卡与诗单封面都栽过（🪨🪵🪷），这里同样拦一道。
   *
   * ⚠️ 这是**启发式**而非完备检查，只卡住 U+1FA96 之后那一段。
   */
  it('不含 Unicode 13+ 的新 emoji —— 老系统上会变成空方框', () => {
    const NEW_EMOJI_FLOOR = 0x1fa96

    for (const card of ALL_WORD_CARDS) {
      for (const ch of card.emoji) {
        const code = ch.codePointAt(0) ?? 0
        expect(
          code,
          `「${card.word}」的图 ${card.emoji}（U+${code.toString(16).toUpperCase()}）太新`,
        ).toBeLessThan(NEW_EMOJI_FLOOR)
      }
    }
  })

  /**
   * ⚠️ 同一面墙上两个词配同一张图，孩子会以为它们是同一个词。
   * 识字墙踩过（「他」「哥」都用 👦）。
   */
  it('配图不重复', () => {
    const seen = new Map<string, string>()
    for (const card of ALL_WORD_CARDS) {
      if (card.emoji === '') continue
      const owner = seen.get(card.emoji)
      expect(owner, `「${card.word}」与「${owner}」用了同一张图 ${card.emoji}`).toBeUndefined()
      seen.set(card.emoji, card.word)
    }
  })

  /**
   * 前两辑是「指得着的东西」，图是她的主要抓手，不该有留空；
   * 第三辑出现动词与形容词，留空是正常的。
   * 这条钉住的是「第一二辑别偷懒」。
   */
  it('前两辑每张卡都有图', () => {
    for (const volume of WORD_VOLUMES.slice(0, 2)) {
      for (const group of volume.groups) {
        for (const card of group.cards) {
          expect(card.emoji.length, `${volume.name}「${card.word}」没有图`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('⭐ 每个词都必须有语音片段', () => {
  it('片段 key 全部在清单里', () => {
    for (const card of ALL_WORD_CARDS) {
      expect(hasClip(englishCardClipKey(card.word)), `「${card.word}」没有语音片段`).toBe(true)
    }
  })

  it('片段 key 互不相同', () => {
    const keys = ALL_WORD_CARDS.map((card) => englishCardClipKey(card.word))
    expect(new Set(keys).size).toBe(keys.length)
  })

  /**
   * ⚠️ 必须以 `en.` 开头，生成脚本按这个前缀切**英语音色**。
   * 漏了的话中文音色会去念 apple——静默，且屏幕上一切正常。
   */
  it('片段 key 都以 en. 开头 —— 否则会用中文音色念英文', () => {
    for (const card of ALL_WORD_CARDS) {
      expect(englishCardClipKey(card.word).startsWith('en.'), `「${card.word}」的 key 前缀不对`).toBe(
        true,
      )
    }
  })

  it('朗读文本是「Word. Sentence.」，首字母大写', () => {
    const cat = ALL_WORD_CARDS.find((card) => card.word === 'cat')
    expect(englishCardSpokenText({ word: 'cat', example: 'A little cat.' })).toBe(
      'Cat. A little cat.',
    )
    expect(cat && englishCardSpokenText(cat)).toBe('Cat. A little cat.')
    // 本来就大写的不受影响
    expect(englishCardSpokenText({ word: 'TV', example: 'Watch TV.' })).toBe('TV. Watch TV.')
  })
})
