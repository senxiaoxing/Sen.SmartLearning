/**
 * @file 几时几分生成器 —— 覆盖 M2-6.1 认识几时几分 · M2-6.2 五分五分地数 · M2-6.4 经过时间
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/clockTime.ts   时刻算术与二年级的干扰候选
 * @see src/domain/generators/clock.ts       一年级的整时/半时，两者刻意分开
 *
 * 为什么不给 `clock` 加个 mode：一年级读错时间几乎只有一个原因（看反指针），
 * 而几时几分带来两个全新的误区——`minute_misread`（分针指向 3 读成 3 分）
 * 和 `hour_overread`（3:55 读成 4:55）。按 §4.1 的判据，
 * **需要新标签的就是新生成器**。
 */

import {
  minuteCandidates,
  readTime,
  type ClockTime,
} from '@/domain/generators/clockTime'
import { buildNumericOptions } from '@/domain/generators/distractors'
import { readEnum, readNumber } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import { num, type ClipKey } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const MODES = ['read', 'minuteFromMark', 'elapsed'] as const

/** 一大格 = 5 分。整个单元的核心事实，也是 `minute_misread` 的来源 */
const MINUTES_PER_MARK = 5

/**
 * 时刻的语音片段。
 *
 * 「3 点 15 分」拼作 `3` + `点` + `15` + `分`，其中「分」直接复用
 * 单位换算加的 `unit.min`——那条片段本来就是为「1 时 = 60 分」加的。
 */
function timeParts(t: ClockTime): ClipKey[] {
  const h = t.hour === 0 ? 12 : t.hour
  if (t.minute === 0) return [...num(h), 'phrase.oclockSharp']
  if (t.minute === 30) return [...num(h), 'phrase.halfPast']
  return [...num(h), 'phrase.oclock', ...num(t.minute), 'unit.min']
}

/**
 * 生成一道「几时几分」的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'read'` 读钟面（M2-6.1）| `'minuteFromMark'` 分针指着几是几分（M2-6.2）
 *                        | `'elapsed'` 再过几分是几点（M2-6.4）。默认 `'read'`
 * @param ctx.params.step - 分针的最小刻度，`5` 或 `1`。默认 5——教材二年级主要练五分五分地数
 * @returns 含 4 个选项的题目
 *
 * @example
 * clockMinutes({ kpId: 'M2-6.1', difficulty: 2, params: {}, rng })
 * // 抽到 3 点 15 分时：
 * //   3 点 15 分 → 正确
 * //   3 点 3 分  → minute_misread  把分针指的格数当成了分钟
 * //   4 点 15 分 → hour_overread   时针快到 4 了就读成 4
 */
export const clockMinutes: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'read')
  const step = readNumber(ctx.params, 'step', MINUTES_PER_MARK)

  if (mode === 'minuteFromMark') return buildMinuteFromMark(ctx)
  if (mode === 'elapsed') return buildElapsed(ctx)

  const hour = randomInt(ctx.rng, 1, 12)
  // 排除 0 分和 30 分：那是一年级的整时半时，这个知识点要练的是「不整不半」
  const minute =
    step === MINUTES_PER_MARK
      ? pickNonTrivialMark(ctx) * MINUTES_PER_MARK
      : randomInt(ctx.rng, 1, 59)

  const correct = readTime(hour, minute)
  const seen = new Set<string>([correct])
  const picked = minuteCandidates(hour, minute)
    .filter((c) => {
      const label = readTime(c.time.hour, c.time.minute)
      if (seen.has(label)) return false
      seen.add(label)
      return true
    })
    .slice(0, 3)

  const options: ItemOption[] = shuffle(ctx.rng, [
    { label: correct, time: { hour, minute }, isCorrect: true, tag: undefined },
    ...picked.map((c) => ({
      label: readTime(c.time.hour, c.time.minute),
      time: c.time,
      isCorrect: false,
      tag: c.tag,
    })),
  ]).map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.label,
    ttsParts: timeParts(o.time),
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))

  return {
    signature: `${ctx.kpId}#read:${hour}:${minute}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: { text: '现在是几点几分？', ttsText: '现在是几点几分', ttsParts: ['phrase.whatTimeNow'] },
    options,
    answer: correct,
    visual: { kind: 'figure', imageKey: `clock:${hour}:${minute}` },
  }
}

/** 1~11 格，跳过 6（那是半点，属于一年级） */
function pickNonTrivialMark(ctx: GeneratorContext): number {
  const mark = randomInt(ctx.rng, 1, 10)
  return mark >= 6 ? mark + 1 : mark
}

/**
 * M2-6.2 `分针指着 3，是多少分？`
 *
 * 这道题把 `minute_misread` 单独拎出来练：答案就是格数 × 5，
 * 而干扰项的头一个正是格数本身。她要是选了它，说明「一大格 5 分」还没建立。
 */
function buildMinuteFromMark(ctx: GeneratorContext): GeneratedItem {
  const mark = randomInt(ctx.rng, 1, 11)
  const answer = mark * MINUTES_PER_MARK

  return {
    signature: `${ctx.kpId}#mark:${mark}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `分针指着 ${mark}，是多少分？`,
      ttsText: `分针指着 ${mark}，是多少分`,
      ttsParts: ['phrase.minuteHandAt', ...num(mark), 'phrase.howManyMinutes'],
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 格数直接当分钟 —— 这个单元唯一要诊断的东西
        { value: mark, tag: 'minute_misread' },
        { value: answer + MINUTES_PER_MARK, tag: 'minute_misread' },
        { value: 60 - answer, tag: 'minute_misread' },
      ],
      ctx.rng,
    ),
    answer: String(answer),
  }
}

/**
 * M2-6.4 `3 点 20 分，再过 15 分是几点几分？`
 *
 * ⭐ 一半的题要**跨过整点**（3 点 50 分 + 20 分 = 4 点 10 分），
 * 否则这道题退化成「分钟相加」，考不到 60 进制那一步——
 * 而「3 点 70 分」正是这里最典型的错误。
 */
function buildElapsed(ctx: GeneratorContext): GeneratedItem {
  const hour = randomInt(ctx.rng, 1, 12)
  const minute = randomInt(ctx.rng, 1, 11) * MINUTES_PER_MARK
  const delta = randomInt(ctx.rng, 1, 8) * MINUTES_PER_MARK

  const total = minute + delta
  const answerTime: ClockTime = {
    hour: total >= 60 ? (hour % 12) + 1 : hour,
    minute: total % 60,
  }
  const correct = readTime(answerTime.hour, answerTime.minute)

  const candidates: Array<{ time: ClockTime; tag: 'unit_conversion' | 'hour_overread' }> = [
    // 分钟一路加下去不进位：3 点 50 分 + 20 分 答成「3 点 70 分」
    { time: { hour, minute: total }, tag: 'unit_conversion' },
    { time: { hour: (answerTime.hour % 12) + 1, minute: answerTime.minute }, tag: 'hour_overread' },
    { time: { hour: answerTime.hour, minute: (answerTime.minute + delta) % 60 }, tag: 'unit_conversion' },
  ]

  const seen = new Set<string>([correct])
  const picked = candidates.filter((c) => {
    const label = readTime(c.time.hour, c.time.minute)
    if (seen.has(label)) return false
    seen.add(label)
    return true
  })

  const options: ItemOption[] = shuffle(ctx.rng, [
    { label: correct, time: answerTime, isCorrect: true, tag: undefined },
    ...picked.map((c) => ({
      label: readTime(c.time.hour, c.time.minute),
      time: c.time,
      isCorrect: false,
      tag: c.tag,
    })),
  ]).map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.label,
    // 「3 点 70 分」这种超出 60 的读数没有对应片段也没关系：选项不朗读，
    // 答错反馈只念正确答案，而正确答案的分钟恒在 0~59
    ttsParts: timeParts(o.time),
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))

  return {
    signature: `${ctx.kpId}#elapsed:${hour}:${minute}+${delta}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: `${readTime(hour, minute)}，再过 ${delta} 分是几点几分？`,
      ttsText: `${readTime(hour, minute)}，再过 ${delta} 分是几点几分`,
      ttsParts: [
        ...timeParts({ hour, minute }),
        'phrase.afterMinutes',
        ...num(delta),
        'phrase.whatTimeThen',
      ],
    },
    options,
    answer: correct,
    visual: { kind: 'figure', imageKey: `clock:${hour}:${minute}` },
  }
}
