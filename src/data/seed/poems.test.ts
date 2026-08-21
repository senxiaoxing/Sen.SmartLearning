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
import { POEM_COVERS, POEM_VOLUMES, POEMS, poemById } from '@/data/seed/poems'
import { hasClip } from '@/data/seed/voiceManifest'
import {
  poemHeadText,
  poemLineClipKey,
  poemMeaningClipKey,
  poemTitleClipKey,
} from '@/domain/poem'

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

describe('古诗 60 首', () => {
  it('正好 60 首，id 不重复', () => {
    expect(POEMS).toHaveLength(60)
    expect(new Set(POEMS.map((p) => p.id)).size).toBe(60)
  })

  it('id 只含小写字母与数字 —— 它要进语音片段 key', () => {
    for (const poem of POEMS) {
      expect(poem.id, `${poem.title} 的 id 不合规`).toMatch(/^[a-z0-9]+$/)
    }
  })

  /**
   * ⭐ `scripts/generate-voices.mjs` 的 `loadPoems()` 是逐行扫这个文件的，
   * 见到一行 `id: 'xxx',` 就当成「一首新诗开始」。辑的声明里也有 `id: 'vol1',`，
   * 脚本靠 `vol` 前缀把它认出来跳过——诗的 id 要是也叫 volxxx，
   * 那首诗的全部片段会被静默丢掉，表现是「点进去整首没声音」。
   */
  it('诗的 id 不以 vol 开头 —— 那是辑的前缀，语音脚本靠它区分', () => {
    for (const poem of POEMS) {
      expect(poem.id.startsWith('vol'), `${poem.title} 的 id 与辑的前缀撞了`).toBe(false)
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

/**
 * ⭐ 分辑守的是**每一辑都摆得满、且长度一致**（与识字墙同一条约束）。
 *
 * 某一辑要是只有十几首，页面不会报任何错——她只会觉得第三辑
 * 「怎么这么快就到底了」，而那正是她说「像幼儿园小朋友做的题目」的那种落差。
 */
describe('分辑', () => {
  it('3 辑，每辑 20 首', () => {
    expect(POEM_VOLUMES).toHaveLength(3)
    for (const volume of POEM_VOLUMES) {
      expect(volume.poems.length, `${volume.name}的首数不对`).toBe(20)
    }
  })

  it('每辑都有序号、名字和说明 —— 孩子不识字，认的是那个数字', () => {
    for (const volume of POEM_VOLUMES) {
      expect(volume.badge.length, `${volume.id} 缺序号图标`).toBeGreaterThan(0)
      expect(volume.name.length, `${volume.id} 缺名字`).toBeGreaterThan(0)
      expect(volume.hint.length, `${volume.id} 缺说明`).toBeGreaterThan(0)
    }
  })

  it('辑 id 互不相同', () => {
    const ids = POEM_VOLUMES.map((volume) => volume.id)
    expect(new Set(ids).size, `重复的辑 id：${ids.join(' ')}`).toBe(ids.length)
  })

  it('POEMS 就是三辑按顺序摊平 —— 顺序即难度梯度，不能被重排', () => {
    expect(POEMS.map((poem) => poem.id)).toEqual(
      POEM_VOLUMES.flatMap((volume) => volume.poems.map((poem) => poem.id)),
    )
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

    expect(rewritten.length).toBeGreaterThan(0)

    for (const [poem, line] of rewritten) {
      expect(
        charCount(line.spoken ?? ''),
        `${poem.title}「${line.text}」的改写「${line.spoken}」字数变了`,
      ).toBe(charCount(line.text))
    }
  })

  /**
   * ⭐ 改写只换**个别字**，不是重写句子。
   *
   * 字数相同还不够：整句换成另外七个同音字，字数也一样，
   * 但那已经不是「把这个字念对」而是另一句话了。
   * 逐位比对能钉住「动过的位置屈指可数」这件事。
   */
  it('改写与原文只差个别字', () => {
    const MAX_CHANGED_CHARS = 3

    for (const poem of POEMS) {
      for (const line of poem.lines) {
        if (line.spoken === undefined) continue
        const before = [...line.text]
        const after = [...line.spoken]
        const changed = before.filter((ch, i) => ch !== after[i]).length

        expect(
          changed,
          `${poem.title}「${line.text}」→「${line.spoken}」改了 ${changed} 个字，不像换字了`,
        ).toBeLessThanOrEqual(MAX_CHANGED_CHARS)
      }
    }
  })

  /**
   * ⭐ 改写**只增不减**。
   *
   * 每一处都是实测读错、或照着多音字表逐首排查出来的，
   * 删掉一处就是放一个错音回到孩子耳朵里（见 poems.ts 文件头：
   * 「鬓毛衰」实测念成了 cuī）。所以这里守的是下限，不是上限——
   * 加诗时这个数只会往上走。
   */
  it('已有的改写一处都不少', () => {
    const rewrittenLines = POEMS.flatMap((poem) =>
      poem.lines.filter((line) => line.spoken !== undefined),
    )
    const rewrittenHeads = POEMS.filter((poem) => poem.headSpoken !== undefined)

    expect(rewrittenLines.length, '有诗句的改写被删掉了').toBeGreaterThanOrEqual(29)
    expect(rewrittenHeads.length, '有诗题的改写被删掉了').toBeGreaterThanOrEqual(5)
  })

  /**
   * ⭐ 诗题的改写与报题句**字数一致**。
   *
   * 报题句是「诗名。朝代，作者。」整句，改写只该换掉其中一个多音字。
   * 字数变了说明连标点或结构都动了，那朗读出来就不是同一句话。
   */
  it('headSpoken 与报题句字数一致', () => {
    for (const poem of POEMS) {
      if (poem.headSpoken === undefined) continue

      expect(
        [...poem.headSpoken].length,
        `${poem.title} 的诗题改写「${poem.headSpoken}」与「${poemHeadText(poem)}」字数不一样`,
      ).toBe([...poemHeadText(poem)].length)
    }
  })

  /**
   * 用户实测那一条，单独钉住：这是整条方针（多音字一律改写）的由来。
   * 见 poems.ts 文件头。
   */
  it('⭐《回乡偶书》「鬓毛衰」必须带改写 —— 实测念成了 cuī', () => {
    const poem = POEMS.find((p) => p.id === 'huixiangoushu')
    const line = poem?.lines.find((l) => l.text.includes('鬓毛衰'))

    expect(line?.spoken, '「鬓毛衰」的改写没了，它会念回 cuī').toBeDefined()
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
