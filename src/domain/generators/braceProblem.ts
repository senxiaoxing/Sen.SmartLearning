/**
 * @file 大括号问号生成器 —— M9.4
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M9 解决问题
 * @see src/items/StemFigure.tsx  BraceGroups 的画法
 *
 * ## ⭐ 问号的位置决定用加还是减
 *
 * 这是人教版一年级的标志性题型，考的**不是算术而是读图列式**：
 *
 * ```
 * 问号在括号外（求总数）   → 加法    3 + 2 = ?
 * 问号在某一组上（求部分） → 减法    5 - 3 = ?
 * ```
 *
 * 孩子做错几乎只有一个原因：没看清问号在哪，把该减的做成了加。
 * 所以干扰项必须包含**用反运算的结果**，命中即 `wrong_operation`。
 */

import { COUNTABLES } from '@/domain/generators/countables'
import { buildNumericOptions } from '@/domain/generators/distractors'
import { readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import type { Generator } from '@/domain/types'

/**
 * 生成一道大括号问号题。
 *
 * @param ctx.params.totalRange - 总数区间
 * @param ctx.params.askPart - 是否可能把问号标在某一组上（求部分，用减法）
 *
 * @example
 * braceProblem({ kpId: 'M9.4', difficulty: 3, params: { askPart: true }, rng })
 * // 总共 7 个、第一组 4 个、问号在第二组时：
 * //   3 → 正确（7 - 4）
 * //  11 → wrong_operation  看成了求总数，做了加法
 * //   7 → wrong_operation  答成了括号外的总数
 */
export const braceProblem: Generator = ({ kpId, difficulty, params, rng }) => {
  const [lo, hi] = readRange(params, 'totalRange', [4, 9])
  const askPart = params['askPart'] === true

  const total = randomInt(rng, Math.max(3, lo), hi)
  const first = randomInt(rng, 1, total - 1)
  const second = total - first
  const thing = randomPick(rng, COUNTABLES)

  // 问号标在总数上（求和）还是某一组上（求差）
  const questionOnPart = askPart && rng() < 0.5
  const partIndex = questionOnPart ? (rng() < 0.5 ? 0 : 1) : -1

  if (!questionOnPart) {
    return {
      signature: `${kpId}-brace#total:${first}+${second}:${thing.name}`,
      kpId,
      type: 'choice_image',
      difficulty,
      stem: { text: `一共有几个${thing.name}？`, ttsText: `一共有几个${thing.name}` },
      options: buildNumericOptions(
        total,
        [
          // ⭐ 看成了求部分，做了减法
          { tag: 'wrong_operation', value: Math.abs(first - second) },
          { tag: 'wrong_operation', value: first },
          { tag: 'off_by_one', value: total + 1 },
        ],
        rng,
      ),
      answer: String(total),
      visual: {
        kind: 'braceGroups',
        emoji: thing.emoji,
        name: thing.name,
        groups: [first, second],
        question: 'total',
      },
    }
  }

  const known = partIndex === 0 ? second : first
  const answer = total - known

  return {
    signature: `${kpId}-brace#part${partIndex}:${total}-${known}:${thing.name}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `问号那一组有几个${thing.name}？`,
      ttsText: `问号那一组有几个${thing.name}`,
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 没看清问号在组上，做成了加法
        { tag: 'wrong_operation', value: total + known },
        // 答成了括号外的总数
        { tag: 'wrong_operation', value: total },
        { tag: 'off_by_one', value: answer + 1 },
      ],
      rng,
    ),
    answer: String(answer),
    visual: {
      kind: 'braceGroups',
      emoji: thing.emoji,
      name: thing.name,
      // ⚠️ 问号那一组的数量仍要画出物体，孩子得能数——它只是不标数字
      groups: [first, second],
      question: partIndex,
    },
  }
}
