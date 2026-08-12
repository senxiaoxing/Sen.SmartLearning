/**
 * @file 分与合生成器 —— 覆盖 M3.1~M3.3 分与合、M1.9 数的组成
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M3 分与合
 *
 * ⭐⭐ M3.3「10 的分与合」是全局唯一的双关键节点：
 * 凑十法（M5.1）与破十法（M6.1）都建立在它之上，必须练到条件反射级别
 * （`targetMastery: 0.95`，`estimatedItems: 60`）。
 * 孩子在 M5/M6 大面积出错时，调度器会无条件回退到这里。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['split', 'combine', 'teen'] as const

/**
 * 生成一道分与合题目。
 *
 * 三种模式：
 * - **`split`（默认）**：`5 可以分成 2 和 ?` —— 分解，M3.1~M3.3 主力题型
 * - **`combine`**：`3 和 4 合起来是 ?` —— 合成，同一知识点的反向练习
 * - **`teen`**：`13 里面有 1 个十和 ? 个一` —— 数的组成，M1.9
 *
 * 干扰项按认知误区构造：
 *
 * | 选项 | 误区 | 孩子的想法 |
 * |---|---|---|
 * | 总数本身 | `whole_part_confusion` | 没理解「分成」，把整体当成了部分 |
 * | 已知的那部分 | `whole_part_confusion` | 把已知部分重复说了一遍 |
 * | 两部分相加 | `op_confusion` | 把分解做成了合成 |
 *
 * @param ctx - 生成上下文
 * @param ctx.params.totalRange - 总数取值区间。M3.1 为 `[2,5]`、M3.2 为 `[6,10]`、M3.3 为 `[10,10]`
 * @param ctx.params.mode - `'split'` | `'combine'` | `'teen'`，默认 `'split'`
 *
 * @example
 * decomposition({ kpId: 'M3.3', difficulty: 2, params: { totalRange: [10, 10] }, rng })
 * // '10 可以分成 4 和 ?'  → 6 正确 / 10 whole_part_confusion / 4 whole_part_confusion / 14 op_confusion
 */
export const decomposition: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'split')
  if (mode === 'teen') return buildTeenItem(ctx)

  const [minTotal, maxTotal] = readRange(ctx.params, 'totalRange', [2, 10])
  const total = randomInt(ctx.rng, minTotal, maxTotal)
  // 已知部分取 1 ~ total-1，保证两部分都非零（0 的分解对一年级无意义）
  const known = randomInt(ctx.rng, 1, Math.max(1, total - 1))
  const answer = total - known

  return mode === 'combine'
    ? buildCombineItem(ctx, known, answer, total)
    : buildSplitItem(ctx, total, known, answer)
}

/** 分解：`10 可以分成 4 和 ?` */
function buildSplitItem(
  ctx: GeneratorContext,
  total: number,
  known: number,
  answer: number,
): GeneratedItem {
  const candidates: NumericDistractor[] = [
    { value: total, tag: 'whole_part_confusion' },
    { value: known, tag: 'whole_part_confusion' },
    { value: total + known, tag: 'op_confusion' },
  ]

  return {
    signature: `${ctx.kpId}#split-${total}-${known}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${total} 可以分成 ${known} 和 ?`,
      ttsText: `${total} 可以分成 ${known} 和几`,
      ttsParts: [...num(total), 'phrase.canSplitInto', ...num(known), 'phrase.andWhat'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}

/** 合成：`4 和 6 合起来是 ?` —— 分解的反向，帮助建立双向联系 */
function buildCombineItem(
  ctx: GeneratorContext,
  partA: number,
  partB: number,
  total: number,
): GeneratedItem {
  const candidates: NumericDistractor[] = [
    { value: Math.abs(partA - partB), tag: 'op_confusion' },
    { value: partA, tag: 'whole_part_confusion' },
    { value: partB, tag: 'whole_part_confusion' },
  ]

  return {
    signature: `${ctx.kpId}#combine-${partA}-${partB}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${partA} 和 ${partB} 合起来是 ?`,
      ttsText: `${partA} 和 ${partB} 合起来是几`,
      ttsParts: [...num(partA), 'op.and', ...num(partB), 'phrase.togetherIsWhat'],
    },
    options: buildNumericOptions(total, candidates, ctx.rng),
    answer: String(total),
  }
}

/**
 * 数的组成（M1.9）：`13 里面有 1 个十和 ? 个一`
 *
 * 这是位值概念的起点，也是凑十法与破十法的另一个前置。
 * 孩子若答 13 或 3 以外的值，说明还没建立「十几 = 10 + 几」的分解模型。
 */
function buildTeenItem(ctx: GeneratorContext): GeneratedItem {
  const [minTotal, maxTotal] = readRange(ctx.params, 'totalRange', [11, 19])
  const total = randomInt(ctx.rng, minTotal, maxTotal)
  const answer = total % 10

  const candidates: NumericDistractor[] = [
    { value: total, tag: 'whole_part_confusion' },
    { value: 10, tag: 'whole_part_confusion' },
    { value: total - 1, tag: 'off_by_one' },
  ]

  return {
    signature: `${ctx.kpId}#teen-${total}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${total} 里面有 1 个十和 ? 个一`,
      ttsText: `${total} 里面有 1 个十和几个一`,
      ttsParts: [...num(total), 'phrase.hasOneTenAnd'],
    },
    options: buildNumericOptions(answer, candidates, ctx.rng),
    answer: String(answer),
  }
}
