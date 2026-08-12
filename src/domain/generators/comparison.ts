/**
 * @file 比大小生成器 —— 覆盖 M1.5 比多少、M1.6 比大小、M1.8 20以内比大小
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M1 数感与计数
 *
 * `symbol_reversed`（大于小于号方向写反）是一年级最顽固的错误之一，
 * 且孩子往往「知道谁大，但符号写反」——诊断出这一点很关键：
 * 它意味着要练符号书写，而不是回去练数感。
 */

import { buildTextOptions } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['symbol', 'which'] as const

/**
 * 符号选项的读法。屏幕上是符号，念出来的是它的名字——
 * 答错反馈「答案是 大于号」与错题本点读用，TTS 念裸符号「>」全凭运气。
 */
const SYMBOL_SPEECH: Record<string, { clip: string; spoken: string }> = {
  '>': { clip: 'op.greaterSign', spoken: '大于号' },
  '<': { clip: 'op.lessSign', spoken: '小于号' },
  '=': { clip: 'op.equalsSign', spoken: '等于号' },
}

/**
 * 生成一道比大小题目。
 *
 * 两种模式：
 * - **`symbol`（默认）**：`7 ○ 5` 选 `>` `<` `=` —— M1.6/M1.8 主力题型
 * - **`which`**：`哪个数更大？` 直接选数字 —— M1.5「比多少」，绕开符号，只考数感
 *
 * 拆成两种模式的原因：孩子答错 `symbol` 题时，无法区分是「不知道谁大」
 * 还是「知道谁大但符号写反」。用 `which` 模式复测就能分离这两种情况——
 * 前者要回去练数感，后者只需练符号，补救路径完全不同。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.range - 参与比较的数值区间。M1.6 为 `[1,10]`、M1.8 为 `[1,20]`
 * @param ctx.params.mode - `'symbol'` | `'which'`，默认 `'symbol'`
 * @param ctx.params.equalRate - 出现相等题目的概率 0~1，默认 0.15
 *
 * @example
 * comparison({ kpId: 'M1.6', difficulty: 2, params: { range: [1, 10] }, rng })
 * // '7 ○ 5'  → '>' 正确 / '<' symbol_reversed / '=' off_by_one
 */
export const comparison: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'symbol')
  const [min, max] = readRange(ctx.params, 'range', [1, 10])

  const a = randomInt(ctx.rng, min, max)
  // 15% 概率出相等题——相等是孩子最容易忽略的情况，但也不能太频繁
  const equal = ctx.rng() < 0.15
  const b = equal ? a : pickDifferent(ctx, min, max, a)

  return mode === 'which' ? buildWhichItem(ctx, a, b) : buildSymbolItem(ctx, a, b)
}

/** 取一个与 `a` 不同的数。区间退化为单点时回退为 `a`，由上层的相等分支兜住。 */
function pickDifferent(ctx: GeneratorContext, min: number, max: number, a: number): number {
  if (min === max) return a
  for (let i = 0; i < 8; i++) {
    const candidate = randomInt(ctx.rng, min, max)
    if (candidate !== a) return candidate
  }
  // 极端情况兜底：向区间内偏移一位
  return a < max ? a + 1 : a - 1
}

/** 符号模式：`7 ○ 5`，选 `>` `<` `=` */
function buildSymbolItem(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  const answer = a > b ? '>' : a < b ? '<' : '='
  const reversed = a > b ? '<' : a < b ? '>' : '='

  const candidates =
    answer === '='
      ? [
          { text: '>', tag: 'symbol_reversed' as const },
          { text: '<', tag: 'symbol_reversed' as const },
        ]
      : [
          // ⭐ 最高频：知道谁大，但符号写反了
          { text: reversed, tag: 'symbol_reversed' as const },
          // 没看出两数不同，误判为相等
          { text: '=', tag: 'off_by_one' as const },
        ]

  return {
    signature: `${ctx.kpId}#sym-${a}-${b}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: `${a} ○ ${b}`,
      ttsText: `${a} 和 ${b} 比，中间该填什么符号`,
      ttsParts: [...num(a), 'op.and', ...num(b), 'phrase.compareWhatSymbol'],
    },
    options: buildTextOptions(answer, candidates, ctx.rng).map((o) => {
      const speech = o.text === undefined ? undefined : SYMBOL_SPEECH[o.text]
      return speech === undefined ? o : { ...o, ttsText: speech.spoken, ttsParts: [speech.clip] }
    }),
    answer,
  }
}

/**
 * 择大模式：`哪个数更大？` 直接选数字。
 *
 * 绕开符号，只考数感。用于 M1.5「比多少」，也用于复测 `symbol_reversed` 的成因。
 */
function buildWhichItem(ctx: GeneratorContext, a: number, b: number): GeneratedItem {
  // 相等时无法问「哪个更大」，强制拉开差距
  const left = a
  const right = a === b ? (a < 20 ? a + 1 : a - 1) : b
  const answer = String(Math.max(left, right))
  const wrong = String(Math.min(left, right))

  return {
    signature: `${ctx.kpId}#which-${left}-${right}`,
    kpId: ctx.kpId,
    type: 'choice_text',
    difficulty: ctx.difficulty,
    stem: {
      text: `${left} 和 ${right}，哪个更大?`,
      ttsText: `${left} 和 ${right}，哪个更大`,
      ttsParts: [...num(left), 'op.and', ...num(right), 'phrase.whichBigger'],
    },
    options: buildTextOptions(answer, [{ text: wrong, tag: 'symbol_reversed' }], ctx.rng),
    answer,
  }
}
