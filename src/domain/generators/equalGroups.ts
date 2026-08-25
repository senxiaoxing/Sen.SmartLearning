/**
 * @file 「几个几」生成器 —— M2-4.1 乘法的意义 · M2-4.2 乘加互换 · M2-9.1 平均分
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/items/StoryFigures.tsx  EqualGroups 怎么画
 * @see design/01-知识点图谱.md §M2-4 §M2-9
 *
 * ## ⭐ 乘法与除法共用同一幅图
 *
 * 看着同一幅「3 组、每组 4 个」，问「一共几个」是乘法，问「每份几个」是除法。
 * 两者本来就是一回事的两个方向，图一样正好帮她建立这个联系——
 * 而不是让除法在两个月后作为一件全新的事情出现。
 *
 * ## ⚠️ 数值刻意压得很小（2~5 组，每组 2~5 个）
 *
 * 这三个知识点考的是**概念**不是口诀：9 × 8 的图要摆 72 个 emoji，
 * 在 iPad 上是一片糊，而且她会去数而不是去想「几个几」。
 * 口诀表的大数值归 `mulTable`，那里不配图。
 */

import { COUNTABLES, type Countable } from '@/domain/generators/countables'
import { buildNumericOptions, buildTextOptions } from '@/domain/generators/distractors'
import { readEnum, readItemType, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  ItemVisual,
  MisconceptionTag,
} from '@/domain/types'

const MODES = ['times', 'equation', 'share', 'groupCount'] as const

/**
 * 生成一道「几个几」的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'times'` 一共几个（乘法的意义）
 *                        | `'equation'` 哪个算式说的是这幅图（乘加互换）
 *                        | `'share'` 平均分成几份，每份几个
 *                        | `'groupCount'` 每份几个，能分几份
 * @param ctx.params.groupsRange - 组数范围，默认 `[2, 5]`
 * @param ctx.params.perGroupRange - 每组几个，默认 `[2, 5]`
 * @returns 含 4 个选项的题目，题干配 `equalGroups` 图
 *
 * @example
 * equalGroups({ kpId: 'M2-4.1', difficulty: 2, params: { mode: 'times' }, rng })
 * // 图上 3 组、每组 4 个，问「一共有几个」：
 * //   12 → 正确
 * //    7 → mul_as_add       算成了 3 + 4
 * //   16 → mul_extra_group  多数了一组
 */
export const equalGroups: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'times')
  const [gLo, gHi] = readRange(ctx.params, 'groupsRange', [2, 5])
  const [pLo, pHi] = readRange(ctx.params, 'perGroupRange', [2, 5])

  const groups = randomInt(ctx.rng, gLo, gHi)
  const perGroup = randomInt(ctx.rng, pLo, pHi)
  const thing = randomPick(ctx.rng, COUNTABLES)

  const visual: ItemVisual = {
    kind: 'equalGroups',
    emoji: thing.emoji,
    name: thing.name,
    groups,
    perGroup,
  }

  if (mode === 'equation') return buildEquation(ctx, groups, perGroup, visual)
  if (mode === 'share') return buildShare(ctx, groups, perGroup, thing, visual)
  if (mode === 'groupCount') return buildGroupCount(ctx, groups, perGroup, thing, visual)
  return buildTimes(ctx, groups, perGroup, visual)
}

/** `一共有几个？` —— 乘法的意义（M2-4.1）。题干只有一句话，物品全靠图 */
function buildTimes(
  ctx: GeneratorContext,
  groups: number,
  perGroup: number,
  visual: ItemVisual,
): GeneratedItem {
  const answer = groups * perGroup

  return {
    signature: `${ctx.kpId}#times:${groups}x${perGroup}`,
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
        // ⭐ 红线：乘法当加法是二年级头号误区，必须占一个选项
        { value: groups + perGroup, tag: 'mul_as_add' },
        { value: (groups + 1) * perGroup, tag: 'mul_extra_group' },
        { value: (groups - 1) * perGroup, tag: 'mul_extra_group' },
      ],
      ctx.rng,
    ),
    answer: String(answer),
    visual,
  }
}

/**
 * `哪个算式说的是这幅图？` —— 乘加互换（M2-4.2）。
 *
 * ⚠️ 正确答案只给 `组数 × 每组几个` 一种写法。
 * 数学上 `4 × 3` 与 `3 × 4` 都对，所以**绝不能拿交换后的写法当干扰项**——
 * 那会把一个正确答案判成错的。干扰项一律在「数错了」和「用错了运算」上做。
 */
function buildEquation(
  ctx: GeneratorContext,
  groups: number,
  perGroup: number,
  visual: ItemVisual,
): GeneratedItem {
  const correct = `${groups} × ${perGroup}`
  const candidates: Array<{ text: string; tag: MisconceptionTag }> = [
    // 把「几个几」理解成了「几加几」
    { text: `${groups} + ${perGroup}`, tag: 'mul_as_add' },
    { text: `${groups + 1} × ${perGroup}`, tag: 'mul_extra_group' },
    { text: `${groups} × ${perGroup + 1}`, tag: 'mul_extra_group' },
  ]

  return {
    signature: `${ctx.kpId}#eq:${groups}x${perGroup}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: '哪个算式说的是这幅图？',
      ttsText: '哪个算式说的是这幅图',
      ttsParts: ['phrase.whichEquationFits'],
    },
    options: buildTextOptions(correct, candidates, ctx.rng),
    answer: correct,
    visual,
  }
}

/** `平均分成 3 份，每份几个？` —— 平均分的意义（M2-9.1） */
function buildShare(
  ctx: GeneratorContext,
  groups: number,
  perGroup: number,
  thing: Countable,
  visual: ItemVisual,
): GeneratedItem {
  const total = groups * perGroup

  return {
    signature: `${ctx.kpId}#share:${total}/${groups}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${total} 个${thing.name}平均分成 ${groups} 份，每份几个？`,
      ttsText: `${total} 个${thing.name}平均分成 ${groups} 份，每份几个`,
      ttsParts: [
        ...num(total),
        'phrase.unitGe',
        thing.clipKey,
        'phrase.equallyIntoParts',
        ...num(groups),
        'phrase.partsEachHowMany',
      ],
    },
    options: buildNumericOptions(
      perGroup,
      [
        // ⭐ 分东西做成了减法
        { value: total - groups, tag: 'div_as_sub' },
        { value: total * groups, tag: 'div_as_mul' },
        // 答成了「分成几份」——问的是每份几个
        { value: groups, tag: 'wrong_operation' },
      ],
      ctx.rng,
    ),
    answer: String(perGroup),
    visual,
  }
}

/**
 * `每份 4 个，能分几份？` —— 包含除（M2-9.1 的另一面）。
 *
 * 与 `share` 是**两种除法**：那个问「每份几个」，这个问「能分几份」。
 * 算式一样、图一样，想的东西不一样，所以两种都要出。
 */
function buildGroupCount(
  ctx: GeneratorContext,
  groups: number,
  perGroup: number,
  thing: Countable,
  visual: ItemVisual,
): GeneratedItem {
  const total = groups * perGroup

  return {
    signature: `${ctx.kpId}#group:${total}/${perGroup}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `${total} 个${thing.name}，${perGroup} 个分一组，能分几组？`,
      ttsText: `${total} 个${thing.name}，${perGroup} 个分一组，能分几组`,
      ttsParts: [
        ...num(total),
        'phrase.unitGe',
        thing.clipKey,
        ...num(perGroup),
        'phrase.perGroupCanMake',
      ],
    },
    options: buildNumericOptions(
      groups,
      [
        { value: total - perGroup, tag: 'div_as_sub' },
        { value: total * perGroup, tag: 'div_as_mul' },
        { value: perGroup, tag: 'wrong_operation' },
      ],
      ctx.rng,
    ),
    answer: String(groups),
    visual,
  }
}
