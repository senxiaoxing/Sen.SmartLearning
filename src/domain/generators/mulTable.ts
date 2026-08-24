/**
 * @file 表内乘法生成器 —— 覆盖 M2-4.3 ~ M2-4.10（5 的口诀直到 1~9 综合）
 * @layer domain  纯函数
 * @see design/08-年级分区与内容扩展.md §4.1  什么时候该新建生成器
 * @see design/01-知识点图谱.md §M2-4 表内乘法
 *
 * 为什么是新生成器而不是给 `arithmetic` 加个 `op: 'mul'`：
 * 判据是**误区清单是不是新的一套**。乘法的三个误区
 * （`mul_as_add` / `table_confusion` / `mul_extra_group`）与加减法毫无重叠，
 * 而干扰项策略正是生成器的全部内容。
 *
 * 81 条口诀是个有限集合，题量却无限——这正是 §1.2 说的
 * 「生成器在计算这块比题库好」的典型。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readNumberList, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['product', 'missingFactor'] as const

/**
 * 生成一道表内乘法题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.factors - 本题考哪几句口诀，如 `[5]` 只考 5 的口诀、
 *                             `[7, 8, 9]` 考 7~9。**必填**，它就是「学到第几句」
 * @param ctx.params.otherRange - 另一个因数的范围，默认 `[1, 9]`
 * @param ctx.params.mode - `'product'` 求积（`3 × 4 = ?`）；
 *                          `'missingFactor'` 求因数（`3 × ? = 12`，为除法铺路），默认 `'product'`
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * mulTable({ kpId: 'M2-4.4', difficulty: 2, params: { factors: [3] }, rng })
 * // '3 × 4 = ?' 时：
 * //   12 → 正确
 * //    7 → mul_as_add       算成了 3 + 4
 * //   15 → mul_extra_group  多数了一组（3 × 5）
 * //   10 → table_confusion  串到了「二五一十」（2 × 5）
 *
 * @see design/03-技术方案.md §4.2  干扰项铁律
 */
export const mulTable: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const factors = readNumberList(ctx.params, 'factors')
  const [otherMin, otherMax] = readRange(ctx.params, 'otherRange', [1, 9])
  const mode = readEnum(ctx.params, 'mode', MODES, 'product')

  const fixed = randomPick(ctx.rng, factors)
  const other = randomInt(ctx.rng, otherMin, otherMax)

  // 口诀两个因数的位置随机对调：只出「5 × 几」会让她背下位置而不是意义。
  // 对调后 `a` 仍然是「每组几个」、`b` 是「组数」，干扰项据此构造
  const swapped = ctx.rng() < 0.5
  const a = swapped ? other : fixed
  const b = swapped ? fixed : other

  return mode === 'missingFactor' ? buildMissingFactor(ctx, a, b) : buildProduct(ctx, a, b)
}

/** `3 × 4 = ?` —— 求积 */
function buildProduct(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  const answer = a * b

  const candidates: NumericDistractor[] = [
    // ⭐ 红线：乘法当加法是二年级头号误区，必须占一个选项。
    //    它不在选项里，这道题就诊断不出「概念没建立」这件事
    { value: a + b, tag: 'mul_as_add' },
    { value: a * (b + 1), tag: 'mul_extra_group' },
  ]
  if (b > 1) candidates.push({ value: a * (b - 1), tag: 'mul_extra_group' })
  // 口诀串行：七八五十六 → 六九五十四，即 (a-1) × (b+1)
  if (a > 1) candidates.push({ value: (a - 1) * (b + 1), tag: 'table_confusion' })

  return {
    signature: `${ctx.kpId}#${a}x${b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} × ${b} = ?`,
      ttsText: `${a} 乘 ${b} 等于几`,
      ttsParts: [...num(a), 'op.times', ...num(b), 'phrase.equalsWhat'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}

/**
 * `3 × ? = 12` —— 求因数。
 *
 * 这是除法的前身：口诀的逆用。放在乘法单元里练，等 M2-9 学除法时
 * 她已经会「想乘法算除法」了，那一步就不再是新东西。
 */
function buildMissingFactor(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  const total = a * b

  const candidates: NumericDistractor[] = [
    // 用加法凑出总数：3 + 9 = 12，于是答 9。与求积题里的 mul_as_add 是同一种病
    { value: total - a, tag: 'mul_as_add' },
    { value: b + 1, tag: 'mul_extra_group' },
    { value: b - 1, tag: 'mul_extra_group' },
  ]

  return {
    signature: `${ctx.kpId}#${a}x?=${total}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} × ? = ${total}`,
      ttsText: `${a} 乘几等于 ${total}`,
      ttsParts: [...num(a), 'phrase.timesWhatEquals', ...num(total)],
    },
    options: buildNumericOptions(b, candidates, ctx.rng),
    answer: String(b),
  }
}
