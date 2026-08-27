/**
 * @file 下一道探测题 —— 摸底的三段式流程
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/assessment/placementProbes.ts  每一级考哪几个知识点
 * @see src/domain/assessment/placement.ts        探完之后怎么定起点
 * @see design/08-年级分区与内容扩展.md §7        摸底跨年级下探
 *
 * ## 三段
 *
 * ```
 * ① probe    档案年级的序列，正序（由易到难）
 *            连错 2 → 进 ②
 * ② safety   保底题 1 道：本级最简单的那个，难度降到 1
 *            答对 → 结束，不下探     答错 → 进 ③
 * ③ descend  低一级的序列，⭐ 倒序（由难到易）
 *            答对 → 结束             答错 → 继续往回，最多 3 题
 * ```
 *
 * ## ⭐ 为什么「连错 2」不能直接下探
 *
 * 同一个阈值不能背两种后果。「连错 2 就停止探测」误判的代价只是起点定低一点点；
 * 而「连错 2 就换到低年级」误判的代价是**让她做一整轮低年级的题**——
 * 孩子有时只是手滑点错，或者没听清。
 *
 * ② 那道保底题存在的唯一理由就是把「手滑」和「真不会」分开：
 * 一道稳能答对的题足以说明前面两道是意外。
 *
 * ## ⭐ 为什么下探要**倒序**
 *
 * 正序下探意味着她从「数一数」重新做起，而孩子的原话是
 * **「像幼儿园小朋友做的题目」**——那句话的潜台词是「这个 App 不适合我」，
 * 是流失前兆（CLAUDE.md 产品红线）。她刚在本年级受了挫，紧接着被塞一堆
 * 一年前就会了的题，只会再补一刀。
 *
 * 倒序取的是低一级里**最难**的那几个，第一个答对就停。
 * 她的体感是「难 → 稍微简单一点 → 找到能做的」，一条自然的下坡。
 * 顺带把题数从「做满 7 题」压到平均 1~3 题。
 *
 * ## ⛔ 只下探一级
 *
 * design §7 写的是「1~2 级」，这里收到 1 级：`GradeSetting` 只列已开放年级，
 * 档案年级最高就是二年级，下探一级已经到 G1——**第二级是永远走不到的死代码**。
 * 而「为将来铺的路是没验过的代码」这条教训刚在阶段 8.7 ② 上吃过。
 * 等三年级内容做出来、那条路真的能走时再加。
 */

import {
  lowerGradeWithProbes,
  sequenceOf,
} from '@/domain/assessment/placementProbes'
import type { GradeLevel, Subject } from '@/domain/types'

/** 这道探测题属于三段里的哪一段 */
export type ProbePhase = 'probe' | 'safety' | 'descend'

export interface ProbeResult {
  kpId: string
  isCorrect: boolean
  /** 这道题取自哪一级的探测序列 */
  gradeLevel: GradeLevel
  phase: ProbePhase
}

export interface NextProbe {
  kpId: string
  gradeLevel: GradeLevel
  phase: ProbePhase
}

/**
 * 连续答错几题就不再往难处走。
 *
 * 设为 2：一题可能是手滑或没听清，连续两题错说明确实到边界了。
 * 继续往下考只会让孩子连续挫败——摸底的目的是定位，不是把她考到崩溃。
 *
 * ⚠️ 它**只决定停止正序探测**，不决定要不要换年级。换年级由保底题决定。
 */
export const STOP_AFTER_WRONG_STREAK = 2

/**
 * 下探时最多做几题。
 *
 * 倒序探到第 3 题还全错，说明她在低一级的中下段——再往回考已经没有信息量了
 * （起点会落在这里，之后由日常的「回退到薄弱前置」继续修正）。
 * 卡在 3 是为了守住总题数：孩子实测反馈过「怎么还没做完啊」。
 */
export const MAX_DESCEND_PROBES = 3

/**
 * 整场摸底的硬上限。
 *
 * 最坏路径是「本级做满 7 题 + 保底 1 题 + 下探 3 题」= 11，这里留 12 兜底。
 * 见 design/05-孩子反馈与响应.md：一轮题量必须短。
 */
export const MAX_PROBE_COUNT = 12

/** 末尾是否已经连错到阈值 */
function hasWrongStreak(results: readonly ProbeResult[]): boolean {
  let streak = 0
  for (const r of results) {
    streak = r.isCorrect ? 0 : streak + 1
    if (streak >= STOP_AFTER_WRONG_STREAK) return true
  }
  return false
}

/**
 * 取下一道探测题。
 *
 * @param subject - 考哪一科。目前只有 `math` 有探测序列
 * @param startGrade - 她**在读**几年级（档案年级），探测从这一级的序列开始
 * @param results - 已完成的探测结果，按作答顺序
 * @returns 下一题；应当结束时为 `undefined`
 *
 * @example
 * // 二年级孩子，前两题都错了 → 先给一道保底题，而不是直接下探
 * nextProbe('math', 'G2', [wrong('M2-1.2'), wrong('M2-2.2')])
 * // → { kpId: 'M2-1.2', gradeLevel: 'G2', phase: 'safety' }
 *
 * @example
 * // 保底题也错了 → 下探一年级，从序列**末尾**（最难的）开始
 * nextProbe('math', 'G2', [...twoWrong, wrongSafety])
 * // → { kpId: 'M6.2', gradeLevel: 'G1', phase: 'descend' }
 *
 * @example
 * // 一年级孩子没有可下探的年级 → 连错 2 就直接结束（与加下探之前完全一致）
 * nextProbe('math', 'G1', [wrong('M1.6'), wrong('M1.9')])   // undefined
 */
export function nextProbe(
  subject: Subject,
  startGrade: GradeLevel,
  results: readonly ProbeResult[],
): NextProbe | undefined {
  if (results.length >= MAX_PROBE_COUNT) return undefined

  const own = sequenceOf(subject, startGrade)
  if (own.length === 0) return undefined

  const descended = results.filter((r) => r.phase === 'descend')
  const safety = results.find((r) => r.phase === 'safety')

  // —— ③ 下探中：倒序往回，答对即停
  if (descended.length > 0) {
    if (descended.some((r) => r.isCorrect)) return undefined
    if (descended.length >= MAX_DESCEND_PROBES) return undefined

    const lower = lowerGradeWithProbes(subject, startGrade)
    if (lower === undefined) return undefined

    const seq = sequenceOf(subject, lower)
    const kpId = seq[seq.length - 1 - descended.length]
    return kpId === undefined ? undefined : { kpId, gradeLevel: lower, phase: 'descend' }
  }

  // —— ② 保底题已作答：答对说明只是手滑，就此结束
  if (safety !== undefined) {
    if (safety.isCorrect) return undefined

    const lower = lowerGradeWithProbes(subject, startGrade)
    if (lower === undefined) return undefined

    const seq = sequenceOf(subject, lower)
    const kpId = seq[seq.length - 1]
    return kpId === undefined ? undefined : { kpId, gradeLevel: lower, phase: 'descend' }
  }

  // —— ① 本级正序
  const probed = results.filter((r) => r.phase === 'probe')
  if (probed.length >= own.length) return undefined

  if (!hasWrongStreak(probed)) {
    const kpId = own[probed.length]
    return kpId === undefined ? undefined : { kpId, gradeLevel: startGrade, phase: 'probe' }
  }

  // 连错 2 了。三种情况里只有一种该继续往下走：
  // 没有更低的年级可探（一年级孩子）→ 结束
  if (lowerGradeWithProbes(subject, startGrade) === undefined) return undefined
  // 本级答对过 → 边界已经在这一级里找到了，不必下探
  if (probed.some((r) => r.isCorrect)) return undefined

  // 本级一题都没对 → 出保底题，让她证明一下前面两道是不是意外
  const kpId = own[0]
  return kpId === undefined ? undefined : { kpId, gradeLevel: startGrade, phase: 'safety' }
}
