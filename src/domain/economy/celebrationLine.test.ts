import { describe, expect, it } from 'vitest'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import {
  CELEBRATION_TAIL_CLIPS,
  celebrationLine,
} from '@/domain/economy/celebrationLine'

describe('celebrationLine', () => {
  it('家具：星星变成了它，是她的', () => {
    const line = celebrationLine({
      label: '地毯',
      clipKey: 'shop.rug',
      kind: 'room',
      pending: false,
    })

    expect(line.text).toBe('地毯，是你的啦')
    expect(line.utterance.parts).toEqual(['shop.rug', 'phrase.itsYours'])
  })

  it('零食：三只一起吃，谢的是她', () => {
    const line = celebrationLine({
      label: '小饼干',
      clipKey: 'shop.cookie',
      kind: 'treat',
      pending: false,
    })

    expect(line.text).toBe('小饼干，大家一起吃，谢谢你')
    expect(line.utterance.parts).toEqual(['shop.cookie', 'phrase.feastThanks'])
  })

  it('现实券待兑现时不说「是你的啦」—— 东西还在爸爸妈妈那儿', () => {
    const line = celebrationLine({
      label: '一个冰淇淋',
      clipKey: 'shop.icecream',
      kind: 'real',
      pending: true,
    })

    expect(line.text).toBe('一个冰淇淋，已经告诉爸爸妈妈啦')
    expect(line.utterance.parts).toEqual(['shop.icecream', 'phrase.toldParents'])
  })

  it('待兑现优先于大类：零食券也该说「告诉爸爸妈妈」', () => {
    const line = celebrationLine({
      label: '一包小零食',
      clipKey: 'shop.snackSmall',
      kind: 'real',
      pending: true,
    })

    expect(line.text).toContain('已经告诉爸爸妈妈啦')
  })

  /**
   * ⭐ 这条是本模块存在的理由：绝不「前半句片段 + 后半句 TTS」。
   * 一句话里两个音色比全程机器音更出戏（design/07 §2.5b）。
   */
  it('商品名没有片段时整句降级为 TTS，绝不半片段半 TTS', () => {
    const line = celebrationLine({ label: '神秘礼物', kind: 'real', pending: true })

    expect(line.utterance.parts).toEqual([])
    expect(line.utterance.fallbackText).toBe('神秘礼物，已经告诉爸爸妈妈啦')
  })

  it('兜底文本与屏幕文本永远逐字一致', () => {
    for (const pending of [true, false]) {
      for (const kind of ['room', 'treat', 'real'] as const) {
        const line = celebrationLine({ label: '大蛋糕', clipKey: 'shop.cake', kind, pending })
        expect(line.utterance.fallbackText).toBe(line.text)
      }
    }
  })

  /**
   * ⭐ 屏幕上写着 A、耳朵里听到 B —— 这类漂移谁也不会主动去核对，
   * 只能靠测试拦。片段的实际念词由 voiceManifest 决定，这里逐字对齐。
   */
  it('后半句片段念的词与屏幕文本一致', () => {
    const cases = [
      { kind: 'room', pending: false, tail: 'phrase.itsYours' },
      { kind: 'treat', pending: false, tail: 'phrase.feastThanks' },
      { kind: 'real', pending: true, tail: 'phrase.toldParents' },
    ] as const

    for (const { kind, pending, tail } of cases) {
      const line = celebrationLine({ label: 'X', clipKey: 'shop.rug', kind, pending })
      expect(line.text).toBe(`X，${VOICE_MANIFEST[tail]}`)
    }
  })

  it('三条后半句都在语音清单里 —— 少一条那句话就整句掉成机器音', () => {
    expect(CELEBRATION_TAIL_CLIPS).toHaveLength(3)
    for (const key of CELEBRATION_TAIL_CLIPS) {
      expect(VOICE_MANIFEST[key], `${key} 不在语音清单里`).toBeDefined()
    }
  })
})
