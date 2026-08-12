/**
 * @file 钟表生成器 —— M8.1 认识钟面 · M8.2 整时 · M8.3 半时
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/clockTime.ts   时刻算术与干扰候选
 * @see src/components/shape/ClockFace.tsx   钟面怎么画
 *
 * ## ⭐ `hand_swap` 是这个单元唯一真正要诊断的东西
 *
 * 一年级读错时间几乎只有一个原因：**把时针和分针看反了**。
 * 3 点整看成 12 点一刻，9 点半看成 6 点四十五——都是同一个病。
 *
 * 因此每道题的干扰项里**必须有一个「指针交换后的时刻」**。
 * 孩子选了它，就精确定位到 `hand_swap`，补救是回 M8.1 重认钟面。
 * 换成随机时刻做干扰项，这条信息就彻底丢了。
 */

import {
  pickDistinctTimes,
  readTime,
  type ClockTime,
} from '@/domain/generators/clockTime'
import { readEnum } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { Difficulty, Generator, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/**
 * 时刻的语音片段。整时/半时可拼（数字 + 点整/点半）；
 * 其余分钟（指针交换产物「12 点 15 分」）拿不到片段，返回 undefined——
 * 它们只出现在干扰项上，而答错反馈只念**正确答案**，正确答案永远是整时或半时。
 */
function timeParts(t: { hour: number; minute: number }): string[] | undefined {
  const h = t.hour === 0 ? 12 : t.hour
  if (t.minute === 0) return [...num(h), 'phrase.oclockSharp']
  if (t.minute === 30) return [...num(h), 'phrase.halfPast']
  return undefined
}

/**
 * 生成一道读钟表的题。
 *
 * @param ctx.params.mode - `'oclock'` 整时（M8.2）| `'half'` 含半点（M8.3）
 *                        | `'parts'` 认指针（M8.1）
 *
 * @returns 整时/半时题的题干是钟面图、选项是文字时刻；
 *          认指针题反过来——题干是文字，选项是钟面
 *
 * @example
 * clock({ kpId: 'M8.2', difficulty: 2, params: { mode: 'oclock' }, rng })
 * // 抽到 3 点整时：
 * //   3 点整      → 正确
 * //   12 点 15 分 → hand_swap  把时针分针看反了
 */
export const clock: Generator = ({ kpId, difficulty, params, rng }) => {
  const mode = readEnum(params, 'mode', ['oclock', 'half', 'parts'] as const, 'oclock')

  const hour = randomInt(rng, 1, 12)
  const minute = mode === 'half' && rng() < 0.5 ? 30 : 0

  if (mode === 'parts') return handsItem(kpId, difficulty, hour, minute, rng)

  const correct = readTime(hour, minute)
  const picked = pickDistinctTimes(hour, minute, (t) => readTime(t.hour, t.minute), correct)

  const options = shuffle(rng, [
    { label: correct, isCorrect: true, time: { hour, minute } },
    ...picked.map((t) => ({ label: readTime(t.hour, t.minute), isCorrect: false, time: t })),
  ])
    .slice(0, 4)
    .map(toOption)

  return {
    signature: `${kpId}-clock#${mode}:${hour}:${minute}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: { text: '现在是几点？', ttsText: '现在是几点', ttsParts: ['phrase.whatTimeNow'] },
    options,
    answer: correct,
    visual: { kind: 'figure', imageKey: `clock:${hour}:${minute}` },
  }
}

/**
 * M8.1 认识钟面：给出时刻，问哪个钟面是对的。
 *
 * 反过来出（题干文字、选项是图）是刻意的：M8.1 学的是**指针的含义**，
 * 让孩子从几个钟面里挑出「时针在 3、分针在 12」的那个，
 * 比让她读一个钟面更直接地考到「哪根针管小时」。
 */
function handsItem(
  kpId: string,
  difficulty: Difficulty,
  hour: number,
  minute: number,
  rng: () => number,
): ReturnType<Generator> {
  const target = readTime(hour, minute)
  const keyOf = (t: ClockTime) => `clock:${t.hour}:${t.minute}`
  const correctKey = keyOf({ hour, minute })
  const picked = pickDistinctTimes(hour, minute, keyOf, correctKey)

  const options: ItemOption[] = shuffle(rng, [
    { key: correctKey, label: target, isCorrect: true, time: { hour, minute } },
    ...picked.map((t) => ({
      key: keyOf(t),
      label: readTime(t.hour, t.minute),
      isCorrect: false,
      time: t,
    })),
  ])
    .slice(0, 4)
    .map((o, i) => {
      const parts = timeParts(o.time)
      return {
        id: OPTION_IDS[i] ?? `x${i}`,
        // ⚠️ 文字不显示也不朗读，只为契约、家长错题本与答错反馈的「答案是」
        text: o.label,
        ...(parts !== undefined && { ttsParts: parts }),
        imageKey: o.key,
        isCorrect: o.isCorrect,
        ...(o.isCorrect ? {} : { misconceptionTag: 'hand_swap' as const }),
      }
    })

  return {
    signature: `${kpId}-clock#parts:${hour}:${minute}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `哪个钟面是 ${target}？`,
      ttsText: `哪个钟面是${target}`,
      // parts 模式的分钟恒为 0（clock() 只在 half 模式掷半点），读法固定是「H 点整」。
      // 万一将来放开半点，这里不给 parts、整句走兜底，绝不能把「点整」拼到半点上
      ...(minute === 0 && {
        ttsParts: ['phrase.whichClockShows', ...num(hour), 'phrase.oclockSharp'],
      }),
    },
    options,
    answer: target,
  }
}

/** 文字时刻选项。⚠️ 每个错误项都要带 tag，见 CLAUDE.md 干扰项铁律 */
function toOption(
  o: { label: string; isCorrect: boolean; time: { hour: number; minute: number } },
  i: number,
): ItemOption {
  const parts = timeParts(o.time)
  return {
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.label,
    ...(parts !== undefined && { ttsParts: parts }),
    isCorrect: o.isCorrect,
    ...(o.isCorrect ? {} : { misconceptionTag: 'hand_swap' as const }),
  }
}
