/**
 * @file 拼音音节表的一致性校验
 * @layer data
 * @see src/data/seed/pinyinSyllables.ts
 *
 * ⭐⭐ **这张表错一个字，孩子就会反复练错一个音。**
 *
 * 机器能查的只有「表**自身**是否自洽」——声调标记与 `tone` 对不对得上、
 * 有没有重复、汉字格式对不对。这些是写表时最容易手滑的地方
 * （实测：`māng` 配 `tone: 2` 就是这么写出来的，被本文件抓到）。
 *
 * ⚠️ **机器查不了「这个汉字是不是真的读这个音」**，那需要人耳。
 * `npm run pinyin:check` 会生成一张试听页，必须有人过一遍。
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_SYLLABLES,
  BLEND_SYLLABLES,
  COMPOUND_FINALS,
  INITIALS,
  INTEGRAL_SYLLABLES,
  SINGLE_FINALS,
  syllableKey,
  SYLLABLES_NEEDING_RECORDING,
  TONE_SET,
  USABLE_SYLLABLES,
} from '@/data/seed/pinyinSyllables'
import type { Syllable, Tone } from '@/domain/pinyin'

/** 带调元音 → 声调号。用于从拼音串反推声调，与 `tone` 字段交叉验证 */
const TONE_MARKS: Record<string, Tone> = {
  ā: 1, ō: 1, ē: 1, ī: 1, ū: 1, ǖ: 1,
  á: 2, ó: 2, é: 2, í: 2, ú: 2, ǘ: 2,
  ǎ: 3, ǒ: 3, ě: 3, ǐ: 3, ǔ: 3, ǚ: 3,
  à: 4, ò: 4, è: 4, ì: 4, ù: 4, ǜ: 4,
}

function toneFromPinyin(pinyin: string): Tone | undefined {
  for (const ch of pinyin) {
    const tone = TONE_MARKS[ch]
    if (tone !== undefined) return tone
  }
  return undefined
}

const GROUPS = {
  声母: INITIALS,
  单韵母: SINGLE_FINALS,
  复韵母鼻韵母: COMPOUND_FINALS,
  整体认读: INTEGRAL_SYLLABLES,
  两拼音节: BLEND_SYLLABLES,
}

describe('拼音音节表自洽性', () => {
  it('⭐ 声调标记必须与 tone 字段一致', () => {
    // 这条抓的是最隐蔽的手滑：'māng'(一声) 却标了 tone: 2。
    // 表面看不出问题，但生成出来的音频和知识点标注会对不上。
    for (const s of ALL_SYLLABLES) {
      const marked = toneFromPinyin(s.pinyin)
      expect(marked, `「${s.pinyin}」里没有找到声调标记`).toBeDefined()
      expect(marked, `「${s.pinyin}」标的是 ${marked} 声，却写了 tone: ${s.tone}`).toBe(s.tone)
    }
  })

  it('每个音节都有非空的 base 和合法的 tone', () => {
    for (const s of ALL_SYLLABLES) {
      expect(s.base.length, `${s.pinyin} 的 base 为空`).toBeGreaterThan(0)
      expect([1, 2, 3, 4], `${s.pinyin} 的 tone 非法`).toContain(s.tone)
    }
  })

  it('音节 key 互不重复', () => {
    const keys = ALL_SYLLABLES.map((s) => syllableKey(s.base, s.tone))
    expect(new Set(keys).size, `重复的 key: ${keys.join(', ')}`).toBe(keys.length)
  })

  it('key 里不含 ü —— 文件名里不安全，必须转成 v', () => {
    for (const s of ALL_SYLLABLES) {
      expect(syllableKey(s.base, s.tone)).not.toContain('ü')
    }
  })

  it('汉字载体必须恰好一个字', () => {
    // 两个字会读成词，节奏和单音节完全不同，孩子学不到单个音节的读法
    for (const s of ALL_SYLLABLES) {
      if (s.char === undefined) continue
      expect([...s.char].length, `${s.pinyin} 的载体「${s.char}」不是单字`).toBe(1)
      expect(s.char, `${s.pinyin} 的载体不是汉字`).toMatch(/^[一-龥]$/)
    }
  })

  it('同一个汉字不会被用在两个不同的读音上', () => {
    // 一字对两音必然意味着其中一个错了（或者它是多音字，更不该用）
    const byChar = new Map<string, Set<string>>()
    for (const s of ALL_SYLLABLES) {
      if (s.char === undefined) continue
      const set = byChar.get(s.char) ?? new Set()
      set.add(s.pinyin)
      byChar.set(s.char, set)
    }
    for (const [char, pinyins] of byChar) {
      expect([...pinyins].length, `「${char}」被标了多个读音: ${[...pinyins].join(' / ')}`).toBe(1)
    }
  })
})

describe('分组完整性', () => {
  it('声母 23 个', () => {
    expect(INITIALS).toHaveLength(23)
  })

  it('单韵母 6 个，每个只有一条且带 toneless 写法', () => {
    // ⚠️ 这一组**不教声调**：裸元音的四声没有干净的汉字载体，
    // TTS 会读错，而选项标着 `ā` 播出 `à` 是在明确地教错。
    // 声调教学移到 TONE_SET（妈麻马骂）。
    expect(SINGLE_FINALS).toHaveLength(6)
    for (const base of ['a', 'o', 'e', 'i', 'u', 'ü']) {
      const hits = SINGLE_FINALS.filter((s) => s.base === base)
      expect(hits, `缺少单韵母 ${base}`).toHaveLength(1)
      expect(hits[0]!.toneless, `${base} 缺少不带调写法`).toBeDefined()
    }
  })

  it('⭐ 四声调组齐全且四个字都有载体 —— 这是唯一真正教声调的地方', () => {
    expect(TONE_SET).toHaveLength(4)
    expect(TONE_SET.map((s) => s.tone).sort()).toEqual([1, 2, 3, 4])
    expect(new Set(TONE_SET.map((s) => s.base)).size, '四声必须是同一个音').toBe(1)
    for (const s of TONE_SET) {
      expect(s.char, `${s.pinyin} 没有汉字载体，声调无法保证`).toBeDefined()
    }
  })

  it('整体认读音节 16 个 —— 课标规定的数量', () => {
    expect(INTEGRAL_SYLLABLES).toHaveLength(16)
  })

  it('两拼音节的 initial + final 拼起来等于 base', () => {
    for (const s of BLEND_SYLLABLES) {
      expect(s.initial + s.final, `${s.pinyin} 的声母韵母拼不出 base`).toBe(s.base)
    }
  })

  it.each(Object.entries(GROUPS))('%s 组内 base 不重复', (_name, group) => {
    const bases = group.map((s) => `${s.base}${s.tone}`)
    expect(new Set(bases).size).toBe(bases.length)
  })
})

describe('⭐⭐ 发音可靠性', () => {
  it('题库只用有汉字载体的音节 —— 没有载体的会读错声调', () => {
    // 这是对孩子实测反馈的直接回应：`á` 读成 `ā`、`ē` 读成 `è`……
    // 全部出现在没有汉字载体的那批。宁可某个韵母暂时不出题，
    // 也不能让她反复听错的读音——学错的发音以后很难改。
    for (const s of USABLE_SYLLABLES) {
      expect(s.char, `${s.pinyin} 进了题库却没有汉字载体`).toBeDefined()
    }
  })

  it('待录音的音节一律不在可用集合里', () => {
    const usableKeys = new Set(USABLE_SYLLABLES.map((s) => syllableKey(s.base, s.tone)))
    for (const s of SYLLABLES_NEEDING_RECORDING) {
      expect(
        usableKeys.has(syllableKey(s.base, s.tone)),
        `${s.pinyin} 还没录音却已进题库`,
      ).toBe(false)
    }
  })

  it('报告还差哪些音节要录', () => {
    const list = SYLLABLES_NEEDING_RECORDING.map((s: Syllable) => s.pinyin).join(' ')
    console.info(
      `\n  可用 ${USABLE_SYLLABLES.length}/${ALL_SYLLABLES.length} 个音节。` +
        `\n  ⚠️ 待录真人音频（暂不出题）：${list}` +
        `\n     录音工具：npm run pinyin:record\n`,
    )
    expect(USABLE_SYLLABLES.length).toBeGreaterThan(0)
  })
})
