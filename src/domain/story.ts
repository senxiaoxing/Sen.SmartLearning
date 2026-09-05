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

/** 一个字在屏幕上的样子 */
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
  /**
   * 是不是识字 300 表里的字。
   *
   * ⭐ 它同时决定三件事，而这三件事必须**是同一件**：标不标色、能不能点、
   * 点了有没有音。表外的字（「的」「了」这类粘合虚词）一律不标、不给点——
   * **点了没反应比没得点更糟**（design/09 §2.1）。
   */
  known: boolean
}

/**
 * 中文标点。拼音串里不含它们，所以拆分时要跳过。
 *
 * ⚠️ 用集合而不是正则 `\p{P}`：那会把英文标点、破折号一并算进来，
 * 而这些短文里出现的标点是可枚举的，写死更稳。
 */
const PUNCTUATION = new Set('，。！？、；：「」“”‘’…—《》')

/**
 * 把一句话拆成逐字渲染需要的形状：每个字配上它的拼音，并标出是否表内字。
 *
 * 标点不占拼音位——`pinyin` 串是按**去掉标点后的字数**给的，
 * 所以拆分时得自己数着走，不能用下标直接对应。
 *
 * @param line - 一句短文
 * @param knownChars - 识字 300 表里的全部字。由调用方注入，
 *                     因为 domain 不依赖 data 层（分层铁律）
 * @returns 逐字结果，长度等于 `line.text` 的字数（**含**标点）
 *
 * @example
 * storyLineChars({ text: '大雪白了。', pinyin: 'dà xuě bái le' }, new Set('大雪白'))
 * // [ { char: '大', pinyin: 'dà',  known: true,  punctuation: false },
 * //   { char: '雪', pinyin: 'xuě', known: true,  punctuation: false },
 * //   { char: '白', pinyin: 'bái', known: true,  punctuation: false },
 * //   { char: '了', pinyin: 'le',  known: false, punctuation: false },  ← 表外虚词，不标色不给点
 * //   { char: '。',               known: false, punctuation: true  } ]  ← 标点不占拼音位
 */
export function storyLineChars(line: StoryLine, knownChars: ReadonlySet<string>): StoryChar[] {
  const syllables = line.pinyin.split(' ').filter((s) => s.length > 0)
  let cursor = 0

  return [...line.text].map((char) => {
    if (PUNCTUATION.has(char)) return { char, known: false, punctuation: true }
    const pinyin = syllables[cursor]
    cursor += 1
    return {
      char,
      ...(pinyin !== undefined && { pinyin }),
      known: knownChars.has(char),
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
