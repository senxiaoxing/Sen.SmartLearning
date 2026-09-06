/**
 * @file Dolch 高频词表前三级 —— 英语短文的「粘合词」白名单
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/englishStories.ts  用它的地方
 * @see src/data/seed/hanziStories.ts    语文短文的 `STORY_GLUE`，同一个位置
 *
 * ## 它相当于语文短文的 `STORY_GLUE`，只是大得多
 *
 * 语文那边只要 13 个虚词，因为识字 300 已经把实词铺满了。
 * 英语这边词表只有一百来个词条（还大半是整句），
 * 光靠它连 `The cat is on the box.` 都写不出来——`the` `is` `on` 一个都没有。
 *
 * ## ⭐ 为什么用 Dolch 而不是自己列一张
 *
 * Dolch Sight Words 是 1936 年从儿童读物里统计出来的高频词表，
 * 至今仍是英语母语区分级读物的通用底座：**一篇初级读物的一半以上的词出自这里**。
 * 自己拍脑袋列一张的话，会漏掉 `said` `went` 这类高频到不可缺、
 * 却因为不是「基础词汇」而想不起来的词。
 *
 * 更要紧的是**它自带分级**，正好对上三辑：
 *
 * | 辑 | 可用的级 | 能写出什么 |
 * |---|---|---|
 * | 第一辑 | Pre-Primer | `I see a red cat.` 三五个词的陈述句 |
 * | 第二辑 | ＋ Primer | `The cat is on my bag.` 有 be 动词、有介词 |
 * | 第三辑 | ＋ Grade 1 | `Then she gave it to me.` 有先后、有人称转换 |
 *
 * 这与语文短文「第 N 辑只用识字第 1~N 辑的字」是同一条规矩的英语版。
 *
 * ## ⚠️ 这些词**没有语音**，点了只给一声轻响
 *
 * 与语文短文的虚词处理完全一致（见 `features/chinese/StoryView.tsx`）：
 * 词表里有的词点了会念，这些没有。短文这一块本来就不新增任何音频，
 * 「语音包到二年级为止」那条红线一个字都不用改。
 *
 * ## ⚠️ 不要往这三张表里加词
 *
 * 它们是**引用的外部标准**，不是我们的配置。缺词说明那句话该换个写法，
 * 而不是把表改大——表一旦可以随手加词，「只用她读得懂的词」这条线就没了，
 * 而这条线正是短文这一块存在的全部意义。
 * 真要扩，就照 Dolch 的分级往后加 Grade 2、Grade 3，连同新的一辑一起。
 */

/**
 * Dolch Pre-Primer（40 词）。学前班级别，最先认的一批。
 *
 * 颜色词（blue/red/yellow）和数词（one/two/three）本来就在这一级里——
 * 它们同时也在英语词表中，重复不影响判定（两边都算「学过」）。
 */
const PRE_PRIMER: readonly string[] = [
  'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
  'funny', 'go', 'help', 'here', 'i', 'in', 'is', 'it', 'jump', 'little',
  'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
  'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
]

/**
 * Dolch Primer（52 词）。⭐ be 动词（am/are/was）与介词（at/on/into/under）
 * 都在这一级——第二辑短文之所以忽然能写出正经句子，靠的就是它们。
 */
const PRIMER: readonly string[] = [
  'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
  'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
  'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
  'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
  'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who',
  'will', 'with', 'yes',
]

/**
 * Dolch Grade 1（41 词）。多出来的是**连接与转折**（then/when/again/some）
 * 和人称的宾格属格（him/his/her/them）——故事到这一级才有得起承转合。
 */
const GRADE_1: readonly string[] = [
  'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
  'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
  'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
  'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
  'were', 'when',
]

/**
 * 三级词表，顺序即难度。**下标与短文的辑一一对应**：
 * 第 N 辑短文可以用第 0~N-1 级的词。
 *
 * ⚠️ 顺序不能动，也不能在中间插一级——`sightWordsUpToVolume()` 按下标切片。
 */
export const SIGHT_WORD_LEVELS: readonly (readonly string[])[] = [PRE_PRIMER, PRIMER, GRADE_1]

/**
 * 累积到第 `index` 级（含）为止的全部高频词，全小写。
 *
 * 给 `englishStories.test.ts` 的越界扫描用，与语文短文的
 * `charsUpToVolume()` 是同一个位置的同一件事。
 *
 * @param index - 级的下标，从 0 起（0 = Pre-Primer）
 * @returns 该级及之前全部级的词
 *
 * @example
 * sightWordsUpToVolume(0).has('see')   // true   Pre-Primer 就有
 * sightWordsUpToVolume(0).has('was')   // false  「was」在 Primer
 * sightWordsUpToVolume(1).has('was')   // true
 */
export function sightWordsUpToVolume(index: number): ReadonlySet<string> {
  return new Set(SIGHT_WORD_LEVELS.slice(0, index + 1).flat())
}
