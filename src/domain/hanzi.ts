/**
 * @file 识字卡的类型与 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/hanziCards.ts  实际的 100 字表（数据在 data 层）
 * @see design/07-音频方案.md §3.3  为什么孤立单字不能直接喂给 TTS
 *
 * 与 `domain/pinyin.ts` 同一个分工：类型和规则在 domain，字表本身在 data/seed。
 * 生成脚本、清单、UI 三方都按这里的规则推 key，不各自拼字符串。
 */

/**
 * 一个字的笔顺数据，来自 `data/seed/strokeOrder.json`（由 `npm run stroke:data` 生成）。
 *
 * ⚠️ **那份 JSON 里没有的字就是没核对过的字**，写字墙上不会出现它。
 * 见 design/09 §6.4：验不了的字宁可不给笔顺，也不能教错——
 * 手上的肌肉记忆比读音还难改。
 */
export interface StrokeOrder {
  /** 笔画轮廓（SVG path 的 d），顺序即笔顺 */
  strokes: string[]
  /** 笔画中线，描画动画沿它走 */
  medians: number[][][]
  /**
   * 每一笔的名称（`'横'` `'竖折折钩'`…），给孩子**书空**时念。
   *
   * ⚠️ 与 `strokes` 一一对应、**长度必然相等**——生成脚本对不上就直接中止，
   * 因为错位之后她念的就是别的笔。
   *
   * ⚠️ 名称来自第二个数据源（cnchar），与笔顺图形（makemeahanzi）各来一处。
   * 笔数已逐字校验，但**名称本身与教材的一致性尚未人工核对**。
   */
  names: string[]
}

/** 一张识字卡的完整内容 */
export interface HanziCard {
  /** 汉字本身，卡片主体。⚠️ 必须是单字 */
  char: string
  /** 带调拼音，如 `'tiān'`。卡片顶部显示，也是「应该念成什么」的权威声明 */
  pinyin: string
  /**
   * 组词。⭐ 不只是给孩子看的例词，它同时是**朗读消歧的载体**——
   * 见 {@link hanziSpokenText}。
   */
  word: string
  /**
   * 卡面配图。
   *
   * ⚠️ 挑图规矩与英语词表一致（见 englishWords.ts 文件头）：**必须一眼认得出**。
   * 「多」「好」这类抽象字没有干净的 emoji，留空即可——
   * 卡片会只显示字与组词，那比一张要猜的图好。
   */
  emoji: string
  /** 所属分组，见 `data/seed/hanziCards.ts` 的 `HANZI_GROUPS` */
  groupId: string
}

/**
 * 识字卡的语音片段 key，用汉字的 Unicode 码点。
 *
 * ⚠️ **不能用拼音当 key**：这 100 个字里同音同调的不止一对
 * （十 shí / 石 shí、木 mù / 目 mù），拼音撞车会让两个字共用一条音频，
 * 而表现是「点『石』念出『十』」——静默、且只有懂拼音的人才发现得了。
 * 码点则天然唯一，且与字本身绑定，加字减字都不会错位。
 *
 * @param char - 单个汉字
 * @returns 片段 key，形如 `'hanzi.u5929'`
 *
 * @example
 * hanziClipKey('天')   // 'hanzi.u5929'
 * hanziClipKey('石')   // 'hanzi.u77f3'
 * hanziClipKey('十')   // 'hanzi.u5341'  —— 与「石」同音，但 key 不同
 */
export function hanziClipKey(char: string): string {
  return `hanzi.u${char.codePointAt(0)?.toString(16) ?? ''}`
}

/**
 * 这张卡实际念出来的话：「天。蓝天的天。」
 *
 * ⭐ **不念孤立的单字**，这是拼音那边用学费换来的结论
 * （见 design/07-音频方案.md §3.3）：孤立单字没有上下文，
 * TTS 既可能挑错多音字的读音，声调也读得发飘。
 *
 * 「X。词的X。」这个句式一次解决两个问题：
 * 1. **消歧** —— 「地」在「大地的地」里只可能读 dì，不会读成助词 de；
 *    「长」在「长短的长」里只可能是 cháng
 * 2. **教学上本来就该这么念** —— 「XX 的 X」是课堂上认字的标准说法，
 *    孩子听到的是字 + 它的用法，而不是一个孤零零的音
 *
 * 句号不是装饰：它让前后两处「天」各自成句，TTS 会给出完整的字调，
 * 而不是把三个字连读成一个词组。
 *
 * @param card - 识字卡
 * @returns 朗读文本
 *
 * @example
 * hanziSpokenText({ char: '天', word: '蓝天', ... })   // '天。蓝天的天。'
 * hanziSpokenText({ char: '地', word: '大地', ... })   // '地。大地的地。'
 */
export function hanziSpokenText(card: Pick<HanziCard, 'char' | 'word'>): string {
  return `${card.char}。${card.word}的${card.char}。`
}
