/**
 * @file 古诗的类型与 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/poems.ts  实际的 20 首（数据在 data 层）
 *
 * 与 `domain/pinyin.ts`、`domain/hanzi.ts` 同一个分工：
 * 类型与 key 规则在 domain，诗本身在 data/seed。
 */

/** 诗里的一句：汉字与它的逐字拼音 */
export interface PoemLine {
  /** 诗句原文，含标点 */
  text: string
  /**
   * 逐字拼音，空格分隔，**不含标点**。
   *
   * ⚠️ 字数必须与 `text` 去掉标点后一致——孩子是照着上下两行对着看的，
   * 对不齐时她会把某个音安到隔壁的字上。由 `poems.test.ts` 强制校验。
   */
  pinyin: string
  /**
   * 送去 TTS 合成的文本，**仅当它与 `text` 不同时才填**。
   *
   * ⭐ 古诗里有些字读的是古音（「见牛羊」的见读 xiàn、「曲项」的曲读 qū），
   * 而 TTS 是文本转语音，只会按现代常用音念。改喂一个**同音字**
   * （「现牛羊」「屈项」）就能读对——这与拼音用汉字载体是同一个手法。
   *
   * ⚠️ 屏幕上显示的永远是 `text`，只有音频用这一份。
   * 由 `poems.test.ts` 校验改写不改变字数。
   */
  spoken?: string
}

/** 一首诗 */
export interface Poem {
  /**
   * 语义 ID，用标题的无调拼音，如 `'jingyesi'`。
   * ⚠️ 只能是小写字母数字——它要进语音片段 key，见 {@link poemLineClipKey}。
   */
  id: string
  title: string
  /** 朝代，如 `'唐'` */
  dynasty: string
  author: string
  lines: readonly PoemLine[]
  /** 白话译文。⚠️ 写给**孩子听**，不是给大人看的注释，见 poems.ts 文件头 */
  meaning: string
}

/**
 * 诗题的语音片段 key。
 *
 * ⚠️ 这一条念的是**「诗名。朝代，作者。」整句**，不只是诗名，
 * 见 {@link poemHeadText}。
 *
 * @example
 * poemTitleClipKey('jingyesi')   // 'poem.jingyesiTitle'
 */
export function poemTitleClipKey(id: string): string {
  return `poem.${id}Title`
}

/**
 * 报诗名那一句：「静夜思。唐，李白。」
 *
 * ⭐ 读整首必须从这一句开始——**报出诗名、朝代、作者本来就是背诗的一部分**，
 * 课堂上老师带读、孩子上台背诵，开口第一句都是它。
 * 只念诗文等于把这首诗从它的来处剥离出来了。
 *
 * ⚠️ 这段文本同时是生成脚本合成音频的输入
 * （`scripts/generate-voices.mjs` 的 `loadPoems()` 必须拼出**逐字相同**的串），
 * 两边对不上的后果是每次 `npm run voices` 都判定「文本变了」而重生成一遍。
 *
 * @param poem - 一首诗
 * @returns 待朗读的整句
 *
 * @example
 * poemHeadText({ title: '静夜思', dynasty: '唐', author: '李白' })
 * // '静夜思。唐，李白。'
 */
export function poemHeadText(poem: Pick<Poem, 'title' | 'dynasty' | 'author'>): string {
  return `${poem.title}。${poem.dynasty}，${poem.author}。`
}

/**
 * 第 `index` 句的语音片段 key（从 0 起）。
 *
 * ⭐ **一句一个片段**，不是整首一条音频。这样「读整首」就是把这些片段
 * 按顺序排给播放器（`utter([...lines])`），而「只读这一句」直接取其中一条——
 * 同一份素材两种用法，不必为整首再录一遍。
 *
 * @example
 * poemLineClipKey('jingyesi', 0)   // 'poem.jingyesiL0'
 */
export function poemLineClipKey(id: string, index: number): string {
  return `poem.${id}L${index}`
}

/**
 * 译文的语音片段 key。
 *
 * @example
 * poemMeaningClipKey('jingyesi')   // 'poem.jingyesiMeaning'
 */
export function poemMeaningClipKey(id: string): string {
  return `poem.${id}Meaning`
}

/**
 * 这首诗全部句子的片段 key，顺序即朗读顺序（**不含**报诗名那一句）。
 *
 * @param poem - 一首诗
 * @returns 逐句片段 key
 *
 * @example
 * poemLineClipKeys({ id: 'jingyesi', lines: [l0, l1, l2, l3], ... })
 * // ['poem.jingyesiL0', 'poem.jingyesiL1', 'poem.jingyesiL2', 'poem.jingyesiL3']
 */
export function poemLineClipKeys(poem: Pick<Poem, 'id' | 'lines'>): string[] {
  return poem.lines.map((_line, index) => poemLineClipKey(poem.id, index))
}

/**
 * 「读整首」要说的话：报诗名那一句 + 全部诗句。
 *
 * @param poem - 一首诗
 * @returns 片段序列与兜底文本，直接交给 `say()`
 *
 * @example
 * wholePoemUtterance(jingyesi)
 * // { parts: ['poem.jingyesiTitle', 'poem.jingyesiL0', …],
 * //   fallbackText: '静夜思。唐，李白。床前明月光，…' }
 */
export function wholePoemUtterance(poem: Poem): { parts: string[]; fallbackText: string } {
  return {
    parts: [poemTitleClipKey(poem.id), ...poemLineClipKeys(poem)],
    fallbackText: poemHeadText(poem) + poem.lines.map((line) => line.text).join(''),
  }
}
