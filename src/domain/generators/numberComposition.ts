/**
 * @file 万以内数的读写与组成 —— 覆盖 M2-13.2 · M2-13.3
 * @layer domain  纯函数
 * @see src/domain/chineseNumber.ts  汉字数字的写法
 * @see design/01-知识点图谱.md §M2-13 万以内数的认识
 *
 * ⭐ **每道题的数都必然含 0**，这是刻意的：
 * 这个知识点唯一要诊断的是 `zero_placeholder_lost`（三千零五写成 305），
 * 而不含 0 的数根本产生不了那个错误——出十道 3527 也问不出她会不会占位。
 *
 * ⚠️ `read` 模式**不朗读题干里的那个数**，只念「这个数读作什么」。
 * 念出来就等于把答案告诉她了。同 `phrase.toneMark1` 那条：
 * 考写法的题，题干只能给提示语。
 */

import { chineseNumber, MAX_CHINESE_NUMBER } from '@/domain/chineseNumber'
import { buildNumericOptions, buildTextOptions } from '@/domain/generators/distractors'
import { readEnum, readItemType, readNumber } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num, type ClipKey } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext, MisconceptionTag } from '@/domain/types'

const MODES = ['write', 'read', 'compose'] as const

/** 数位名的语音片段，索引即「第几位」：0 个位、1 十位、2 百位、3 千位 */
const PLACE_CLIPS: readonly ClipKey[] = [
  'phrase.countOnes',
  'phrase.countTens',
  'phrase.countHundreds',
  'phrase.countThousands',
]
const PLACE_NAMES = ['个一', '个十', '个百', '个千'] as const

/**
 * 生成一道万以内数的读写题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'write'` 汉字→数字 | `'read'` 数字→汉字 | `'compose'` 几个千几个一
 * @param ctx.params.digits - 3 或 4 位，默认 4
 * @returns 含 4 个选项的题目
 *
 * @example
 * numberComposition({ kpId: 'M2-13.3', difficulty: 3, params: { mode: 'write' }, rng })
 * // 「三千零五」写作几？
 * //   3005 → 正确
 * //    305 → zero_placeholder_lost  少写了一个 0
 * //     35 → zero_placeholder_lost  零全丢了
 */
export const numberComposition: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'write')
  const digits = readNumber(ctx.params, 'digits', 4)
  const value = pickWithZero(ctx, digits)

  if (mode === 'compose') return buildCompose(ctx, value)
  if (mode === 'read') return buildRead(ctx, value)
  return buildWrite(ctx, value)
}

/**
 * 造一个**必然含 0** 的数。最高位恒非 0，其余位随机，全非 0 时强制挖掉一个。
 *
 * 不用「随机取数再判断含不含 0」：那样在三位数上要重试好几轮，
 * 而重试次数不定就固定不住种子，测试也就锁不住。
 */
function pickWithZero(ctx: GeneratorContext, digits: number): number {
  const lead = randomInt(ctx.rng, 1, 9)
  const tailLength = digits - 1
  const tail = Array.from({ length: tailLength }, () =>
    ctx.rng() < 0.45 ? randomInt(ctx.rng, 1, 9) : 0,
  )
  if (tail.every((d) => d !== 0)) tail[randomInt(ctx.rng, 0, tailLength - 1)] = 0

  return [lead, ...tail].reduce((acc, d) => acc * 10 + d, 0)
}

/** 零全丢：3005 → 35。这是「零不是数，不用写」的典型表现 */
function dropAllZeros(value: number): number {
  return Number(String(value).replace(/0/g, '')) || 0
}

/** 少写一个零：3005 → 305 */
function dropOneZero(value: number): number {
  return Number(String(value).replace('0', '')) || 0
}

/** 数位调换：3005 → 5003。她知道有哪几个数字，但不知道各自该站哪一位 */
function swapEnds(value: number): number {
  const s = String(value).split('')
  const last = s.length - 1
  ;[s[0], s[last]] = [s[last]!, s[0]!]
  return Number(s.join(''))
}

/**
 * 挑出**恰好三个**互不相同的干扰值。
 *
 * ⚠️ 三个主候选会互相撞：`1000` 首尾对调是 `0001` = 1，与「零全丢」同值，
 * 于是选项只剩三个。数值题有 `buildNumericOptions` 的兜底，
 * 但 `read` 模式走的是文本选项，那边**不补位**——少一个就是少一个。
 * 所以三种 mode 统一在这里保证数量，行为也一致。
 */
function distractorsFor(value: number): Array<{ value: number; tag: MisconceptionTag }> {
  const candidates: Array<{ value: number; tag: MisconceptionTag }> = [
    { value: dropOneZero(value), tag: 'zero_placeholder_lost' },
    { value: dropAllZeros(value), tag: 'zero_placeholder_lost' },
    { value: swapEnds(value), tag: 'place_value_swap' },
    // 兜底：只有当上面三个撞了才用得上
    { value: value + 1, tag: 'off_by_one' },
    { value: value - 1, tag: 'off_by_one' },
    { value: value + 10, tag: 'place_value_swap' },
  ]

  const seen = new Set([value])
  const picked: Array<{ value: number; tag: MisconceptionTag }> = []
  for (const c of candidates) {
    if (picked.length === 3) break
    if (c.value < 0 || c.value > MAX_CHINESE_NUMBER || seen.has(c.value)) continue
    seen.add(c.value)
    picked.push(c)
  }
  return picked
}

/** `「三千零五」写作几？` */
function buildWrite(ctx: GeneratorContext, value: number): GeneratedItem {
  const text = chineseNumber(value)

  return {
    signature: `${ctx.kpId}#write:${value}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${text} 写作几？`,
      ttsText: `${text} 写作几`,
      // 题干念的是汉字数字，答案是阿拉伯数字，念出来不泄题
      ttsParts: [...num(value), 'phrase.writtenAsWhat'],
    },
    options: buildNumericOptions(value, distractorsFor(value), ctx.rng),
    answer: String(value),
  }
}

/** `3005 读作什么？` —— 选项是汉字数字 */
function buildRead(ctx: GeneratorContext, value: number): GeneratedItem {
  const candidates: Array<{ text: string; tag: MisconceptionTag }> = distractorsFor(value).map(
    (d) => ({ text: chineseNumber(d.value), tag: d.tag }),
  )

  return {
    signature: `${ctx.kpId}#read:${value}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: `${value} 读作什么？`,
      ttsText: '这个数读作什么',
      // ⚠️ 绝不能念 value —— 念出来就是答案
      ttsParts: ['phrase.howToReadThis'],
    },
    options: buildTextOptions(chineseNumber(value), candidates, ctx.rng),
    answer: chineseNumber(value),
  }
}

/** `4 个千和 5 个一，合起来是几？` */
function buildCompose(ctx: GeneratorContext, value: number): GeneratedItem {
  const digits = String(value).split('').map(Number)
  // 从高位到低位，只说非零的那几位——「0 个百」不是人话，也不是教材的问法
  const spoken = digits
    .map((d, i) => ({ count: d, place: digits.length - 1 - i }))
    .filter((p) => p.count > 0)

  const parts: ClipKey[] = []
  const words: string[] = []
  spoken.forEach((p, i) => {
    if (i > 0) {
      parts.push('op.and')
      words.push('和')
    }
    parts.push(...num(p.count), PLACE_CLIPS[p.place]!)
    words.push(`${p.count} ${PLACE_NAMES[p.place]}`)
  })
  parts.push('phrase.togetherIsWhat')

  return {
    signature: `${ctx.kpId}#compose:${value}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${words.join('')}，合起来是几？`,
      ttsText: `${words.join('')}，合起来是几`,
      ttsParts: parts,
    },
    // ⭐ 「4 个千 5 个一」直接写成 45：中间空着的两位没有用 0 占住
    options: buildNumericOptions(value, distractorsFor(value), ctx.rng),
    answer: String(value),
  }
}
