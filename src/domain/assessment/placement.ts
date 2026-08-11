/**
 * @file 摸底定位 —— 用几道探测题判断孩子的真实起点
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §6 摸底测评
 *
 * 存在的理由是孩子的一句原话：「像幼儿园小朋友做的题目」。
 *
 * 上过幼小衔接的孩子从「数一数」开始会立刻失去兴趣，而这句话的潜台词
 * 不是「给我难一点的」，是「这个 App 不适合我」——它是流失前兆。
 * `placementPresets.ts` 是按经验拍的临时方案，这里才是按她**实际水平**定位。
 */

import type { KnowledgePoint } from '@/domain/types'

/**
 * 探测题序列，**按难度递增**排列。
 *
 * 每个单元只取一个代表知识点，覆盖从数感到退位减法的完整跨度。
 * 只选有生成器的知识点——探测题必须真的出得出来。
 */
export const PLACEMENT_PROBES: readonly string[] = [
  'M1.6', // 比大小 —— 基础数感
  'M1.9', // 数的组成（十几 = 10 + 几）
  'M3.3', // ⭐ 10 的分与合，凑十法与破十法的地基
  'M4.5', // 6~10 的加法
  'M4.6', // 6~10 的减法
  'M5.2', // 9 加几（进位）
  'M6.2', // 十几减 9（退位）
]

/**
 * 连续答错几题就停止探测。
 *
 * 设为 2：一题可能是手滑或没听清，连续两题错说明确实到边界了。
 * 继续往下考只会让孩子连续挫败——摸底的目的是定位，不是把她考到崩溃。
 */
export const STOP_AFTER_WRONG_STREAK = 2

/** 判定为「已掌握」的初始分数。低于 targetMastery，仍会被巩固题验证 */
export const PLACEMENT_MASTERY_SCORE = 0.75

export interface ProbeResult {
  kpId: string
  isCorrect: boolean
}

export interface PlacementOutcome {
  /** 判定为已掌握的知识点（含其全部前置） */
  masteredKpIds: string[]
  /** 建议的学习起点。全部答对时为 undefined，表示可直接进入最后一个探测点之后 */
  startKpId?: string
  /** 实际探测了几题，用于展示与记录 */
  probedCount: number
}

/**
 * 该轮探测是否应当继续。
 *
 * @param results - 已完成的探测结果，顺序与 {@link PLACEMENT_PROBES} 一致
 * @returns 还需继续探测则为 true
 *
 * @example
 * shouldContinueProbing([{ kpId:'M1.6', isCorrect:true }])        // true
 * shouldContinueProbing([wrong, wrong])                           // false —— 连错两题，到边界了
 */
export function shouldContinueProbing(results: readonly ProbeResult[]): boolean {
  if (results.length >= PLACEMENT_PROBES.length) return false

  let streak = 0
  for (const r of results) {
    streak = r.isCorrect ? 0 : streak + 1
    if (streak >= STOP_AFTER_WRONG_STREAK) return false
  }
  return true
}

/**
 * 取下一道探测题的知识点 ID。
 *
 * @returns 已探完或应当停止时返回 undefined
 */
export function nextProbeKpId(results: readonly ProbeResult[]): string | undefined {
  return shouldContinueProbing(results) ? PLACEMENT_PROBES[results.length] : undefined
}

/**
 * 依据探测结果计算学习起点。
 *
 * 判定规则：
 * - 答对的探测点，**它本身及其全部前置**都视为已掌握（传递闭包）
 * - 第一个答错的探测点作为起点
 * - 全部答对则没有起点限制，从最后一个探测点之后继续
 *
 * 之所以要算传递闭包：孩子答对了 M5.2「9 加几」，说明凑十法（M5.1）、
 * 10 的分与合（M3.3）、数的组成（M1.9）她都会——没必要再从那些地方练起。
 *
 * @param results - 探测结果，按作答顺序
 * @param kpById - 知识点索引，用于查前置
 * @returns 定位结果
 *
 * @example
 * // 前三题对、第四题错
 * computePlacement([pass('M1.6'), pass('M1.9'), pass('M3.3'), fail('M4.5')], kpById)
 * // → masteredKpIds 含 M1.6/M1.9/M3.3 及它们的全部前置，startKpId 为 'M4.5'
 */
export function computePlacement(
  results: readonly ProbeResult[],
  kpById: ReadonlyMap<string, KnowledgePoint>,
): PlacementOutcome {
  const mastered = new Set<string>()

  for (const r of results) {
    if (!r.isCorrect) continue
    collectWithPrerequisites(r.kpId, kpById, mastered)
  }

  const firstWrong = results.find((r) => !r.isCorrect)

  return {
    masteredKpIds: [...mastered],
    ...(firstWrong !== undefined && { startKpId: firstWrong.kpId }),
    probedCount: results.length,
  }
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
