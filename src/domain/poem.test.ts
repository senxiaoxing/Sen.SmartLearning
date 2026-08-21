/**
 * @file 古诗朗读组装的测试
 * @layer domain
 * @see src/domain/poem.ts
 *
 * ⭐ 这个文件守的是两件**只影响听感、回退了没人会发现**的事：
 * 读整首要从报诗名开始，句与句之间要留出换气的停顿。
 * 两者都不会报错、不会崩，只有真的坐下来听一遍才察觉——
 * 而那正是最容易在重构里被顺手抹掉的东西。
 */

import { describe, expect, it } from 'vitest'
import { POEMS } from '@/data/seed/poems'
import {
  poemHeadSpokenText,
  poemHeadText,
  poemLineClipKeys,
  poemTitleClipKey,
  wholePoemUtterance,
} from '@/domain/poem'

const JINGYESI = POEMS.find((poem) => poem.id === 'jingyesi')!
/** 诗名里带多音字的那首：「华山」的华读 huà，报题句必须换字才念得对 */
const HUASHAN = POEMS.find((poem) => poem.id === 'yonghuashan')!

describe('poemHeadText', () => {
  it('念的是「诗名。朝代，作者。」', () => {
    expect(poemHeadText(JINGYESI)).toBe('静夜思。唐，李白。')
  })

  it('每首诗都拼得出报题句，且含诗名与作者', () => {
    for (const poem of POEMS) {
      const head = poemHeadText(poem)
      expect(head).toContain(poem.title)
      expect(head).toContain(poem.dynasty)
      expect(head).toContain(poem.author)
    }
  })
})

describe('poemHeadSpokenText', () => {
  it('没填 headSpoken 时就是报题句本身', () => {
    expect(poemHeadSpokenText(JINGYESI)).toBe('静夜思。唐，李白。')
  })

  it('⭐ 填了就用改写版 —— 诗名里的多音字只有换字才念得对', () => {
    expect(poemHeadSpokenText(HUASHAN)).toBe('咏化山。宋，寇准。')
  })

  it('⭐ 屏幕上的那一份不受影响，仍是原文', () => {
    expect(poemHeadText(HUASHAN)).toBe('咏华山。宋，寇准。')
  })
})

describe('wholePoemUtterance', () => {
  it('⭐ 从报诗名那一句开始 —— 报诗名本来就是背诗的一部分', () => {
    const utterance = wholePoemUtterance(JINGYESI)

    expect(utterance.parts[0]).toBe(poemTitleClipKey(JINGYESI.id))
    expect(utterance.parts.slice(1)).toEqual(poemLineClipKeys(JINGYESI))
  })

  it('兜底文本也从报诗名开始 —— 片段缺失时不能只念诗文', () => {
    expect(wholePoemUtterance(JINGYESI).fallbackText.startsWith('静夜思。唐，李白。')).toBe(true)
  })

  /**
   * ⭐ 掉回系统 TTS 时读音也得对。
   *
   * 兜底那条路平时不走，一走就是「音频没下全」这种本来就没人盯着的时候——
   * 如果它念的是原文，表现就是「平时读对、偶尔读错」，比一直读错更难发现。
   */
  it('⭐ 兜底文本走改写版，不会掉回错读音', () => {
    const fallback = wholePoemUtterance(HUASHAN).fallbackText

    expect(fallback.startsWith('咏化山。宋，寇准。'), '报诗名掉回了会读错的原文').toBe(true)
  })

  it('⭐ 句间留出换气的停顿，明显长于播放器 80ms 的词间默认值', () => {
    const gap = wholePoemUtterance(JINGYESI).gap

    expect(gap, '句间停顿被抹掉了，四句会连成一口气').toBeDefined()
    // 下限：默认词间间隔的三倍以上，否则等于没加
    expect(gap!).toBeGreaterThan(0.24)
    // 上限：0.85s 是 TTS 自己在句号处的停顿，超过它就不像同一首诗了
    expect(gap!).toBeLessThanOrEqual(0.85)
  })

  it('每首诗的片段数 = 1 句报题 + 全部诗句', () => {
    for (const poem of POEMS) {
      expect(wholePoemUtterance(poem).parts).toHaveLength(poem.lines.length + 1)
    }
  })
})
