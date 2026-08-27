/**
 * @file 摸底定位 —— 用几道探测题判断孩子的真实起点
 * @layer domain  纯函数
 * @see src/domain/assessment/nextProbe.ts        探测怎么走（三段式）
 * @see src/domain/assessment/placementProbes.ts  每一级考哪几个知识点
 * @see design/01-知识点图谱.md §6 摸底测评
 *
 * 存在的理由是孩子的一句原话：「像幼儿园小朋友做的题目」。
 *
 * 上过幼小衔接的孩子从「数一数」开始会立刻失去兴趣，而这句话的潜台词
 * 不是「给我难一点的」，是「这个 App 不适合我」——它是流失前兆。
 * `placementPresets.ts` 是按经验拍的临时方案，这里才是按她**实际水平**定位。
 */

import { sequenceOf } from '@/domain/assessment/placementProbes'
import type { ProbeResult } from '@/domain/assessment/nextProbe'
import type { GradeLevel, KnowledgePoint, Subject } from '@/domain/types'

/** 判定为「已掌握」的初始分数。低于 targetMastery，仍会被巩固题验证 */
export const PLACEMENT_MASTERY_SCORE = 0.75

export interface PlacementOutcome {
  /** 判定为已掌握的知识点（含其全部前置） */
  masteredKpIds: string[]
  /** 建议的学习起点。全部答对时为 undefined，表示可直接进入最后一个探测点之后 */
  startKpId?: string
  /** 实际探测了几题，用于展示与记录 */
  probedCount: number
}

/**
 * 依据探测结果计算学习起点。
 *
 * 判定规则：
 * - 答对的探测点，**它本身及其全部前置**都视为已掌握（传递闭包）
 * - 起点取自**实际停在的那一级**，见 {@link startKpIdOf}
 * - 全部答对则没有起点限制，从最后一个探测点之后继续
 *
 * 之所以要算传递闭包：孩子答对了 M5.2「9 加几」，说明凑十法（M5.1）、
 * 10 的分与合（M3.3）、数的组成（M1.9）她都会——没必要再从那些地方练起。
 *
 * @param results - 探测结果，按作答顺序
 * @param kpById - 知识点索引，用于查前置
 * @param subject - 考的哪一科，用于在下探时回查序列
 * @param startGrade - 档案年级，即探测的起始那一级
 * @returns 定位结果
 *
 * @example
 * // 前三题对、第四题错
 * computePlacement([pass('M1.6'), pass('M1.9'), pass('M3.3'), fail('M4.5')], kpById, 'math', 'G1')
 * // → masteredKpIds 含 M1.6/M1.9/M3.3 及它们的全部前置，startKpId 为 'M4.5'
 */
export function computePlacement(
  results: readonly ProbeResult[],
  kpById: ReadonlyMap<string, KnowledgePoint>,
  subject: Subject,
  startGrade: GradeLevel,
): PlacementOutcome {
  const mastered = new Set<string>()

  for (const r of results) {
    if (!r.isCorrect) continue
    collectWithPrerequisites(r.kpId, kpById, mastered)
  }

  const startKpId = startKpIdOf(results, subject, startGrade)

  return {
    masteredKpIds: [...mastered],
    ...(startKpId !== undefined && { startKpId }),
    probedCount: results.length,
  }
}

/**
 * 起点取自**实际停在的那一级**，不是「全局第一个答错的」。
 *
 * ⭐ 这是跨年级下探带来的关键改动。二年级的孩子在 G2 前两题就错了、
 * 下探到 G1 才找到能做的，那么起点必须落在 G1 那个位置——
 * 若还按老规则取「第一个答错的」，起点会被钉死在 G2 第一题上，
 * 而那正是她刚证明了自己做不了的地方。
 *
 * 三种收尾：
 *
 * | 停在哪 | 起点 |
 * |---|---|
 * | 没下探（含保底题答对） | 本级第一个答错的 |
 * | 下探时答对了某题 | 那道题在低一级序列里的**下一个**（她会这个了，从后面开始） |
 * | 下探全错 | 探到的最靠前那个（倒序的最后一道） |
 */
function startKpIdOf(
  results: readonly ProbeResult[],
  subject: Subject,
  startGrade: GradeLevel,
): string | undefined {
  const descended = results.filter((r) => r.phase === 'descend')

  if (descended.length === 0) {
    // 保底题答对说明前面只是手滑，边界仍在本级——它不参与起点判定
    return results.find((r) => r.phase === 'probe' && !r.isCorrect)?.kpId
  }

  const passed = descended.find((r) => r.isCorrect)
  if (passed === undefined) {
    // 倒序全错：起点就是探到的最靠前那一个
    return descended[descended.length - 1]?.kpId
  }

  const seq = sequenceOf(subject, passed.gradeLevel)
  const index = seq.indexOf(passed.kpId)
  // 她连低一级最难的都会 → 序列里没有「下一个」了，起点回到本级开头
  return seq[index + 1] ?? sequenceOf(subject, startGrade)[0]
}

/** 把知识点及其全部前置（递归）收进集合 */
function collectWithPrerequisites(
  kpId: string,
  kpById: ReadonlyMap<string, KnowledgePoint>,
  acc: Set<string>,
): void {
  if (acc.has(kpId)) return
  const kp = kpById.get(kpId)
  if (kp === undefined) return

  acc.add(kpId)
  for (const preId of kp.prerequisites) {
    collectWithPrerequisites(preId, kpById, acc)
  }
}
