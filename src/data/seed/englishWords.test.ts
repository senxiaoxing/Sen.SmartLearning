/**
 * @file 英语词表的一致性校验
 * @layer data
 * @see src/data/seed/englishWords.ts
 *
 * 机器能查的是「表**自身**是否自洽」：id 会不会重、图形面会不会在同一道题里撞脸、
 * 每组够不够凑一道四选一。这些都是写表时最容易手滑的地方，
 * 而且错了在 iPad 上未必看得出来——两个一样的 emoji 摆在一起，
 * 孩子点了错的那个也只会以为是自己听错了。
 *
 * ⚠️ **机器查不了发音对不对。** 单词基本不用担心（英语音色念英文是母语场景），
 * 但**孤立字母有歧义**（`A` 可能被念成冠词 /ə/），必须有人听一遍，
 * 见 `englishLetters.ts` 的说明。
 */

import { describe, expect, it } from 'vitest'
import { LETTER_CARDS, LETTERS } from '@/data/seed/englishLetters'
import { ALL_ENGLISH_WORDS, ENGLISH_WORDS_BY_KP } from '@/data/seed/englishWords'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS_BY_SUBJECT } from '@/data/seed/knowledgePoints'
import { spokenText, wordKey } from '@/domain/english'

/** 一道题固定 4 个选项，所以每组至少要有 4 条词才出得了题 */
const MIN_WORDS_PER_GROUP = 4

const GROUPS = Object.entries(ENGLISH_WORDS_BY_KP)
const englishKpIds = new Set(KNOWLEDGE_POINTS_BY_SUBJECT.english.map((kp) => kp.id))

describe('英语词表自洽性', () => {
  it('词条 id 全局唯一 —— id 决定音频文件名，重了就会互相覆盖', () => {
    const ids = ALL_ENGLISH_WORDS.map((word) => word.id)
    expect(new Set(ids).size, `重复的 id: ${ids.join(', ')}`).toBe(ids.length)
  })

  it('id 只含 ASCII 字母与数字 —— 它会成为文件名', () => {
    // 非 ASCII 字符在跨平台传输、URL 编码、iOS「文件」App 里都可能出问题，
    // 与拼音那边把 ü 转成 v 是同一个理由
    for (const word of ALL_ENGLISH_WORDS) {
      expect(word.id, `id「${word.id}」含非法字符`).toMatch(/^[A-Za-z][A-Za-z0-9]*$/)
    }
  })

  it('每个词条的英文、中文、图形面都非空', () => {
    for (const word of ALL_ENGLISH_WORDS) {
      expect(word.en.length, `${word.id} 缺英文原文`).toBeGreaterThan(0)
      expect(word.zh.length, `${word.id} 缺中文释义`).toBeGreaterThan(0)
      expect(word.face.length, `${word.id} 缺图形面`).toBeGreaterThan(0)
    }
  })

  it('英文原文里没有中文 —— 混进中文会让 TTS 切换语言，读出半英半中', () => {
    for (const word of ALL_ENGLISH_WORDS) {
      expect(word.en, `${word.id} 的英文原文混入了中文`).not.toMatch(/[一-龥]/)
    }
  })
})

describe('分组可出题性', () => {
  it.each(GROUPS)('%s 至少有 4 条词，才凑得出四选一', (kpId, words) => {
    expect(words.length, `${kpId} 只有 ${words.length} 条词`).toBeGreaterThanOrEqual(
      MIN_WORDS_PER_GROUP,
    )
  })

  it.each(GROUPS)('⭐ %s 组内图形面互不重复', (kpId, words) => {
    // 同一道题里出现两个一模一样的 emoji，孩子点哪个都说不清对错，
    // 掌握度还会被这种「无解题」污染
    const faces = words.map((word) => word.face)
    const duplicated = faces.filter((face, i) => faces.indexOf(face) !== i)
    expect(duplicated, `${kpId} 有重复图形面: ${duplicated.join(' ')}`).toHaveLength(0)
  })

  it.each(GROUPS)('⭐ %s 的同族词要么独一份，要么够凑一道题', (kpId, words) => {
    // family 的用途是「干扰项优先从同族取」（见 englishWords.ts 的 COUNTED_THINGS）。
    // 某一族只有两三条时，生成器凑不满四个同族选项，会退回跨族——
    // 那就等于这一族的设计意图落空了。
    const counts = new Map<string, number>()
    for (const word of words) {
      if (word.family === undefined) continue
      counts.set(word.family, (counts.get(word.family) ?? 0) + 1)
    }
    for (const [family, count] of counts) {
      expect(
        count === 1 || count >= MIN_WORDS_PER_GROUP,
        `${kpId} 的族「${family}」只有 ${count} 条，凑不满一道题`,
      ).toBe(true)
    }
  })
})

describe('与知识点图谱对齐', () => {
  it('词表里的知识点 ID 都真实存在', () => {
    for (const [kpId] of GROUPS) {
      expect(englishKpIds.has(kpId), `${kpId} 不在英语知识点表里`).toBe(true)
    }
  })

  it('报告还有哪些英语知识点没有题库', () => {
    const inWordList = new Set(GROUPS.map(([kpId]) => kpId))
    const notInWordList = [...englishKpIds].filter((id) => !inWordList.has(id))
    // ⭐ 不在词表里 ≠ 出不了题：E1.6/E1.9 走 memory_pair，题目由字母表直接生成
    const noItemsAtAll = notInWordList.filter((id) => !ITEM_TEMPLATE_BY_KP.has(id))

    console.info(
      `\n  英语题库覆盖 ${englishKpIds.size - noItemsAtAll.length}/${englishKpIds.size} 个知识点，` +
        `词表 ${ALL_ENGLISH_WORDS.length} 条词/句 + memory_pair 2 个知识点。` +
        `\n  ⚠️ 仍缺题库：${noItemsAtAll.join(' ')}（字母歌要的是歌曲音频与跟唱交互）\n`,
    )

    // 这三个不在词表里，但前两个已由 memory_pair 覆盖。
    // 数量变了说明有人动了覆盖范围，应当是有意为之
    expect(notInWordList).toEqual(['E1.6', 'E1.7', 'E1.9'])
    expect(noItemsAtAll, '只剩字母歌还没有题库').toEqual(['E1.7'])
  })
})

describe('字母表', () => {
  it('26 个字母，顺序完整', () => {
    expect(LETTERS).toHaveLength(26)
    expect(LETTERS.map((l) => l.en).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  })

  it('图形面是「大写 + 小写」并列', () => {
    for (const letter of LETTERS) {
      expect(letter.face, `${letter.en} 的图形面不对`).toBe(
        `${letter.en}${letter.en.toLowerCase()}`,
      )
    }
  })

  it('片段 key 形如 en.letterA', () => {
    expect(wordKey(LETTERS[0]!)).toBe('en.letterA')
    expect(wordKey(LETTERS[25]!)).toBe('en.letterZ')
  })

  it('⭐ 朗读的是整句而不是孤立字母 —— 孤立的 A 可能被念成冠词', () => {
    // 这是「发音教错比没有声音更严重」的直接落点：
    // 放进 "A is for apple." 之后，那个 A 只可能是字母名
    for (const letter of LETTERS) {
      expect(spokenText(letter), `${letter.en} 还在念孤立字母`).toMatch(/ is for .+\.$/)
    }
  })

  it('每张字母卡的首字母单词真的以该字母开头', () => {
    // 手滑写错一个（D → bird）就是在教错，而且看注释很难发现
    for (const card of LETTER_CARDS) {
      expect(
        card.word.toUpperCase().startsWith(card.upper),
        `${card.upper} 配的单词是「${card.word}」，首字母对不上`,
      ).toBe(true)
      expect(card.emoji.length, `${card.upper} 缺 emoji`).toBeGreaterThan(0)
      expect(card.wordZh.length, `${card.upper} 缺中文`).toBeGreaterThan(0)
    }
  })

  it('字母卡的分组与知识点对得上', () => {
    // A~E → E1.1，F~J → E1.2，K~O → E1.3，P~T → E1.4，U~Z → E1.5
    expect(LETTER_CARDS.filter((c) => c.kpId === 'E1.1').map((c) => c.upper).join('')).toBe('ABCDE')
    expect(LETTER_CARDS.filter((c) => c.kpId === 'E1.5').map((c) => c.upper).join('')).toBe('UVWXYZ')
    for (const card of LETTER_CARDS) {
      expect(englishKpIds.has(card.kpId), `${card.upper} 挂在不存在的 ${card.kpId} 上`).toBe(true)
    }
  })
})
