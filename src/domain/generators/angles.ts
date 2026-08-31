/**
 * @file 角的识别 —— M2-3.2 认识直角 · M2-3.3 锐角与钝角
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/AngleShape.tsx  角怎么画
 * @see design/01-知识点图谱.md §M2-3 角的初步认识
 *
 * ## ⭐ 每道题都必须有一个「边长骗人」的选项
 *
 * `angle_side_length`（边画得长就以为角大）是这整个单元的核心，
 * 教材专门用活动角来讲它。因此选项里恒有一个**开口比正确答案小、
 * 但边明显更长**的角——她要是选了它，就精确命中这个误区。
 *
 * 换成随机角度做干扰，这个单元最要紧的那件事就诊断不出来了。
 *
 * ## 角度取值离直角远一点
 *
 * 锐角取 30~75、钝角取 105~150，**刻意避开 80~100 那一段**：
 * 88° 和 92° 在 100×100 的图上肉眼分不出来，那种题考的是视力不是概念。
 */

import { readEnum } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type {
  GeneratedItem,
  Generator,
  GeneratorContext,
  ItemOption,
  MisconceptionTag,
} from '@/domain/types'

const MODES = ['right', 'kind'] as const
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 直角 */
const RIGHT = 90

/** 锐角与钝角的取值区间。⚠️ 都离 90° 至少 15°，否则是在考视力 */
const ACUTE: [number, number] = [30, 75]
const OBTUSE: [number, number] = [105, 150]

/** 边长档位。⭐ 差距要足够大，「长边」和「短边」得一眼看出来 */
const SHORT_ARM: [number, number] = [20, 26]
const LONG_ARM: [number, number] = [38, 44]

/** 一个角的完整描述 */
interface Angle {
  degrees: number
  arm: number
  rotate: number
}

const keyOf = (a: Angle): string => `angle:${a.degrees}:${a.arm}:${a.rotate}`

/** 角的三类。`kind` 模式问锐角或钝角，`right` 模式问直角 */
type AngleKind = 'acute' | 'right' | 'obtuse'

const KIND_LABEL: Record<AngleKind, { text: string; clip: string }> = {
  acute: { text: '哪个是锐角？', clip: 'phrase.whichAcuteAngle' },
  right: { text: '哪个是直角？', clip: 'phrase.whichRightAngle' },
  obtuse: { text: '哪个是钝角？', clip: 'phrase.whichObtuseAngle' },
}

/**
 * 生成一道认角的题。
 *
 * @param ctx - 生成上下文
 * @param ctx.params.mode - `'right'` 哪个是直角（M2-3.2）
 *                        | `'kind'` 哪个是锐角/钝角（M2-3.3）。默认 `'right'`
 * @returns 选项是四个角的图，每个错误项都带 `misconceptionTag`
 *
 * @example
 * angles({ kpId: 'M2-3.2', difficulty: 2, params: { mode: 'right' }, rng })
 * // 「哪个是直角？」四个角里恒有一个开口更小、边却更长的
 * //   → 选它就是 angle_side_length
 */
export const angles: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'right')
  const target: AngleKind = mode === 'right' ? 'right' : ctx.rng() < 0.5 ? 'acute' : 'obtuse'

  /**
   * ⭐ 要找的是「小的那个」还是「大的那个」，决定诱饵往哪个方向骗。
   *
   * 问钝角/直角时孩子在找大角，错误直觉是「边长的大」；
   * 问锐角时她在找小角，错误直觉反过来是「边短的小」。
   * 因此正确答案的边长一律取**与直觉相反**的那一档——
   * 靠边长蒙的孩子无论问哪一类都会错。
   */
  const askSmall = target === 'acute'
  const correct: Angle = {
    degrees: pickDegreesOf(ctx, target, []),
    arm: askSmall ? longArm(ctx) : shortArm(ctx),
    rotate: randomInt(ctx.rng, 0, 40),
  }

  const label = KIND_LABEL[target]

  return {
    signature: `${ctx.kpId}#${target}:${correct.degrees}:${correct.arm}`,
    kpId: ctx.kpId,
    type: 'choice_image',
    difficulty: ctx.difficulty,
    stem: {
      text: label.text,
      ttsText: label.text.replace('？', ''),
      ttsParts: [label.clip],
    },
    options: buildOptions(ctx, correct, target, askSmall),
    answer: keyOf(correct),
    /**
     * ⭐ 答案**不朗读**：四个选项都是「角」，区别只在张口大小，
     * 说「答案是直角」等于把题干重复一遍（题干问的就是「哪个是直角」）。
     * `angle:90:24:0` 更不能念——那是画图用的 key。答对的那个角会画在反馈里。
     */
    answerSpeech: { parts: [], text: '' },
  }
}

const shortArm = (ctx: GeneratorContext): number =>
  randomInt(ctx.rng, SHORT_ARM[0], SHORT_ARM[1])
const longArm = (ctx: GeneratorContext): number => randomInt(ctx.rng, LONG_ARM[0], LONG_ARM[1])

/** 抽一个属于该类别、且不与 `exclude` 重复的度数 */
function pickDegreesOf(ctx: GeneratorContext, kind: AngleKind, exclude: number[]): number {
  if (kind === 'right') return RIGHT
  const [lo, hi] = kind === 'acute' ? ACUTE : OBTUSE
  for (let i = 0; i < 8; i++) {
    const deg = randomInt(ctx.rng, lo, hi)
    if (!exclude.includes(deg)) return deg
  }
  // 兜底：区间足够宽，走到这里说明运气极差，偏移一度即可
  return exclude.includes(lo) ? lo + 1 : lo
}

/**
 * 四个角：一个正确的，三个各带诊断标签的。
 *
 * ⚠️ 三个干扰项的**类别一律不是正确答案那一类**——
 * 问「哪个是锐角」时混进另一个锐角，那道题就有两个正确答案，
 * 孩子选了会被判错，而她其实答对了。
 */
function buildOptions(
  ctx: GeneratorContext,
  correct: Angle,
  target: AngleKind,
  askSmall: boolean,
): ItemOption[] {
  const rot = (): number => randomInt(ctx.rng, 0, 40)
  const others: AngleKind[] = (['acute', 'right', 'obtuse'] as const).filter((k) => k !== target)

  // ⭐ 诱饵：类别不对，但边长恰好符合错误直觉。
  // 找大角时它开口小、边却最长；找小角时它开口大、边却最短
  const decoy: Angle = {
    degrees: pickDegreesOf(ctx, others[0]!, []),
    arm: askSmall ? shortArm(ctx) : longArm(ctx),
    rotate: rot(),
  }

  // 另外两个：剩下那一类，以及诱饵同类但度数不同的一个
  const second: Angle = {
    degrees: pickDegreesOf(ctx, others[1]!, []),
    arm: correct.arm,
    rotate: rot(),
  }
  const third: Angle = {
    degrees: pickDegreesOf(ctx, others[1]!, [second.degrees]),
    arm: askSmall ? shortArm(ctx) : longArm(ctx),
    rotate: rot(),
  }

  // ⭐ 两种错分开标：decoy 是「被边长骗了」（她在比大小，只是比错了依据），
  // 其余是「压根不认识这一类角」。补救一个用活动角、一个用三角板，不能混
  const wrong: Array<{ angle: Angle; tag: MisconceptionTag }> = [
    { angle: decoy, tag: 'angle_side_length' },
    { angle: second, tag: 'angle_kind_confusion' },
    { angle: third, tag: 'angle_kind_confusion' },
  ]

  const picked = shuffle(ctx.rng, [
    { key: keyOf(correct), isCorrect: true, tag: undefined as MisconceptionTag | undefined },
    ...wrong.map((w) => ({ key: keyOf(w.angle), isCorrect: false, tag: w.tag })),
  ])

  return picked.map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    // ⚠️ 文字不显示也不朗读，只为契约与家长错题本
    text: o.key,
    imageKey: o.key,
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))
}
