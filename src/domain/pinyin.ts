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
   * 汉字示例。⚠️ 必须是**非多音字**且读音恰好等于 `pinyin`。
   *
   * ⚠️ **它不再决定音频**：2026-09 起拼音音频全部是真人录音
   * （`npm run pinyin:voice`，见 design/11-拼音真人录音方案.md）。
   * 仍有三处用途——拼音墙的兜底文本 `spoken`、整体认读卡的 `carrier`、
   * P8.3「听音选字」的选项池。
   *
   * ⭐ **留空 = 这个音节不可用**（{@link isUsable} 为 false，不进题库）。
   *
   * 这条判据定于 TTS 时代：没有载体字时兜底 TTS 会把拼音串念错
   * （`á` 读成 `ā`、`ē` 读成 `è`……）。发音教错比没有声音严重得多。
   * 现在只剩 `ong` 一条落在外面——它连真人录音都有了，
   * 缺的只是一个读音恰好是 `ōng` 的常用单音字，而汉语里没有。
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

  /**
   * ⭐ 载体字**只用于发音**，不许出现在以「认字」为目的的题里。
   *
   * 声母韵母的呼读音（d 念「的」、eng 念「鞥」、ci 念「呲」）必须用这些字
   * 才念得准，但它们本身不是一年级该认的字：
   * 「鞥」「讷」「呲」根本不在识字表里，「的」「乐」是高频多音字。
   * 把它们摆进 P8.3「听音选字」的选项，考的就成了辨认生僻字——
   * 那是另一回事，而且会让孩子以为自己学漏了什么。
   *
   * ⚠️ 它**不影响**听音选拼音（P2/P4/P5/P8.1）：那些题的选项是拼音文字，
   * 载体字只在背后发声，正是它该待的位置。
   */
  soundOnly?: true
}

/**
 * 这个音节能不能进题库。
 *
 * 判据是**有没有汉字示例**（`char`）。
 *
 * ⚠️ 这个判据定于 TTS 时代（那时「没载体字」=「音频必然念不准」）。
 * 换真人录音之后**理由已经消失，但判据本身留着没改**——
 * 现在只有 `ong` 一条落在外面，而它缺的是一个读音恰好为 `ōng` 的常用字。
 *
 * @example
 * isUsable({ pinyin: 'bā', base: 'ba', tone: 1, char: '八' })  // true
 * isUsable({ pinyin: 'ōng', base: 'ong', tone: 1 })            // false —— 汉语里没有 ōng 的常用字
 */
export function isUsable(syllable: Syllable): boolean {
  return syllable.char !== undefined
}

/**
 * 这个音节能不能出现在「听音选**字**」题里（P8.3）。
 *
 * 比 {@link isUsable} 多一条：载体字还得是**孩子该认的字**。
 * 呼读音的载体（的/讷/乐/诶/韵/鞥/呲）只负责发音，见 {@link Syllable.soundOnly}。
 *
 * @example
 * isCharUsable({ pinyin: 'mā', base: 'ma', tone: 1, char: '妈' })                    // true
 * isCharUsable({ pinyin: 'ēng', base: 'eng', tone: 1, char: '鞥', soundOnly: true })  // false
 */
export function isCharUsable(syllable: Syllable): boolean {
  return syllable.char !== undefined && syllable.soundOnly !== true
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

/**
 * 声母/韵母**本音**片段的 key。
 *
 * ⭐ 与 {@link syllableKey} 是**两条轨道**，别混用：
 *
 * ```
 * syllableKey('fo', 2)   // 'pinyin.fo2'     带调音节「佛 fó」—— 题目用
 * bareKey('f')           // 'pinyinbare.f'   纯辅音 /f/        —— 拼音墙用
 * ```
 *
 * 为什么不干脆共用一个 key：`pinyin.fo2` 同时被题目当作「fo 这个音节」使用
 * （选项显示 `fó`、题干也播 `fó`），就地换成纯 /f/ 会让 P8.3 那类题
 * **没有正确答案**。见 design/11-拼音真人录音方案.md §3.1。
 *
 * `ü` 同样写成 `v`，理由与 {@link syllableKey} 相同。
 *
 * @param letter - 声母字母（`'f'` `'zh'`）或韵母（`'ai'` `'ü'` `'ün'`）
 * @returns 片段 key
 *
 * @example
 * bareKey('f')     // 'pinyinbare.f'
 * bareKey('ai')    // 'pinyinbare.ai'
 * bareKey('ü')     // 'pinyinbare.v'
 */
export function bareKey(letter: string): string {
  return `pinyinbare.${letter.replace(/ü/g, 'v')}`
}
