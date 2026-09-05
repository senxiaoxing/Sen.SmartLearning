/**
 * @file 短文的类型与逐字拆分规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/hanziStories.ts  实际的短文（数据在 data 层）
 * @see design/09-竞品借鉴.md §2.1  短文朗读模块
 *
 * 与 `domain/poem.ts`、`domain/hanzi.ts` 同一个分工：类型与规则在 domain，内容在 data/seed。
 *
 * ## ⭐ 这个模块和古诗最大的不同：**没有语音**
 *
 * 短文的目的就是**让她自己读出来**。带上朗读会变成拼音依赖的加强版——
 * 她听得懂、跟得上，但从来没有独立读过一句。
 *
 * 所以这里**没有任何 clipKey 函数**。唯一会响的是单个字的读音，
 * 而那用的是识字墙早就有的 `hanziClipKey()`，零新增语音。
 *
 * ## 交互的单位是「字」，不是「句」
 *
 * 古诗点的是整句（背诵要磨的是一句），短文点的是**一个字**（卡住时的退路）。
 * 所以短文必须逐字拆开渲染，这正是 {@link storyLineChars} 存在的理由——
 * 而古诗那边两行整串对齐就够了，不必跟着改。
 */

/** 一句话：汉字与它的逐字拼音 */
export interface StoryLine {
  /** 原文，含标点 */
  text: string
  /**
   * 逐字拼音，空格分隔，**不含标点**。
   *
   * ⚠️ 个数必须与 `text` 去掉标点后的字数一致——她是照着字头上那个音念的，
   * 对不齐就会把音安到隔壁字上。由 `hanziStories.test.ts` 强制校验。
   *
   * ⚠️ 逐字标注而**不是从识字表查**：同一个字在不同句子里读音可能不同
   * （「长大」zhǎng / 「长短」cháng），字表里只存得下一个。
   */
  pinyin: string
}

/** 一篇短文 */
export interface Story {
  /** 语义 ID，用标题的无调拼音，如 `'daxue'` */
  id: string
  title: string
  /** 标题的逐字拼音，规则同 {@link StoryLine.pinyin} */
  titlePinyin: string
  /** 卡片上的图，给还不识字的她认路用 */
  emoji: string
  /**
   * 这篇从哪来，**给家长看的**一行。
   *
   * ⚠️ 现代课文有版权而仓库是公开的，所以原文一律不放（design/09 §2.1）。
   * 取值只有三种：`'寓言'`（公有领域）、`'古文'`（公有领域）、`'自己写的'`。
   */
  source: '寓言' | '古文' | '自己写的'
  lines: readonly StoryLine[]
}

/**
 * 一辑短文。⚠️ 分辑规矩与识字墙、诗单完全一致：**只往后加辑，不重排、不接长**。
 *
 * 与识字辑一一对应：第 N 辑短文只用识字第 1~N 辑的字。
 * 所以她学完第一辑 100 字，第一辑短文当天就读得了。
 */
export interface StoryVolume {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1️⃣2️⃣3️⃣，与识字墙同一套 */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
  stories: readonly Story[]
}

/**
 * 一个字在屏幕上的样子。
 *
 * ⛔ **刻意没有「这个字在不在识字表里」这一项。**
 *
 * 原先有个 `known`，同时决定标不标色、能不能点、点了有没有音。
 * 上机第一次就被推翻：孩子问「为什么『了』『的』『也』没有高亮」，
 * **那个差异本身成了整屏最吸引她注意的东西**。
 *
 * 我们用颜色编码了一个她根本不需要知道的信息（这个字属不属于某张表），
 * 而她看到的只是「有些字被冷落了」——她读的是句子，
 * 「的」「了」在她眼里和别的字一样是句子的一部分，凭什么灰着。
 *
 * 现在全部字一个样。「这个字有没有语音」由播放层自己查，不进渲染数据，
 * 见 `features/chinese/StoryView.tsx`。
 */
export interface StoryChar {
  char: string
  /** 标点没有拼音 */
  pinyin?: string
  /**
   * 是不是标点。
   *
   * ⚠️ 单独标出来而不是让 UI 用「没有拼音」去猜：排版要靠它把标点和前一个字
   * **绑成不可断开的一组**（见 `components/RubyText.tsx`），
   * 否则折行时句号会被甩到下一行孤零零占一整行。
   */
  punctuation: boolean
}

/**
 * 中文标点。拼音串里不含它们，所以拆分时要跳过。
 *
 * ⚠️ 用集合而不是正则 `\p{P}`：那会把英文标点、破折号一并算进来，
 * 而这些短文里出现的标点是可枚举的，写死更稳。
 */
const PUNCTUATION = new Set('，。！？、；：「」“”‘’…—《》')

/**
 * 把一句话拆成逐字渲染需要的形状：每个字配上它头上的拼音。
 *
 * 标点不占拼音位——`pinyin` 串是按**去掉标点后的字数**给的，
 * 所以拆分时得自己数着走，不能用下标直接对应。
 *
 * ⚠️ 它**不需要知道识字表**（原先要注入一份）。所有字一视同仁，
 * 理由见 {@link StoryChar}。
 *
 * @param line - 一句短文
 * @returns 逐字结果，长度等于 `line.text` 的字数（**含**标点）
 *
 * @example
 * storyLineChars({ text: '大雪白了。', pinyin: 'dà xuě bái le' })
 * // [ { char: '大', pinyin: 'dà',  punctuation: false },
 * //   { char: '雪', pinyin: 'xuě', punctuation: false },
 * //   { char: '白', pinyin: 'bái', punctuation: false },
 * //   { char: '了', pinyin: 'le',  punctuation: false },
 * //   { char: '。',               punctuation: true  } ]  ← 标点不占拼音位
 */
export function storyLineChars(line: StoryLine): StoryChar[] {
  const syllables = line.pinyin.split(' ').filter((s) => s.length > 0)
  let cursor = 0

  return [...line.text].map((char) => {
    if (PUNCTUATION.has(char)) return { char, punctuation: true }
    const pinyin = syllables[cursor]
    cursor += 1
    return {
      char,
      ...(pinyin !== undefined && { pinyin }),
      punctuation: false,
    }
  })
}

/**
 * 一句话里去掉标点后的字数。校验拼音对不对得上时用。
 *
 * @param text - 含标点的原文
 * @returns 汉字个数
 *
 * @example
 * storyCharCount('大雪白了。')   // 4
 */
export function storyCharCount(text: string): number {
  return [...text].filter((char) => !PUNCTUATION.has(char)).length
}
