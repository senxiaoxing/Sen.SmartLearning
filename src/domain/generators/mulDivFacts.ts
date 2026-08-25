/**
 * @file 乘除版一图四式 —— M2-9.5 乘除法的关系
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/fourFacts.ts   加减版，结构完全同构
 * @see src/domain/generators/equalGroups.ts 共用同一种「几个几」配图
 *
 * ## 一幅图对应四个算式
 *
 * 3 组、每组 4 个，一共 12 个。这幅图同时说明四件事：
 * ```
 * 3 × 4 = 12     4 × 3 = 12     12 ÷ 3 = 4     12 ÷ 4 = 3
 * ```
 * M2-9.5 要建立的就是**乘除互逆**的整体结构感——
 * 「想乘法算除法」这句口诀的底子就在这里。
 *
 * ## 为什么与 `fourFacts` 分开而不是加个参数
 *
 * 结构一样，但**误区是全新的一套**（`mul_as_add` / `div_as_sub` /
 * `div_as_mul` / `table_confusion`），而干扰项策略正是生成器的全部内容。
 * 按 §4.1 的判据，需要新标签的就是新生成器。
 * 两边共用的只有算式文本的处理，已经提到 `domain/equation.ts`。
 */

import { equationParts, equationSpoken, isTrueEquation } from '@/domain/equation'
import { COUNTABLES } from '@/domain/generators/countables'
import { readRange } from '@/domain/generators/params'
import { randomInt, randomPick, shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/**
 * 生成一道乘除版一图四式题。
 *
 * @param ctx.params.groupsRange - 组数范围，默认 `[2, 5]`
 * @param ctx.params.perGroupRange - 每组几个，默认 `[2, 5]`
 *
 * @example
 * mulDivFacts({ kpId: 'M2-9.5', difficulty: 3, params: {}, rng })
 * // 图为 3 组每组 4 个，抽到「12 ÷ 3 = 4」时：
 * //   12 ÷ 3 = 4  → 正确
 * //   3 + 4 = 12  → mul_as_add    把「几个几」当成了「几加几」
 * //   12 - 3 = 4  → div_as_sub    分东西做成了减法
 * //   12 ÷ 3 = 5  → table_confusion  口诀用岔了
 */
export const mulDivFacts: Generator = ({ kpId, difficulty, params, rng }) => {
  const [gLo, gHi] = readRange(params, 'groupsRange', [2, 5])
  const [pLo, pHi] = readRange(params, 'perGroupRange', [2, 5])

  const groups = randomInt(rng, gLo, gHi)
  const perGroup = randomInt(rng, pLo, pHi)
  const total = groups * perGroup
  const thing = randomPick(rng, COUNTABLES)

  /** 这幅图对应的四个算式 */
  const facts = [
    `${groups} × ${perGroup} = ${total}`,
    `${perGroup} × ${groups} = ${total}`,
    `${total} ÷ ${groups} = ${perGroup}`,
    `${total} ÷ ${perGroup} = ${groups}`,
  ]
  const correct = randomPick(rng, facts)

  /**
   * ⚠️⚠️ 干扰项要过两道关。
   *
   * ① **不能是这幅图的任何一个正确算式**——题干问「哪个算式说的是这幅图」，
   *    而一幅图对应四个。塞进另一个，孩子选了会被判错，但她其实答对了。
   *
   * ② ⭐ **必须是不成立的等式**。这一条是乘除版特有的：一幅「2 组、每组 2 个」
   *    的图，`4 - 2 = 2` 既成立又讲得通（4 个拿走 2 个剩 2 个），
   *    把它当干扰项等于把一个讲得通的答案判成错。
   *    只要干扰项本身算不通，就永远不会有这种歧义。
   */
  const seen = new Set<string>(facts)

  const pool: { text: string; tag: MisconceptionTag }[] = [
    // ⭐ 把「几个几」当成了「几加几」——二年级头号误区
    { text: `${groups} + ${perGroup} = ${total}`, tag: 'mul_as_add' },
    // 分东西做成了减法
    { text: `${total} - ${groups} = ${perGroup}`, tag: 'div_as_sub' },
    { text: `${total} - ${perGroup} = ${groups}`, tag: 'div_as_sub' },
    // 除法做成了乘法：该算 12 ÷ 3，她算了 12 × 3 填进商的位置。
    // ⛔ 不要写成「12 × 3 = 4」——那种荒谬到一眼排除的选项诊断力为零
    { text: `${total} ÷ ${groups} = ${total * groups}`, tag: 'div_as_mul' },
    // 口诀用岔，积或商差了一点
    { text: `${groups} × ${perGroup} = ${total + groups}`, tag: 'table_confusion' },
    { text: `${total} ÷ ${groups} = ${perGroup + 1}`, tag: 'table_confusion' },
    { text: `${total} ÷ ${perGroup} = ${groups + 1}`, tag: 'table_confusion' },
  ]

  const picked = pool
    // ② 算得通的一律弃用
    .filter((w) => !isTrueEquation(w.text))
    // ① 四式与池内重复项一并去掉
    .filter((w) => (seen.has(w.text) ? false : (seen.add(w.text), true)))
    .slice(0, 3)

  const options: ItemOption[] = shuffle(rng, [
    { text: correct, isCorrect: true, tag: undefined as MisconceptionTag | undefined },
    ...picked.map((w) => ({ text: w.text, isCorrect: false, tag: w.tag })),
  ])
    .slice(0, 4)
    .map((o, i) => {
      const parts = equationParts(o.text)
      return {
        id: OPTION_IDS[i] ?? `x${i}`,
        text: o.text,
        // 算式选项要能点读——孩子不识字，但算式里的数字和符号她认得
        ttsText: equationSpoken(o.text),
        ...(parts !== undefined && { ttsParts: parts }),
        isCorrect: o.isCorrect,
        ...(o.tag !== undefined && { misconceptionTag: o.tag }),
      }
    })

  return {
    signature: `${kpId}-four#${groups}x${perGroup}:${correct}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: '哪个算式说的是这幅图？',
      ttsText: '哪个算式说的是这幅图',
      ttsParts: ['phrase.whichEquationFits'],
    },
    options,
    answer: correct,
    // ⭐ 与 M2-4.1 / M2-9.1 共用同一种图：乘法和除法看着同一幅画面，
    // 这正是「乘除互逆」最直接的呈现
    visual: {
      kind: 'equalGroups',
      emoji: thing.emoji,
      name: thing.name,
      groups,
      perGroup,
    },
  }
}
