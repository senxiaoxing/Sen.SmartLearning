/**
 * @file 单位换算与量感生成器 —— 覆盖 M2-1.3/1.4（长度）· M2-6.3（时间）· M2-14.2/14.3（质量）
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-1 长度单位 §M2-14 克和千克
 *
 * 一个生成器管三种量，因为**换算这件事的误区是同一套**：
 * 进率记错（`unit_conversion`）和量级没概念（`unit_sense_weak`），
 * 换成千克还是米都不改变这两条。按 §4.1 的判据，这就该是一个生成器。
 *
 * 两种 mode 考的是两件事，别混：
 * - `convert` 会不会算（3 米 = 300 厘米）
 * - `chooseUnit` 有没有感觉（哪个东西大约长 1 米）
 * 前者背得下来，后者得靠身体去比——所以 `unit_sense_weak` 只出现在后者。
 */

import { buildNumericOptions, buildTextOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { MEASURABLES, type Measurable } from '@/domain/generators/measurables'
import { readEnum, readItemType } from '@/domain/generators/params'
import { randomInt, randomPick, shuffle } from '@/domain/generators/rng'
import { num, type ClipKey } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const QUANTITIES = ['length', 'mass', 'time'] as const
const MODES = ['convert', 'chooseUnit'] as const
const DIRECTIONS = ['down', 'up', 'both'] as const

/** 每种量的大小单位与进率 */
const SCALES = {
  length: { big: '米', bigClip: 'unit.m', small: '厘米', smallClip: 'unit.cm', rate: 100 },
  mass: { big: '千克', bigClip: 'unit.kg', small: '克', smallClip: 'unit.g', rate: 1000 },
  time: { big: '时', bigClip: 'unit.hour', small: '分', smallClip: 'unit.min', rate: 60 },
} as const

/** 记错进率时最常用的那个数。中国孩子对「十进制」的惯性最强 */
const WRONG_RATE = 10

/**
 * 生成一道单位换算或量感题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.quantity - `'length'` | `'mass'` | `'time'`，默认 `'length'`
 * @param ctx.params.mode - `'convert'` 换算 | `'chooseUnit'` 挑量级，默认 `'convert'`
 * @param ctx.params.direction - 换算方向：`'down'` 大→小、`'up'` 小→大、`'both'` 随机。默认 `'down'`
 * @returns 含 4 个选项的题目
 *
 * @example
 * unitConvert({ kpId: 'M2-1.3', difficulty: 2, params: { quantity: 'length' }, rng })
 * // '3 米 = ? 厘米' 时：
 * //   300 → 正确
 * //    30 → unit_conversion  把进率记成了 10
 * //     3 → unit_conversion  只换了单位名，数没动
 *
 * unitConvert({ kpId: 'M2-1.4', difficulty: 2, params: { mode: 'chooseUnit' }, rng })
 * // '哪个大约长 2 米？' → 🚪 正确，✏️ / 🌳 / 📎 都是量级不对
 */
export const unitConvert: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'convert')
  const quantity = readEnum(ctx.params, 'quantity', QUANTITIES, 'length')

  if (mode === 'chooseUnit') return buildChooseUnit(ctx, quantity === 'time' ? 'length' : quantity)

  const direction = readEnum(ctx.params, 'direction', DIRECTIONS, 'down')
  const resolved = direction === 'both' ? (ctx.rng() < 0.5 ? 'down' : 'up') : direction
  return buildConvert(ctx, quantity, resolved)
}

/** `3 米 = ? 厘米` / `300 厘米 = ? 米` */
function buildConvert(
  ctx: GeneratorContext,
  quantity: (typeof QUANTITIES)[number],
  direction: 'down' | 'up',
): GeneratedItem {
  const scale = SCALES[quantity]
  const base = randomInt(ctx.rng, 1, 9)
  const scaled = base * scale.rate

  const [shown, answer, fromUnit, toUnit, fromClip, toClip] =
    direction === 'down'
      ? [base, scaled, scale.big, scale.small, scale.bigClip, scale.smallClip]
      : [scaled, base, scale.small, scale.big, scale.smallClip, scale.bigClip]

  const candidates: NumericDistractor[] = [
    // 进率记成 10 —— 十进制的惯性太强，这是换算题的头号误区
    {
      value: direction === 'down' ? base * WRONG_RATE : Math.round(scaled / WRONG_RATE),
      tag: 'unit_conversion',
    },
    // 只把单位名换了，数一个没动
    { value: shown, tag: 'unit_conversion' },
    // 方向做反了：该乘的时候除、该除的时候乘
    {
      value: direction === 'down' ? base * scale.rate * WRONG_RATE : scaled * scale.rate,
      tag: 'unit_conversion',
    },
  ]

  return {
    signature: `${ctx.kpId}#${shown}${fromUnit}->${toUnit}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${shown} ${fromUnit} = ? ${toUnit}`,
      ttsText: `${shown} ${fromUnit} 等于几 ${toUnit}`,
      // 「等于几」直接复用加减法那条片段，这道题因此只多出两个单位名
      ttsParts: [...num(shown), fromClip, 'phrase.equalsWhat', toClip] as ClipKey[],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}

/**
 * `哪个大约长 2 米？` —— 选项是四样东西，考的是量级感觉。
 *
 * 干扰项取**同一种量、但量级明显不同**的物品：问「2 米」时拿铅笔（18 厘米）
 * 和大树（8 米）来配，她得真的想一想一米有多长才选得对。
 */
function buildChooseUnit(ctx: GeneratorContext, quantity: 'length' | 'mass'): GeneratedItem {
  const pool = MEASURABLES.filter((m) => m.quantity === quantity)
  const target = randomPick(ctx.rng, pool)
  const others = shuffle(
    ctx.rng,
    pool.filter((m) => !sameScale(m, target)),
  ).slice(0, 3)

  const verb = quantity === 'length' ? '长' : '重'
  const unitClip = unitClipOf(target.unit)

  return {
    signature: `${ctx.kpId}#${target.name}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: `哪个大约${verb} ${target.value} ${target.unit}？`,
      ttsText: `哪个大约${verb} ${target.value} ${target.unit}`,
      ttsParts: [
        quantity === 'length' ? 'phrase.whichIsAboutLong' : 'phrase.whichIsAboutHeavy',
        ...num(target.value),
        unitClip,
      ],
    },
    options: buildTextOptions(
      target.emoji,
      others.map((m) => ({ text: m.emoji, tag: 'unit_sense_weak' as const })),
      ctx.rng,
    ).map((opt) => ({
      ...opt,
      // 物品名只作小字说明：知道那是「房门」并不等于知道它有多高，不泄题
      caption: findByEmoji(pool, opt.text)?.name,
    })),
    answer: target.emoji,
  }
}

/** 同量级（数值与单位都相同）的物品不能互相当干扰项——那会有两个正确答案 */
function sameScale(a: Measurable, b: Measurable): boolean {
  return a.value === b.value && a.unit === b.unit
}

function findByEmoji(pool: readonly Measurable[], emoji: string | undefined): Measurable | undefined {
  return pool.find((m) => m.emoji === emoji)
}

function unitClipOf(unit: string): ClipKey {
  for (const scale of Object.values(SCALES)) {
    if (scale.big === unit) return scale.bigClip
    if (scale.small === unit) return scale.smallClip
  }
  throw new Error(`未登记的单位: ${unit}`)
}
