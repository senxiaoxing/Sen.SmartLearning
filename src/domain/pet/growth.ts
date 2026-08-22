/**
 * @file 宠物成长换算 —— 由经验推导等级、形态与进度
 * @layer domain  纯函数
 * @see design/06-宠物系统.md
 * @see src/domain/pet/levelCurves.ts  各年级的曲线表与两端约束
 *
 * ⚠️ 等级与形态**一律由 exp 推导，不存冗余的 level 字段**（宠物红线第 5 条）——
 * 存了迟早会和 exp 不一致，而不一致的表现是「宠物等级莫名其妙变了」，
 * 对孩子来说非常伤。
 *
 * ⭐ 换算全部需要 `gradeLevel`：曲线是一个年级一条（见 levelCurves.ts）。
 * 参数做成必填而不是默认 G1，是因为曲线用错在 UI 上完全看不出来——
 * 六年级套一年级曲线只会表现为「学到半学期就满级了」。
 */

import { curveOf, MAX_LEVEL, STAGE_COUNT } from '@/domain/pet/levelCurves'
import type { GradeLevel } from '@/domain/types'

/** 每个形态覆盖的等级数。6 个形态 × 2 级 = 12 级 */
const LEVELS_PER_STAGE = 2

/** 各类学习行为的经验奖励。与年级无关——同样的努力得同样的经验 */
export const EXP_REWARDS = {
  /** 答对一题 */
  correct: 2,
  /** ⭐ 订正答对也给——否则孩子会回避错题 */
  retryCorrect: 1,
  /** 完成一轮 */
  sessionComplete: 5,
  /** 掌握一个知识点 */
  masterKnowledgePoint: 15,
} as const

/**
 * 由累计经验算出等级。
 *
 * @param exp - 累计经验，只增不减
 * @param gradeLevel - 宠物所属年级，决定用哪条曲线
 * @returns 1 ~ {@link MAX_LEVEL}
 *
 * @example
 * levelFromExp(0, 'G1')    // 1
 * levelFromExp(20, 'G1')   // 2  —— 一轮之后
 * levelFromExp(100, 'G1')  // 4  —— 破壳
 */
export function levelFromExp(exp: number, gradeLevel: GradeLevel): number {
  const curve = curveOf(gradeLevel)
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (exp >= (curve[level] ?? 0)) return level
  }
  return 1
}

/** 形态序号，0 ~ 5 */
export type StageIndex = 0 | 1 | 2 | 3 | 4 | 5

/**
 * 由等级算出形态序号（0~5）。
 *
 * **每 2 级一变**：形态是视觉上的大变化，等级是形态内的小进阶。
 * 两级一变让孩子做完两三轮就能看到宠物真的不一样了，
 * 而不是练很久还停在同一个样子。
 *
 * 不需要 `gradeLevel`：形态与等级的对应关系所有年级一致，
 * 随年级变的是「练多少到几级」，不是「几级长什么样」。
 *
 * @example
 * stageFromLevel(1)   // 0  蛋
 * stageFromLevel(3)   // 1  破壳
 * stageFromLevel(11)  // 5  最终形态
 */
export function stageFromLevel(level: number): StageIndex {
  const stage = Math.floor((Math.max(1, level) - 1) / LEVELS_PER_STAGE)
  return Math.min(STAGE_COUNT - 1, stage) as StageIndex
}

export interface LevelProgress {
  level: number
  stage: StageIndex
  /** 当前等级内已获得的经验 */
  expInLevel: number
  /** 升到下一级还需要的经验 */
  expToNextLevel: number
  /** 当前等级的进度 0~1，用于进度条 */
  ratio: number
  /** 是否已满级 */
  isMax: boolean
}

/**
 * 计算完整的等级进度，供 UI 直接使用。
 *
 * @param exp - 累计经验
 * @param gradeLevel - 宠物所属年级
 *
 * @example
 * levelProgress(50, 'G1')
 * // { level: 3, stage: 1, expInLevel: 5, expToNextLevel: 50, ratio: 0.09, isMax: false }
 */
export function levelProgress(exp: number, gradeLevel: GradeLevel): LevelProgress {
  const curve = curveOf(gradeLevel)
  const level = levelFromExp(exp, gradeLevel)
  const stage = stageFromLevel(level)
  const isMax = level >= MAX_LEVEL

  if (isMax) {
    return { level, stage, expInLevel: 0, expToNextLevel: 0, ratio: 1, isMax: true }
  }

  const current = curve[level] ?? 0
  const next = curve[level + 1] ?? current + 1
  const span = Math.max(1, next - current)
  const expInLevel = exp - current

  return {
    level,
    stage,
    expInLevel,
    expToNextLevel: next - exp,
    ratio: Math.max(0, Math.min(1, expInLevel / span)),
    isMax: false,
  }
}

/**
 * 增加经验后的变化结果，用于判断要不要播升级动画。
 *
 * @param currentExp - 当前累计经验
 * @param gained - 本次获得。负数被忽略（宠物红线第 5 条：经验只增不减）
 * @param gradeLevel - 宠物所属年级
 *
 * @example
 * applyExpGain(10, 20, 'G1')
 * // { exp: 30, leveledUp: true, stageChanged: false, fromLevel: 1, toLevel: 2 }
 */
export function applyExpGain(
  currentExp: number,
  gained: number,
  gradeLevel: GradeLevel,
): {
  exp: number
  leveledUp: boolean
  stageChanged: boolean
  fromLevel: number
  toLevel: number
} {
  const exp = Math.max(0, currentExp + Math.max(0, gained))
  const fromLevel = levelFromExp(currentExp, gradeLevel)
  const toLevel = levelFromExp(exp, gradeLevel)

  return {
    exp,
    leveledUp: toLevel > fromLevel,
    stageChanged: stageFromLevel(toLevel) > stageFromLevel(fromLevel),
    fromLevel,
    toLevel,
  }
}
