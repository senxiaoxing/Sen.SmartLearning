/**
 * @file 数位生成器 —— M1.10 数位初步（个位·十位）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M1 数感与计数
 * @see src/components/TenFrame.tsx  「1 个十和几个一」的可视化
 *
 * 复用十格阵而不是另画一套小棒：孩子在 M1.9（数的组成）、M5.1（凑十法）
 * 里已经反复见过这个图形，同一个概念换一套视觉语言只会增加认知负担
 * （design/05-孩子反馈与响应.md 第 5 条：讲解与练习共用同一套视觉）。
 */

import { buildNumericOptions } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import type { Generator } from '@/domain/types'

/**
 * 生成一道数位题。
 *
 * @param ctx.params.ask - 问哪一位：`'tens'` 十位 | `'ones'` 个位 | `'both'` 随机
 * @param ctx.params.range - 被问的数的区间，默认 11~19
 *
 * @example
 * placeValue({ kpId: 'M1.10', difficulty: 3, params: { ask: 'tens' }, rng })
 * // 抽到 15 时：
 * //   1 → 正确（十位上是 1）
 * //   5 → place_value_swap  说成了个位上的数
 * //  15 → place_value_swap  答成了整个数
 */
export const placeValue: Generator = ({ kpId, difficulty, params, rng }) => {
  const ask = readEnum(params, 'ask', ['tens', 'ones', 'both'] as const, 'both')
  const [lo, hi] = readRange(params, 'range', [11, 19])

  const value = randomInt(rng, lo, hi)
  const tens = Math.floor(value / 10)
  const ones = value % 10

  const askTens = ask === 'tens' || (ask === 'both' && rng() < 0.5)
  const answer = askTens ? tens : ones
  const other = askTens ? ones : tens
  const placeName = askTens ? '十位' : '个位'

  return {
    signature: `${kpId}-place#${askTens ? 'tens' : 'ones'}:${value}`,
    kpId,
    type: 'input_number',
    difficulty,
    stem: {
      text: `${value} 的${placeName}上是几？`,
      ttsText: `${value} 的${placeName}上是几`,
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 说反了：把另一位的数当成答案
        { tag: 'place_value_swap', value: other },
        // 答成了整个数，完全没理解「某一位上」是什么意思
        { tag: 'place_value_swap', value },
        { tag: 'off_by_one', value: answer + 1 },
      ],
      rng,
    ),
    answer: String(answer),
    // 难度 1 给十格阵脚手架；⚠️ 高难度必须撤掉，否则孩子只是在读图不是在理解数位
    ...(difficulty === 1
      ? { visual: { kind: 'tenFrame' as const, frame: tens * 10, loose: ones } }
      : {}),
  }
}
