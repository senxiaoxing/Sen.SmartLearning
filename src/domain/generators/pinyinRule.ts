/**
 * @file 拼音书写规则 —— P3.3 j q x 与 ü 去两点 · P3.4 声调标注位置
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §P3 拼读规则
 *
 * 这两条是拼音里**只能靠规则、不能靠听**的部分：
 * `ju` 和 `jü` 读音完全一样，`hǎo` 和 `haǒ` 念出来也没区别。
 * 所以它们是全科仅有的两个 `choice_text`——考的是写法而不是听辨。
 *
 * ⚠️ 因此选项**不可点读**：念出来四个选项一模一样，
 * 点读只会让孩子以为自己听错了。
 */

import { readEnum } from '@/domain/generators/params'
import { shuffle } from '@/domain/generators/rng'
import { applyTone, isTonable, tonePosition } from '@/domain/generators/toneMarks'
import type { Tone } from '@/domain/pinyin'
import type { Generator, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 与 ü 相拼要去掉两点的四个声母 */
const UMLAUT_INITIALS = ['j', 'q', 'x', 'y'] as const

/**
 * 生成一道拼音书写规则题。
 *
 * @param ctx.params.mode - `'umlaut'`（P3.3 去两点）| `'tonePos'`（P3.4 标调位置）
 * @param ctx.params.finals - `umlaut` 模式用哪些 ü 系韵母，默认 `['ü', 'üe', 'ün']`
 * @param ctx.params.bases - `tonePos` 模式的候选音节（不带调）
 *
 * @example
 * pinyinRule({ kpId: 'P3.3', difficulty: 3, params: { mode: 'umlaut' }, rng })
 * // j + ü 时：
 * //   ju  → 正确
 * //   jü  → u_umlaut_kept  两点没去掉
 */
export const pinyinRule: Generator = ({ kpId, difficulty, params, rng }) => {
  const mode = readEnum(params, 'mode', ['umlaut', 'tonePos'] as const, 'umlaut')
  return mode === 'umlaut' ? umlautItem(kpId, difficulty, params, rng) : toneItem(kpId, difficulty, params, rng)
}

/** P3.3：j q x y 与 ü 相拼，ü 要去掉两点 */
function umlautItem(
  kpId: string,
  difficulty: 1 | 2 | 3,
  params: Record<string, unknown>,
  rng: () => number,
): ReturnType<Generator> {
  const finals = (params['finals'] as string[] | undefined) ?? ['ü', 'üe', 'ün']
  const initial = UMLAUT_INITIALS[Math.floor(rng() * UMLAUT_INITIALS.length)] ?? 'j'
  const final = finals[Math.floor(rng() * finals.length)] ?? 'ü'

  const correct = `${initial}${final.replace('ü', 'u')}`

  const candidates = [
    { text: correct, isCorrect: true },
    // ⭐ 两点没去掉 —— 拼音全科最高频的书写错误
    { text: `${initial}${final}`, isCorrect: false },
    // 把 ü 直接当成 u 之外的元音
    { text: `${initial}${final.replace('ü', 'i')}`, isCorrect: false },
    { text: `${initial}${final.replace('ü', 'v')}`, isCorrect: false },
  ]

  return {
    signature: `${kpId}-rule#umlaut:${initial}${final}`,
    kpId,
    type: 'choice_text',
    difficulty,
    stem: {
      text: `${initial} 和 ${final} 拼在一起，应该怎么写？`,
      ttsText: `${initial} 和 ü 拼在一起，应该怎么写`,
    },
    options: toOptions(shuffle(rng, dedupe(candidates)), 'u_umlaut_kept'),
    answer: correct,
  }
}

/** P3.4：声调标在哪个字母上 */
function toneItem(
  kpId: string,
  difficulty: 1 | 2 | 3,
  params: Record<string, unknown>,
  rng: () => number,
): ReturnType<Generator> {
  const bases = (params['bases'] as string[] | undefined) ?? ['hao', 'jia', 'liu', 'gui', 'xie']
  const base = bases[Math.floor(rng() * bases.length)] ?? 'hao'
  const tone = ((Math.floor(rng() * 4) + 1) as Tone)

  const right = tonePosition(base)
  const correct = applyTone(base, tone, right)

  // 干扰项：把调号标到别的元音上
  const wrongPositions = [...base]
    .map((c, i) => (isTonable(c) && i !== right ? i : -1))
    .filter((i) => i >= 0)

  const candidates = [
    { text: correct, isCorrect: true },
    ...wrongPositions.map((p) => ({ text: applyTone(base, tone, p), isCorrect: false })),
    // 位置对但标错声调
    { text: applyTone(base, ((tone % 4) + 1) as Tone, right), isCorrect: false },
  ]

  return {
    signature: `${kpId}-rule#tone:${base}${tone}`,
    kpId,
    type: 'choice_text',
    difficulty,
    stem: {
      text: `${base} 读第 ${tone} 声，声调该标在哪里？`,
      ttsText: `${base}，读第 ${tone} 声，声调该标在哪里`,
    },
    options: toOptions(shuffle(rng, dedupe(candidates)), 'tone_wrong_position'),
    answer: correct,
  }
}

/** 文本重合的候选剔除，正确项优先保留 */
function dedupe(list: { text: string; isCorrect: boolean }[]) {
  const seen = new Set<string>()
  return [...list].sort((a, b) => Number(b.isCorrect) - Number(a.isCorrect)).filter((c) => {
    if (seen.has(c.text)) return false
    seen.add(c.text)
    return true
  })
}

/** ⚠️ 不设 ttsText —— 四个选项念出来一模一样，点读只会让孩子困惑 */
function toOptions(
  list: { text: string; isCorrect: boolean }[],
  tag: 'u_umlaut_kept' | 'tone_wrong_position',
): ItemOption[] {
  return list.slice(0, 4).map((c, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: c.text,
    isCorrect: c.isCorrect,
    ...(c.isCorrect ? {} : { misconceptionTag: tag }),
  }))
}
