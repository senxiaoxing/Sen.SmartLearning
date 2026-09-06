/**
 * @file 英语短文的类型与逐词拆分规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/englishStories.ts  实际的短文（数据在 data 层）
 * @see src/domain/story.ts  语文短文，这一块处处对标它
 *
 * ## ⭐ 和短语页最大的不同：**没有语音**
 *
 * 与语文短文同一条理由（见 `domain/story.ts`）：短文的目的就是
 * **让她自己读出来**。带上朗读它会变成中文翻译的加强版——
 * 她听得懂、跟得上，但从来没有独立读过一句英文。
 *
 * 所以这里**没有任何 clipKey 函数**。唯一会响的是单个词，
 * 而那用的是英语词表早就有的 `wordKey()`，零新增语音。
 *
 * ## 交互的单位是「词」，不是「句」
 *
 * 语文短文点的是一个**字**，英语短文点的是一个**词**——英语的最小意义单位
 * 本来就是词，而她卡住时想问的也是「这个词念什么」。
 * 这正是 {@link storyLineWords} 存在的理由。
 *
 * ## ⚠️ 点了只在**精确命中词表**时才发音
 *
 * `cats` 不念 `cat`。少响一次远好过「屏幕上是 cats、耳朵里是 cat」——
 * 她正在学的就是把看到的形状和听到的声音对上，这一步错位，
 * 这一页的全部意义就没了。写短文时优先用单数正是为了这条
 * （分级读物本来就大量用单数句）。
 */

/** 一句话：英文与它的中文意思 */
export interface EnglishStoryLine {
  /** 英文原文，含标点 */
  en: string
  /**
   * 中文意思。⚠️ 是**说人话的那一句**，不是逐词直译。
   *
   * 它在屏幕上的位置相当于语文短文的拼音：默认显示，
   * 按一下「藏起来」就要她自己读——那个动作才是这一页的主线。
   */
  zh: string
}

/** 一篇短文 */
export interface EnglishStory {
  /** 语义 ID，小写字母数字，如 `'myredball'` */
  id: string
  /** 英文标题 */
  title: string
  /** 中文标题，卡片上和标题一起显示 */
  titleZh: string
  /** 卡片上的图，给还不识字的她认路用 */
  emoji: string
  /**
   * 这篇从哪来。**取值只有一个**，这是刻意的。
   *
   * ⛔ 仓库是公开的，`dist/` 里的东西等于公开可访问，
   * 所以《Let's Go》《Power Up》这类教材的课文原文**一个字都不能放**——
   * 「纯自用」在那一刻就不成立了。选篇参考它们的**大纲与句型**，
   * 文本全部自己写（用受控词表写，见 englishStories.ts 的用词规矩）。
   *
   * 写成单值字面量类型而不是注释里的一句提醒：将来有人想贴原文时，
   * 会先撞到编译错误。
   */
  source: '自己写的'
  lines: readonly EnglishStoryLine[]
}

/**
 * 一辑短文。⚠️ 分辑规矩与识字墙、诗单、语文短文完全一致：
 * **只往后加辑，不重排、不接长**。
 *
 * 三辑对应 Dolch 词表的前三级（见 `data/seed/englishSightWords.ts`）：
 * 第 N 辑短文只用第 1~N 级的高频词 + 英语词表里的实词。
 */
export interface EnglishStoryVolume {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1 2 3，与识字墙、诗单同一套 */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
  stories: readonly EnglishStory[]
}

/**
 * 一个词在屏幕上的样子。
 *
 * ⛔ 与 `StoryChar` 一样，**刻意没有「这个词在不在词表里」这一项**。
 * 上机推翻过一次的东西不要再做第二遍：语文短文原先给表内字上色，
 * 孩子第一眼问的就是「为什么那些字没有高亮」——
 * 我们用颜色编码了一个她根本不需要知道的信息。
 * 屏幕上所有词长得一样，「这个词有没有音」由播放层自己查。
 */
export interface EnglishWordToken {
  /** 屏幕上原样显示的一段，含紧跟其后的标点，如 `'cat.'` */
  text: string
  /**
   * 查音与查白名单用的规范形式：小写、剥掉两端标点，如 `'cat'`。
   *
   * ⚠️ 词内的撇号与连字符**要留着**（`it's` `x-ray`）：
   * 剥掉它们就成了另一个词，而 `it's` 恰恰是这些短文里最常见的词之一。
   */
  word: string
}

/**
 * 词首尾可能粘着的标点。
 *
 * ⚠️ 用集合而不是 `\p{P}`：那会把词内的撇号（`it's`）和连字符（`x-ray`）
 * 一并剥掉，而这两样是词的一部分。这些短文里出现的标点是可枚举的，写死更稳。
 */
const EDGE_PUNCTUATION = new Set('.,!?;:"“”‘’()')

/**
 * 把屏幕上的一段（可能粘着标点）规范成查表用的词：剥掉两端标点、转小写。
 *
 * 词表那边（`englishStories.ts`）用同一个函数把 `'Hello!'` 规范成 `hello`——
 * **两边必须是同一套规则**，否则「短文里这个词算不算学过」和
 * 「点它有没有音」会得出不同的答案。
 *
 * @param raw - 原样的一段，如 `'cat.'`、`'"I'`
 * @returns 规范形式；整段都是标点时返回空串
 *
 * @example
 * normalizeEnglishWord('Cat.')    // 'cat'
 * normalizeEnglishWord('"I')      // 'i'
 * normalizeEnglishWord("it's")    // "it's"   ← 词内撇号留着
 */
export function normalizeEnglishWord(raw: string): string {
  let start = 0
  let end = raw.length
  while (start < end && EDGE_PUNCTUATION.has(raw.charAt(start))) start += 1
  while (end > start && EDGE_PUNCTUATION.has(raw.charAt(end - 1))) end -= 1
  return raw.slice(start, end).toLowerCase()
}

/**
 * 把一句话拆成逐词渲染需要的形状。
 *
 * 标点**跟着前一个词**走，不单独成块：句号自己占一格时，折行会把它甩到
 * 下一行行首，而她认的是「一句话」这个整体。这与语文短文
 * `groupWithPunctuation()` 处理句号是同一件事，只是英语天然按空格分块，
 * 一步就做完了。
 *
 * @param line - 一句短文
 * @returns 逐词结果，顺序与原文一致；连续空格不会产生空词
 *
 * @example
 * storyLineWords({ en: "I see a cat.", zh: '我看见一只猫。' })
 * // [ { text: 'I',    word: 'i'   },
 * //   { text: 'see',  word: 'see' },
 * //   { text: 'a',    word: 'a'   },
 * //   { text: 'cat.', word: 'cat' } ]   ← 句号跟着 cat，查音时被剥掉
 */
export function storyLineWords(line: EnglishStoryLine): EnglishWordToken[] {
  return line.en
    .split(/\s+/)
    .filter((raw) => raw.length > 0)
    .map((raw) => ({ text: raw, word: normalizeEnglishWord(raw) }))
}
