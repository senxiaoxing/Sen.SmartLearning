/**
 * @file 图形面选项构造 —— 把英语词条组装成「emoji + 中文小字」的选项
 * @layer domain  纯函数
 * @see src/domain/generators/distractors.ts  数值/文本型选项（数学、拼音用）
 * @see src/domain/generators/englishListen.ts  唯一使用者
 *
 * 单独成文件而不是塞进 `distractors.ts`：那边处理的是「答案是一个值」
 * （数字、符号、拼音串），这边处理的是「答案是一个东西」——
 * 选项要同时携带图形面、中文释义、朗读文本三样，与前者不是一类。
 */

import { shuffle } from '@/domain/generators/rng'
import type { EnglishWord } from '@/domain/english'
import type { ItemOption, MisconceptionTag } from '@/domain/types'

/** 选项 ID 序列。四选一是上限，一年级孩子的注意力容纳不了更多 */
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 一个干扰项候选：用哪个词、孩子选中它算哪种误区 */
export interface FaceCandidate {
  word: EnglishWord
  tag: MisconceptionTag
}

/**
 * 把正确词条与干扰候选组装成一组选项。
 *
 * ⚠️ **按图形面去重，不是按 id**：`cat`（E2.1）与 `itsACat`（E10.1）是两个词条，
 * 但图形面都是 `🐱`。两个一模一样的选项摆在一起，孩子点哪个都说不清对错，
 * 掌握度还会被这种无解题污染。
 *
 * @param correct - 正确词条
 * @param candidates - 干扰候选，**顺序即优先级**（音近词排在兜底词前面）
 * @param rng - 注入的随机源。正确答案若总在固定位置，
 *              孩子会学会「选第二个」而不是听内容
 * @returns 已洗牌的选项，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * buildFaceOptions(fourteen, [
 *   { word: four, tag: 'number_teen_ty' },   // 词尾 -teen 没听见
 *   { word: fifteen, tag: 'similar_sound' },
 *   { word: fourty, tag: 'similar_sound' },
 * ], rng)
 * // → 4 个选项，正确项「14」无 tag，其余各带自己的误区标签
 */
export function buildFaceOptions(
  correct: EnglishWord,
  candidates: readonly FaceCandidate[],
  rng: () => number,
): ItemOption[] {
  const seen = new Set<string>([correct.face])
  const picked: FaceCandidate[] = []

  for (const candidate of candidates) {
    if (picked.length >= OPTION_IDS.length - 1) break
    if (seen.has(candidate.word.face)) continue
    seen.add(candidate.word.face)
    picked.push(candidate)
  }

  const options: ItemOption[] = [
    toOption('a', correct, true),
    ...picked.map((c, i) => toOption(OPTION_IDS[i + 1] ?? `x${i}`, c.word, false, c.tag)),
  ]

  // 洗牌后重新分配 ID，保证 ID 始终是 a/b/c/d 的顺序而位置随机
  return shuffle(rng, options).map((option, i) => ({
    ...option,
    id: OPTION_IDS[i] ?? `x${i}`,
  }))
}

/**
 * 一个词条 → 一个选项。
 *
 * `ttsText` 取中文而不是英文：点选项是**确认这个图是什么**，
 * 念英文等于直接把答案念出来，这道题就白出了。
 */
function toOption(
  id: string,
  word: EnglishWord,
  isCorrect: boolean,
  tag?: MisconceptionTag,
): ItemOption {
  return {
    id,
    text: word.face,
    caption: word.zh,
    ttsText: word.zh,
    isCorrect,
    ...(tag === undefined ? {} : { misconceptionTag: tag }),
  }
}
