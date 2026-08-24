/**
 * @file 文字应用题生成器 —— M2-2.6 求比一个数多几少几 · M2-9.6 平均分与包含除
 *                          · M2-11.4 两步计算 · M2-12.4 至少要几个
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/storyFrame.ts  句式骨架
 * @see src/domain/generators/storyProblem.ts  一年级的看图列式，两者刻意分开
 * @see design/08-年级分区与内容扩展.md §4.2  骨架 + 参数化
 *
 * ## 为什么不并进 `storyProblem`
 *
 * 不是因为年级（§4.4 明说年级不是算法属性），是因为**这两种题的形态不同**：
 * 那个配 emoji 分组图、一步算完、数值 ≤10；这个不配图、含乘除与两步、
 * 数值大到画不出来。合起来会是一个三百行、六个分支的万能文件。
 *
 * ## ⭐ `atLeast` 是这里唯一真正新的东西
 *
 * 「22 个人坐船，每船坐 4 个，至少要几条船」的答案是 **6 而不是 5**——
 * 商要进一。5 条船只坐得下 20 个，剩下 2 个还得再来一条。
 * 因此 `remainder_ignored`（答 5）必须占一个选项，它就是这道题要抓的东西。
 */

import { COUNTABLES, type Countable } from '@/domain/generators/countables'
import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readItemType, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { fillFrame, framesFor, type StoryFrame, type StoryOp } from '@/domain/storyFrame'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

/** 本生成器负责的运算，与 `storyProblem` 的三种不重叠 */
const OPS = [
  'share',
  'group',
  'moreThan',
  'lessThan',
  'twoStepLess',
  'twoStepMore',
  'atLeast',
] as const

/** 一道题的算题结果：填进句式的数、正确答案、按误区构造的干扰项 */
interface Solved {
  values: { a: number; b: number; c?: number }
  answer: number
  distractors: NumericDistractor[]
}

/**
 * 生成一道二年级文字应用题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - 见 {@link OPS}。**必填**
 * @param ctx.params.frames - 句式表（`STORY_FRAMES`）。⚠️ 由 `itemTemplates` 注入，
 *                            不在这里 import——domain 不依赖 data 是分层铁律
 * @param ctx.params.factorRange - 乘除法里因数/除数的范围，默认 `[2, 9]`
 * @param ctx.params.quotientRange - 商（或每份几个）的范围，默认 `[2, 9]`
 * @returns 含 4 个选项的题目，**不带 visual**——数值大到画不出来
 *
 * @example
 * wordProblem({ kpId: 'M2-12.4', difficulty: 3, params: { mode: 'atLeast', frames }, rng })
 * // 「22 个小朋友坐船，每条船坐 4 个，至少要几条船？」
 * //   6 → 正确（商 5 余 2，剩下的 2 个还得再来一条）
 * //   5 → remainder_ignored  只答了商，剩下那两个没管
 */
export const wordProblem: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readMode(ctx.params)
  const frame = randomPick(ctx.rng, framesFor(readFrames(ctx.params), mode, true))
  const thing = randomPick(ctx.rng, thingsFor(frame))

  const solved = solve(ctx, mode)

  return {
    signature: `${ctx.kpId}#${mode}:${solved.values.a}_${solved.values.b}_${solved.values.c ?? ''}:${thing.name}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: fillFrame(frame, { ...solved.values, thing }),
    options: buildNumericOptions(solved.answer, solved.distractors, ctx.rng),
    answer: String(solved.answer),
  }
}

/** 按运算算出数值与干扰项 */
function solve(ctx: GeneratorContext, mode: StoryOp): Solved {
  const [fLo, fHi] = readRange(ctx.params, 'factorRange', [2, 9])
  const [qLo, qHi] = readRange(ctx.params, 'quotientRange', [2, 9])

  if (mode === 'share' || mode === 'group') return solveDivision(ctx, fLo, fHi, qLo, qHi)
  if (mode === 'moreThan' || mode === 'lessThan') return solveCompare(ctx, mode)
  if (mode === 'atLeast') return solveAtLeast(ctx, fLo, fHi, qLo, qHi)
  return solveTwoStep(ctx, mode, fLo, fHi, qLo, qHi)
}

/**
 * 平均分与包含除：`总数 ÷ 每份 = 份数`。
 *
 * 总数由除数与商乘出来，恒整除——**除不尽的题在这里是错的**，
 * 有余数的应用另有 `atLeast`，而孩子还没学到「分不完怎么办」。
 */
function solveDivision(
  ctx: GeneratorContext,
  fLo: number,
  fHi: number,
  qLo: number,
  qHi: number,
): Solved {
  const divisor = randomInt(ctx.rng, fLo, fHi)
  const quotient = randomInt(ctx.rng, qLo, qHi)
  const total = divisor * quotient

  return {
    values: { a: total, b: divisor },
    answer: quotient,
    distractors: [
      // ⭐ 分东西做成了减法：知道「变少了」，但不知道是平均分
      { value: total - divisor, tag: 'div_as_sub' },
      { value: total * divisor, tag: 'div_as_mul' },
      { value: divisor, tag: 'wrong_operation' },
    ],
  }
}

/**
 * 求比一个数多几·少几的数。
 *
 * ⭐ 干扰项的头一个恒是**反着算**的结果：问「多几」时给出减出来的数。
 * 这类题孩子的错几乎全在这里——听到「比」就不知道该往哪边走，
 * 而 `wrong_operation` 正是要抓这个。
 */
function solveCompare(ctx: GeneratorContext, mode: StoryOp): Solved {
  const diff = randomInt(ctx.rng, 2, 20)
  // ⚠️ 两个方向都要 base > diff。求「少几」是为了答案非负；
  // 求「多几」看着不需要，但干扰项里那个「反着算」的结果是 base − diff——
  // base 比 diff 小它就成了负数，会被静默剔除，这道题也就没了要诊断的东西。
  // 顺带也读得更顺：「有 10 个，比他多 11 个」总有点怪
  const base =
    mode === 'moreThan' ? randomInt(ctx.rng, diff + 1, 79) : randomInt(ctx.rng, diff + 1, 99)
  const answer = mode === 'moreThan' ? base + diff : base - diff

  return {
    values: { a: base, b: diff },
    answer,
    distractors: [
      // 反着算了
      { value: mode === 'moreThan' ? base - diff : base + diff, tag: 'wrong_operation' },
      // 把「多的那几个」当成了答案
      { value: diff, tag: 'wrong_operation' },
      // 答成了原来那个数，没意识到要算
      { value: base, tag: 'wrong_operation' },
    ],
  }
}

/**
 * 至少要几个（商进一）。
 *
 * ⭐ 恒**除不尽**：除得尽的话商就是答案，这道题的全部难点（余下的还得再来一个）
 * 就消失了，而 `remainder_ignored` 那个干扰项也会等于正确答案被剔除。
 */
function solveAtLeast(
  ctx: GeneratorContext,
  fLo: number,
  fHi: number,
  qLo: number,
  qHi: number,
): Solved {
  // 每份至少 2，否则余数无处可取
  const perUnit = randomInt(ctx.rng, Math.max(2, fLo), fHi)
  const quotient = randomInt(ctx.rng, qLo, qHi)
  const remainder = randomInt(ctx.rng, 1, perUnit - 1)
  const total = perUnit * quotient + remainder

  return {
    values: { a: total, b: perUnit },
    answer: quotient + 1,
    distractors: [
      // ⭐ 只答了商：剩下那几个没地方去
      { value: quotient, tag: 'remainder_ignored' },
      { value: remainder, tag: 'remainder_ignored' },
      { value: total - perUnit, tag: 'div_as_sub' },
    ],
  }
}

/**
 * 两步计算：`a` 盒每盒 `b` 个，再加减 `c` 个。
 *
 * ⭐ 干扰项的头一个恒是**按错误顺序算**的结果（先把 c 加减进去再乘），
 * 这正是两步题的头号误区，与 `mixedOps` 的 `op_order` 是同一种病。
 */
function solveTwoStep(
  ctx: GeneratorContext,
  mode: StoryOp,
  fLo: number,
  fHi: number,
  qLo: number,
  qHi: number,
): Solved {
  const boxes = randomInt(ctx.rng, Math.max(2, fLo), fHi)
  const perBox = randomInt(ctx.rng, Math.max(2, qLo), qHi)
  const product = boxes * perBox
  const isLess = mode === 'twoStepLess'
  // 减法要减得动，且不能减成 0——「还剩 0 个」是道怪题
  const delta = isLess ? randomInt(ctx.rng, 1, product - 1) : randomInt(ctx.rng, 1, 20)
  const answer = isLess ? product - delta : product + delta

  return {
    values: { a: boxes, b: perBox, c: delta },
    answer,
    distractors: [
      // 顺序反了：先把 c 加减到每盒的数上，再去乘
      { value: boxes * (isLess ? Math.max(0, perBox - delta) : perBox + delta), tag: 'op_order' },
      // 只算了第一步就交卷
      { value: product, tag: 'op_order' },
      // 第二步做反了
      { value: isLess ? product + delta : product - delta, tag: 'wrong_operation' },
    ],
  }
}

/** @throws 缺失或不认识时抛错 —— seed 配错必须显式失败，不能静默出一道别的题 */
function readMode(params: Record<string, unknown>): StoryOp {
  const raw = params['mode']
  if (typeof raw !== 'string' || !OPS.includes(raw as (typeof OPS)[number])) {
    throw new Error(`wordProblem 的 mode 应为 ${OPS.join(' | ')}，实际为 ${JSON.stringify(raw)}`)
  }
  return raw as StoryOp
}

/**
 * 从参数里读出句式表。
 *
 * @throws 缺失或为空时抛错——静默回落会让题干变成空字符串，
 *         而孩子看到的是一道**没有题目的题**
 */
function readFrames(params: Record<string, unknown>): readonly StoryFrame[] {
  const raw = params['frames']
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('生成器参数 frames 应为非空句式数组，检查 data/seed/itemTemplates.ts')
  }
  return raw as StoryFrame[]
}

/** 这个句式能配哪些物品。⚠️ 「吃掉了 3 颗星星」不成话，见 `ThingKind` */
function thingsFor(frame: StoryFrame): readonly Countable[] {
  if (frame.thingKinds === undefined) return COUNTABLES

  const kinds = frame.thingKinds
  const matched = COUNTABLES.filter((c) => kinds.includes(c.kind))
  if (matched.length === 0) {
    throw new Error(`句式「${frame.text}」限定的 thingKinds 在 COUNTABLES 里一个都没有`)
  }
  return matched
}
