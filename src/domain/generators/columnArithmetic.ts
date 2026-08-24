/**
 * @file 100 以内加减法笔算生成器 —— 覆盖 M2-2.1 ~ M2-2.4
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-2 100以内加减法笔算
 *
 * 与 `arithmetic` 的分工：那个是**口算**（10 以内、三项连加），
 * 这个是**笔算**——多出来的是「数位」这个概念，误区也因此全新：
 * `column_misaligned`（35 + 7 把 7 对到十位）在口算里根本不可能发生。
 *
 * ⭐ 数对是**构造**出来的，不是随机取了再判断合不合格。
 * 「一定要进位」这类约束用重试法在参数收紧时会反复空转，
 * 而生成器必须在固定种子下稳定产出——重试次数不定，测试就锁不住。
 *
 * 语音零新增：`38 + 25 = ?` 用的还是 `num` + `op.plus` + `phrase.equalsWhat`，
 * 全靠 `num()` 扩到了 9999（见 domain/speech.ts）。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readNumber } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const OPS = ['add', 'sub', 'mixed'] as const
const CARRY_MODES = ['any', 'require', 'forbid'] as const
type Carry = (typeof CARRY_MODES)[number]

/**
 * 生成一道 100 以内的两位数笔算题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.op - `'add'` | `'sub'` | `'mixed'`（随机选一种），默认 `'add'`
 * @param ctx.params.carry - 进位/退位要求：`'require'` 必须进（退）位、
 *                           `'forbid'` 必须不进（退）位、`'any'` 都行。默认 `'any'`
 * @param ctx.params.bDigits - 第二个数几位。**取 1 时才会出现 `column_misaligned`
 *                             干扰项**——「35 + 7」把 7 对到十位才是那个误区的真实样子
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * columnArithmetic({ kpId: 'M2-2.2', difficulty: 2, params: { op: 'add', carry: 'require' }, rng })
 * // '38 + 25 = ?' 时：
 * //   63 → 正确
 * //   53 → no_carry        个位进了 1，十位忘了加
 * //   13 → op_confusion    做成了减法
 *
 * columnArithmetic({ kpId: 'M2-2.1', difficulty: 1, params: { bDigits: 1 }, rng })
 * // '35 + 7 = ?' 时额外出现 105 → column_misaligned（把 7 对到了十位）
 */
export const columnArithmetic: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const op = readEnum(ctx.params, 'op', OPS, 'add')
  const carry = readEnum(ctx.params, 'carry', CARRY_MODES, 'any')
  const bDigits = readNumber(ctx.params, 'bDigits', 2)

  const resolved = op === 'mixed' ? (ctx.rng() < 0.5 ? 'add' : 'sub') : op
  const [a, b] =
    resolved === 'add' ? makeAddPair(ctx, carry, bDigits) : makeSubPair(ctx, carry, bDigits)

  return build(ctx, resolved, a, b, bDigits)
}

/** 构造一对加数。`carry` 为 `'any'` 时随机决定这一题进不进位 */
function makeAddPair(ctx: GeneratorContext, carry: Carry, bDigits: number): [number, number] {
  const wantCarry = carry === 'any' ? ctx.rng() < 0.5 : carry === 'require'

  if (bDigits === 1) {
    const ones = randomInt(ctx.rng, 1, 9)
    const onesA = wantCarry
      ? randomInt(ctx.rng, 10 - ones, 9)
      : randomInt(ctx.rng, 0, 9 - ones)
    // 进位会让十位多 1，因此上限收一格，保证结果不超过两位数
    const tensA = randomInt(ctx.rng, 1, wantCarry ? 8 : 9)
    return [tensA * 10 + onesA, ones]
  }

  const onesA = wantCarry ? randomInt(ctx.rng, 1, 9) : randomInt(ctx.rng, 0, 9)
  const onesB = wantCarry
    ? randomInt(ctx.rng, 10 - onesA, 9)
    : randomInt(ctx.rng, 0, 9 - onesA)
  const tensA = randomInt(ctx.rng, 1, wantCarry ? 7 : 8)
  const tensB = randomInt(ctx.rng, 1, (wantCarry ? 8 : 9) - tensA)
  return [tensA * 10 + onesA, tensB * 10 + onesB]
}

/** 构造被减数与减数，恒保证结果非负（二年级不学负数） */
function makeSubPair(ctx: GeneratorContext, carry: Carry, bDigits: number): [number, number] {
  const wantBorrow = carry === 'any' ? ctx.rng() < 0.5 : carry === 'require'

  if (bDigits === 1) {
    // 退位要求个位不够减，因此减数至少是 1
    const ones = randomInt(ctx.rng, wantBorrow ? 1 : 0, 9)
    const onesA = wantBorrow ? randomInt(ctx.rng, 0, ones - 1) : randomInt(ctx.rng, ones, 9)
    return [randomInt(ctx.rng, 1, 9) * 10 + onesA, ones]
  }

  const onesA = wantBorrow ? randomInt(ctx.rng, 0, 8) : randomInt(ctx.rng, 0, 9)
  const onesB = wantBorrow ? randomInt(ctx.rng, onesA + 1, 9) : randomInt(ctx.rng, 0, onesA)
  const tensB = randomInt(ctx.rng, 1, 8)
  // 退位要从十位借 1，所以被减数的十位必须严格更大
  const tensA = randomInt(ctx.rng, wantBorrow ? tensB + 1 : tensB, 9)
  return [tensA * 10 + onesA, tensB * 10 + onesB]
}

function build(
  ctx: GeneratorContext,
  op: 'add' | 'sub',
  a: number,
  b: number,
  bDigits: number,
): GeneratedItem {
  const answer = op === 'add' ? a + b : a - b
  const candidates: NumericDistractor[] = []

  if (op === 'add' && a % 10 + (b % 10) >= 10) {
    // 个位进了位，十位忘了加那个 1 —— 进位笔算的头号错误
    candidates.push({ value: answer - 10, tag: 'no_carry' })
  }
  if (op === 'sub' && a % 10 < b % 10) {
    // 个位不够减，就掉头用大的减小的：52 - 27 → 十位 3、个位 5 → 35
    const faked = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10))
    candidates.push({ value: faked, tag: 'no_borrow' })
  }
  // ⭐ 只有一位数的第二项才谈得上「对错位置」：把 7 写到了十位下面
  if (bDigits === 1) {
    candidates.push({ value: op === 'add' ? a + b * 10 : a - b * 10, tag: 'column_misaligned' })
  }
  candidates.push({ value: op === 'add' ? a - b : a + b, tag: 'op_confusion' })

  const symbol = op === 'add' ? '+' : '-'
  return {
    signature: `${ctx.kpId}#${a}${symbol}${b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} ${symbol} ${b} = ?`,
      ttsText: `${a} ${op === 'add' ? '加' : '减'} ${b} 等于几`,
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
