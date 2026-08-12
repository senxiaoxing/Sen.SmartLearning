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
  poemHeadText,
  poemLineClipKeys,
  poemTitleClipKey,
  wholePoemUtterance,
} from '@/domain/poem'

const JINGYESI = POEMS.find((poem) => poem.id === 'jingyesi')!

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

describe('wholePoemUtterance', () => {
  it('⭐ 从报诗名那一句开始 —— 报诗名本来就是背诗的一部分', () => {
    const utterance = wholePoemUtterance(JINGYESI)

    expect(utterance.parts[0]).toBe(poemTitleClipKey(JINGYESI.id))
    expect(utterance.parts.slice(1)).toEqual(poemLineClipKeys(JINGYESI))
  })

  it('兜底文本也从报诗名开始 —— 片段缺失时不能只念诗文', () => {
    expect(wholePoemUtterance(JINGYESI).fallbackText.startsWith('静夜思。唐，李白。')).toBe(true)
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
