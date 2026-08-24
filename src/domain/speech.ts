/**
 * @file 语音语句模型 —— 把「要说的话」表示成可预生成的片段序列
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see design/07-音频方案.md  为什么弃用实时 TTS、片段怎么切分
 * @see src/platform/speech.ts  运行时怎么播
 * @see scripts/generate-voices.mjs  片段音频怎么生成
 *
 * ⭐ **核心思路：题干是拼出来的，语音也应该是拼出来的。**
 *
 * 数学题运行时生成，题面无穷无尽（`9 加 5 等于几`、`13 减 8 等于几`…），
 * 不可能为每一道题预录一条音频。但它们都由极小的词汇表拼成：
 * 0~20 的数字，加上几十个固定短语。
 *
 * 所以把一句话表示成**片段 key 的数组**：
 * ```
 * ['num.9', 'op.plus', 'num.5', 'phrase.equalsWhat']
 * ```
 * 每个 key 对应一个预生成的音频文件，运行时按顺序播放。
 * 于是无穷多的题目只需要**几十个音频文件**，而且发音完全稳定——
 * 不会出现同一个「9」这次读「jiǔ」下次读「jiū」的情况。
 *
 * 这套机制同时是拼音题库的地基：420 个音节就是 420 个 `pinyin.*` 片段，
 * 用的是同一个播放器、同一套生成脚本。
 */

/**
 * 语音片段 key。
 *
 * 命名规范 `<类别>.<标识>`，类别决定它由哪份清单生成：
 *
 * | 前缀 | 内容 | 数量级 |
 * |---|---|---|
 * | `num.*` | 数字 0~20，加位值片段 `num.hundred` / `num.thousand` | 23 |
 * | `op.*` | 运算词（加/减/等于） | ~6 |
 * | `phrase.*` | 固定短语（「等于几」「把它们从小到大排好」） | ~60 |
 * | `word.*` | 名词（苹果/小猫…，数数题用） | ~15 |
 * | `pinyin.*` | 拼音音节（阶段 ⑧） | ~80 |
 * | `en.*` | 英语词、短语、字母（阶段 ⑨）⚠️ 用英语音色生成 | ~160 |
 */
export type ClipKey = string

/**
 * 一句待朗读的话。
 *
 * `parts` 为空数组表示「无话可说」，播放器直接跳过。
 */
export interface Utterance {
  /** 按顺序播放的片段 key */
  parts: ClipKey[]
  /**
   * 兜底文本。⚠️ **必填**。
   *
   * 缺少某个片段音频时用它走实时 TTS。孩子不识字，
   * **绝不能出现「什么也没听到」**——那等于这道题她没法做。
   * 宁可某一句音色不一致，也不能静音。
   */
  fallbackText: string
  /**
   * 兜底 TTS 的语言，默认中文。
   *
   * ⚠️ 英语内容**必须**标 `'en-US'`：用中文引擎念 `apple`
   * 得到的是一个孩子听不懂、也学不对的音。发音教错比没有声音严重得多，
   * 学错的读音以后很难改（design/07-音频方案.md §3.3 的拼音教训同理）。
   */
  lang?: 'zh-CN' | 'en-US'
  /**
   * 片段之间的间隔（秒）。不填用播放器的默认值（80ms）。
   *
   * ⭐ 默认值是按**词与词**之间的语流定的（「9」「加」「5」黏成一团会听不清词界），
   * 而**句与句**之间需要的停顿完全是另一个量级——古诗四句连着念，
   * 80ms 听起来就是一口气赶完。见 `domain/poem.ts` 的 `POEM_LINE_GAP`。
   */
  gap?: number
}

/**
 * `num()` 能正确拼读的上限。定在 9999 是因为二年级「万以内数的认识」到此为止，
 * 而三年级起不再朗读中文题干（CLAUDE.md 产品红线），这个上限不会再往上抬。
 */
export const MAX_SPOKEN_NUMBER = 9999

/**
 * 数字片段，覆盖 0~9999（二年级「万以内数的认识」的上限）。
 *
 * ⭐ **位值片段念的是「百」「千」，不是「一百」「一千」**——
 * 三百 = `num.3` + `num.hundred`，片段本身若念「一百」就会拼出「三一百」。
 * 因此这两个 key 特意不叫 `num.100` / `num.1000`：那个名字会让人
 * 想当然地把文本填成 100，而错法在测试里看不出来，只有听才发现。
 *
 * 中文数字的三个坑，都在下面的分支里处理掉了：
 *
 * - **零的占位**：3005 念「三千零五」而不是「三千五」。
 *   缺了那个「零」，孩子听到的和 305 一模一样。
 * - **一十**：110 念「一百一十」，而单独的 10 念「十」。
 *   所以百位以内的两位数不能复用 `num.10` 那条单片段。
 * - **整十不带尾**：30 念「三十」，不是「三十零」。
 *
 * @param n - 非负整数。超过 9999 会退化成逐位拼读（那是错的读法，
 *            但三年级起不再朗读中文题干，不会走到这里）
 * @returns 片段 key 序列，按播放顺序
 *
 * @example
 * num(9)      // ['num.9']                              九
 * num(35)     // ['num.3', 'num.10', 'num.5']           三十五
 * num(110)    // ['num.1', 'num.hundred', 'num.1', 'num.10']   一百一十
 * num(3005)   // ['num.3', 'num.thousand', 'num.0', 'num.5']   三千零五
 */
export function num(n: number): ClipKey[] {
  if (!Number.isInteger(n) || n < 0) return [`num.${n}`]
  if (n <= 20) return [`num.${n}`]
  if (n < 100) return tensParts(n)
  if (n < 1000) return hundredsParts(n)
  if (n < 10_000) return thousandsParts(n)

  // 万以上没有内容会用到，留这条只为不至于产出空片段
  return String(n)
    .split('')
    .map((d) => `num.${d}`)
}

/**
 * 两位数 21~99 的读法，同时用于更大数的末两位。
 *
 * ⚠️ 与 `num()` 的 0~20 分支不同，这里 10~19 一律读「一十几」——
 * 「一百**一十**」对，「一百十」不对。
 */
function tensParts(n: number): ClipKey[] {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const head: ClipKey[] = [`num.${tens}`, 'num.10']
  return ones === 0 ? head : [...head, `num.${ones}`]
}

/** 三位数 100~999。末两位不足十时补「零」：305 → 三百零五 */
function hundredsParts(n: number): ClipKey[] {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const head: ClipKey[] = [`num.${hundreds}`, 'num.hundred']

  if (rest === 0) return head
  if (rest < 10) return [...head, 'num.0', `num.${rest}`]
  return [...head, ...tensParts(rest)]
}

/** 四位数 1000~9999。百位为空时补「零」：3050 → 三千零五十 */
function thousandsParts(n: number): ClipKey[] {
  const thousands = Math.floor(n / 1000)
  const rest = n % 1000
  const head: ClipKey[] = [`num.${thousands}`, 'num.thousand']

  if (rest === 0) return head
  if (rest < 10) return [...head, 'num.0', `num.${rest}`]
  if (rest < 100) return [...head, 'num.0', ...tensParts(rest)]
  return [...head, ...hundredsParts(rest)]
}

/**
 * 构造一句话。
 *
 * @param parts - 片段 key，可嵌套数组（`num()` 返回的就是数组），会被展平
 * @param fallbackText - 缺片段时用来走 TTS 的完整文本
 *
 * @example
 * utter([num(9), 'op.plus', num(5), 'phrase.equalsWhat'], '9 加 5 等于几')
 * // → { parts: ['num.9', 'op.plus', 'num.5', 'phrase.equalsWhat'], fallbackText: '9 加 5 等于几' }
 */
export function utter(
  parts: ReadonlyArray<ClipKey | ClipKey[]>,
  fallbackText: string,
): Utterance {
  return { parts: parts.flat(), fallbackText }
}

/**
 * 把「数字组成的答案文本」解析成片段序列 —— 答错反馈念「答案是 X」用。
 *
 * 覆盖四类答案原文：`'5'`（填空）、`'5 6 7 8'`（排序）、`'10 和 3'`（拆分）、
 * `'1 和 4、2 和 3'`（配对）。解析不了的自由文本（图形名、拼音写法等）
 * 返回 `undefined`，由调用方整句降级——**宁可整句 TTS 也不能拼出漏词的句子**。
 *
 * @param text - 正确答案的展示文本
 * @returns 片段序列；含非数字词或数字超过 {@link MAX_SPOKEN_NUMBER} 时返回 `undefined`
 *
 * @example
 * answerParts('10 和 3')      // ['num.10', 'op.and', 'num.3']
 * answerParts('5 6 7 8')      // ['num.5', 'num.6', 'num.7', 'num.8']
 * answerParts('正方体')       // undefined —— 这类答案由选项自带的 ttsParts 提供
 */
export function answerParts(text: string): ClipKey[] | undefined {
  const tokens = text.split(/[\s、，]+/).filter((t) => t.length > 0)
  if (tokens.length === 0) return undefined

  const parts: ClipKey[] = []
  for (const token of tokens) {
    if (token === '和') {
      parts.push('op.and')
      continue
    }
    // 有余数除法的答案是「3 余 1」——不认这个字就得整句降级成 TTS，
    // 而那个单元每道题的答案都长这样
    if (token === '余') {
      parts.push('op.remainder')
      continue
    }
    // 超出 num() 能正确拼读的范围就整句降级 —— 宁可整句 TTS，也不能念出错的读法
    if (!/^\d+$/.test(token) || Number(token) > MAX_SPOKEN_NUMBER) return undefined
    parts.push(...num(Number(token)))
  }
  return parts
}

/**
 * 纯文本语句 —— 没有对应片段，只能走 TTS。
 *
 * 过渡期用：宠物台词、成就文案这些还没纳入片段清单的内容先这样挂着，
 * 播放器会走 TTS 兜底。⚠️ 不要长期停在这里，
 * `voiceManifest.test.ts` 会统计还有多少句是纯文本的。
 *
 * @example
 * plain('小企鹅有点想你了')
 */
export function plain(text: string): Utterance {
  return { parts: [], fallbackText: text }
}
