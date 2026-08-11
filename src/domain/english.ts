/**
 * @file 英语词条的类型与片段 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/englishWords.ts  实际的词表（数据在 data 层）
 * @see design/01-知识点图谱.md §5 英语（English）
 *
 * 类型与 key 规则放在 domain，**词表本身放在 data/seed**：
 * 生成器要用 `wordKey()` 拼音频 key，若为此 import `data/seed`
 * 就破坏了「domain 不依赖 data」这条分层铁律（同 `domain/pinyin.ts`）。
 *
 * ## ⭐ 为什么英语词条必须自带一个「图形面」
 *
 * 一年级孩子中文都认不全，英文单词更是一个字母都不认识。
 * 于是英语题只剩一条路：**听英文 → 选图**。
 * 但本项目没有任何美术资源（宠物都是手绘 SVG），115 个词不可能配 115 张图，
 * 所以图形面用 **emoji**——iPad 上是彩色矢量、尺寸随意放大不糊，
 * 而且 `🍎` 表达「苹果」比任何自绘图标都准确。
 *
 * 数字与字母没有 emoji，就直接用字符本身（`'7'` / `'Aa'`）——
 * 阿拉伯数字是孩子早就认识的符号，字母的形状本来就是要认的东西。
 */

/**
 * 一个可出题的英语词条。**词、短语、整句共用这一个结构**——
 * 对孩子来说「apple」和「It's a cat.」都只是「听到一串声音，选出对应的图」，
 * 没有必要为句子另开一套类型。
 */
export interface EnglishWord {
  /**
   * 词条标识，用于拼语音片段 key，如 `'apple'` `'goodMorning'` `'letterA'`。
   * 只用 ASCII 字母与数字：它会成为音频文件名，见 {@link wordKey}。
   */
  id: string
  /**
   * 英文原文。⭐ 这是「应该念成什么」的权威声明，也是喂给 TTS 的文本。
   *
   * 与拼音不同，英语**不需要发音载体**：Edge TTS 的英语音色念英文单词
   * 本来就是它的母语场景，`apple` 必然读对。拼音那边要挂汉字，
   * 是因为把拼音串喂给中文 TTS 等于让它猜（见 design/07-音频方案.md §3.3）。
   */
  en: string
  /** 中文释义。显示在图形面下方的小字，也是点击选项时朗读的内容 */
  zh: string
  /**
   * 选项上显示的图形面：emoji / 阿拉伯数字 / 字母。
   *
   * ⚠️ **同一道题里的四个选项，图形面必须互不相同**，否则会出现
   * 两个一模一样的选项——孩子点哪个都说不清对错。
   * 由 `englishWords.test.ts` 按组强制校验。
   */
  face: string
  /**
   * 同族标记，如 `'teen'` `'apples'` `'color'`。**决定干扰项优先从哪里取。**
   *
   * ⭐ 这个字段是「干扰项必须有诊断性」这条红线在英语侧的落点。
   * 「Three apples.」的选项若是「两只猫 / 四只鸭 / 三个苹果」，
   * 孩子听见 `apples` 就选中了，two/three/four 根本没参与——
   * 题看着出了，实际什么也没测到。同族里数量是**唯一的变量**，
   * 才逼她真的听清那个数字。
   *
   * 留空表示不限定，干扰项按音近表与同组词来挑。
   */
  family?: string
  /**
   * 覆盖朗读文本。仅在 `en` 直接喂 TTS 会读错时使用。
   *
   * 目前只有字母组用得上：孤立的 `'A'` 有可能被读成冠词 /ə/ 而不是字母名 /eɪ/。
   * 这类词条必须**人工试听**后再决定要不要覆盖——机器验不了发音，
   * 与拼音那边「声调只能靠人耳」是同一类问题。
   */
  speak?: string
}

/**
 * 词条的语音片段 key。
 *
 * @example
 * wordKey({ id: 'apple', ... })   // 'en.apple'
 *
 * @see src/data/seed/voiceManifest.ts  片段清单
 */
export function wordKey(word: EnglishWord): string {
  return `en.${word.id}`
}

/** 实际喂给 TTS 的文本：有 `speak` 覆盖就用它，否则用英文原文 */
export function spokenText(word: EnglishWord): string {
  return word.speak ?? word.en
}
