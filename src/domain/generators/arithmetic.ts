/**
 * @file 10以内加减法生成器 —— 覆盖 M4.2 ~ M4.9
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M4 10以内加减法
 *
 * 这是整个数学模块使用频率最高的生成器：M4 是 M5/M6 的直接前置，
 * 调度器在孩子进位/退位大面积出错时会回退到这里。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readBoolean, readEnum, readNumber } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const OPERATIONS = ['add', 'sub', 'mixed'] as const
type Operation = (typeof OPERATIONS)[number]

/**
 * 生成一道 10 以内加减法题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.op - `'add'` | `'sub'` | `'mixed'`（随机选加或减），默认 `'add'`
 * @param ctx.params.maxSum - 结果上限，M4.2/M4.4 为 5，M4.5/M4.6 为 10，默认 10
 * @param ctx.params.terms - 项数。2 为普通算式，3 为连加连减/加减混合（M4.8/M4.9），默认 2
 * @param ctx.params.allowZero - 是否允许 0 参与（M4.7「0 的加减法」置 true），默认 false
 * @returns 含 4 个选项的题目
 *
 * @example
 * arithmetic({ kpId: 'M4.5', difficulty: 2, params: { op: 'add', maxSum: 10 }, rng })
 * // '7 + 2 = ?'  → 9 正确 / 5 op_confusion（做成减法）/ 8、10 off_by_one
 *
 * arithmetic({ kpId: 'M4.8', difficulty: 3, params: { terms: 3, op: 'mixed' }, rng })
 * // '3 + 4 - 2 = ?'
 */
export const arithmetic: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const op = readEnum(ctx.params, 'op', OPERATIONS, 'add')
  const maxSum = readNumber(ctx.params, 'maxSum', 10)
  const terms = readNumber(ctx.params, 'terms', 2)
  const allowZero = readBoolean(ctx.params, 'allowZero', false)
  const min = allowZero ? 0 : 1

  return terms >= 3
    ? buildThreeTermItem(ctx, maxSum, min)
    : buildTwoTermItem(ctx, resolveOp(ctx, op), maxSum, min)
}

/** `mixed` 模式下随机决定本题是加还是减 */
function resolveOp(ctx: GeneratorContext, op: Operation): 'add' | 'sub' {
  if (op !== 'mixed') return op
  return ctx.rng() < 0.5 ? 'add' : 'sub'
}

/** 两项算式：`7 + 2 = ?` / `8 - 3 = ?` */
function buildTwoTermItem(
  ctx: GeneratorContext,
  op: 'add' | 'sub',
  maxSum: number,
  min: number,
): GeneratedItem {
  let a: number
  let b: number
  let answer: number

  if (op === 'add') {
    a = randomInt(ctx.rng, min, maxSum - 1)
    b = randomInt(ctx.rng, min, maxSum - a)
    answer = a + b
  } else {
    // 减法先定被减数，再保证结果非负——一年级不学负数
    a = randomInt(ctx.rng, Math.max(min, 1), maxSum)
    b = randomInt(ctx.rng, min, a)
    answer = a - b
  }

  const symbol = op === 'add' ? '+' : '-'
  const ttsOp = op === 'add' ? '加' : '减'

  const candidates: NumericDistractor[] = [
    // ⭐ 最高频：把运算符看反了
    { value: op === 'add' ? Math.abs(a - b) : a + b, tag: 'op_confusion' },
    { value: answer + 1, tag: 'off_by_one' },
    { value: answer - 1, tag: 'off_by_one' },
  ]
  // 有 0 参与时，「5 + 0 = 0」「5 - 0 = 0」是典型误解
  if (a === 0 || b === 0) {
    candidates.unshift({ value: 0, tag: 'zero_rule' })
  }

  return {
    signature: `${ctx.kpId}#${a}${symbol}${b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} ${symbol} ${b} = ?`,
      ttsText: `${a} ${ttsOp} ${b} 等于几`,
      ttsParts: [
        ...num(a),
        op === 'add' ? 'op.plus' : 'op.minus',
        ...num(b),
        'phrase.equalsWhat',
      ],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}

/**
 * 三项算式：`3 + 4 - 2 = ?`（M4.8 连加连减 / M4.9 加减混合）
 *
 * 全程保证中间结果与最终结果都落在 `[0, maxSum]`。
 * 中间结果为负会直接卡死一年级孩子（他们还没有负数概念），
 * 中间结果为 0 则会让第二步的减法无数可减——两种情况都必须在生成时排除。
 */
function buildThreeTermItem(
  ctx: GeneratorContext,
  maxSum: number,
  min: number,
): GeneratedItem {
  const a = randomInt(ctx.rng, Math.max(min, 1), maxSum - 2)

  // a < 2 时无法做减法（减完中间结果会归零或为负），强制走加法
  const op1 = a >= 2 && ctx.rng() < 0.4 ? '-' : '+'
  const b = op1 === '+' ? randomInt(ctx.rng, 1, maxSum - a) : randomInt(ctx.rng, 1, a - 1)
  const mid = op1 === '+' ? a + b : a - b

  // 中间结果顶到上限则只能减；中间结果为 1 时减法只能减 1，保留但无风险
  const op2 = mid >= maxSum ? '-' : ctx.rng() < 0.5 ? '+' : '-'
  const c = op2 === '+' ? randomInt(ctx.rng, 1, maxSum - mid) : randomInt(ctx.rng, 1, mid)
  const answer = op2 === '+' ? mid + c : mid - c

  const candidates: NumericDistractor[] = [
    // 只算了前两项就交卷——三项算式最典型的失误
    { value: mid, tag: 'op_confusion' },
    { value: answer + 1, tag: 'off_by_one' },
    { value: answer - 1, tag: 'off_by_one' },
  ]

  const tts = `${a} ${op1 === '+' ? '加' : '减'} ${b} ${op2 === '+' ? '加' : '减'} ${c} 等于几`

  return {
    signature: `${ctx.kpId}#${a}${op1}${b}${op2}${c}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: { text: `${a} ${op1} ${b} ${op2} ${c} = ?`, ttsText: tts },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
