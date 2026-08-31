/**
 * @file 观察物体 —— M2-5.1 从不同位置观察 · M2-5.2 辨认三视图
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/blockStack.ts  积木堆与三视图的计算
 *
 * ## ⭐ 干扰项就是**另外两个视图**
 *
 * 问「从上面看是哪个」，把从正面看和从侧面看摆进选项——
 * 她要是选了，就精确命中 `view_direction_confusion`（看的方向弄混了）。
 * 换成随机图案做干扰，孩子一眼排除，这道题也就问不出她到底会不会换个方向想。
 *
 * ## 积木堆压得很小（2~3 列 × 2~3 行 × 最多 2 层）
 *
 * 再大在等轴测图上会互相遮挡，而「被挡住的那块也要算」是三年级的空间想象，
 * 二年级这里只要求「换个方向看形状变了」。
 */

import { buildNumericOptions, buildTextOptions } from '@/domain/generators/distractors'
import { GRID } from '@/domain/generators/gridPatterns'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import {
  blockCount,
  frontView,
  isoPieces,
  maxHeight,
  sideView,
  topView,
  type BlockStack,
} from '@/domain/blockStack'
import { encodeCells, sameShape, type Cell } from '@/domain/gridShape'
import type { GeneratedItem, Generator, GeneratorContext, MisconceptionTag } from '@/domain/types'

const VIEWS = ['top', 'front', 'side'] as const
type ViewName = (typeof VIEWS)[number]

const VIEW_LABEL: Record<ViewName, { text: string; clip: string }> = {
  top: { text: '从上面看，是哪个？', clip: 'phrase.viewFromTop' },
  front: { text: '从正面看，是哪个？', clip: 'phrase.viewFromFront' },
  side: { text: '从侧面看，是哪个？', clip: 'phrase.viewFromSide' },
}

/** 画布逻辑尺寸，够摆下 3×3×2 的堆 */
const CANVAS = { w: 210, h: 150 }

/**
 * 生成一道观察物体的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.ask - 问哪个方向：`'top'` | `'front'` | `'side'` | `'any'` 随机。默认 `'any'`
 * @param ctx.params.blockRange - 总块数，默认 `[3, 6]`
 * @returns 题干是积木堆的立体图，选项是三个视图的格子图
 *
 * @example
 * viewFromSide({ kpId: 'M2-5.1', difficulty: 2, params: { ask: 'top' }, rng })
 * // 「从上面看，是哪个？」干扰项是从正面看与从侧面看
 */
export const viewFromSide: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const asked = readEnum(ctx.params, 'ask', [...VIEWS, 'any'] as const, 'any')
  const [lo, hi] = readRange(ctx.params, 'blockRange', [3, 6])

  const stack = makeStack(ctx, lo, hi)
  const views: Record<ViewName, Cell[]> = {
    top: topView(stack),
    front: frontView(stack),
    side: sideView(stack),
  }

  if (readEnum(ctx.params, 'mode', ['pick', 'countView'] as const, 'pick') === 'countView') {
    return buildCountView(ctx, stack, views.top)
  }

  // ⚠️ 要问的那个视图必须与另外两个都不同形，否则会有两个正确答案
  const target = pickDistinctView(ctx, views, asked)
  const label = VIEW_LABEL[target]

  const wrong = VIEWS.filter((v) => v !== target && !sameShape(views[v], views[target]))
  const candidates: Array<{ text: string; tag: MisconceptionTag }> = wrong.map((v) => ({
    text: keyOf(views[v]),
    tag: 'view_direction_confusion',
  }))
  // 不够就补一个「多一块」的视图：形状像但不对
  if (candidates.length < 3) {
    candidates.push({ text: keyOf(addStray(views[target])), tag: 'view_direction_confusion' })
  }

  return {
    signature: `${ctx.kpId}#${target}:${encodeCells(views[target])}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: label.text,
      ttsText: label.text.replace('，是哪个？', '是哪个'),
      ttsParts: [label.clip],
    },
    options: buildTextOptions(keyOf(views[target]), candidates, ctx.rng).map((opt) => ({
      ...opt,
      imageKey: opt.text,
    })),
    answer: keyOf(views[target]),
    // ⭐ 答案**不朗读**：选项是「从这个方向看到的样子」，一个方格图案，没有名字。
    //    那张图会画在反馈里（见 Feedback.tsx），比任何一句描述都直接
    answerSpeech: { parts: [], text: '' },
    visual: {
      kind: 'shapeScene',
      pieces: isoPieces(stack, CANVAS),
      width: CANVAS.w,
      height: CANVAS.h,
    },
  }
}

const keyOf = (cells: readonly Cell[]): string => `grid:${GRID}:${encodeCells(cells)}`

/**
 * `从上面看，有几个小正方形？` —— 同一堆积木的数量问法。
 *
 * ⭐ 干扰项的头一个是**总块数**，而这正是这个知识点的核心区别：
 * 从上面看只看得见每一摞的最顶上那块，堆了两层的位置在俯视图里还是一格。
 * 她答出总块数，就说明还没有「投影」这个概念。
 */
function buildCountView(ctx: GeneratorContext, stack: BlockStack, top: Cell[]): GeneratedItem {
  const answer = top.length
  const total = blockCount(stack)

  return {
    signature: `${ctx.kpId}#topCount:${encodeCells(top)}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: '从上面看，有几个小正方形？',
      ttsText: '从上面看，有几个小正方形',
      ttsParts: ['phrase.topViewHowMany'],
    },
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 数成了积木总块数 —— 没建立「投影」的概念
        { value: total, tag: 'view_direction_confusion' },
        { value: answer + 1, tag: 'count_skip' },
        { value: answer - 1, tag: 'count_skip' },
      ],
      ctx.rng,
    ),
    answer: String(answer),
    visual: {
      kind: 'shapeScene',
      pieces: isoPieces(stack, CANVAS),
      width: CANVAS.w,
      height: CANVAS.h,
    },
  }
}

/** 造一堆积木：2~3 列 × 2~3 行，每格 0~2 层，总数落在范围内 */
function makeStack(ctx: GeneratorContext, lo: number, hi: number): BlockStack {
  for (let attempt = 0; attempt < 30; attempt++) {
    const cols = randomInt(ctx.rng, 2, 3)
    const rows = randomInt(ctx.rng, 2, 3)
    const heights = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () => randomInt(ctx.rng, 0, 2)),
    )
    const stack: BlockStack = { heights, cols, rows }
    const n = blockCount(stack)
    // 至少两层才谈得上「正面看和上面看不一样」
    if (n >= lo && n <= hi && maxHeight(stack) >= 2 && topView(stack).length >= 2) return stack
  }

  // 兜底：一个确定合格的小 L 堆
  return { heights: [[2, 1], [1, 0]], cols: 2, rows: 2 }
}

/**
 * 挑一个与另外两个都不同形的视图。
 *
 * 三个视图恰好都一样（比如 2×2×2 的实心方块）时这道题没有答案，
 * 那种堆会被 `makeStack` 的条件挡掉大部分，这里再兜一层。
 */
function pickDistinctView(
  ctx: GeneratorContext,
  views: Record<ViewName, Cell[]>,
  asked: ViewName | 'any',
): ViewName {
  const distinct = VIEWS.filter((v) => VIEWS.some((o) => o !== v && !sameShape(views[v], views[o])))
  if (asked !== 'any' && distinct.includes(asked)) return asked
  if (distinct.length > 0) return distinct[randomInt(ctx.rng, 0, distinct.length - 1)]!
  return asked === 'any' ? 'top' : asked
}

/** 在视图旁边多加一格，造一个「像但不对」的干扰项 */
function addStray(cells: readonly Cell[]): Cell[] {
  const maxC = Math.max(...cells.map((c) => c[0]))
  const anyRow = cells[0]?.[1] ?? 0
  return [...cells, [maxC + 1, anyRow] as Cell]
}
