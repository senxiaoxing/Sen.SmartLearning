/**
 * @file 轴对称 —— M2-10.1 轴对称图形 · M2-10.2 找对称轴
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/gridPatterns.ts   图案怎么造
 * @see src/domain/generators/gridTransform.ts  平移与旋转，同一批图案
 *
 * 用格子而不是自由图形：折过去能不能重合，孩子可以一格一格自己验证，
 * 不必靠眼力判断。
 */

import { buildTextOptions } from '@/domain/generators/distractors'
import {
  makeAsymmetric,
  makeSymmetric,
  padWrong,
  patternKey,
  toPatternOptions,
  fits,
} from '@/domain/generators/gridPatterns'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { encodeCells, isSymmetricX, isSymmetricY, rotate90, type Cell } from '@/domain/gridShape'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['symmetry', 'axis'] as const

/**
 * 生成一道轴对称的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'symmetry'` 哪个图形是轴对称的（M2-10.1）
 *                        | `'axis'` 沿哪条线对称（M2-10.2）。默认 `'symmetry'`
 * @param ctx.params.cellRange - 图案有几格，默认 `[4, 6]`
 *
 * @example
 * gridSymmetry({ kpId: 'M2-10.1', difficulty: 2, params: {}, rng })
 * // 四个方格图案，只有一个左右折过去能重合
 */
export const gridSymmetry: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'symmetry')
  const [lo, hi] = readRange(ctx.params, 'cellRange', [4, 6])
  const half = Math.max(1, Math.round(randomInt(ctx.rng, lo, hi) / 2))

  return mode === 'axis' ? buildAxis(ctx, half) : buildSymmetry(ctx, half)
}

/** `哪个图形是轴对称的？` */
function buildSymmetry(ctx: GeneratorContext, half: number): GeneratedItem {
  const correct = makeSymmetric(ctx.rng, half)
  const wrong: Cell[][] = []
  const seen = new Set<string>([encodeCells(correct)])

  for (let attempt = 0; attempt < 30 && wrong.length < 3; attempt++) {
    const cand = makeAsymmetric(ctx.rng, half)
    const k = encodeCells(cand)
    if (seen.has(k) || !fits(cand)) continue
    seen.add(k)
    wrong.push(cand)
  }
  padWrong(wrong, seen)

  return {
    signature: `${ctx.kpId}#sym:${encodeCells(correct)}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: '哪个图形是轴对称的？',
      ttsText: '哪个图形是轴对称的',
      ttsParts: ['phrase.whichIsSymmetric'],
    },
    options: toPatternOptions(ctx.rng, correct, wrong, 'symmetry_axis_wrong'),
    answer: patternKey(correct),
  }
}

/**
 * `这个图形沿哪条线对称？` —— 选项是「竖着的线 / 横着的线」。
 *
 * ⚠️ 图案必须**只在一个方向对称**：两个方向都对称的话两个选项都是对的，
 * 那道题孩子怎么答都可能被判错。
 * `makeSymmetric` 造的是左右对称，转 90° 就成了上下对称。
 */
function buildAxis(ctx: GeneratorContext, half: number): GeneratedItem {
  const vertical = ctx.rng() < 0.5

  for (let attempt = 0; attempt < 20; attempt++) {
    const base = makeSymmetric(ctx.rng, half)
    const cand = vertical ? base : rotate90(base)
    if (isSymmetricX(cand) !== isSymmetricY(cand)) return axisItem(ctx, cand, vertical)
  }

  // 兜底：一个确定只左右对称的 T 形
  const tShape: Cell[] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ]
  return axisItem(ctx, vertical ? tShape : rotate90(tShape), vertical)
}

function axisItem(ctx: GeneratorContext, cells: Cell[], vertical: boolean): GeneratedItem {
  const correct = vertical ? '竖着的线' : '横着的线'
  const wrong = vertical ? '横着的线' : '竖着的线'

  return {
    signature: `${ctx.kpId}#axis:${encodeCells(cells)}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: '这个图形沿哪条线对称？',
      ttsText: '这个图形沿哪条线对称',
      ttsParts: ['phrase.whichAxis'],
    },
    options: buildTextOptions(
      correct,
      [
        { text: wrong, tag: 'symmetry_axis_wrong' },
        { text: '斜着的线', tag: 'symmetry_axis_wrong' },
        { text: '没有对称轴', tag: 'symmetry_axis_wrong' },
      ],
      ctx.rng,
    ),
    answer: correct,
    visual: { kind: 'figure', imageKey: patternKey(cells) },
  }
}
