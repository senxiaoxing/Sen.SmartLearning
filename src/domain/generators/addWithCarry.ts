/**
 * @file 20以内进位加法生成器 —— 覆盖 M5.1 凑十法原理 ~ M5.5 综合
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M5 20以内进位加法
 * @see design/03-技术方案.md §4.2 干扰项铁律
 *
 * M5 建立在 M3.3「10 的分与合」之上。孩子在这里出错，往往不是不会加法，
 * 而是凑十过程的某一步断了——干扰项的全部意义就是把「哪一步断了」测出来。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readBoolean, readNumberList } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

/** 进位加法的和必须超过 10，否则不构成进位 */
const MIN_SUM = 11
/** 20 以内 */
const MAX_SUM = 20
/** 第二个加数是个位数 */
const MAX_ADDEND_B = 9

/**
 * 生成一道 20 以内进位加法题。
 *
 * 支持两种模式，由 `params.makeTen` 切换：
 * - **直接计算**（默认，M5.2~M5.5）：`9 + 5 = ?`
 * - **凑十法原理**（M5.1）：`9 + 5，先把 5 分成 1 和几?` —— 只考拆分步骤，
 *   让孩子先理解原理再算完整算式
 *
 * 干扰项按认知误区构造，**顺序即优先级**（高频误区在前，通常只取前 3 个）：
 *
 * | 选项 | 误区 | 孩子的想法 |
 * |---|---|---|
 * | `correct - 1` | `no_carry` | 凑十时数漏了一个（9+5 当成 9+4） |
 * | `10` | `carry_lost` | 凑成 10 就交卷了，忘记加剩余的 4 |
 * | `\|a - b\|` | `sub_instead` | 把加号看成了减号 |
 * | `拼接 a b` | `digit_concat` | 不理解进位，直接把数字拼起来（仅难度 3 启用） |
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源，禁止 `Math.random()`
 * @param ctx.params.addends - 可选的被加数集合，如 M5.2 为 `[9]`、M5.3 为 `[8, 7, 6]`
 * @param ctx.params.makeTen - 为 true 时出凑十法拆分题（M5.1），默认 false
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * const item = addWithCarry({
 *   kpId: 'M5.2', difficulty: 2, params: { addends: [9] }, rng: createRng(1),
 * })
 * // 当 a=9, b=5 时：
 * //   stem      '9 + 5 = ?'
 * //   ttsText   '9 加 5 等于几'
 * //   signature 'M5.2#9+5'
 * //   选项      14 正确 / 13 no_carry / 10 carry_lost / 4 sub_instead
 */
export const addWithCarry: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const addends = readNumberList(ctx.params, 'addends', [9])
  const makeTenMode = readBoolean(ctx.params, 'makeTen', false)

  const a = randomPick(ctx.rng, addends)
  // b 的取值必须让和落在 (10, 20] 区间，且自身是个位数
  const bMin = Math.max(1, MIN_SUM - a)
  const bMax = Math.min(MAX_ADDEND_B, MAX_SUM - a)
  if (bMin > bMax) {
    throw new Error(`被加数 ${a} 无法构成 20 以内的进位加法`)
  }
  const b = randomInt(ctx.rng, bMin, bMax)

  return makeTenMode
    ? buildMakeTenItem(ctx, a, b)
    : buildDirectItem(ctx, a, b)
}

/** 直接计算模式：`9 + 5 = ?` */
function buildDirectItem(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  const answer = a + b

  const candidates: NumericDistractor[] = [
    { value: answer - 1, tag: 'no_carry' },
    { value: 10, tag: 'carry_lost' },
    { value: Math.abs(a - b), tag: 'sub_instead' },
  ]
  // 数字拼接（9+5 答 95）在 20 以内题目里过于突兀，孩子一眼就能排除，
  // 会让四选一退化成三选一。仅在最高难度作为补充候选。
  if (ctx.difficulty === 3) {
    candidates.push({ value: Number(`${a}${b}`), tag: 'digit_concat' })
  }

  return {
    signature: `${ctx.kpId}#${a}+${b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} + ${b} = ?`,
      ttsText: `${a} 加 ${b} 等于几`,
      ttsParts: [...num(a), 'op.plus', ...num(b), 'phrase.equalsWhat'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    // 难度 1 给十格阵脚手架：孩子能看见「9 还差 1 就满十」。
    // 难度 2、3 撤除，逼她在脑子里完成凑十。
    ...(ctx.difficulty === 1 && { visual: { kind: 'tenFrame' as const, frame: a, loose: b } }),
  }
}

/**
 * 凑十法原理模式（M5.1）：`9 + 5，先把 5 分成 1 和几?`
 *
 * 只考「拆分」这一步。孩子答错说明他还没建立凑十的心理模型，
 * 此时直接练 `9+5=?` 只会让他用数手指硬凑，练不出凑十法。
 */
function buildMakeTenItem(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  const toTen = 10 - a // 把 a 补成 10 需要的数
  const answer = b - toTen // 拆分后剩余的部分

  const candidates: NumericDistractor[] = [
    { value: toTen, tag: 'carry_lost' }, // 把两部分说反了
    { value: a + b - 10, tag: 'no_carry' }, // 直接说了最终结果的个位
    { value: b, tag: 'sub_instead' }, // 没拆，把原数说了出来
  ]

  return {
    signature: `${ctx.kpId}#maketen-${a}+${b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} + ${b}，把 ${b} 分成 ${toTen} 和 ?`,
      ttsText: `${a} 加 ${b}，先把 ${b} 分成 ${toTen} 和几`,
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
