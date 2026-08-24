/**
 * @file 搭配与排列生成器 —— 覆盖 M2-7.1 简单的搭配 · M2-7.2 简单的排列
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-7 数学广角·搭配
 *
 * 数学广角的题看着是「数一数有几种」，考的其实是**有没有按顺序去配**。
 * 因此 `combination_missed`（漏掉一种）必须占一个选项——
 * 她答出一个偏小的数，说明想到哪配到哪；答出 a+b，那是压根没理解「每一件都要配一遍」。
 *
 * ⚠️ 两种 mode 的语音各只加两条片段：物品**不做词表**。
 * 搭配题固定「上衣配裤子」，排列题干脆只用数字——这两样都是教材原样的情境，
 * 而换成十几种物品要十几条 mp3，换来的只是题干看着热闹一点。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readItemType, readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['outfit', 'digits'] as const

/**
 * 生成一道搭配或排列题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'outfit'` 几件配几件（M2-7.1）| `'digits'` 组成几个两位数（M2-7.2）
 * @param ctx.params.countRange - `outfit` 里每一边的数量范围，默认 `[2, 4]`
 * @param ctx.params.digitCount - `digits` 里给几个数字，默认 3
 * @returns 含 4 个选项的题目
 *
 * @example
 * combination({ kpId: 'M2-7.1', difficulty: 2, params: {}, rng })
 * // '2 件上衣和 3 条裤子，一共有几种穿法？'
 * //   6 → 正确
 * //   5 → mul_as_add          算成了 2 + 3
 * //   3 → combination_missed  只配了一件上衣就停了
 */
export const combination: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'outfit')
  return mode === 'digits' ? buildDigits(ctx) : buildOutfit(ctx)
}

/** `2 件上衣和 3 条裤子，一共有几种穿法？` */
function buildOutfit(ctx: GeneratorContext): GeneratedItem {
  const [lo, hi] = readRange(ctx.params, 'countRange', [2, 4])
  const tops = randomInt(ctx.rng, lo, hi)
  const bottoms = randomInt(ctx.rng, lo, hi)
  const answer = tops * bottoms

  const candidates: NumericDistractor[] = [
    // 「一共」听成了「一共有几件衣服」
    { value: tops + bottoms, tag: 'mul_as_add' },
    // 只把一件上衣配完就停了
    { value: bottoms, tag: 'combination_missed' },
    { value: answer - bottoms, tag: 'combination_missed' },
    { value: answer + bottoms, tag: 'mul_extra_group' },
  ]

  return {
    signature: `${ctx.kpId}#outfit:${tops}x${bottoms}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${tops} 件上衣和 ${bottoms} 条裤子，一共有几种穿法？`,
      ttsText: `${tops} 件上衣和 ${bottoms} 条裤子，一共有几种穿法`,
      ttsParts: [...num(tops), 'phrase.topsAnd', ...num(bottoms), 'phrase.bottomsHowMany'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}

/**
 * `用 1、2、3，能组成几个不同的两位数？`
 *
 * ⚠️ 数字里**不能有 0**：0 不能站十位，答案就不再是 n × (n-1) 了，
 * 而这道题考的正是那个乘法结构。
 */
function buildDigits(ctx: GeneratorContext): GeneratedItem {
  const count = readRange(ctx.params, 'digitCountRange', [3, 3])[0]
  const digits = shuffle(ctx.rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count).sort((a, b) => a - b)
  // 每个数字都能当十位，个位再从剩下的里挑一个
  const answer = count * (count - 1)

  const candidates: NumericDistractor[] = [
    // 每个数字只当了一次十位就收工
    { value: count, tag: 'combination_missed' },
    { value: count + (count - 1), tag: 'mul_as_add' },
    // 把「十位个位可以是同一个数」也算了进去
    { value: count * count, tag: 'mul_extra_group' },
  ]

  const spoken = digits.flatMap((d, i) => (i === 0 ? num(d) : ['op.and', ...num(d)]))

  return {
    signature: `${ctx.kpId}#digits:${digits.join('')}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `用 ${digits.join('、')}，能组成几个不同的两位数？`,
      ttsText: `用 ${digits.join(' ')}，能组成几个不同的两位数`,
      ttsParts: ['phrase.usingTheseDigits', ...spoken, 'phrase.howManyTwoDigits'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
