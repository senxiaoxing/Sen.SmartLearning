/**
 * @file 古诗数据的一致性测试
 * @layer data
 * @see src/data/seed/poems.ts
 *
 * ⭐ 这个文件守的是**拼音与汉字对不齐**。
 *
 * 孩子是照着上下两行对着念的：拼音一行、汉字一行，一个字对一个音节。
 * 少写一个音节，后面全部错位，而她会把音安到隔壁的字上——
 * 屏幕上一切正常，没有任何报错，只有懂拼音的人凑巧看一眼才会发现。
 * 这与「干扰项退化成随机数」是同一类问题：错得安静。
 */

import { describe, expect, it } from 'vitest'
import { POEM_COVERS, POEMS, poemById } from '@/data/seed/poems'
import { hasClip } from '@/data/seed/voiceManifest'
import { poemLineClipKey, poemMeaningClipKey, poemTitleClipKey } from '@/domain/poem'

/** 诗句里的标点，计字数时要去掉 */
const PUNCTUATION = /[，。？！、；：]/g

/** 一句诗有几个字（不含标点） */
function charCount(text: string): number {
  return [...text.replace(PUNCTUATION, '')].length
}

/** 一行拼音有几个音节 */
function syllableCount(pinyin: string): number {
  return pinyin.trim().split(/\s+/).length
}

describe('古诗 20 首', () => {
  it('正好 20 首，id 不重复', () => {
    expect(POEMS).toHaveLength(20)
    expect(new Set(POEMS.map((p) => p.id)).size).toBe(20)
  })

  it('id 只含小写字母与数字 —— 它要进语音片段 key', () => {
    for (const poem of POEMS) {
      expect(poem.id, `${poem.title} 的 id 不合规`).toMatch(/^[a-z0-9]+$/)
    }
  })

  it('标题、朝代、作者、译文都不为空', () => {
    for (const poem of POEMS) {
      expect(poem.title.length, `${poem.id} 缺标题`).toBeGreaterThan(0)
      expect(poem.dynasty.length, `${poem.id} 缺朝代`).toBeGreaterThan(0)
      expect(poem.author.length, `${poem.id} 缺作者`).toBeGreaterThan(0)
      expect(poem.meaning.length, `${poem.id} 缺译文`).toBeGreaterThan(0)
    }
  })

  it('poemById 能查到每一首', () => {
    for (const poem of POEMS) {
      expect(poemById(poem.id)).toBe(poem)
    }
    expect(poemById('不存在的诗')).toBeUndefined()
  })
})

describe('⭐ 拼音必须与汉字逐字对齐', () => {
  it.each(POEMS.map((poem) => [poem.title, poem] as const))('%s', (_title, poem) => {
    poem.lines.forEach((line, index) => {
      expect(
        syllableCount(line.pinyin),
        `${poem.title} 第 ${index + 1} 句「${line.text}」有 ${charCount(line.text)} 个字，` +
          `拼音却有 ${syllableCount(line.pinyin)} 个音节`,
      ).toBe(charCount(line.text))
    })
  })

  it('拼音里不含标点 —— 标点会被当成音节数进去', () => {
    for (const poem of POEMS) {
      for (const line of poem.lines) {
        expect(line.pinyin, `${poem.title}「${line.text}」的拼音里有标点`).not.toMatch(PUNCTUATION)
      }
    }
  })
})

describe('⭐ 改写给 TTS 的句子只换字、不改结构', () => {
  /**
   * `spoken` 是拿同音字换掉 TTS 会读错的那个字（「曲项」→「屈项」）。
   * 换字不该改变字数——字数变了说明改写把句子整个重写了，
   * 那朗读出来就和屏幕上的诗对不上了。
   */
  it('spoken 与原文字数一致', () => {
    const rewritten = POEMS.flatMap((poem) =>
      poem.lines.filter((line) => line.spoken !== undefined).map((line) => [poem, line] as const),
    )

    // 这不是断言而是提示：改写是有代价的手段，数量应该保持在个位数
    expect(rewritten.length).toBeGreaterThan(0)

    for (const [poem, line] of rewritten) {
      expect(
        charCount(line.spoken ?? ''),
        `${poem.title}「${line.text}」的改写「${line.spoken}」字数变了`,
      ).toBe(charCount(line.text))
    }
  })
})

describe('诗单封面', () => {
  it('每首诗都有封面，且不重复', () => {
    for (const poem of POEMS) {
      expect(POEM_COVERS[poem.id], `${poem.title} 没有封面`).toBeDefined()
    }
    const covers = POEMS.map((poem) => POEM_COVERS[poem.id])
    // 重复过一次：江南与小池都用了莲花 🪷，诗单上并排看就是同一张图
    expect(new Set(covers).size, `有重复的封面：${covers.join(' ')}`).toBe(covers.length)
  })

  /**
   * ⭐ 与识字卡同一条规矩，理由见 `hanziCards.test.ts` 的对应用例：
   * Unicode 13+ 的 emoji 在 Windows 与旧版 iOS 上是空方框。
   * 莲花 🪷（14.0）就在这里栽过，江南与小池两首同时变成方框。
   */
  it('封面不含 Unicode 13+ 的新 emoji', () => {
    const NEW_EMOJI_FLOOR = 0x1fa96

    for (const [id, cover] of Object.entries(POEM_COVERS)) {
      for (const ch of cover) {
        const code = ch.codePointAt(0) ?? 0
        expect(
          code,
          `${id} 的封面 ${cover}（U+${code.toString(16).toUpperCase()}）太新，老系统上是空方框`,
        ).toBeLessThan(NEW_EMOJI_FLOOR)
      }
    }
  })

  it('没有多余的封面 —— 键必须都对应一首真实的诗', () => {
    const ids = new Set(POEMS.map((poem) => poem.id))
    for (const id of Object.keys(POEM_COVERS)) {
      expect(ids.has(id), `POEM_COVERS 里的 ${id} 不是任何一首诗`).toBe(true)
    }
  })
})

describe('⭐ 每一条语音片段都必须在清单里', () => {
  it('诗题、每一句、译文都有片段', () => {
    for (const poem of POEMS) {
      expect(hasClip(poemTitleClipKey(poem.id)), `${poem.title} 的诗题没有片段`).toBe(true)
      expect(hasClip(poemMeaningClipKey(poem.id)), `${poem.title} 的译文没有片段`).toBe(true)

      poem.lines.forEach((line, index) => {
        expect(
          hasClip(poemLineClipKey(poem.id, index)),
          `${poem.title}「${line.text}」没有片段`,
        ).toBe(true)
      })
    }
  })
})
