/**
 * @file 推理生成器 —— 覆盖 M2-15.1 简单推理 · M2-15.2 稍复杂推理
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M2-15 数学广角·推理
 *
 * ## ⭐ 两条铁律
 *
 * **① 答案必须唯一。** 出题方式是先把队排好、再倒推线索，而不是先给线索再求解——
 * 后者需要在生成器里写个求解器，还可能解不唯一，
 * 而一道有两个答案的推理题，孩子选对了照样被判错。
 *
 * **② 干扰项必须是「只看第一条线索会选的那个」。** 推理题的全部难点就在
 * 「把条件合起来看」，若干扰项是随便挑的另一只动物，孩子蒙也有三分之一蒙对，
 * 而真正要抓的错误——听到第一条就下结论——压根没机会发生。
 * 这正是 `logic_first_only` 存在的理由。
 *
 * 动物名复用 `COUNTABLES` 的现成片段，本文件只新增序数与句式。
 */

import { COUNTABLES, type Countable } from '@/domain/generators/countables'
import { readNumber } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type { ClipKey } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 序数的读法与片段。推理题最多排到第四 */
const ORDINALS = [
  { name: '第一', clip: 'ord.first' },
  { name: '第二', clip: 'ord.second' },
  { name: '第三', clip: 'ord.third' },
  { name: '第四', clip: 'ord.fourth' },
] as const

/**
 * 生成一道推理题。
 *
 * 线索一律是否定式「谁不排第几」，且**除正确答案外每只动物各一条**——
 * 这样合起来恰好把其他所有位置排除干净，答案唯一。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.animals - 队里几只动物。3 只对应 M2-15.1（两条线索），
 *                             4 只对应 M2-15.2（三条线索）。默认 3
 * @returns 选项数等于动物数的题目
 *
 * @example
 * logicReasoning({ kpId: 'M2-15.1', difficulty: 2, params: {}, rng })
 * // 「小狗不排第一，小兔子不排第一。谁排第一？」
 * //   小猫   → 正确
 * //   小兔子 → logic_first_only  只听了第一条，在剩下两只里挑错了
 */
export const logicReasoning: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const animalCount = readNumber(ctx.params, 'animals', 3)

  const creatures = COUNTABLES.filter((c) => c.kind === 'creature')
  const lineup = shuffle(ctx.rng, [...creatures]).slice(0, animalCount)
  const askRank = randomInt(ctx.rng, 0, animalCount - 1)
  const answer = lineup[askRank]!

  // 除答案外，每只都来一条「不排第 k」。少一条答案就不唯一了
  const clues = lineup.filter((a) => a !== answer)
  const ordinal = ORDINALS[askRank]!

  const clueText = clues.map((who) => `${who.name}不排${ordinal.name}`).join('，')
  const clueParts: ClipKey[] = clues.flatMap((who) => [who.clipKey, 'phrase.isNotAt', ordinal.clip])

  return {
    signature: `${ctx.kpId}#${lineup.map((a) => a.name).join('')}@${askRank}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: `${lineup.map((a) => a.emoji).join(' ')} 排成一排。${clueText}。谁排${ordinal.name}？`,
      ttsText: `小动物们排成一排。${clueText}。谁排${ordinal.name}`,
      ttsParts: [
        'phrase.animalsLineUp',
        ...clueParts,
        'phrase.whoRanksAt',
        ordinal.clip,
      ],
    },
    options: buildOptions(ctx, lineup, answer, clues[0]!),
    answer: answer.emoji,
  }
}

/**
 * 选项是队里的每一只动物。
 *
 * ⚠️ 只有「只看第一条线索会选的那个」标 `logic_first_only`，其余错误项标
 * `combination_missed`（线索没读完就随手挑了一个）。
 * 全标 first_only 会让统计虚高，把随便蒙的也算成「只看了一条」，
 * 而这两种情况的补救不一样：前者要教她读完再答，后者是压根没在推理。
 */
function buildOptions(
  ctx: GeneratorContext,
  lineup: Countable[],
  answer: Countable,
  firstClue: Countable,
): ItemOption[] {
  // 只看第一条线索时，她能排除的只有 firstClue 那一只，
  // 于是在剩下的里挑——挑错最可能落在下一只没被提到的动物身上
  const firstOnlyPick = lineup.find((a) => a !== answer && a !== firstClue) ?? firstClue

  return shuffle(
    ctx.rng,
    lineup.map((animal) => ({
      animal,
      isCorrect: animal === answer,
      tag:
        animal === answer
          ? undefined
          : animal === firstOnlyPick
            ? ('logic_first_only' as const)
            : ('combination_missed' as const),
    })),
  ).map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.animal.emoji,
    caption: o.animal.name,
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))
}
