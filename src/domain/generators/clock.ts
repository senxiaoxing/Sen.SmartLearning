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
import type { Difficulty, Generator, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

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
    { label: correct, isCorrect: true },
    ...picked.map((t) => ({ label: readTime(t.hour, t.minute), isCorrect: false })),
  ])
    .slice(0, 4)
    .map(toOption)

  return {
    signature: `${kpId}-clock#${mode}:${hour}:${minute}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: { text: '现在是几点？', ttsText: '现在是几点' },
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
    { key: correctKey, label: target, isCorrect: true },
    ...picked.map((t) => ({
      key: keyOf(t),
      label: readTime(t.hour, t.minute),
      isCorrect: false,
    })),
  ])
    .slice(0, 4)
    .map((o, i) => ({
      id: OPTION_IDS[i] ?? `x${i}`,
      // ⚠️ 文字不显示也不朗读，只为契约与家长错题本
      text: o.label,
      imageKey: o.key,
      isCorrect: o.isCorrect,
      ...(o.isCorrect ? {} : { misconceptionTag: 'hand_swap' as const }),
    }))

  return {
    signature: `${kpId}-clock#parts:${hour}:${minute}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: { text: `哪个钟面是 ${target}？`, ttsText: `哪个钟面是${target}` },
    options,
    answer: target,
  }
}

/** 文字时刻选项。⚠️ 每个错误项都要带 tag，见 CLAUDE.md 干扰项铁律 */
function toOption(o: { label: string; isCorrect: boolean }, i: number): ItemOption {
  return {
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.label,
    isCorrect: o.isCorrect,
    ...(o.isCorrect ? {} : { misconceptionTag: 'hand_swap' as const }),
  }
}
