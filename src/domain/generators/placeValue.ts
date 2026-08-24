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
import { num } from '@/domain/speech'
import type { Generator } from '@/domain/types'

/** 数位：索引即「第几位」，0 是个位。扩到千位是为二年级万以内数（M2-13.4） */
const PLACES = ['ones', 'tens', 'hundreds', 'thousands'] as const
type Place = (typeof PLACES)[number]

const PLACE_NAMES: Record<Place, string> = {
  ones: '个位',
  tens: '十位',
  hundreds: '百位',
  thousands: '千位',
}

const PLACE_CLIPS: Record<Place, string> = {
  ones: 'phrase.onesDigitWhat',
  tens: 'phrase.tensDigitWhat',
  hundreds: 'phrase.hundredsDigitWhat',
  thousands: 'phrase.thousandsDigitWhat',
}

/** 取某一位上的数字 */
function digitAt(value: number, place: Place): number {
  return Math.floor(value / 10 ** PLACES.indexOf(place)) % 10
}

/**
 * 生成一道数位题。
 *
 * ⭐ 从一年级的个位/十位扩到千位是**扩参数而不是新生成器**：
 * 误区还是 `place_value_swap`（说成了另一位上的数），干扰项策略一个字没变。
 * 判据见 design/08-年级分区与内容扩展.md §4.1。
 *
 * @param ctx.params.ask - 问哪一位：`'ones'` | `'tens'` | `'hundreds'` | `'thousands'` | `'both'` 随机
 * @param ctx.params.range - 被问的数的区间，默认 11~19
 *
 * @example
 * placeValue({ kpId: 'M1.10', difficulty: 3, params: { ask: 'tens' }, rng })
 * // 抽到 15 时：
 * //   1 → 正确（十位上是 1）
 * //   5 → place_value_swap  说成了个位上的数
 * //  15 → place_value_swap  答成了整个数
 *
 * placeValue({ kpId: 'M2-13.4', difficulty: 3, params: { ask: 'hundreds', range: [1000, 9999] }, rng })
 * // 「3527 的百位上是几」→ 5
 */
export const placeValue: Generator = ({ kpId, difficulty, params, rng }) => {
  const ask = readEnum(params, 'ask', [...PLACES, 'both'] as const, 'both')
  const [lo, hi] = readRange(params, 'range', [11, 19])

  const value = randomInt(rng, lo, hi)
  // 只在这个数真有的位里挑，免得问「15 的千位上是几」
  const available = PLACES.filter((p) => hi >= 10 ** PLACES.indexOf(p))
  const place: Place =
    ask === 'both' ? available[Math.floor(rng() * available.length)]! : ask

  const answer = digitAt(value, place)
  const others = available.filter((p) => p !== place).map((p) => digitAt(value, p))
  const placeName = PLACE_NAMES[place]

  return {
    signature: `${kpId}-place#${place}:${value}`,
    kpId,
    type: 'input_number',
    difficulty,
    stem: {
      text: `${value} 的${placeName}上是几？`,
      ttsText: `${value} 的${placeName}上是几`,
      ttsParts: [...num(value), PLACE_CLIPS[place]],
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 说反了：把别的位上的数当成答案
        ...others.map((v) => ({ tag: 'place_value_swap' as const, value: v })),
        // 答成了整个数，完全没理解「某一位上」是什么意思
        { tag: 'place_value_swap', value },
        { tag: 'off_by_one', value: answer + 1 },
      ],
      rng,
    ),
    answer: String(answer),
    // 难度 1 给十格阵脚手架；⚠️ 高难度必须撤掉，否则孩子只是在读图不是在理解数位。
    // 只在两位数内给：十格阵摆不下三位数，那是二年级的内容
    ...(difficulty === 1 && value < 100
      ? {
          visual: {
            kind: 'tenFrame' as const,
            frame: digitAt(value, 'tens') * 10,
            loose: digitAt(value, 'ones'),
          },
        }
      : {}),
  }
}
