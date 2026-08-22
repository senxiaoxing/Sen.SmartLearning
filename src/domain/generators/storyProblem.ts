/**
 * @file 情境题生成器 —— M4.1/M4.3 加减的意义 · M9.1~M9.3 解决问题
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M4 §M9
 * @see src/items/StemFigure.tsx  StoryGroups 三种画法
 *
 * ## 一个生成器覆盖五个知识点
 *
 * 它们本质是同一件事——**看图列式**，只是运算与情境不同：
 * `add` 两堆合起来（M4.1 / M9.1）· `remove` 拿走几个（M4.3 / M9.2）·
 * `compare` 两排比多少（M9.3）。M9 与 M4 的差别只在 `story` 开关：
 * 前者把已知条件说进题干，后者直接问。
 *
 * ## ⭐ `wrong_operation` 是 M9 唯一要诊断的东西
 *
 * 一年级做应用题的错误几乎只有一种：**该加的做成了减，该减的做成了加**。
 * 所以每道题的干扰项里必须有「用反了运算」的那个结果，
 * 孩子选了它就精确命中，补救是回去练「变多还是变少」的判断。
 */

import { COUNTABLES, type Countable } from '@/domain/generators/countables'
import { buildNumericOptions } from '@/domain/generators/distractors'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { fillFrame, framesFor, type StoryFrame } from '@/domain/storyFrame'
import type { Generator, ItemVisual } from '@/domain/types'

/**
 * 生成一道情境题。
 *
 * @param ctx.params.mode - `'add'` 合并 | `'remove'` 去掉 | `'compare'` 比多少
 * @param ctx.params.story - 题干是否用一句话情境（M9）而非直白提问（M4）
 * @param ctx.params.totalRange - 数量上限区间
 * @param ctx.params.frames - 句式表（`STORY_FRAMES`）。⚠️ 由 `itemTemplates` 注入，
 *                            不在这里 import——domain 不依赖 data 是分层铁律
 *
 * @example
 * storyProblem({ kpId: 'M9.2', difficulty: 2, params: { mode: 'remove', story: true, frames }, rng })
 * // 5 个饼干吃掉 2 个：3 正确 · 7 wrong_operation（做成了加法）· 4 off_by_one
 */
export const storyProblem: Generator = ({ kpId, difficulty, params, rng }) => {
  const mode = readEnum(params, 'mode', ['add', 'remove', 'compare'] as const, 'add')
  const story = params['story'] === true
  const [lo, hi] = readRange(params, 'totalRange', [3, 9])

  // ⭐ 先挑说法，再按说法挑物品——顺序反过来会撞出「吃掉了 3 颗星星」
  const frame = randomPick(rng, framesFor(readFrames(params), mode, story))
  const thing = randomPick(rng, thingsFor(frame))

  /** 三个分支的配图只有 groups 与 operation 不同，抽出来省掉重复 */
  const scene = (groups: number[], operation: 'add' | 'remove' | 'compare'): ItemVisual => ({
    kind: 'storyGroups',
    emoji: thing.emoji,
    name: thing.name,
    groups,
    operation,
  })

  if (mode === 'add') {
    const a = randomInt(rng, 1, Math.max(1, hi - 2))
    const b = randomInt(rng, 1, Math.max(1, hi - a))
    const answer = a + b

    return {
      signature: `${kpId}-story#add:${a}+${b}:${thing.name}`,
      kpId,
      type: 'choice_image',
      difficulty,
      stem: fillFrame(frame, { a, b, thing }),
      options: buildNumericOptions(
        answer,
        [
          // ⭐ 用反了运算：做成了减法
          { tag: 'wrong_operation', value: Math.abs(a - b) },
          { tag: 'off_by_one', value: answer - 1 },
          { tag: 'off_by_one', value: answer + 1 },
        ],
        rng,
      ),
      answer: String(answer),
      visual: scene([a, b], 'add'),
    }
  }

  if (mode === 'remove') {
    const total = randomInt(rng, Math.max(2, lo), hi)
    const taken = randomInt(rng, 1, total - 1)
    const answer = total - taken

    return {
      signature: `${kpId}-story#remove:${total}-${taken}:${thing.name}`,
      kpId,
      type: 'choice_image',
      difficulty,
      stem: fillFrame(frame, { a: total, b: taken, thing }),
      options: buildNumericOptions(
        answer,
        [
          // ⭐ 做成了加法
          { tag: 'wrong_operation', value: total + taken },
          // 答成了「原来有几个」——没意识到要减
          { tag: 'wrong_operation', value: total },
          { tag: 'off_by_one', value: answer + 1 },
        ],
        rng,
      ),
      answer: String(answer),
      visual: scene([total, taken], 'remove'),
    }
  }

  // compare：两排对齐摆，问多几个
  const more = randomInt(rng, 2, hi)
  const less = randomInt(rng, 1, more - 1)
  const answer = more - less

  return {
    signature: `${kpId}-story#compare:${more}vs${less}:${thing.name}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: fillFrame(frame, { a: more, b: less, thing }),
    options: buildNumericOptions(
      answer,
      [
        // ⭐ 做成了加法
        { tag: 'wrong_operation', value: more + less },
        // 答成了「多的那排有几个」——没做减法
        { tag: 'wrong_operation', value: more },
        { tag: 'off_by_one', value: answer + 1 },
      ],
      rng,
    ),
    answer: String(answer),
    visual: scene([more, less], 'compare'),
  }
}

/**
 * 从参数里读出句式表。
 *
 * @throws 缺失或为空时抛错——静默回落会让题干变成空字符串，
 *         而孩子看到的是一道**没有题目的题**，比直接失败糟糕得多
 */
function readFrames(params: Record<string, unknown>): readonly StoryFrame[] {
  const raw = params['frames']
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('生成器参数 frames 应为非空句式数组，检查 data/seed/itemTemplates.ts')
  }
  return raw as StoryFrame[]
}

/**
 * 这个句式能配哪些物品。
 *
 * @throws 一个都配不上时抛错——那是 `thingKinds` 写了个 `COUNTABLES` 里没有的类别，
 *         属于 seed 配置错误，必须显式失败
 */
function thingsFor(frame: StoryFrame): readonly Countable[] {
  if (frame.thingKinds === undefined) return COUNTABLES

  const kinds = frame.thingKinds
  const matched = COUNTABLES.filter((c) => kinds.includes(c.kind))
  if (matched.length === 0) {
    throw new Error(`句式「${frame.text}」限定的 thingKinds 在 COUNTABLES 里一个都没有`)
  }
  return matched
}
