/**
 * @file 序数生成器 —— M1.4 基数与序数（第几个）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M1 数感与计数
 *
 * ## ⭐ 考「它排第几」而不是「第几个是谁」
 *
 * 两种问法看着差不多，诊断能力差很远：
 *
 * ```
 * 「第 3 个是谁？」   选项是动物 → 选错了只知道她数错了，不知道错在哪
 * 「小兔排第几？」    选项是数字 → 选「一共 5 个」的 5 就是 ordinal_cardinal_confusion
 * ```
 *
 * 后者能把**基数序数混淆**（把「第 3 个」听成「3 个」）单独拎出来，
 * 而那正是 M1.4 唯一要诊断的东西。
 */

import { buildNumericOptions } from '@/domain/generators/distractors'
import { ORDINAL_LINEUP } from '@/domain/generators/countables'
import { readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type { Generator } from '@/domain/types'

/**
 * 生成一道序数题。
 *
 * @param ctx.params.countRange - 一排放几个
 * @param ctx.params.allowFromRight - 是否可能从右边数（难度 2 起）
 *
 * @example
 * ordinal({ kpId: 'M1.4', difficulty: 2, params: { countRange: [4, 6] }, rng })
 * // 摆出 5 只动物、箭头指第 3 只时：
 * //   3 → 正确
 * //   5 → ordinal_cardinal_confusion  答成了「一共几个」
 * //   2 / 4 → off_by_one              数的时候差一个
 */
export const ordinal: Generator = ({ kpId, difficulty, params, rng }) => {
  const [lo, hi] = readRange(params, 'countRange', [4, 6])
  const count = randomInt(rng, lo, hi)
  const allowFromRight = params['allowFromRight'] === true

  const lineup = shuffle(rng, [...ORDINAL_LINEUP]).slice(0, count)
  const fromRight = allowFromRight && rng() < 0.5
  // 位次 1-based，避开首尾——第一个和最后一个不用数就能看出来
  const position = randomInt(rng, 2, Math.max(2, count - 1))
  const targetIndex = position - 1

  const arrayIndex = fromRight ? count - 1 - targetIndex : targetIndex
  const targetName = lineup[arrayIndex]?.name ?? '它'
  const side = fromRight ? '右' : '左'

  return {
    signature: `${kpId}-ordinal#${side}:${count}:${position}:${lineup.map((c) => c.name).join('')}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `从${side}边数，${targetName}排第几？`,
      ttsText: `从${side}边数，${targetName}排第几`,
    },
    options: buildNumericOptions(
      position,
      [
        // ⭐ 把「第几个」听成了「几个」，答成总数
        { tag: 'ordinal_cardinal_confusion', value: count },
        // 从另一头数的结果
        { tag: 'ordinal_cardinal_confusion', value: count + 1 - position },
        { tag: 'off_by_one', value: position - 1 },
        { tag: 'off_by_one', value: position + 1 },
      ],
      rng,
    ),
    answer: String(position),
    visual: {
      kind: 'ordinalRow',
      emojis: lineup.map((c) => c.emoji),
      targetIndex,
      ...(fromRight ? { fromRight: true } : {}),
    },
  }
}
