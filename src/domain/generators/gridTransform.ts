/**
 * @file 平移与旋转 —— M2-10.3 平移 · M2-10.4 旋转
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/gridPatterns.ts  图案怎么造
 * @see src/domain/generators/gridSymmetry.ts  轴对称，同一批图案
 *
 * ## ⭐ 平移只走横向或纵向
 *
 * 教材的平移就是「向右移几格」「向下移几格」，不斜着走。
 * 斜移要同时数两个方向，而这个知识点考的是「移动」这件事本身。
 *
 * ## 图案必须不对称
 *
 * 旋转题拿对称图案出，转过来和原来一模一样——那道题没有答案。
 * 平移题也一样：对称图案挪一格看不出「往哪边挪的」。
 */

import { buildNumericOptions } from '@/domain/generators/distractors'
import {
  GRID,
  makeAsymmetric,
  padWrong,
  patternKey,
  toPatternOptions,
  fits,
} from '@/domain/generators/gridPatterns'
import { readEnum, readItemType, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import {
  bbox,
  encodeCells,
  mirrorX,
  normalize,
  rotate90,
  translate,
  type Cell,
} from '@/domain/gridShape'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['translate', 'rotate'] as const

/**
 * 生成一道平移或旋转的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'translate'` 移了几格（M2-10.3）
 *                        | `'rotate'` 转过来是哪个（M2-10.4）。默认 `'translate'`
 * @param ctx.params.cellRange - 图案有几格，默认 `[3, 5]`
 *
 * @example
 * gridTransform({ kpId: 'M2-10.3', difficulty: 2, params: {}, rng })
 * // 图上画出原位置（虚线）与新位置，问「向右移了几格」
 */
export const gridTransform: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'translate')
  const [lo, hi] = readRange(ctx.params, 'cellRange', [3, 5])
  const half = Math.max(1, Math.round(randomInt(ctx.rng, lo, hi) / 2))

  return mode === 'rotate' ? buildRotate(ctx, half) : buildTranslate(ctx, half)
}

/** `向右移了几格？` */
function buildTranslate(ctx: GeneratorContext, half: number): GeneratedItem {
  const shape = makeAsymmetric(ctx.rng, half)
  const { w, h } = bbox(shape)

  // 只走横向或纵向，且移完还在网格里
  const horizontal = ctx.rng() < 0.5
  const room = horizontal ? GRID - w : GRID - h
  const step = randomInt(ctx.rng, 1, Math.max(1, room))
  const moved = horizontal ? translate(shape, step, 0) : translate(shape, 0, step)

  const dirText = horizontal ? '右' : '下'

  return {
    signature: `${ctx.kpId}#move:${encodeCells(shape)}:${horizontal ? 'x' : 'y'}${step}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: `向${dirText}移了几格？`,
      ttsText: `向${dirText}移了几格`,
      ttsParts: [horizontal ? 'phrase.movedRight' : 'phrase.movedDown'],
    },
    options: buildNumericOptions(
      step,
      [
        { value: step + 1, tag: 'off_by_one' },
        { value: step - 1, tag: 'off_by_one' },
        // 数成了图形自己的宽度或高度
        { value: horizontal ? w : h, tag: 'off_by_one' },
      ],
      ctx.rng,
    ),
    answer: String(step),
    visual: {
      kind: 'figure',
      imageKey: `gridpair:${GRID}:${encodeCells(shape)}:${encodeCells(moved)}`,
    },
  }
}

/**
 * `把它转一下，会变成哪个？`
 *
 * ⚠️ 干扰项取**翻过来的**和**转两次的**：这两个与转一次的结果不同，
 * 但看起来都「像是动过了」。摆一个完全无关的图案进去，
 * 孩子一眼就能排除，这道题也就问不出她到底会不会转。
 */
function buildRotate(ctx: GeneratorContext, half: number): GeneratedItem {
  const shape = makeAsymmetric(ctx.rng, half)
  const correct = rotate90(shape)

  const seen = new Set<string>([encodeCells(correct)])
  const wrong: Cell[][] = []
  for (const cand of [mirrorX(shape), rotate90(rotate90(shape)), normalize(shape)]) {
    const k = encodeCells(cand)
    if (seen.has(k) || !fits(cand)) continue
    seen.add(k)
    wrong.push(cand)
  }
  padWrong(wrong, seen)

  return {
    signature: `${ctx.kpId}#rot:${encodeCells(shape)}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: '把它转一下，会变成哪个？',
      ttsText: '把它转一下，会变成哪个',
      ttsParts: ['phrase.whichAfterTurn'],
    },
    options: toPatternOptions(ctx.rng, correct, wrong.slice(0, 3), 'symmetry_axis_wrong'),
    answer: patternKey(correct),
    visual: { kind: 'figure', imageKey: patternKey(shape) },
  }
}
