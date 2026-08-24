/**
 * @file 近似数生成器 —— M2-13.5「4985 大约是几千」
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-13 万以内数的认识
 *
 * ⭐ **每道题都取在「要进位」和「不进位」两侧各半**。
 *
 * 全出 4985 这类要进位的，她会把规则记成「往上找那个整数」；
 * 全出 4123 这类不进位的，`estimate_truncate`（直接砍掉后面几位）
 * 算出来的数就等于正确答案，被去重剔除——这道题也就问不出她会不会四舍五入了。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readItemType, readNumber } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

/**
 * 生成一道近似数题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.unit - 约到哪一位：`100` 约到百、`1000` 约到千。默认 100
 * @param ctx.params.maxUnits - 最多几个整单位，默认 9（即百位题到 999、千位题到 9999）
 * @returns 含 4 个选项的题目
 *
 * @example
 * roundNumber({ kpId: 'M2-13.5', difficulty: 3, params: { unit: 1000 }, rng })
 * // 「4985 大约是几千？」
 * //   5000 → 正确
 * //   4000 → estimate_truncate  只看千位，后面几位一概不管
 */
export const roundNumber: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const unit = readNumber(ctx.params, 'unit', 100)
  const maxUnits = readNumber(ctx.params, 'maxUnits', 9)

  const head = randomInt(ctx.rng, 1, maxUnits - 1)
  // ⭐ 一半的题要进位、一半不要 —— 理由见文件头
  const roundsUp = ctx.rng() < 0.5
  const rest = roundsUp
    ? randomInt(ctx.rng, unit / 2, unit - 1)
    : randomInt(ctx.rng, 1, unit / 2 - 1)

  const value = head * unit + rest
  const truncated = head * unit
  const answer = roundsUp ? truncated + unit : truncated

  const unitName = unit === 1000 ? '千' : '百'
  const candidates: NumericDistractor[] = [
    // ⭐ 直接砍掉后面几位。不进位的那一半里它等于正确答案，会被自动剔除
    { value: truncated, tag: 'estimate_truncate' },
    // 反过来：不管三七二十一都往上进
    { value: truncated + unit, tag: 'estimate_truncate' },
    // 约到了错误的那一位（该约到千却约到了百）
    { value: Math.round(value / (unit / 10)) * (unit / 10), tag: 'place_value_swap' },
    { value: value, tag: 'place_value_swap' },
  ]

  return {
    signature: `${ctx.kpId}#round${unit}:${value}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${value} 大约是几${unitName}？`,
      ttsText: `${value} 大约是几${unitName}`,
      ttsParts: [
        ...num(value),
        unit === 1000 ? 'phrase.aboutHowManyThousands' : 'phrase.aboutHowManyHundreds',
      ],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
