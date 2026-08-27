/**
 * @file 量长度 —— M2-1.1 认识厘米 · M2-1.2 用尺子量 · M2-1.5 认识线段
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/RulerShape.tsx  尺子与线段怎么画
 * @see src/domain/rulerGeometry.ts  刻度与物体的坐标
 *
 * ## ⭐ 一半的题起点不在 0
 *
 * `ruler_start_wrong`（把物体左端对在刻度 1 上、直接读右端的数）是这个单元
 * 唯一要诊断的东西，而**物体从 0 开始量的题根本产生不了这个错误**——
 * 那时右端的数恰好就是答案，干扰项会等于正确答案被剔除。
 *
 * 所以起点是掷出来的，且掷中非 0 时那道题必然带上「直接读右端」这个选项。
 *
 * ## 难度三档不是「换更长的物体」
 *
 * 1 从 0 开始量（先学会读刻度）→ 2 起点随机（真正的考点）→ 3 起点必不为 0。
 * 与本项目其他生成器一样：难度是**换一种更难的思维**，不是换个更大的数。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readItemType, readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import { MAX_TICKS, optionRulerTicks } from '@/domain/rulerGeometry'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  ItemOption,
  MisconceptionTag,
} from '@/domain/types'

const MODES = ['read', 'pick'] as const
const STARTS = ['zero', 'any', 'shifted'] as const
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/**
 * 生成一道量长度的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'read'` 用尺子读出长度（M2-1.2）
 *                        | `'pick'` 哪条线段长 N 厘米（M2-1.5）。默认 `'read'`
 * @param ctx.params.start - `'zero'` 恒从 0 量 | `'shifted'` 恒不从 0 量
 *                         | `'any'` 掷。默认 `'any'`
 * @param ctx.params.lengthRange - 物体长度范围，默认 `[3, 8]`
 * @returns 含 4 个选项的题目
 *
 * @example
 * measureLength({ kpId: 'M2-1.2', difficulty: 2, params: { start: 'shifted' }, rng })
 * // 物体从刻度 1 到 6：
 * //   5 → 正确
 * //   6 → ruler_start_wrong  直接读了右端的数
 */
export const measureLength: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'read')
  const [lo, hi] = readRange(ctx.params, 'lengthRange', [3, 8])
  const lengthCm = randomInt(ctx.rng, lo, hi)

  if (mode === 'pick') return buildPick(ctx, lengthCm, lo, hi)
  return buildRead(ctx, lengthCm)
}

/** `这个有多长？` —— 尺子上量 */
function buildRead(ctx: GeneratorContext, lengthCm: number): GeneratedItem {
  const startMode = readEnum(ctx.params, 'start', STARTS, 'any')
  const maxTick = MAX_TICKS

  // 起点：'zero' 恒 0；'shifted' 恒 ≥1；'any' 掷一半
  const maxStart = maxTick - lengthCm
  const start =
    startMode === 'zero'
      ? 0
      : startMode === 'shifted'
        ? randomInt(ctx.rng, 1, Math.max(1, maxStart))
        : randomInt(ctx.rng, 0, Math.max(0, maxStart))
  const end = start + lengthCm

  const candidates: NumericDistractor[] = []
  // ⭐ 起点不为 0 时，「直接读右端」才是个真实且不同于答案的错误
  if (start > 0) candidates.push({ value: end, tag: 'ruler_start_wrong' })
  candidates.push(
    { value: lengthCm + 1, tag: 'off_by_one' },
    { value: lengthCm - 1, tag: 'off_by_one' },
    { value: start, tag: 'ruler_start_wrong' },
  )

  return {
    signature: `${ctx.kpId}#read:${start}-${end}`,
    kpId: ctx.kpId,
    type: readItemType(ctx.params, 'input_number'),
    difficulty: ctx.difficulty,
    stem: {
      text: '它有多长？（厘米）',
      ttsText: '它有多长',
      ttsParts: ['phrase.howLongIsIt'],
    },
    options: buildNumericOptions(lengthCm, candidates, ctx.rng),
    answer: String(lengthCm),
    visual: { kind: 'figure', imageKey: `ruler:${maxTick}:${start}:${end}` },
  }
}

/**
 * `哪条线段长 5 厘米？` —— 选项是几条长短不同的线段，**每条都躺在尺子上**。
 *
 * ⭐ **必须配尺子，否则这道题无解。**
 *
 * 第一版画的是四条光秃秃的线段。孩子没有任何办法知道哪条是 5 厘米——
 * 屏幕上的长度既不是真实厘米数，还会随设备变；更糟的是每个选项按自己的
 * 长度定画布、再被缩放到同样宽的卡片里，四条线**看起来几乎一样长**。
 *
 * 配上尺子，「哪条长 5 厘米」就变回它本来的样子：数格子。
 * 这也正是 M2-1.5「认识线段·**量**画线段」要她做的事。
 *
 * 四条共用同一把尺子（{@link optionRulerTicks}），四个选项的画布因此等宽，
 * 缩放比例一致，线段的长短差别才落在眼睛里。
 *
 * ⚠️ 干扰线段的长度必须**互不相同且都不等于答案**，
 * 否则会出现两条一样长的线段，孩子选了另一条会被判错。
 */
function buildPick(
  ctx: GeneratorContext,
  lengthCm: number,
  lo: number,
  hi: number,
): GeneratedItem {
  // 在允许范围里挑三个不同的错误长度，不够就往外扩。
  // ⚠️ 上限留一格给尺子：线段占满整把尺子时右端点压在最后一条刻度线上，看不清
  const pool = Array.from({ length: MAX_TICKS - 1 }, (_, i) => i + 1).filter(
    (n) => n !== lengthCm && n >= Math.max(1, lo - 2) && n <= Math.min(MAX_TICKS - 1, hi + 2),
  )
  const wrong = shuffle(ctx.rng, pool).slice(0, 3)

  const picked = shuffle(ctx.rng, [
    { cm: lengthCm, isCorrect: true, tag: undefined as MisconceptionTag | undefined },
    ...wrong.map((cm) => ({
      cm,
      isCorrect: false,
      // 选了别的长度，说明「1 厘米有多长」还没建立起来
      tag: 'unit_sense_weak' as MisconceptionTag,
    })),
  ])

  const ticks = optionRulerTicks(picked.map((o) => o.cm))

  const options: ItemOption[] = picked.map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: `segment:${o.cm}:${ticks}`,
    imageKey: `segment:${o.cm}:${ticks}`,
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))

  return {
    signature: `${ctx.kpId}#pick:${lengthCm}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: `哪条线段长 ${lengthCm} 厘米？`,
      ttsText: `哪条线段长 ${lengthCm} 厘米`,
      ttsParts: ['phrase.whichSegmentIs', ...num(lengthCm), 'unit.cm'],
    },
    options,
    answer: `segment:${lengthCm}:${ticks}`,
  }
}
