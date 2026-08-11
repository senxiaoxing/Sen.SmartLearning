/**
 * @file 认整体认读音节生成器 —— P6 各组
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §P6 整体认读音节
 *
 * ## ⭐ 直接考那个误区本身
 *
 * P6 唯一要防的错误是 `spell_integral`：把 `zhi` 拆成 zh-i 去拼。
 * 而「听 zī 选 zī」根本考不到这件事——孩子听音选对了，
 * 也不代表她知道这个音节**不能拆**。
 *
 * 换成「这四个里哪个是整体认读音节」，考的就是那条规则本身：
 * 她得认出 `zi` 和 `zu` 的区别不在读音，而在**能不能拼**。
 *
 * 顺带解决题量：正确答案从本组的 3~4 个里出，干扰项从几十个两拼音节里挑，
 * 组合数远大于「听音选拼音」的 3 种。
 *
 * ## ⚠️ 这是看的题，不是听的题
 *
 * 整体认读与两拼音节**读音上没有区别**（`zi` 就读 zi），
 * 区别在于书写规则。所以题干不播音、选项也不点读——
 * 播出来只会让孩子以为要靠听，反而误导。
 */

import { displayForm, type Syllable } from '@/domain/pinyin'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const OPTION_COUNT = 4

/**
 * 生成一道「哪个是整体认读音节」的题。
 *
 * @param ctx.params.integrals - 本知识点教的整体认读音节（正确答案从这里出）
 * @param ctx.params.others - 干扰用的两拼音节池
 *
 * @returns `type: 'choice_text'`，题干与选项都是拼音文字
 *
 * @example
 * pinyinIntegral({ kpId: 'P6.2', difficulty: 2, params: { integrals, others }, rng })
 * // 抽到 zī 时：
 * //   zi → 正确（整体认读，不能拆）
 * //   zǎo / mǐ / hé → spell_integral  没认出哪个是整体认读
 */
export const pinyinIntegral: Generator = ({ kpId, difficulty, params, rng }) => {
  const integrals = readList(params, 'integrals')
  const others = readList(params, 'others')

  const target = integrals[Math.floor(rng() * integrals.length)] as Syllable

  // ⚠️ 干扰项必须**不是**整体认读音节，否则会出现两个正确答案
  const integralBases = new Set(integrals.map((s) => s.base))
  const pool = others.filter((s) => !integralBases.has(s.base))

  const distractors = shuffle(rng, pool)
    .filter((s, i, arr) => arr.findIndex((x) => displayForm(x) === displayForm(s)) === i)
    .filter((s) => displayForm(s) !== displayForm(target))
    .slice(0, OPTION_COUNT - 1)

  const options: ItemOption[] = shuffle(rng, [target, ...distractors]).map((s, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: displayForm(s),
    isCorrect: s === target,
    ...(s === target ? {} : { misconceptionTag: 'spell_integral' as const }),
  }))

  return {
    signature: `${kpId}-integral#${target.base}${target.tone}:${distractors
      .map((s) => s.base)
      .sort()
      .join('.')}`,
    kpId,
    type: 'choice_text',
    difficulty,
    stem: {
      text: '哪个是整体认读音节？（不能拆开拼的那个）',
      ttsText: '哪个是整体认读音节，就是不能拆开拼的那个',
    },
    options,
    answer: displayForm(target),
  }
}

function readList(params: Record<string, unknown>, name: string): Syllable[] {
  const raw = params[name]
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`pinyinIntegral: 缺少 ${name} 参数`)
  }
  return raw as Syllable[]
}
