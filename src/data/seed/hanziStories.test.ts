/**
 * @file 短文的内容校验 —— ⭐ 这一块的全部价值压在第一条测试上
 * @layer data
 * @see design/09-竞品借鉴.md §2.1
 *
 * 短文存在的唯一意义是「**她读得懂**」。一旦混进本辑之后才学的字，
 * 它就退化成又一堆她读不懂的课文——而那正是识字墙已经解决过的问题。
 *
 * 这条界线肉眼守不住：一篇 50 字的短文里混进一个第三辑的「很」，
 * 读起来通顺得很，没有人会发现。所以只能逐字扫。
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_STORIES,
  KNOWN_HANZI,
  STORY_GLUE,
  STORY_VOLUMES,
  charsUpToVolume,
  storyById,
} from '@/data/seed/hanziStories'
import { storyCharCount, storyLineChars } from '@/domain/story'

/** 一篇短文里出现的全部汉字（含标题，不含标点） */
function charsOf(story: (typeof ALL_STORIES)[number]): string[] {
  const text = story.title + story.lines.map((l) => l.text).join('')
  return [...text].filter((c) => storyCharCount(c) === 1)
}

describe('⭐ 用字不越界 —— 守不住这条，这一块就没有存在意义', () => {
  it('每篇短文只用「本辑及之前学过的字」＋ 粘合虚词', () => {
    const problems: string[] = []

    STORY_VOLUMES.forEach((volume, index) => {
      const learned = charsUpToVolume(index)
      for (const story of volume.stories) {
        for (const char of charsOf(story)) {
          if (learned.has(char)) continue
          if (char in STORY_GLUE) continue
          // 分两种报法：在表内但排在后面的辑，是**分级错了**（最危险的一种，
          // 因为读起来完全通顺）；压根不在表里的，是漏加粘合词或该换个说法
          const where = KNOWN_HANZI.has(char) ? '是后面辑才学的字' : '不在识字 300 表内'
          problems.push(`${volume.name}《${story.title}》的「${char}」${where}`)
        }
      }
    })

    expect(problems).toEqual([])
  })

  it('⚠️ 粘合虚词必须真的在识字 300 表外', () => {
    // 把一个表内字写进 STORY_GLUE，后果是它在短文里失去颜色和读音——
    // 等于把她学过的字藏起来。而测试之外没人看得出来。
    const wrong = Object.keys(STORY_GLUE).filter((c) => KNOWN_HANZI.has(c))
    expect(wrong, `这些字在识字表内，不该当粘合词：${wrong.join('')}`).toEqual([])
  })

  it('粘合虚词都是单字，且都带拼音', () => {
    for (const [char, pinyin] of Object.entries(STORY_GLUE)) {
      expect([...char], `「${char}」不是单字`).toHaveLength(1)
      expect(pinyin.length, `「${char}」没有拼音`).toBeGreaterThan(0)
    }
  })
})

describe('拼音逐字对齐 —— 错位一个字，她就把音安到隔壁字上', () => {
  it('每句的拼音个数等于去掉标点后的字数', () => {
    const problems: string[] = []
    for (const story of ALL_STORIES) {
      for (const line of story.lines) {
        const syllables = line.pinyin.split(' ').filter((s) => s.length > 0).length
        const chars = storyCharCount(line.text)
        if (syllables !== chars) {
          problems.push(`《${story.title}》「${line.text}」${chars} 字却有 ${syllables} 个音`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('标题的拼音个数也要对上', () => {
    const problems: string[] = []
    for (const story of ALL_STORIES) {
      const syllables = story.titlePinyin.split(' ').filter((s) => s.length > 0).length
      const chars = storyCharCount(story.title)
      if (syllables !== chars) {
        problems.push(`《${story.title}》标题 ${chars} 字却有 ${syllables} 个音`)
      }
    }
    expect(problems).toEqual([])
  })

  it('⭐ 拼音必须带声调 —— 不带调的拼音教不了读音', () => {
    // 「hao」和「hǎo」在屏幕上都像模像样，但前者念不出来。
    //
    // 轻声字（的 de、了 le、们 men）是例外，它们本来就没有调号。
    // ⚠️ 例外只取 STORY_GLUE 里**真的没有调号**的那几个，不是整张表：
    // 「在 zài」「个 gè」本来就带调，放进例外等于给正文里任何一个
    // 恰好同音的字开了后门。
    const TONELESS_OK = new Set(
      Object.values(STORY_GLUE).filter((p) => !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(p)),
    )
    const problems: string[] = []
    for (const story of ALL_STORIES) {
      const all = [story.titlePinyin, ...story.lines.map((l) => l.pinyin)].join(' ')
      for (const syllable of all.split(' ').filter((s) => s.length > 0)) {
        if (TONELESS_OK.has(syllable)) continue
        if (!/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(syllable)) {
          problems.push(`《${story.title}》的「${syllable}」没有声调`)
        }
      }
    }
    expect(problems).toEqual([])
  })
})

describe('⛔ 版权红线 —— 仓库是公开的', () => {
  it('出处只能是公有领域或自己写的', () => {
    for (const story of ALL_STORIES) {
      expect(['寓言', '古文', '自己写的']).toContain(story.source)
    }
  })
})

describe('结构完整性', () => {
  it('ID 唯一 —— 撞车会让点开哪篇都是同一篇', () => {
    const ids = ALL_STORIES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ID 只用小写字母数字，且不以 vol 开头', () => {
    // 与诗单同一条：vol 是辑的前缀，混用会让分辑按钮和内容撞在一起
    for (const story of ALL_STORIES) {
      expect(story.id, `${story.id} 格式不对`).toMatch(/^[a-z0-9]+$/)
      expect(story.id.startsWith('vol'), `${story.id} 不能以 vol 开头`).toBe(false)
    }
  })

  it('每篇都有标题、图和至少两句', () => {
    for (const story of ALL_STORIES) {
      expect(story.title.length, `${story.id} 没标题`).toBeGreaterThan(0)
      expect(story.emoji.length, `${story.id} 没图`).toBeGreaterThan(0)
      expect(story.lines.length, `${story.id} 只有一句，算不上短文`).toBeGreaterThanOrEqual(2)
    }
  })

  it('storyById 找得到，找不到时返回 undefined', () => {
    expect(storyById('daxue')?.title).toBe('大雪')
    expect(storyById('meiyouzhepian')).toBeUndefined()
  })
})

describe('逐字拆分（storyLineChars）', () => {
  it('⭐ 粘合虚词和别的字拆出来一模一样 —— 渲染层没有任何理由把它们分开', () => {
    // 原先这里断言「表内字标 known、虚词不标」，那个设计上机第一次就被推翻：
    // 孩子问「为什么『了』『的』『也』没有高亮」，差异本身成了最抢眼的东西。
    // 现在拆分结果里根本没有「这个字在不在表里」这一项。
    const line = { text: '大雪白了。', pinyin: 'dà xuě bái le' }
    const chars = storyLineChars(line)

    expect(chars).toHaveLength(5)
    expect(chars[3]).toEqual({ char: '了', pinyin: 'le', punctuation: false })
    // 「白」（表内）与「了」（表外）除了字和音之外没有任何差别
    expect(Object.keys(chars[2] ?? {}).sort()).toEqual(Object.keys(chars[3] ?? {}).sort())
  })

  it('⭐ 标点单独标出来 —— 排版要靠它把句号绑在前一个字后面', () => {
    // 不标的话 UI 只能用「没有拼音」去猜，而折行时句号会被甩到下一行
    // 孤零零占一整行（实测，容器 340px）。见 components/RubyText.tsx
    const chars = storyLineChars({ text: '好看！', pinyin: 'hǎo kàn' })
    expect(chars.map((c) => c.punctuation)).toEqual([false, false, true])
  })

  it('⚠️ 标点不占拼音位 —— 占了的话后面每个字的音都会错开一格', () => {
    const line = { text: '山白了，田也白了。', pinyin: 'shān bái le tián yě bái le' }
    const chars = storyLineChars(line)

    // 「，」之后的「田」必须还是 tián，而不是被标点挤掉一格变成 yě
    const tian = chars.find((c) => c.char === '田')
    expect(tian?.pinyin).toBe('tián')
    expect(chars.find((c) => c.char === '，')?.pinyin).toBeUndefined()
  })

  it('每篇每句都拆得出与原文等长的结果', () => {
    for (const story of ALL_STORIES) {
      for (const line of story.lines) {
        expect(storyLineChars(line)).toHaveLength([...line.text].length)
      }
    }
  })
})
