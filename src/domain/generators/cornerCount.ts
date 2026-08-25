/**
 * @file 数角 —— M2-3.1 认识角（顶点与边）· M2-3.4 数图形中角的个数
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/PlaneShape.tsx  图形怎么画
 * @see src/components/shape/ShapeScene.tsx  多个图形怎么摆
 *
 * ⭐ **零新增图形**：认角和数角全部用一年级就有的平面图形
 * （三角形 3 个角、正方形和长方形各 4 个、圆 0 个）。
 *
 * 教材里「认识角」正是从实物和图形中找角开始的，不是先画一个孤零零的角。
 * 而 `AngleShape` 那种单独的角留给 M2-3.2 / M2-3.3——
 * 那两个知识点要比较角的大小，非得把角单独拎出来不可。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt, randomPick, shuffle } from '@/domain/generators/rng'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  PlaneShapeKind,
  ScenePiece,
} from '@/domain/types'

const MODES = ['single', 'total'] as const

/** 每种平面图形有几个角。⚠️ 圆是 0 —— 「没有角」也要能被问到 */
const CORNERS: Record<PlaneShapeKind, number> = {
  triangle: 3,
  square: 4,
  rect: 4,
  circle: 0,
}

const SHAPE_NAMES: Record<PlaneShapeKind, string> = {
  triangle: '三角形',
  square: '正方形',
  rect: '长方形',
  circle: '圆',
}

/** 有角的图形。数总角数时不摆圆——0 个角的图形混进去只是干扰视线 */
const CORNERED: PlaneShapeKind[] = ['triangle', 'square', 'rect']

/**
 * 生成一道数角的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'single'` 这个图形有几个角（M2-3.1）
 *                        | `'total'` 一共有几个角（M2-3.4）。默认 `'single'`
 * @param ctx.params.countRange - `total` 模式摆几个图形，默认 `[2, 3]`
 * @returns 含 4 个选项的题目
 *
 * @example
 * cornerCount({ kpId: 'M2-3.1', difficulty: 1, params: {}, rng })
 * // 一个三角形，问「有几个角」：3 正确 / 4 与 2 是 count_skip
 */
export const cornerCount: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'single')
  return mode === 'total' ? buildTotal(ctx) : buildSingle(ctx)
}

/** `这个图形有几个角？` —— 一个图形，含圆（0 个角） */
function buildSingle(ctx: GeneratorContext): GeneratedItem {
  const kinds = Object.keys(CORNERS) as PlaneShapeKind[]
  const kind = randomPick(ctx.rng, kinds)
  const answer = CORNERS[kind]

  const candidates: NumericDistractor[] = [
    { value: answer + 1, tag: 'count_skip' },
    { value: answer - 1, tag: 'count_skip' },
    { value: answer + 2, tag: 'count_skip' },
  ]

  return {
    signature: `${ctx.kpId}#single:${kind}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${SHAPE_NAMES[kind]}有几个角？`,
      ttsText: `${SHAPE_NAMES[kind]}有几个角`,
      // 图形名片段的 key 与 kind 同名（word.square / word.triangle…），
      // 与 shapes.ts 用的是同一批，零新增
      ttsParts: [`word.${kind}`, 'phrase.howManyCorners'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    visual: { kind: 'figure', imageKey: `plane:${kind}` },
  }
}

/**
 * `一共有几个角？` —— 摆几个图形，数总数。
 *
 * ⭐ 干扰项里恒有**图形的个数**：摆 3 个图形共 11 个角时，「3」是个很像样的
 * 错误答案——她数的是「有几个图形」而不是「有几个角」。
 * 那正是这道题要分辨的东西。
 */
function buildTotal(ctx: GeneratorContext): GeneratedItem {
  const [lo, hi] = readRange(ctx.params, 'countRange', [2, 3])
  const count = randomInt(ctx.rng, lo, hi)
  const kinds = Array.from({ length: count }, () => randomPick(ctx.rng, CORNERED))
  const answer = kinds.reduce((sum, k) => sum + CORNERS[k], 0)

  // 一行摆开，间距足够不重叠。坐标在这里算好，组件只负责画
  const step = 62
  const pieces: ScenePiece[] = shuffle(ctx.rng, kinds).map((shape, i) => ({
    shape,
    x: 6 + i * step,
    y: 8,
    size: 48,
  }))

  const candidates: NumericDistractor[] = [
    // ⭐ 数成了「有几个图形」
    { value: count, tag: 'count_skip' },
    { value: answer - 1, tag: 'count_skip' },
    { value: answer + 1, tag: 'count_skip' },
  ]

  return {
    signature: `${ctx.kpId}#total:${kinds.join('.')}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: '一共有几个角？',
      ttsText: '一共有几个角',
      ttsParts: ['phrase.totalCornersHowMany'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
    visual: {
      kind: 'shapeScene',
      pieces,
      width: 6 + count * step,
      height: 64,
    },
  }
}

/** 供测试与模板校验：某个平面图形有几个角 */
export function cornersOf(kind: PlaneShapeKind): number {
  return CORNERS[kind]
}
