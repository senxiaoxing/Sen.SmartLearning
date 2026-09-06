/**
 * @file 英语短文的内容校验 —— ⭐ 这一块的全部价值压在第一条测试上
 * @layer data
 * @see src/data/seed/englishStories.ts
 * @see src/data/seed/englishSightWords.ts
 *
 * 短文存在的唯一意义是「**她读得懂**」。一旦混进她没学过的词，
 * 它就退化成又一堆读不下去的英文——而那正是这一块要解决的问题本身。
 *
 * 这条界线肉眼守不住：一篇六句的短文里混进一个 `because`，
 * 读起来通顺得很，没有人会发现。所以只能逐词扫。
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_ENGLISH_STORIES,
  ENGLISH_STORY_VOLUMES,
  ENGLISH_STORY_WORDS,
  englishStoryById,
  storyWordClipKey,
} from '@/data/seed/englishStories'
import { SIGHT_WORD_LEVELS, sightWordsUpToVolume } from '@/data/seed/englishSightWords'
import { hasClip } from '@/data/seed/voiceManifest'
import { normalizeEnglishWord, storyLineWords } from '@/domain/englishStory'
import type { EnglishStory } from '@/domain/englishStory'

/** 一篇短文里出现的全部词（含标题），已规范化、去掉空串 */
function wordsOf(story: EnglishStory): string[] {
  return [story.title, ...story.lines.map((line) => line.en)]
    .flatMap((en) => storyLineWords({ en, zh: '' }))
    .map((token) => token.word)
    .filter((word) => word.length > 0)
}

/**
 * 这个词她读得懂吗。
 *
 * ⚠️ 复数与第三人称单数**放行**（去掉词尾的 `s` / `es` 再查一遍）：
 * `two apples` 里的 `apples` 就是 `apple` 加个 s，一年级英语第一课就讲。
 * 但点读那边**不做**这个还原（见 `storyWordClipKey`）——
 * 「读得懂」和「屏幕耳朵要一致」是两条不同的标准，故意不对称。
 */
function isReadable(word: string, sight: ReadonlySet<string>): boolean {
  const known = (w: string) => sight.has(w) || ENGLISH_STORY_WORDS.has(w)
  if (known(word)) return true

  for (const suffix of ['s', 'es']) {
    if (word.endsWith(suffix) && known(word.slice(0, -suffix.length))) return true
  }
  return false
}

describe('⭐ 用词不越界 —— 守不住这条，这一块就没有存在意义', () => {
  it('每篇短文只用「本辑及之前的高频词」＋ 英语词表里的实词', () => {
    const problems: string[] = []

    ENGLISH_STORY_VOLUMES.forEach((volume, index) => {
      const sight = sightWordsUpToVolume(index)
      const laterSight = sightWordsUpToVolume(SIGHT_WORD_LEVELS.length - 1)

      for (const story of volume.stories) {
        for (const word of wordsOf(story)) {
          if (isReadable(word, sight)) continue
          // 分两种报法：在后面的级里，是**分级错了**（最危险的一种，
          // 因为读起来完全通顺）；压根不在任何表里的，是该换个说法
          const where = isReadable(word, laterSight) ? '是后面辑才学的词' : '不在任何词表里'
          problems.push(`${volume.name}《${story.title}》的「${word}」${where}`)
        }
      }
    })

    expect(problems).toEqual([])
  })

  it('三级高频词表都不为空，且级与辑一一对应', () => {
    expect(SIGHT_WORD_LEVELS.length).toBe(ENGLISH_STORY_VOLUMES.length)
    for (const level of SIGHT_WORD_LEVELS) {
      expect(level.length).toBeGreaterThan(0)
    }
  })

  it('高频词表全是小写单词 —— 查表前会先转小写，大写项永远命不中', () => {
    for (const word of SIGHT_WORD_LEVELS.flat()) {
      expect(word, `「${word}」不是小写单词`).toMatch(/^[a-z']+$/)
    }
  })

  it('高频词表里没有重复项', () => {
    const all = SIGHT_WORD_LEVELS.flat()
    const seen = new Set<string>()
    const dupes = all.filter((word) => (seen.has(word) ? true : (seen.add(word), false)))
    expect(dupes, `重复的高频词：${dupes.join(' ')}`).toEqual([])
  })
})

describe('⛔ 版权红线 —— 仓库是公开的', () => {
  it('出处只能是「自己写的」', () => {
    // 类型上就只有这一个取值，这条测试守的是「有人把类型改宽了」
    for (const story of ALL_ENGLISH_STORIES) {
      expect(story.source, `《${story.title}》的出处不对`).toBe('自己写的')
    }
  })
})

describe('⛔ 这一块零新增语音', () => {
  /**
   * 短文不带朗读，唯一会响的是单个词，用的是英语词表早就有的片段。
   * 这条测试守的是「有人为短文补了一批 `en.story*` 片段」——
   * 那会让「语音包到二年级为止」这条红线从「一个字都不用改」变成要重新算账。
   */
  it('点词用的片段全部来自现有词表', () => {
    const problems: string[] = []
    for (const story of ALL_ENGLISH_STORIES) {
      for (const word of wordsOf(story)) {
        const key = storyWordClipKey(word)
        if (key === undefined) continue
        if (!key.startsWith('en.')) problems.push(`《${story.title}》的「${word}」用了 ${key}`)
        if (!hasClip(key)) problems.push(`《${story.title}》的「${word}」片段 ${key} 不在清单里`)
      }
    }
    expect(problems).toEqual([])
  })

  it('⚠️ 点词不做复数还原 —— 屏幕上是 cats 就不能念出 cat', () => {
    expect(storyWordClipKey('cat')).toBe('en.cat')
    expect(storyWordClipKey('cats')).toBeUndefined()
  })

  it('⚠️ 字母词条不参与点读 —— 点 a 不该念出「A is for apple.」', () => {
    // 字母的片段念的是整句，把它接到短文里的冠词 a 上，
    // 一个虚词会变成一堂字母课
    expect(storyWordClipKey('a')).toBeUndefined()
  })

  it('高频虚词没有片段，点了只会得到一声轻响', () => {
    for (const word of ['the', 'is', 'and', 'you']) {
      expect(storyWordClipKey(word), `「${word}」不该有片段`).toBeUndefined()
    }
  })
})

describe('结构完整性', () => {
  it('3 辑，每辑至少 5 篇', () => {
    expect(ENGLISH_STORY_VOLUMES).toHaveLength(3)
    for (const volume of ENGLISH_STORY_VOLUMES) {
      expect(volume.stories.length, `${volume.name}篇数太少`).toBeGreaterThanOrEqual(5)
      expect(volume.badge.length, `${volume.id} 缺序号`).toBeGreaterThan(0)
      expect(volume.hint.length, `${volume.id} 缺说明`).toBeGreaterThan(0)
    }
  })

  it('ID 唯一，只用小写字母数字，且不以 vol 开头', () => {
    const ids = ALL_ENGLISH_STORIES.map((story) => story.id)
    expect(new Set(ids).size, `重复的 id：${ids.join(' ')}`).toBe(ids.length)

    for (const story of ALL_ENGLISH_STORIES) {
      expect(story.id, `${story.id} 格式不对`).toMatch(/^[a-z0-9]+$/)
      expect(story.id.startsWith('vol'), `${story.id} 不能以 vol 开头`).toBe(false)
    }
  })

  it('每篇都有中英标题、图和至少两句，每句都有中文意思', () => {
    for (const story of ALL_ENGLISH_STORIES) {
      expect(story.title.length, `${story.id} 没英文标题`).toBeGreaterThan(0)
      expect(story.titleZh.length, `${story.id} 没中文标题`).toBeGreaterThan(0)
      expect(story.emoji.length, `${story.id} 没图`).toBeGreaterThan(0)
      expect(story.lines.length, `${story.id} 只有一句，算不上短文`).toBeGreaterThanOrEqual(2)

      for (const line of story.lines) {
        expect(line.zh.trim().length, `《${story.title}》「${line.en}」缺中文`).toBeGreaterThan(0)
      }
    }
  })

  it('图互不重复，也不含 Unicode 13+ 的新 emoji', () => {
    const NEW_EMOJI_FLOOR = 0x1fa96

    const emojis = ALL_ENGLISH_STORIES.map((story) => story.emoji)
    expect(new Set(emojis).size, `有重复的图：${emojis.join(' ')}`).toBe(emojis.length)

    for (const story of ALL_ENGLISH_STORIES) {
      for (const ch of story.emoji) {
        const code = ch.codePointAt(0) ?? 0
        expect(code, `《${story.title}》的图太新，老系统上是空方框`).toBeLessThan(NEW_EMOJI_FLOOR)
      }
    }
  })

  it('englishStoryById 找得到，找不到时返回 undefined', () => {
    expect(englishStoryById('mylittlecat')?.title).toBe('My Little Cat')
    expect(englishStoryById('meiyouzhepian')).toBeUndefined()
  })
})

describe('逐词拆分（storyLineWords）', () => {
  it('标点跟着前一个词走 —— 句号独占一格时折行会把它甩到下一行', () => {
    const tokens = storyLineWords({ en: 'I see a cat.', zh: '我看见一只猫。' })

    expect(tokens.map((t) => t.text)).toEqual(['I', 'see', 'a', 'cat.'])
    expect(tokens.map((t) => t.word)).toEqual(['i', 'see', 'a', 'cat'])
  })

  it('⭐ 词内的撇号留着 —— 剥掉就成了另一个词', () => {
    const tokens = storyLineWords({ en: "It's my dog.", zh: '这是我的狗。' })
    expect(tokens[0]).toEqual({ text: "It's", word: "it's" })
  })

  it('引号被剥掉，词本身留下', () => {
    const tokens = storyLineWords({ en: '"I did it!" she said.', zh: '「我做到啦！」她说。' })
    expect(tokens.map((t) => t.word)).toEqual(['i', 'did', 'it', 'she', 'said'])
  })

  it('normalizeEnglishWord 与拆分用的是同一套规则', () => {
    expect(normalizeEnglishWord('Cat.')).toBe('cat')
    expect(normalizeEnglishWord('"Thank')).toBe('thank')
    expect(normalizeEnglishWord('...')).toBe('')
  })

  it('每篇每句都拆得出至少一个词', () => {
    for (const story of ALL_ENGLISH_STORIES) {
      for (const line of story.lines) {
        expect(storyLineWords(line).length, `《${story.title}》「${line.en}」拆不出词`).toBeGreaterThan(0)
      }
    }
  })
})
