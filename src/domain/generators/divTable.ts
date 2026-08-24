/**
 * @file 表内除法生成器 —— 覆盖 M2-9.2 ~ M2-9.4（除法的意义、用口诀求商）
 * @layer domain  纯函数
 * @see design/08-年级分区与内容扩展.md §4.1  什么时候该新建生成器
 * @see design/01-知识点图谱.md §M2-9 表内除法
 *
 * 除法是乘法的逆，因此**被除数由商和除数乘出来**，而不是随机取一个数再判断整除——
 * 后者会在参数稍紧时反复重试，还可能撞出口诀表以外的算式（如 `91 ÷ 7`）。
 *
 * ⚠️ 有余数的除法不在这里，见 `remainderDiv.ts`：那一套的误区
 * （`remainder_ignored` / `remainder_too_big` / `quotient_remainder_swap`）
 * 是全新的，按 §4.1 的判据该另起一个生成器。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readNumberList, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['quotient', 'divisor'] as const

/**
 * 生成一道表内除法题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.divisors - 除数候选，即「用哪几句口诀求商」。**必填**
 * @param ctx.params.quotientRange - 商的范围，默认 `[1, 9]`（表内除法的上限）
 * @param ctx.params.mode - `'quotient'` 求商（`12 ÷ 3 = ?`）；
 *                          `'divisor'` 求除数（`12 ÷ ? = 4`），默认 `'quotient'`
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * divTable({ kpId: 'M2-9.3', difficulty: 2, params: { divisors: [3] }, rng })
 * // '12 ÷ 3 = ?' 时：
 * //    4 → 正确
 * //    9 → div_as_sub        做成了 12 - 3
 * //   36 → div_as_mul        做成了 12 × 3
 * //    3 → table_confusion   口诀用岔，把除数当成了商
 *
 * @see design/03-技术方案.md §4.2  干扰项铁律
 */
export const divTable: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const divisors = readNumberList(ctx.params, 'divisors')
  const [qMin, qMax] = readRange(ctx.params, 'quotientRange', [1, 9])
  const mode = readEnum(ctx.params, 'mode', MODES, 'quotient')

  const divisor = randomPick(ctx.rng, divisors)
  const quotient = randomInt(ctx.rng, qMin, qMax)
  const dividend = divisor * quotient

  return mode === 'divisor'
    ? buildDivisor(ctx, dividend, divisor, quotient)
    : buildQuotient(ctx, dividend, divisor, quotient)
}

/** `12 ÷ 3 = ?` —— 求商 */
function buildQuotient(
  ctx: GeneratorContext,
  dividend: number,
  divisor: number,
  quotient: number,
): GeneratedItem {
  const candidates: NumericDistractor[] = [
    // ⭐ 除法当减法：她知道「变少了」，但不知道是平均分。这是求商题的头号误区
    { value: dividend - divisor, tag: 'div_as_sub' },
    { value: dividend * divisor, tag: 'div_as_mul' },
    // 口诀用岔：算 12 ÷ 3 时想到「三四十二」，却报出了除数 3
    { value: divisor, tag: 'table_confusion' },
    { value: quotient + 1, tag: 'table_confusion' },
  ]

  return {
    signature: `${ctx.kpId}#${dividend}/${divisor}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${dividend} ÷ ${divisor} = ?`,
      ttsText: `${dividend} 除以 ${divisor} 等于几`,
      ttsParts: [...num(dividend), 'op.dividedBy', ...num(divisor), 'phrase.equalsWhat'],
    },
    options: buildNumericOptions(quotient, candidates, ctx.rng),
    answer: String(quotient),
  }
}

/**
 * `12 ÷ ? = 4` —— 求除数。
 *
 * 与求商是同一句口诀的另一个方向。只出求商，她会把「想乘法算除法」
 * 固化成「看见 ÷ 就找口诀第三个数」，换个位置就卡住。
 */
function buildDivisor(
  ctx: GeneratorContext,
  dividend: number,
  divisor: number,
  quotient: number,
): GeneratedItem {
  const candidates: NumericDistractor[] = [
    { value: dividend - quotient, tag: 'div_as_sub' },
    { value: quotient, tag: 'table_confusion' },
    { value: divisor + 1, tag: 'table_confusion' },
    { value: divisor - 1, tag: 'table_confusion' },
  ]

  return {
    signature: `${ctx.kpId}#${dividend}/?=${quotient}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${dividend} ÷ ? = ${quotient}`,
      ttsText: `${dividend} 除以几等于 ${quotient}`,
      ttsParts: [...num(dividend), 'phrase.dividedByWhatEquals', ...num(quotient)],
    },
    options: buildNumericOptions(divisor, candidates, ctx.rng),
    answer: String(divisor),
  }
}
