/**
 * @file 有余数除法生成器 —— 覆盖 M2-12.1 ~ M2-12.3
 * @layer domain  纯函数
 * @see design/08-年级分区与内容扩展.md §4.1  什么时候该新建生成器
 * @see design/01-知识点图谱.md §M2-12 有余数的除法
 *
 * 为什么不并进 `divTable`：判据是误区清单。有余数除法的三个误区
 * （`remainder_ignored` / `remainder_too_big` / `quotient_remainder_swap`）
 * 在表内除法里一个都不存在——那里根本没有余数这个东西。
 *
 * ⚠️ 答案是「3 余 1」这样的**两段式文本**，不是一个数，因此用
 * `buildTextOptions` 而不是 `buildNumericOptions`。
 */

import { buildTextOptions } from '@/domain/generators/distractors'
import { readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  MisconceptionTag,
} from '@/domain/types'

/** 把商与余数拼成答案文本。⚠️ 与 `answerParts()` 的分词规则一致，改一处要改两处 */
function format(quotient: number, remainder: number): string {
  return `${quotient} 余 ${remainder}`
}

/**
 * 生成一道有余数的除法题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.divisorRange - 除数范围，默认 `[2, 9]`
 * @param ctx.params.quotientRange - 商的范围，默认 `[2, 9]`
 * @returns 含 4 个选项的题目，选项是「商 余 余数」的文本
 *
 * @example
 * remainderDiv({ kpId: 'M2-12.3', difficulty: 3, params: {}, rng })
 * // '13 ÷ 4 = ?' 时：
 * //   「3 余 1」→ 正确
 * //   「3」    → remainder_ignored        只答商，余数丢了
 * //   「1 余 3」→ quotient_remainder_swap  算对了但写反
 * //   「2 余 5」→ remainder_too_big        余数比除数还大，其实还能再分一轮
 */
export const remainderDiv: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const [dMin, dMax] = readRange(ctx.params, 'divisorRange', [2, 9])
  const [qMin, qMax] = readRange(ctx.params, 'quotientRange', [2, 9])

  const divisor = randomInt(ctx.rng, dMin, dMax)
  const quotient = randomInt(ctx.rng, qMin, qMax)
  // 余数恒在 [1, divisor-1]：取 0 就成了表内除法，这道题就白出了
  const remainder = randomInt(ctx.rng, 1, divisor - 1)
  const dividend = divisor * quotient + remainder

  const correct = format(quotient, remainder)
  const swapped = format(remainder, quotient)
  // 商与余数相等时（10 ÷ 4 = 2 余 2）对调后和正确答案一模一样，会被去重剔除，
  // 而 `buildTextOptions` 不像数值版那样有补位机制——选项会静静地少一个。
  // 这一题就换成「多分了一轮」，仍然是个真实的错误
  const swapOrExtra: { text: string; tag: MisconceptionTag } =
    swapped === correct
      ? { text: format(quotient + 1, remainder), tag: 'off_by_one' }
      : { text: swapped, tag: 'quotient_remainder_swap' }
  // 商为 1 时再减就成了 0，那句「0 余几」念出来很怪，改成商不动、余数超标
  const tooBigQuotient = quotient > 1 ? quotient - 1 : quotient

  const candidates: Array<{ text: string; tag: MisconceptionTag }> = [
    // ⭐ 只答商 —— 分完了却没想起来「还剩下几个」
    { text: String(quotient), tag: 'remainder_ignored' },
    swapOrExtra,
    // 少分一轮，余数就比除数还大了：13 ÷ 4 答「2 余 5」
    { text: format(tooBigQuotient, remainder + divisor), tag: 'remainder_too_big' },
  ]

  return {
    signature: `${ctx.kpId}#${dividend}/${divisor}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: `${dividend} ÷ ${divisor} = ?`,
      ttsText: `${dividend} 除以 ${divisor} 等于几余几`,
      ttsParts: [
        ...num(dividend),
        'op.dividedBy',
        ...num(divisor),
        'phrase.equalsWhatRemainder',
      ],
    },
    options: buildTextOptions(correct, candidates, ctx.rng),
    answer: correct,
  }
}
