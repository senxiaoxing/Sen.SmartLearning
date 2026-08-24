/**
 * @file 混合运算生成器 —— 覆盖 M2-11.1 ~ M2-11.3 与 M2-4.6 乘加乘减
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-11 混合运算
 *
 * ⭐ **这个生成器的每一道题都必须「按错误顺序算能算出另一个数」**，
 * 否则 `op_order` 干扰项会等于正确答案而被剔除，这道题也就诊断不出任何东西。
 *
 * 括号题尤其容易踩：`(3 + 2) × 4` 无视括号从左往右照样得 20，
 * 和正确答案一模一样。因此括号一律放在**右边**——`4 × (3 + 2)`
 * 忽略括号会得 14，那才暴露出问题。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readNumber } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num, type ClipKey } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['sameLevel', 'mixed', 'paren'] as const

/** 运算符的三件套：屏幕上的样子、念法、片段 key */
const OP_INFO = {
  '+': { spoken: '加', clip: 'op.plus' },
  '-': { spoken: '减', clip: 'op.minus' },
  '×': { spoken: '乘', clip: 'op.times' },
  '÷': { spoken: '除以', clip: 'op.dividedBy' },
} as const
type Op = keyof typeof OP_INFO

function apply(a: number, op: Op, b: number): number {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '×') return a * b
  return a / b
}

/**
 * 生成一道混合运算题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'sameLevel'` 同级运算（`12 - 5 + 3`，考从左往右）；
 *                          `'mixed'` 两级混合（`2 + 3 × 4`，考先乘除后加减）；
 *                          `'paren'` 带括号（`4 × (3 + 2)`）。默认 `'mixed'`
 * @param ctx.params.maxFactor - 乘除法里因数的上限，默认 9（表内乘法范围）
 * @returns 含 4 个选项的题目，`op_order` / `paren_ignored` 恒为「按错误顺序算出来的那个数」
 *
 * @example
 * mixedOps({ kpId: 'M2-11.2', difficulty: 3, params: { mode: 'mixed' }, rng })
 * // '2 + 3 × 4 = ?' 时：
 * //   14 → 正确
 * //   20 → op_order   从左往右算成了 (2 + 3) × 4
 */
export const mixedOps: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'mixed')
  const maxFactor = readNumber(ctx.params, 'maxFactor', 9)

  if (mode === 'sameLevel') return buildSameLevel(ctx)
  if (mode === 'paren') return buildParen(ctx, maxFactor)
  return buildTwoLevel(ctx, maxFactor)
}

/**
 * 同级运算 `12 - 5 + 3`。
 *
 * 恒为「减在前、加在后」：`12 + 5 - 3` 先算后面也得同一个数，
 * 那道题问不出「你是不是从左往右算的」。
 */
function buildSameLevel(ctx: GeneratorContext): GeneratedItem {
  const b = randomInt(ctx.rng, 2, 9)
  const c = randomInt(ctx.rng, 1, 9)
  // 下界取 b + c 而不是 b + 1：那样「先算后面」得到的 a - (b + c) 才不会是负数，
  // 负的干扰项会被静默剔除，这道题就少一个诊断选项
  const a = randomInt(ctx.rng, b + c, 99 - c)

  const answer = a - b + c
  const rightFirst = a - (b + c) // 先算了后面那一步

  return assemble(ctx, [a, '-', b, '+', c], answer, [{ value: rightFirst, tag: 'op_order' }])
}

/**
 * 两级混合 `2 + 3 × 4`：乘除那一步随机排在前面或后面。
 *
 * 两种排法考的是**同一条规则的两个方向**，都必须出：
 * - `2 + 3 × 4` —— 错法是从左往右，`(2 + 3) × 4 = 20`
 * - `3 × 4 + 2` —— 从左往右反而是对的，错法是跳过去先算加，`3 × (4 + 2) = 18`
 *
 * 只出前一种，她会把规则记成「先算右边」，碰到后一种照样错。
 */
function buildTwoLevel(ctx: GeneratorContext, maxFactor: number): GeneratedItem {
  const x = randomInt(ctx.rng, 2, maxFactor)
  const y = randomInt(ctx.rng, 2, maxFactor)
  const add = ctx.rng() < 0.6
  const mulFirst = ctx.rng() < 0.5
  const op: Op = add ? '+' : '-'

  // 减法两处都要够减：乘积在前时是「先算的 y - other」不能为负，
  // 乘积在后时是整道题 other - x×y 不能为负
  const other = add
    ? randomInt(ctx.rng, 1, 20)
    : mulFirst
      ? randomInt(ctx.rng, 1, y - 1)
      : randomInt(ctx.rng, x * y + 1, x * y + 20)

  const parts: Array<number | Op> = mulFirst ? [x, '×', y, op, other] : [other, op, x, '×', y]

  const answer = mulFirst ? apply(x * y, op, other) : apply(other, op, x * y)
  const wrongOrder = mulFirst
    ? apply(x, '×', apply(y, op, other)) // 跳过去先算了加减
    : apply(apply(other, op, x), '×', y) // 老老实实从左往右

  return assemble(ctx, parts, answer, [{ value: wrongOrder, tag: 'op_order' }])
}

/**
 * 带括号 `4 × (3 + 2)`。
 *
 * ⚠️ 括号恒在**右边**。放左边的话「无视括号从左往右」得到的正是正确答案，
 * `paren_ignored` 会被去重剔除，这道题就白出了。
 */
function buildParen(ctx: GeneratorContext, maxFactor: number): GeneratedItem {
  const inner: Op = ctx.rng() < 0.5 ? '+' : '-'
  // 减法括号里必须真减得动，且结果不为 0——`4 × (5 - 5)` 答案恒是 0，
  // 她不算也能猜对
  const ic = inner === '-' ? randomInt(ctx.rng, 1, 8) : randomInt(ctx.rng, 1, 9)
  const ib = inner === '-' ? randomInt(ctx.rng, ic + 1, 9) : randomInt(ctx.rng, 1, 9)
  const innerValue = apply(ib, inner, ic)

  const outer: Op = ctx.rng() < 0.5 ? '×' : '-'
  // 外层是减法时下界取 ib + ic + 1：`12 - (8 - 7)` 无视括号会一路减成 12-8-7 = -3，
  // 负的干扰项被静默剔除，这道题就没有 paren_ignored 了。
  // 只避开第一次减（下界取 ib）不够，两次减都要减得动
  const a =
    outer === '×'
      ? randomInt(ctx.rng, 2, maxFactor)
      : randomInt(ctx.rng, ib + ic + 1, ib + ic + 40)

  const answer = apply(a, outer, innerValue)

  return assemble(ctx, [a, outer, '(', ib, inner, ic, ')'], answer, [
    { value: apply(apply(a, outer, ib), inner, ic), tag: 'paren_ignored' },
    // 括号算对了，却忘了外面还有一步
    { value: innerValue, tag: 'op_order' },
  ])
}

/** 把「数字与符号交替的序列」拼成题面、念法与片段 */
function assemble(
  ctx: GeneratorContext,
  parts: Array<number | Op | '(' | ')'>,
  answer: number,
  candidates: NumericDistractor[],
): GeneratedItem {
  const text = parts.join(' ').replace('( ', '(').replace(' )', ')')
  const clips: ClipKey[] = []
  const spoken: string[] = []

  for (const p of parts) {
    if (typeof p === 'number') {
      clips.push(...num(p))
      spoken.push(String(p))
    } else if (p === '(') {
      clips.push('op.parenL')
      spoken.push('左括号')
    } else if (p === ')') {
      clips.push('op.parenR')
      spoken.push('右括号')
    } else {
      clips.push(OP_INFO[p].clip)
      spoken.push(OP_INFO[p].spoken)
    }
  }
  clips.push('phrase.equalsWhat')

  return {
    signature: `${ctx.kpId}#${parts.join('')}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${text} = ?`,
      ttsText: `${spoken.join(' ')} 等于几`,
      ttsParts: clips,
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
