/**
 * @file 计数与数序生成器 —— 覆盖 M1.1 数一数、M1.2 认识 0、M1.3 数的顺序、M1.7 数 11~20
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M1 数感与计数
 *
 * 计数题需要「一堆可数的东西」。MVP 阶段直接用 emoji 而非图片资源：
 * 零资源成本、iOS 渲染质量高、孩子也更喜欢。等美术资源就位后
 * 只需把 `stem.text` 换成 `imageKey`，题目逻辑一行不用改。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['count', 'next', 'prev', 'between'] as const

/** 可数对象。挑选原则：轮廓清晰、颜色鲜明、一年级孩子都认识 */
const COUNTABLES = [
  { emoji: '🍎', name: '苹果' },
  { emoji: '🐱', name: '小猫' },
  { emoji: '⭐', name: '星星' },
  { emoji: '🌸', name: '花' },
  { emoji: '🚗', name: '小汽车' },
  { emoji: '🐟', name: '小鱼' },
  { emoji: '🍓', name: '草莓' },
  { emoji: '🎈', name: '气球' },
] as const

/**
 * 生成一道计数或数序题目。
 *
 * 四种模式：
 * - **`count`（默认）**：`🍎🍎🍎` 有几个苹果？—— M1.1/M1.2/M1.7
 * - **`next`**：`3 的后面是几？` —— M1.3 数的顺序
 * - **`prev`**：`5 的前面是几？` —— M1.3，反向练习
 * - **`between`**：`4 和 6 中间是几？` —— M1.3 进阶
 *
 * 干扰项：
 *
 * | 选项 | 误区 | 孩子的想法 |
 * |---|---|---|
 * | `答案 ± 1` | `count_skip` | 数数时跳数或重复数了一个 |
 * | 题干里的已知数 | `off_by_one` | 把问的数和给的数搞混 |
 *
 * @param ctx - 生成上下文
 * @param ctx.params.range - 数值区间。M1.1 为 `[1,10]`、M1.2 含 0 为 `[0,10]`、M1.7 为 `[11,20]`
 * @param ctx.params.mode - 见上，默认 `'count'`
 *
 * @example
 * counting({ kpId: 'M1.1', difficulty: 1, params: { range: [1, 10] }, rng })
 * // '🍎🍎🍎🍎' → 4 正确 / 3、5 count_skip
 *
 * counting({ kpId: 'M1.3', difficulty: 1, params: { range: [1, 10], mode: 'next' }, rng })
 * // '3 的后面是几?' → 4 正确 / 2 off_by_one（说了前面）/ 3 off_by_one（说了自己）
 */
export const counting: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'count')
  const [min, max] = readRange(ctx.params, 'range', [1, 10])

  return mode === 'count' ? buildCountItem(ctx, min, max) : buildSequenceItem(ctx, mode, min, max)
}

/**
 * 计数模式：数物体的个数。
 *
 * 产出 `tap_count` 题型——孩子可以**逐个点击物体来数**，而不只是看一眼选数字。
 * 数数的本质是「一一对应」，点击交互才真的在练这个能力；
 * 同时也回应了孩子「答题界面太单一」的反馈。
 */
function buildCountItem(ctx: GeneratorContext, min: number, max: number): GeneratedItem {
  const answer = randomInt(ctx.rng, min, max)
  const thing = randomPick(ctx.rng, COUNTABLES)

  const candidates: NumericDistractor[] = [
    { value: answer + 1, tag: 'count_skip' },
    { value: answer - 1, tag: 'count_skip' },
    { value: answer + 2, tag: 'count_skip' },
  ]

  return {
    signature: `${ctx.kpId}#count-${thing.name}-${answer}`,
    kpId: ctx.kpId,
    type: 'tap_count',
    difficulty: ctx.difficulty,
    stem: {
      // 0 个时无法用 emoji 表示，改用文字描述——M1.2「认识 0」的核心场景
      text: answer === 0 ? `一个${thing.name}也没有，是几个?` : `数一数，有几个${thing.name}?`,
      ttsText: answer === 0 ? `一个${thing.name}也没有，是几个` : `数一数，有几个${thing.name}`,
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    visual: { kind: 'countable', emoji: thing.emoji, name: thing.name, count: answer },
  }
}

/** 数序模式：前一个 / 后一个 / 中间 */
function buildSequenceItem(
  ctx: GeneratorContext,
  mode: 'next' | 'prev' | 'between',
  min: number,
  max: number,
): GeneratedItem {
  // 留出边界余量，避免问出「0 的前面是几」这种超纲问题
  const pivot = randomInt(ctx.rng, min + 1, Math.max(min + 1, max - 1))

  const config = {
    next: {
      answer: pivot + 1,
      text: `${pivot} 的后面是几?`,
      tts: `${pivot} 的后面是几`,
      // 说成前一个，是「前/后」方位没建立
      wrong: pivot - 1,
    },
    prev: {
      answer: pivot - 1,
      text: `${pivot} 的前面是几?`,
      tts: `${pivot} 的前面是几`,
      wrong: pivot + 1,
    },
    between: {
      answer: pivot,
      text: `${pivot - 1} 和 ${pivot + 1} 中间是几?`,
      tts: `${pivot - 1} 和 ${pivot + 1} 中间是几`,
      wrong: pivot + 2,
    },
  }[mode]

  const candidates: NumericDistractor[] = [
    { value: config.wrong, tag: 'off_by_one' },
    { value: pivot, tag: 'off_by_one' },
    { value: config.answer + 2, tag: 'count_skip' },
  ]

  return {
    signature: `${ctx.kpId}#${mode}-${pivot}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: { text: config.text, ttsText: config.tts },
    options: buildNumericOptions(config.answer, candidates, ctx.rng),
    answer: String(config.answer),
  }
}
