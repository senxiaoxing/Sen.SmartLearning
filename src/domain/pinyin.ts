/**
 * @file 拼音音节的类型与 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/pinyinSyllables.ts  实际的音节表（数据在 data 层）
 * @see design/07-音频方案.md §3.3
 *
 * 类型与 key 规则放在 domain，**音节表本身放在 data/seed**：
 * 生成器要用 `syllableKey()` 拼音频 key，若为此 import `data/seed`
 * 就破坏了「domain 不依赖 data」这条分层铁律
 * （同样的理由，调度器的知识点也是由调用方注入的，见 `ScheduleInput.knowledgePoints`）。
 */

/** 声调：1 阴平 2 阳平 3 上声 4 去声 */
export type Tone = 1 | 2 | 3 | 4

export interface Syllable {
  /** 带调拼音，如 `'bā'`。⭐ 这是「应该念成什么」的权威声明 */
  pinyin: string
  /** 不带调的音节，如 `'ba'`。用于组卡片、拼读题 */
  base: string
  tone: Tone
  /**
   * 发音载体汉字。⚠️ 必须是**非多音字**且读音恰好等于 `pinyin`。
   *
   * ⭐ **留空 = 这个音节不可用**。
   *
   * 没有载体字时只能把拼音串本身喂给 TTS，而实测证明那样会**大面积读错声调**
   * （`á` 读成 `ā`、`ē` 读成 `è`……）。发音教错比没有声音严重得多，
   * 所以 {@link isUsable} 为 false 的音节一律**不进题库**，
   * 直到有人录了真人音频补上（见 `npm run pinyin:record`）。
   */
  char?: string

  /**
   * 不带声调的写法，如 `'a'`。
   *
   * 只有单韵母用得上：P1.1/P1.2 教的是元音音色**不是声调**，
   * 选项应显示 `a o e` 而不是 `ā ō ē`——
   * 标了调就等于对声调作了声明，而那个声明可能与音频不符。
   */
  toneless?: string
}

/**
 * 这个音节能不能进题库。
 *
 * 判据就是有没有汉字载体：有则 TTS 必然读对，无则只能念拼音串、声调靠猜。
 *
 * @example
 * isUsable({ pinyin: 'bā', base: 'ba', tone: 1, char: '八' })  // true
 * isUsable({ pinyin: 'ēng', base: 'eng', tone: 1 })            // false —— 等录音
 */
export function isUsable(syllable: Syllable): boolean {
  return syllable.char !== undefined
}

/** 题目里该显示的写法：单韵母显示不带调的形式，其余显示带调拼音 */
export function displayForm(syllable: Syllable): string {
  return syllable.toneless ?? syllable.pinyin
}

/** 两拼音节：额外记录它由哪个声母和韵母拼成 */
export interface BlendSyllable extends Syllable {
  initial: string
  final: string
}

/**
 * 三拼音节：声母 + **介母** + 韵母（P3.2）。
 *
 * 介母只可能是 `i` `u` `ü` 三个之一。它是拼音里最容易被漏掉的部件——
 * 孩子把 `jia` 拼成 `ja`，就是 `three_syllable_missing_medial`。
 */
export interface TripleSyllable extends Syllable {
  initial: string
  medial: string
  final: string
}

/**
 * 全部声母，**按长度降序**——`zh` 必须排在 `z` 前面匹配，
 * 否则 `zhī` 会被判成声母 `z` + 韵母 `hi`，平翘舌就永远分不出来了。
 */
const INITIAL_PATTERNS = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w',
] as const

/**
 * 从不带调的音节里切出声母。
 *
 * @param base - 不带调音节，如 `'zhao'`
 * @returns 声母；零声母音节（`an` `ing`）返回空串
 *
 * @example
 * initialOf('zhao')   // 'zh'  —— 不是 'z'
 * initialOf('gu')     // 'g'
 * initialOf('an')     // ''    —— 零声母
 */
export function initialOf(base: string): string {
  return INITIAL_PATTERNS.find((p) => base.startsWith(p)) ?? ''
}

/**
 * 从不带调的音节里切出韵母。
 *
 * @example
 * finalOf('zhao')   // 'ao'
 * finalOf('an')     // 'an'   —— 零声母，整个都是韵母
 */
export function finalOf(base: string): string {
  return base.slice(initialOf(base).length)
}

/**
 * 音节的**韵母**（教学意义上的），三拼音节会剥掉介母。
 *
 * ⚠️ 与 {@link finalOf} 的区别正在三拼上：
 * ```
 * finalOf('xiao')   // 'iao'  —— 单纯去掉声母
 * rhymeOf(xiǎo)     // 'ao'   —— 教学上 x 是声母、i 是介母、ao 才是韵母
 * ```
 * 拿 `iao` 去匹配「教 ao 的知识点」永远匹配不上，
 * 三拼音节就再也进不了 P4/P5 的题库。
 *
 * 拆介母的规则很绕（`ie` `iu` `in` 是完整韵母，`iao` `ian` 才是介母+韵母），
 * 所以不去推导——直接取音节表声明的 `final` 字段，
 * 那是数据录入时人工判定好的。零声母音节没有该字段，退回 {@link finalOf}。
 */
export function rhymeOf(syllable: Syllable): string {
  const declared = (syllable as Partial<BlendSyllable>).final
  return declared ?? finalOf(syllable.base)
}

/**
 * 音节的语音片段 key。
 *
 * `ü` 统一写成 `v`：文件名里的非 ASCII 字符在跨平台传输、
 * URL 编码、以及 iOS「文件」App 里都可能出问题，
 * 而 `v` 代 `ü` 是拼音输入法的通行约定，不会有歧义。
 *
 * @example
 * syllableKey('ba', 1)    // 'pinyin.ba1'
 * syllableKey('ü', 2)     // 'pinyin.v2'
 */
export function syllableKey(base: string, tone: Tone): string {
  return `pinyin.${base.replace(/ü/g, 'v')}${tone}`
}
