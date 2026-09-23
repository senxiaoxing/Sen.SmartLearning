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
   * ⭐⭐ 声母韵母**一个都不借例词**（2026-09）。
   *
   * 历史上为借例词做过两次取舍：2026-08 把 d/n/l/ei/ün/eng/ci 从
   * 「弟/你/里/飞/云/风/词」掰回呼读音；而 `ong` 一直摆在「借松」上，
   * 因为汉语里它不能独立成音节、也找不到呼读字。
   *
   * 换成真人录音之后连那个将就也不需要了——`pinyinv3.ong` 就是干净的韵母本音。
   * 2026-09-23 换权威音源时整体认读也不标了（念的是音节本身、16 条全是一声），
   * 于是**这张表里一张标 carrier 的卡都没有**。
   */
  it('一张卡都不标载体字', () => {
    const marked = ALL_CHART_CARDS.filter((card) => card.carrier !== undefined).map((c) => c.form)

    expect(marked).toEqual([])
  })

  /**
   * ⭐⭐ 63 张卡全走 `pinyinv3.*`，一张卡一条片段。
   *
   * 这是这面墙最重要的一条不变量：卡面写 `f` 却播「佛 fó」，
   * 孩子听到的是一个**完整音节**而不是声母，而教材要的是「读得轻短些」。
   * 走错轨道的表现是「听着别扭」而不是报错，只有这条断言拦得住。
   *
   * ⚠️ `/^pinyinv3\./` 里的点必须转义。
   * ⛔ **题目那 118 条 `pinyin.*` 不在这条轨道上**：选项显示 `fó` 就得播 `fó`，
   *    就地换成这一套会让 P8.3 一类的题没有正确答案。
   *
   * @see design/11-拼音真人录音方案.md §3.1
   */
  it('63 张卡全走权威音源，一条片段都不共用', () => {
    for (const card of ALL_CHART_CARDS) {
      expect(
        card.clipKey,
        `「${card.form}」的片段 ${card.clipKey} 走错了轨道`,
      ).toMatch(/^pinyinv3\./)
    }
    const keys = ALL_CHART_CARDS.map((card) => card.clipKey)
    expect(new Set(keys).size, '有两张卡共用同一条片段').toBe(keys.length)
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
