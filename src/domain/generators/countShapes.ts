/**
 * @file 数图形生成器 —— 数积木块数（M7.1）· 数某种图形有几个（M7.4）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/blockLayouts.ts  积木摆法
 * @see src/components/shape/ShapeScene.tsx    画面怎么画
 *
 * ## ⭐ 这类题是 M7 题量的主要来源
 *
 * 「哪个是正方体」只有 4 种问法（4 个图形），一轮 10 题里排到三次就必然重复。
 * 而「摆 N 块积木问一共几块」「摆一堆混合图形问三角形有几个」
 * 的组合是几十上百种，同时练的还是同一个单元的内容。
 *
 * 上机反馈里「重复的题目有点多」，M7 这两条模板是当时最严重的两个。
 */

import { LAYOUTS, layoutBlocks } from '@/domain/generators/blockLayouts'
import { buildNumericOptions } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type { Generator, ScenePiece } from '@/domain/types'

/** 画布逻辑尺寸与每块边长 */
const CANVAS = { w: 240, h: 130 }
const PIECE = 34

const PLANES = ['square', 'rect', 'triangle', 'circle'] as const

const PLANE_NAMES: Record<string, string> = {
  square: '正方形',
  rect: '长方形',
  triangle: '三角形',
  circle: '圆',
}

/**
 * 生成一道数图形的题。
 *
 * @param ctx.params.mode - `'blocks'` 数积木（M7.1 备选题型）| `'mixed'` 数某种图形（M7.4）
 * @param ctx.params.countRange - 总数区间
 *
 * @example
 * countShapes({ kpId: 'M7.1', difficulty: 1, params: { mode: 'blocks', countRange: [3, 6] }, rng })
 * // 摆出 5 块积木时：
 * //   5 → 正确
 * //   4 / 6 → count_skip  漏数或多数了一块
 */
export const countShapes: Generator = ({ kpId, difficulty, params, rng }) => {
  const mode = readEnum(params, 'mode', ['blocks', 'mixed'] as const, 'blocks')
  const [lo, hi] = readRange(params, 'countRange', [3, 6])
  const total = randomInt(rng, lo, hi)

  return mode === 'blocks'
    ? blocksItem(kpId, difficulty, total, rng)
    : mixedItem(kpId, difficulty, total, rng)
}

/** 数积木：一堆正方体，问一共几块 */
function blocksItem(
  kpId: string,
  difficulty: 1 | 2 | 3,
  total: number,
  rng: () => number,
): ReturnType<Generator> {
  // 一排放不下 6 块以上，块数多时排除 row
  const usable = total > 5 ? LAYOUTS.filter((l) => l !== 'row') : LAYOUTS
  const layout = usable[Math.floor(rng() * usable.length)] ?? 'row'
  const pieces = layoutBlocks(total, layout, PIECE, CANVAS, rng)

  return {
    signature: `${kpId}-count#blocks:${total}:${layout}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: '一共有几块积木？',
      ttsText: '一共有几块积木',
      ttsParts: ['phrase.howManyBlocks'],
    },
    options: buildNumericOptions(
      total,
      [
        { tag: 'count_skip', value: total - 1 },
        { tag: 'count_skip', value: total + 1 },
        { tag: 'count_skip', value: Math.max(1, total - 2) },
      ],
      rng,
    ),
    answer: String(total),
    visual: { kind: 'shapeScene', pieces, width: CANVAS.w, height: CANVAS.h },
  }
}

/**
 * 数某一种图形有几个。
 *
 * 被问的那种至少出现 2 个、且不是全部——**问「有几个三角形」时
 * 图里只有三角形**，这道题就退化成数总数，跟 `blocks` 模式重复了。
 */
function mixedItem(
  kpId: string,
  difficulty: 1 | 2 | 3,
  total: number,
  rng: () => number,
): ReturnType<Generator> {
  const target = PLANES[Math.floor(rng() * PLANES.length)] ?? 'triangle'
  const others = PLANES.filter((p) => p !== target)

  const targetCount = randomInt(rng, 2, Math.max(2, total - 1))
  const shapes: string[] = [
    ...Array.from({ length: targetCount }, () => target),
    ...Array.from(
      { length: Math.max(1, total - targetCount) },
      () => others[Math.floor(rng() * others.length)] ?? 'circle',
    ),
  ]

  const scattered = shuffle(rng, shapes)
  const perRow = Math.ceil(scattered.length / 2)
  const pieces: ScenePiece[] = scattered.map((shape, i) => ({
    shape,
    x: 12 + (i % perRow) * (PIECE + 10),
    y: 14 + Math.floor(i / perRow) * (PIECE + 14),
    size: PIECE,
  }))

  const name = PLANE_NAMES[target] ?? '图形'

  return {
    signature: `${kpId}-count#mixed:${target}:${targetCount}of${scattered.length}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `有几个${name}？`,
      ttsText: `图里有几个${name}`,
      // 图形名片段与 kind 同名（word.triangle…），见 voiceManifest WORDS 段
      ttsParts: ['phrase.howManyInPicture', `word.${target}`],
    },
    options: buildNumericOptions(
      targetCount,
      [
        // 数成了总数 —— 没看清要数的是哪一种
        { tag: 'count_skip', value: scattered.length },
        { tag: 'count_skip', value: targetCount - 1 },
        { tag: 'count_skip', value: targetCount + 1 },
      ],
      rng,
    ),
    answer: String(targetCount),
    visual: { kind: 'shapeScene', pieces, width: CANVAS.w, height: CANVAS.h },
  }
}
