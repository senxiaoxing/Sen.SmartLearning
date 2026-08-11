/**
 * @file 20以内退位减法生成器 —— 覆盖 M6.1 破十法原理 ~ M6.5 综合
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M6 20以内退位减法
 * @see design/03-技术方案.md §4.2 干扰项铁律
 *
 * 退位减法是一年级最高频的错误来源。最典型的错误 `no_borrow`——
 * 孩子不会退位，就用大数减小数（`13 - 9` 算成 `9 - 3 = 6`）。
 * 这个错误必须被单独识别出来，因为它意味着要回到 M3.3「10 的分与合」重练，
 * 而不是继续刷退位减法题。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readBoolean, readNumberList } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

/** 被减数下限：必须是十几，否则不构成退位 */
const MIN_MINUEND = 11
/** 被减数上限 */
const MAX_MINUEND = 18

/**
 * 生成一道 20 以内退位减法题。
 *
 * 支持两种模式，由 `params.breakTen` 切换：
 * - **直接计算**（默认，M6.2~M6.5）：`13 - 9 = ?`
 * - **破十法原理**（M6.1）：`13 - 9，先算 10 - 9 = ?` —— 只考破十这一步
 *
 * 干扰项按认知误区构造（顺序即优先级）：
 *
 * | 选项 | 误区 | 孩子的想法 |
 * |---|---|---|
 * | `\|个位 - 减数\|` | `no_borrow` | 不会退位，用大数减小数（13-9 算成 9-3=6） |
 * | `10 - 减数` | `borrow_lost` | 破十算完就交卷，忘记加回个位 |
 * | `被减数 + 减数 - 10` | `add_instead` | 把减号看成了加号 |
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源，禁止 `Math.random()`
 * @param ctx.params.subtrahends - 可选的减数集合，如 M6.2 为 `[9]`、M6.3 为 `[8, 7, 6]`
 * @param ctx.params.breakTen - 为 true 时出破十法拆分题（M6.1），默认 false
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * const item = subWithBorrow({
 *   kpId: 'M6.2', difficulty: 2, params: { subtrahends: [9] }, rng: createRng(1),
 * })
 * // 当 minuend=13, subtrahend=9 时：
 * //   stem      '13 - 9 = ?'
 * //   signature 'M6.2#13-9'
 * //   选项      4 正确 / 6 no_borrow / 1 borrow_lost / 12 add_instead
 */
export const subWithBorrow: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const subtrahends = readNumberList(ctx.params, 'subtrahends', [9])
  const breakTenMode = readBoolean(ctx.params, 'breakTen', false)

  const subtrahend = randomPick(ctx.rng, subtrahends)
  // 被减数必须是十几，且个位小于减数才构成退位
  // 个位取值 0 ~ subtrahend-1，保证「不够减」
  const ones = randomInt(ctx.rng, 0, subtrahend - 1)
  const minuend = clampMinuend(10 + ones)

  return breakTenMode
    ? buildBreakTenItem(ctx, minuend, subtrahend)
    : buildDirectItem(ctx, minuend, subtrahend)
}

/** 把被减数夹到合法区间，防止参数配置异常时产出荒谬题目 */
function clampMinuend(value: number): number {
  return Math.min(MAX_MINUEND, Math.max(MIN_MINUEND, value))
}

/** 直接计算模式：`13 - 9 = ?` */
function buildDirectItem(
  ctx: GeneratorContext,
  minuend: number,
  subtrahend: number,
): GeneratedItem {
  const answer = minuend - subtrahend
  const ones = minuend % 10

  const candidates: NumericDistractor[] = [
    // ⭐ 最高频：不会退位，把个位和减数倒过来减
    { value: Math.abs(ones - subtrahend), tag: 'no_borrow' },
    // 破十算出 10-9=1 就停了，忘记加回个位的 3
    { value: 10 - subtrahend, tag: 'borrow_lost' },
    // 看成加法。减到 20 以内需扣掉 10，否则数值过大一眼被排除
    { value: minuend + subtrahend - 10, tag: 'add_instead' },
  ]

  return {
    signature: `${ctx.kpId}#${minuend}-${subtrahend}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${minuend} - ${subtrahend} = ?`,
      ttsText: `${minuend} 减 ${subtrahend} 等于几`,
      ttsParts: [...num(minuend), 'op.minus', ...num(subtrahend), 'phrase.equalsWhat'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    // 难度 1 展示被减数的结构：1 个十和几个一，让「个位不够减」看得见
    ...(ctx.difficulty === 1 && {
      visual: { kind: 'tenFrame' as const, frame: 10, loose: ones },
    }),
  }
}

/**
 * 破十法原理模式（M6.1）：`13 - 9，先算 10 - 9 = ?`
 *
 * 只考破十这一步。答错说明孩子还没有「把十几拆成 10 和几」的心理模型，
 * 应回退到 M3.3 与 M1.9，而不是继续刷完整算式。
 */
function buildBreakTenItem(
  ctx: GeneratorContext,
  minuend: number,
  subtrahend: number,
): GeneratedItem {
  const answer = 10 - subtrahend
  const ones = minuend % 10

  const candidates: NumericDistractor[] = [
    { value: minuend - subtrahend, tag: 'borrow_lost' }, // 直接给了最终答案
    { value: Math.abs(ones - subtrahend), tag: 'no_borrow' }, // 仍用大减小
    { value: 10 + subtrahend, tag: 'add_instead' },
  ]

  return {
    signature: `${ctx.kpId}#breakten-${minuend}-${subtrahend}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${minuend} - ${subtrahend}，先算 10 - ${subtrahend} = ?`,
      ttsText: `${minuend} 减 ${subtrahend}，先算 10 减 ${subtrahend} 等于几`,
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
