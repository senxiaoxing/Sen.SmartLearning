/**
 * @file 拼音表的一致性测试
 * @layer data
 * @see src/data/seed/pinyinChart.ts
 *
 * ⭐ 这个文件守的是**卡面与读音对不上**。
 *
 * 卡面写 `ai`、播出来是别的音，这件事不会报错、不会崩，
 * 只有懂拼音的人凑巧听到才会发现——而孩子会照着错的音反复练。
 * `card()` 已经在模块加载时挡掉了「引用不存在的音节」，
 * 这里再补上「音节存在但没有音频」的那一半。
 */

import { describe, expect, it } from 'vitest'
import { ALL_CHART_CARDS, PINYIN_CHART } from '@/data/seed/pinyinChart'
import { pinyinKnowledgePoints } from '@/data/seed/pinyinKnowledgePoints'
import { hasClip } from '@/data/seed/voiceManifest'

/** 声母 23 + 单韵母 6 + 复韵母 9 + 前鼻 5 + 后鼻 4 + 整体认读 16 */
const EXPECTED_TOTAL = 63

/** 整体认读音节的卡面写法。它们标 carrier 是设计如此，与「借例词」是两回事 */
const INTEGRAL_FORMS = new Set(
  PINYIN_CHART.find((group) => group.id === 'integral')?.cards.map((card) => card.form) ?? [],
)

describe('拼音表', () => {
  it('六组共 63 张卡', () => {
    expect(PINYIN_CHART).toHaveLength(6)
    expect(ALL_CHART_CARDS).toHaveLength(EXPECTED_TOTAL)
  })

  it('各组数量符合课本', () => {
    const counts = Object.fromEntries(PINYIN_CHART.map((g) => [g.id, g.cards.length]))
    expect(counts).toEqual({
      single: 6,
      initial: 23,
      compound: 9,
      'front-nasal': 5,
      'back-nasal': 4,
      integral: 16,
    })
  })

  it('卡面写法不重复', () => {
    const forms = ALL_CHART_CARDS.map((card) => card.form)
    expect(new Set(forms).size, `有重复的卡：${forms.join(' ')}`).toBe(forms.length)
  })
})

describe('⭐ 每张卡都必须发得出正确的音', () => {
  it('片段 key 全部在清单里', () => {
    for (const card of ALL_CHART_CARDS) {
      expect(hasClip(card.clipKey), `「${card.form}」的片段 ${card.clipKey} 不在清单里`).toBe(true)
    }
  })

  /**
   * 兜底文本必须是**汉字**，不能是卡面写法。
   *
   * 片段缺失时整句走 TTS，而拿 `'b'` 去念会得到英文字母 bee、
   * 拿 `'ai'` 去念不知道会读成什么。载体字（玻、哀）则必然读对。
   */
  it('兜底文本不是卡面写法', () => {
    for (const card of ALL_CHART_CARDS) {
      expect(card.spoken.length, `「${card.form}」缺兜底文本`).toBeGreaterThan(0)
      expect(card.spoken, `「${card.form}」的兜底文本就是卡面写法，TTS 会读错`).not.toBe(card.form)
    }
  })

  /**
   * ⭐ 标了 carrier 的卡，那个字必须就是实际念出来的字。
   *
   * 不然就是「卡面写 ong、耳朵听到 sōng、屏幕上却标着别的字」的三重错位。
   */
  it('carrier 与实际念的字一致', () => {
    for (const card of ALL_CHART_CARDS.filter((c) => c.carrier !== undefined)) {
      expect([...(card.carrier ?? '')].length, `「${card.form}」的 carrier 不是单字`).toBe(1)
      expect(card.carrier, `「${card.form}」的 carrier 与兜底文本对不上`).toBe(card.spoken)
    }
  })

  /**
   * ⭐⭐ 声母韵母必须念**呼读音**，不许借例词。
   *
   * 这是 2026-08 的修正：此前 d 念「弟」、n 念「你」、l 念「里」、
   * ei 念「飞」、ün 念「云」、eng 念「风」、ci 念「词」——
   * 孩子在这面墙上听到的和老师带读的不是一个音，
   * 而拼音墙的全部意义就是给课堂做复习。
   *
   * `ong` 是唯一的例外：汉语里它不能独立成音节，也没有呼读字。
   */
  it('声母韵母念呼读音，只有 ong 借例词', () => {
    const borrowed = ALL_CHART_CARDS.filter(
      (card) => card.carrier !== undefined && !INTEGRAL_FORMS.has(card.form),
    ).map((card) => card.form)

    expect(borrowed).toEqual(['ong'])
  })

  /** 整体认读音节念的是载体字，必须标出来——孩子得知道听到的是哪个字 */
  it('16 个整体认读音节都标了载体字', () => {
    const shown = ALL_CHART_CARDS.filter(
      (card) => INTEGRAL_FORMS.has(card.form) && card.carrier !== undefined,
    )
    expect(shown.length).toBe(INTEGRAL_FORMS.size)
  })
})

describe('分组挂的知识点必须真实存在', () => {
  it('kpId 都能在拼音知识点里找到', () => {
    const known = new Set(pinyinKnowledgePoints.map((kp) => kp.id))
    for (const group of PINYIN_CHART) {
      expect(group.kpIds.length, `${group.name} 没挂知识点`).toBeGreaterThan(0)
      for (const kpId of group.kpIds) {
        expect(known.has(kpId), `${group.name} 挂了不存在的知识点 ${kpId}`).toBe(true)
      }
    }
  })
})
