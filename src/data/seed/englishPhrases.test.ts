/**
 * @file 英语短语短句的一致性测试
 * @layer data
 * @see src/data/seed/englishPhrases.ts
 *
 * ⭐ 这个文件守的是**静音**与**编号错位**。
 *
 * 这一页的全部内容都是听的：句子缺片段就整句降级成机器音（静默发生），
 * 而编号一旦与文件里的书写顺序对不上，表现是「点第三句、念出第二句」——
 * 屏幕上一切正常，只有耳朵听得出来，而她还不识字，说不出哪里不对。
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_PHRASE_TOPICS,
  PHRASE_VOLUMES,
  phraseTopicById,
} from '@/data/seed/englishPhrases'
import { hasClip } from '@/data/seed/voiceManifest'
import {
  phraseLineClipKey,
  phraseLineClipKeys,
  phraseLineUtterance,
  wholeTopicUtterance,
} from '@/domain/englishPhrase'

/** 一辑几个话题、一个话题几句。⚠️ 加内容时连同生成脚本的断言一起改 */
const TOPICS_PER_VOLUME = 6
const LINES_PER_TOPIC = 6

describe('分辑', () => {
  it('3 辑，每辑 6 个话题', () => {
    expect(PHRASE_VOLUMES).toHaveLength(3)
    for (const volume of PHRASE_VOLUMES) {
      expect(volume.topics.length, `${volume.name}的话题数不对`).toBe(TOPICS_PER_VOLUME)
    }
  })

  it('每辑都有序号、名字和说明 —— 孩子不识字，认的是那个数字', () => {
    for (const volume of PHRASE_VOLUMES) {
      expect(volume.badge.length, `${volume.id} 缺序号`).toBeGreaterThan(0)
      expect(volume.name.length, `${volume.id} 缺名字`).toBeGreaterThan(0)
      expect(volume.hint.length, `${volume.id} 缺说明`).toBeGreaterThan(0)
    }
  })

  it('ALL_PHRASE_TOPICS 就是三辑按顺序摊平 —— 顺序即难度梯度，不能被重排', () => {
    expect(ALL_PHRASE_TOPICS.map((topic) => topic.id)).toEqual(
      PHRASE_VOLUMES.flatMap((volume) => volume.topics.map((topic) => topic.id)),
    )
  })
})

describe('话题结构', () => {
  it('每个话题正好 6 句', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(topic.lines.length, `${topic.title} 的句数不对`).toBe(LINES_PER_TOPIC)
    }
  })

  it('id 唯一，且只含 ASCII 字母数字 —— 它要进语音片段 key', () => {
    const ids = ALL_PHRASE_TOPICS.map((topic) => topic.id)
    expect(new Set(ids).size, `重复的话题 id：${ids.join(' ')}`).toBe(ids.length)

    for (const topic of ALL_PHRASE_TOPICS) {
      expect(topic.id, `${topic.title} 的 id 不合规`).toMatch(/^[a-zA-Z0-9]+$/)
    }
  })

  /**
   * ⭐ `scripts/generate-voices.mjs` 的 `loadPhrases()` 逐行扫这个文件，
   * 见到一行 `id: 'xxx',` 就当成「一个新话题开始」。辑的声明里也有 `id: 'vol1',`，
   * 脚本靠 `vol` 前缀把它认出来跳过——话题 id 要是也叫 volxxx，
   * 那个话题的全部片段会被静默丢掉，表现是「点进去整组没声音」。
   */
  it('话题 id 不以 vol 开头 —— 那是辑的前缀，语音脚本靠它区分', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(topic.id.startsWith('vol'), `${topic.title} 的 id 与辑的前缀撞了`).toBe(false)
    }
  })

  it('中英标题、图都不为空', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(topic.title.length, `${topic.id} 缺中文名`).toBeGreaterThan(0)
      expect(topic.titleEn.length, `${topic.id} 缺英文名`).toBeGreaterThan(0)
      expect(topic.emoji.length, `${topic.id} 缺图`).toBeGreaterThan(0)
    }
  })

  it('每句都有英文和中文意思', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      for (const line of topic.lines) {
        expect(line.en.trim().length, `${topic.title} 有一句缺英文`).toBeGreaterThan(0)
        expect(line.zh.trim().length, `${topic.title}「${line.en}」缺中文`).toBeGreaterThan(0)
      }
    }
  })

  /**
   * ⭐ 英文里混进全角字符是这一块最容易犯、也最难看出来的错。
   *
   * 弯引号（’）与全角问号（？）在屏幕上和半角几乎一样，
   * 但送去 TTS 时会被当成另一个符号，轻则停顿古怪，重则整句读法变形。
   * 中文标点更是直接写错了内容。
   */
  it('英文原文只含半角可打印 ASCII', () => {
    const problems: string[] = []
    for (const topic of ALL_PHRASE_TOPICS) {
      for (const line of topic.lines) {
        if (!/^[\x20-\x7E]+$/.test(line.en)) {
          problems.push(`${topic.title}「${line.en}」含非 ASCII 字符`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  /**
   * 与识字卡、诗单封面同一条规矩：Unicode 13+ 的 emoji 在 Windows 与
   * 旧版 iOS 上是空方框。莲花 🪷 在诗单上栽过一次。
   */
  it('话题的图互不重复，也不含 Unicode 13+ 的新 emoji', () => {
    const NEW_EMOJI_FLOOR = 0x1fa96

    const emojis = ALL_PHRASE_TOPICS.map((topic) => topic.emoji)
    expect(new Set(emojis).size, `有重复的图：${emojis.join(' ')}`).toBe(emojis.length)

    for (const topic of ALL_PHRASE_TOPICS) {
      for (const ch of topic.emoji) {
        const code = ch.codePointAt(0) ?? 0
        expect(
          code,
          `${topic.title} 的图 ${topic.emoji}（U+${code.toString(16).toUpperCase()}）太新，老系统上是空方框`,
        ).toBeLessThan(NEW_EMOJI_FLOOR)
      }
    }
  })

  it('phraseTopicById 能查到每一个', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(phraseTopicById(topic.id)).toBe(topic)
    }
    expect(phraseTopicById('meiyouzhege')).toBeUndefined()
  })
})

describe('⭐ 每一条语音片段都必须在清单里', () => {
  it('每个话题的每一句都有片段', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      topic.lines.forEach((line, index) => {
        expect(
          hasClip(phraseLineClipKey(topic.id, index)),
          `${topic.title}「${line.en}」没有片段`,
        ).toBe(true)
      })
    }
  })

  it('片段 key 全局唯一 —— 撞车会让两句共用一条音频', () => {
    const keys = ALL_PHRASE_TOPICS.flatMap((topic) => phraseLineClipKeys(topic))
    expect(new Set(keys).size, '有重复的片段 key').toBe(keys.length)
  })

  it('片段 key 符合清单的命名规范', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      for (const key of phraseLineClipKeys(topic)) {
        expect(key, `${key} 不符合 <类别>.<标识> 规范`).toMatch(/^[a-z]+\.[A-Za-z0-9]+$/)
      }
    }
  })
})

describe('⭐ 兜底朗读必须标英语', () => {
  /**
   * 片段缺失时 `say()` 会拿 `fallbackText` 走系统 TTS。
   * 不标 `en-US` 的话中文引擎会念 `Hello`——那是教错音，
   * 比没有声音严重得多（design/07 §3.3 的拼音教训）。
   */
  it('单句与整组都标了 en-US', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(wholeTopicUtterance(topic).lang, `${topic.title} 整组朗读没标英语`).toBe('en-US')

      topic.lines.forEach((line, index) => {
        expect(
          phraseLineUtterance(topic.id, index, line).lang,
          `${topic.title}「${line.en}」没标英语`,
        ).toBe('en-US')
      })
    }
  })

  it('整组朗读的片段顺序就是句子顺序', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(wholeTopicUtterance(topic).parts).toEqual(phraseLineClipKeys(topic))
    }
  })

  it('兜底文本非空 —— 绝不能出现「什么也没听到」', () => {
    for (const topic of ALL_PHRASE_TOPICS) {
      expect(wholeTopicUtterance(topic).fallbackText.length).toBeGreaterThan(0)
    }
  })
})
