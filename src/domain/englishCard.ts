/**
 * @file 英语词汇卡的类型与 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/englishWordCards.ts  实际的 180 词（数据在 data 层）
 * @see src/domain/hanzi.ts  识字卡，这一块处处对标它
 *
 * 与 `domain/hanzi.ts` 是同一个位置的同一件事，逐项对应：
 *
 * | 识字卡 | 词汇卡 |
 * |---|---|
 * | 汉字 | 单词 |
 * | 带调拼音（「应该念成什么」） | 中文释义（「这个词是什么意思」） |
 * | 组词（朗读消歧的载体） | 例句（同样是朗读的一部分） |
 * | 「天。蓝天的天。」 | 「Apple. A red apple.」 |
 *
 * ## ⭐ 为什么词汇卡另有一批片段，而不复用词表的 `en.*`
 *
 * `englishWords.ts` 里已经有 `en.apple`（念「Apple」），但词汇卡念的是
 * **「Apple. A red apple.」整句**——念的内容根本不是一回事，
 * 这与识字卡的 `hanzi.*` 和题库互不相干是同一个道理。
 *
 * 附带的一条：词汇卡是**跟着念**的内容，语速要慢一档
 * （`scripts/generate-voices.mjs` 的 `RATE_EN_RECITE`），词表那批是出题素材、常速。
 */

/** 一张词汇卡的完整内容 */
export interface EnglishCard {
  /**
   * 英文单词本身，卡片主体。**小写书写**（`apple` 而不是 `Apple`）——
   * 那是单词的自然形式，也是她以后在任何书上看到的样子。
   *
   * ⚠️ 朗读时首字母会被大写（见 {@link englishCardSpokenText}），
   * 那是句子的需要，不是这个字段的事。
   *
   * ⚠️ 只能是**单个词**（可含撇号或连字符），因为它要进片段 key。
   */
  word: string
  /**
   * 中文释义。
   *
   * ⭐ 它在这张卡上的位置相当于识字卡的拼音：**「这个词是什么意思」的权威声明**。
   * 而且它比拼音更要紧——汉字本身就带着意义，一串英文字母不带，
   * 图配不出来时（形容词、动作词）中文释义是她唯一的抓手。
   * 所以它**不可省**，而 emoji 可以。
   */
  zh: string
  /**
   * 例句。⭐ 不只是给家长看的例子，它同时是**朗读的后半句**——
   * 见 {@link englishCardSpokenText}。
   *
   * ⚠️ 必须包含 {@link word} 本身（允许复数、第三人称等词形变化），
   * 否则念出来就是「Apple. I like bananas.」这种句子。
   * 由 `englishWordCards.test.ts` 逐张校验。
   */
  example: string
  /**
   * 卡面配图。
   *
   * ⚠️ 挑图规矩与识字卡、英语词表一致：**必须一眼认得出**，认不出就留空。
   * 形容词那一组（big / small / new / old…）几乎整组留空，
   * 这是**内容本身的性质**，不是没配完——与识字第三辑方位虚词整组留空同理。
   *
   * 留空在这里的代价比识字小：卡上还有中文释义顶着。
   */
  emoji: string
  /** 所属分组，见 `data/seed/englishWordCards.ts` */
  groupId: string
}

/** 一组词汇卡 */
export interface EnglishCardGroup {
  id: string
  /** 组名，给家长看的标签。孩子认的是组图标与卡片本身 */
  name: string
  emoji: string
  cards: readonly EnglishCard[]
}

/**
 * 一辑。⚠️ 分辑规矩与识字墙完全一致：**只往后加辑，不重排、不接长**。
 */
export interface EnglishCardVolume {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1 2 3，与识字墙、诗单同一套 */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
  groups: readonly EnglishCardGroup[]
}

/**
 * 词汇卡的语音片段 key。
 *
 * ⚠️ 必须以 `en.` 开头 —— 生成脚本按这个前缀切**英语音色**
 * （`scripts/generate-voices.mjs` 的 `voiceFor`）。
 * 用中文音色念 `apple` 得到的是一个孩子听不懂、也学不对的音，
 * 而这个错误是静默的：屏幕上一切正常。
 *
 * 单词本身就唯一（`englishWordCards.test.ts` 保证不重复），
 * 所以不必像识字卡那样绕码点——那边绕是因为同音字会撞（十/石），
 * 而这里 key 里放的是词形不是读音，`read` 和 `red` 天然分得开。
 *
 * @param word - 单词，小写
 * @returns 片段 key，形如 `'en.cardApple'`
 *
 * @example
 * englishCardClipKey('apple')   // 'en.cardApple'
 * englishCardClipKey('TV')      // 'en.cardTV'
 */
export function englishCardClipKey(word: string): string {
  return `en.card${capitalize(word)}`
}

/**
 * 这张卡实际念出来的话：「Apple. A red apple.」
 *
 * ⭐ 句式与识字卡「天。蓝天的天。」完全对应，用意也一样：
 * **先听清这个词本身，再听它在句子里的样子**。
 * 「XX。词的XX。」是中文课堂认字的标准说法，
 * 「Word. Sentence.」则是英语词汇卡的通行念法。
 *
 * ⚠️ 与识字那边不同的是，这里的例句**不承担消歧**——英语音色念孤立的英文单词
 * 是母语场景，`apple` 必然读对，不像中文孤立单字会声调发飘。
 * 例句在这里纯粹是教学价值：一个词单独听十遍，也不如听它用在一句话里一遍。
 *
 * ⚠️ 例外是**同形异音词**（`read` /riːd/ 与 /red/、`live` /lɪv/ 与 /laɪv/）。
 * 那类词孤立念是赌运气，而例句锁不住前半句——所以对策是**选词时避开**，
 * 不是靠这个函数补救。见 `englishWordCards.ts` 文件头。
 *
 * @param card - 词汇卡
 * @returns 朗读文本
 *
 * @example
 * englishCardSpokenText({ word: 'apple', example: 'A red apple.', ... })
 * // 'Apple. A red apple.'
 * englishCardSpokenText({ word: 'TV', example: 'Watch TV.', ... })
 * // 'TV. Watch TV.'   —— 已经大写的不受影响
 */
export function englishCardSpokenText(card: Pick<EnglishCard, 'word' | 'example'>): string {
  return `${capitalize(card.word)}. ${card.example}`
}

/**
 * 首字母大写。句首要大写，而 {@link EnglishCard.word} 存的是小写原形。
 *
 * ⚠️ 生成脚本 `loadWordCards()` 必须拼出**逐字相同**的串，
 * 否则每次 `npm run voices` 都会判定「文本变了」而把 180 条重生成一遍
 * （`poemHeadText` 那边踩过同一个坑）。
 */
function capitalize(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
}
