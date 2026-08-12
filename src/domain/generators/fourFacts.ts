/**
 * @file 一图四式生成器 —— M4.10 加减关系
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M4 10以内加减法
 *
 * ## 一幅图对应四个算式
 *
 * 3 个红的 + 2 个蓝的，一共 5 个。这幅图同时说明四件事：
 * ```
 * 3 + 2 = 5      2 + 3 = 5      5 - 3 = 2      5 - 2 = 3
 * ```
 * M4.10 要建立的就是这种**加减互逆**的整体结构感。
 *
 * ## ⚠️ 出题时只能问「哪个算式说的是这幅图」
 *
 * 原设计用 `drag_match`（把四个算式拖到图旁边），改成选择题的代价是
 * 一次只考一个算式。但四个正确算式**不能同时作为选项**——
 * 那样四个选项全对，孩子点哪个都算对，这道题就没有意义了。
 *
 * 因此：正确项从四式里随机抽一个，干扰项是**数字对不上这幅图**的算式。
 * 诊断落在 `op_confusion`（运算用反）与 `off_by_one`（数错）上。
 */

import { COUNTABLES } from '@/domain/generators/countables'
import { readRange } from '@/domain/generators/params'
import { randomInt, randomPick, shuffle } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/**
 * 把「3 + 2 = 5」解析成语音片段序列（选项点读与错题本用）。
 *
 * 从展示文本反解而不是让每个候选各带一份 parts：候选在 facts / pool
 * 两处构造，带两份迟早漂移，而算式文本本身就是唯一事实源。
 */
function equationParts(text: string): string[] | undefined {
  const m = /^(\d+) ([+-]) (\d+) = (\d+)$/.exec(text)
  if (m === null) return undefined
  return [
    ...num(Number(m[1])),
    m[2] === '+' ? 'op.plus' : 'op.minus',
    ...num(Number(m[3])),
    'op.equals',
    ...num(Number(m[4])),
  ]
}

/**
 * 生成一道一图四式题。
 *
 * @param ctx.params.totalRange - 总数区间
 *
 * @example
 * fourFacts({ kpId: 'M4.10', difficulty: 3, params: { totalRange: [5, 9] }, rng })
 * // 图为 3 + 2 = 5，抽到「5 - 3 = 2」时：
 * //   5 - 3 = 2 → 正确
 * //   5 + 3 = 8 → op_confusion  该减做成了加
 * //   5 - 3 = 3 → off_by_one    算错了
 */
export const fourFacts: Generator = ({ kpId, difficulty, params, rng }) => {
  const [lo, hi] = readRange(params, 'totalRange', [4, 9])
  const total = randomInt(rng, Math.max(3, lo), hi)
  const a = randomInt(rng, 1, total - 1)
  const b = total - a
  const thing = randomPick(rng, COUNTABLES)

  /** 这幅图对应的四个算式 */
  const facts = [
    { text: `${a} + ${b} = ${total}`, kind: 'add' as const },
    { text: `${b} + ${a} = ${total}`, kind: 'add' as const },
    { text: `${total} - ${a} = ${b}`, kind: 'sub' as const },
    { text: `${total} - ${b} = ${a}`, kind: 'sub' as const },
  ]
  const correct = randomPick(rng, facts)

  /**
   * ⚠️⚠️ 干扰项绝不能是这幅图的**任何一个**正确算式。
   *
   * 题干问的是「哪个算式说的是这幅图」，而一幅图对应四个算式。
   * 若把其中另一个塞进选项，孩子选了它会被判错——**但她其实答对了**，
   * 掌握度和错题本都会记下一笔冤枉账。
   *
   * 所以这里先把四式全部放进 `seen`，再从候选池里挑数字真正对不上的。
   */
  const seen = new Set<string>(facts.map((f) => f.text))

  const pool: { text: string; tag: MisconceptionTag }[] = [
    { text: `${total} + ${a} = ${total + a}`, tag: 'op_confusion' },
    { text: `${total} + ${b} = ${total + b}`, tag: 'op_confusion' },
    { text: `${a} + ${b} = ${total + 1}`, tag: 'off_by_one' },
    { text: `${total} - ${a} = ${b + 1}`, tag: 'off_by_one' },
    { text: `${total} - ${b} = ${a + 1}`, tag: 'off_by_one' },
    // 只在不产生负数时可用
    ...(a > b ? [{ text: `${a} - ${b} = ${a - b}`, tag: 'op_confusion' as const }] : []),
    ...(b > a ? [{ text: `${b} - ${a} = ${b - a}`, tag: 'op_confusion' as const }] : []),
  ]

  const picked = pool
    .filter((w) => (seen.has(w.text) ? false : (seen.add(w.text), true)))
    .slice(0, 3)

  const options: ItemOption[] = shuffle(rng, [
    { text: correct.text, isCorrect: true, tag: undefined as MisconceptionTag | undefined },
    ...picked.map((w) => ({ text: w.text, isCorrect: false, tag: w.tag })),
  ])
    .slice(0, 4)
    .map((o, i) => {
      const parts = equationParts(o.text)
      return {
        id: OPTION_IDS[i] ?? `x${i}`,
        text: o.text,
        // 算式选项要能点读——孩子不识字，但算式里的数字和符号她认得
        ttsText: o.text.replace('+', '加').replace('-', '减').replace('=', '等于'),
        ...(parts !== undefined && { ttsParts: parts }),
        isCorrect: o.isCorrect,
        ...(o.tag !== undefined && { misconceptionTag: o.tag }),
      }
    })

  return {
    signature: `${kpId}-four#${a}+${b}:${correct.text}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: '哪个算式说的是这幅图？',
      ttsText: '哪个算式说的是这幅图',
      ttsParts: ['phrase.whichEquationFits'],
    },
    options,
    answer: correct.text,
    visual: {
      kind: 'storyGroups',
      emoji: thing.emoji,
      name: thing.name,
      groups: [a, b],
      operation: 'add',
    },
  }
}
