/**
 * @file 读条形图 —— M2-8.1 收集数据 · M2-8.2 读统计表
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/items/BarChart.tsx  图怎么画
 *
 * ## ⭐ 四种问法考的不是同一件事
 *
 * | 问法 | 她要做什么 |
 * |---|---|
 * | `count` X 有几个 | 读一根柱子的高度 |
 * | `most` 哪个最多 | 比较所有柱子 |
 * | `total` 一共有几个 | 全部相加 |
 * | `diff` X 和 Y 相差几个 | 找出两根再相减 |
 *
 * 只出 `count` 的话这个单元就退化成「数格子」，
 * 而教材要教的是「从图里把数据取出来用」。
 */

import { COUNTABLES, type Countable } from '@/domain/generators/countables'
import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readItemType, readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  ItemOption,
  ItemVisual,
} from '@/domain/types'

const MODES = ['count', 'most', 'total', 'diff'] as const
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 一根柱子 */
interface Bar {
  thing: Countable
  count: number
}

/**
 * 生成一道读条形图的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - 见文件头的四种问法，默认 `'count'`
 * @param ctx.params.barCount - 几根柱子，默认 `[3, 4]`
 * @param ctx.params.valueRange - 每根柱子的数量，默认 `[1, 6]`
 * @returns 含 4 个选项的题目，题干配 `barChart` 图
 *
 * @example
 * barChartRead({ kpId: 'M2-8.2', difficulty: 2, params: { mode: 'most' }, rng })
 * // 「哪个最多？」选项是几个 emoji
 */
export const barChartRead: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'count')
  const [bLo, bHi] = readRange(ctx.params, 'barCount', [3, 4])
  const [vLo, vHi] = readRange(ctx.params, 'valueRange', [1, 6])

  const things = shuffle(ctx.rng, [...COUNTABLES]).slice(0, randomInt(ctx.rng, bLo, bHi))
  const bars: Bar[] = things.map((thing) => ({
    thing,
    count: randomInt(ctx.rng, vLo, vHi),
  }))

  // ⚠️ 「哪个最多」要求最大值唯一，否则两个选项都对
  if (mode === 'most') ensureUniqueMax(ctx, bars, vHi)
  // 相差几个要求两根不等，否则答案是 0，那道题问不出东西
  if (mode === 'diff') ensureTwoDiffer(bars, vLo, vHi)

  const visual: ItemVisual = {
    kind: 'barChart',
    // 顶格的柱子看不出「到顶了没有」，留一格余量
    maxScale: Math.max(...bars.map((b) => b.count)) + 1,
    bars: bars.map((b) => ({ emoji: b.thing.emoji, name: b.thing.name, count: b.count })),
  }

  if (mode === 'most') return buildMost(ctx, bars, visual)
  if (mode === 'total') return buildTotal(ctx, bars, visual)
  if (mode === 'diff') return buildDiff(ctx, bars, visual)
  return buildCount(ctx, bars, visual)
}

/** 把最大值顶上去，保证只有一根最高 */
function ensureUniqueMax(ctx: GeneratorContext, bars: Bar[], vHi: number): void {
  const top = randomInt(ctx.rng, 0, bars.length - 1)
  const others = Math.max(...bars.filter((_, i) => i !== top).map((b) => b.count))
  bars[top]!.count = Math.min(vHi + 1, others + randomInt(ctx.rng, 1, 2))
}

/** 保证前两根不等 —— 相差 0 那道题问不出东西 */
function ensureTwoDiffer(bars: Bar[], vLo: number, vHi: number): void {
  if (bars[0]!.count !== bars[1]!.count) return
  bars[0]!.count = bars[0]!.count < vHi ? bars[0]!.count + 1 : Math.max(vLo, bars[0]!.count - 1)
}

/** `🍎 有几个？` —— 读一根柱子 */
function buildCount(ctx: GeneratorContext, bars: Bar[], visual: ItemVisual): GeneratedItem {
  const target = bars[randomInt(ctx.rng, 0, bars.length - 1)]!
  const answer = target.count

  const candidates: NumericDistractor[] = [
    { value: answer + 1, tag: 'count_skip' },
    { value: answer - 1, tag: 'count_skip' },
    // 读错了行，answer 变成了别人的高度
    ...bars.filter((b) => b !== target).map((b) => ({ value: b.count, tag: 'count_skip' as const })),
  ]

  return {
    signature: `${ctx.kpId}#count:${target.thing.name}:${answer}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${target.thing.name}有几个？`,
      ttsText: `${target.thing.name}有几个`,
      ttsParts: [target.thing.clipKey, 'phrase.howMany'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    visual,
  }
}

/** `哪个最多？` —— 选项是 emoji */
function buildMost(ctx: GeneratorContext, bars: Bar[], visual: ItemVisual): GeneratedItem {
  const top = bars.reduce((a, b) => (b.count > a.count ? b : a))

  const options: ItemOption[] = shuffle(ctx.rng, bars).map((b, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: b.thing.emoji,
    caption: b.thing.name,
    isCorrect: b === top,
    ...(b === top ? {} : { misconceptionTag: 'count_skip' as const }),
  }))

  return {
    signature: `${ctx.kpId}#most:${top.thing.name}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: '哪个最多？',
      ttsText: '哪个最多',
      ttsParts: ['phrase.whichMost'],
    },
    options,
    answer: top.thing.emoji,
    visual,
  }
}

/** `一共有几个？` —— 全部相加 */
function buildTotal(ctx: GeneratorContext, bars: Bar[], visual: ItemVisual): GeneratedItem {
  const answer = bars.reduce((s, b) => s + b.count, 0)

  return {
    signature: `${ctx.kpId}#total:${bars.map((b) => b.count).join('.')}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: '一共有几个？',
      ttsText: '一共有几个',
      ttsParts: ['phrase.altogetherHowMany'],
    },
    options: buildNumericOptions(
      answer,
      [
        // 漏加了一根柱子
        { value: answer - bars[bars.length - 1]!.count, tag: 'count_skip' },
        // 数成了「有几种」
        { value: bars.length, tag: 'count_skip' },
        { value: answer + 1, tag: 'off_by_one' },
      ],
      ctx.rng,
    ),
    answer: String(answer),
    visual,
  }
}

/** `🍎 和 🍌 相差几个？` */
function buildDiff(ctx: GeneratorContext, bars: Bar[], visual: ItemVisual): GeneratedItem {
  const [a, b] = [bars[0]!, bars[1]!]
  const answer = Math.abs(a.count - b.count)

  return {
    signature: `${ctx.kpId}#diff:${a.thing.name}-${b.thing.name}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${a.thing.name}和${b.thing.name}相差几个？`,
      ttsText: `${a.thing.name}和${b.thing.name}相差几个`,
      ttsParts: [a.thing.clipKey, 'op.and', b.thing.clipKey, 'phrase.differBy'],
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 相差做成了相加
        { value: a.count + b.count, tag: 'wrong_operation' },
        { value: Math.max(a.count, b.count), tag: 'wrong_operation' },
        { value: answer + 1, tag: 'off_by_one' },
      ],
      ctx.rng,
    ),
    answer: String(answer),
    visual,
  }
}
