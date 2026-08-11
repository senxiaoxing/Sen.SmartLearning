/**
 * @file 宠物成长曲线 —— 经验、等级与形态的换算
 * @layer domain  纯函数
 * @see design/06-宠物系统.md
 *
 * 曲线设计的核心是**前面极快**：第一轮做完就必定升级，
 * 约四轮见到破壳。孩子在第一次使用时就要看到「我让它变了」，
 * 否则养成系统对她只是个不动的图标。
 *
 * 后期逐渐拉长，但因为三个科目各有一只宠物，
 * 总有一只接近升级——这是三宠物设计相对单宠物的核心优势。
 */

/** 最高等级 */
export const MAX_LEVEL = 12

/** 每个形态覆盖的等级数。6 个形态 × 2 级 = 12 级 */
const LEVELS_PER_STAGE = 2

/** 形态总数 */
export const STAGE_COUNT = 6

/**
 * 升到第 N 级所需的**累计**经验。索引即等级（`LEVEL_THRESHOLDS[2]` 是升到 2 级所需）。
 *
 * 曲线要同时满足两个目标：
 *
 * **① 开头极快** —— 一轮 10 题全对约 25 exp，
 * 因此第一轮必到 2 级、第二轮就能看到第一次形态变化（3 级）。
 * 孩子首次使用若看不到变化，养成系统对她就只是个不动的图标。
 *
 * **② 满级 ≈ 学完一个年级** —— 一年级数学 47 个知识点、
 * 平均每点 30 题，合计约 1400 题 ≈ 140 轮。满级定在 3000 exp
 * （约 120 轮全对）与之匹配，学完一年正好把宠物养到最终形态。
 */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // Lv1 起始
  0, // Lv1   🥚 蛋
  15, // Lv2  ⭐ 第一轮就能到
  45, // Lv3  🐣 破壳，形态变化（第二轮）
  100, // Lv4
  190, // Lv5 🐧 幼体
  320, // Lv6
  500, // Lv7 🧣 学徒
  750, // Lv8
  1080, // Lv9 🎒 高手
  1500, // Lv10
  2100, // Lv11 👑 最终形态
  3000, // Lv12 满级 ≈ 学完一个年级
]

/** 各类学习行为的经验奖励 */
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
 * @returns 1 ~ {@link MAX_LEVEL}
 *
 * @example
 * levelFromExp(0)    // 1
 * levelFromExp(20)   // 2  —— 一轮之后
 * levelFromExp(100)  // 4  —— 破壳
 */
export function levelFromExp(exp: number): number {
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (exp >= (LEVEL_THRESHOLDS[level] ?? 0)) return level
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
 * @example
 * levelProgress(50)
 * // { level: 3, stage: 0, expInLevel: 10, expToNextLevel: 30, ratio: 0.25, isMax: false }
 */
export function levelProgress(exp: number): LevelProgress {
  const level = levelFromExp(exp)
  const stage = stageFromLevel(level)
  const isMax = level >= MAX_LEVEL

  if (isMax) {
    return { level, stage, expInLevel: 0, expToNextLevel: 0, ratio: 1, isMax: true }
  }

  const current = LEVEL_THRESHOLDS[level] ?? 0
  const next = LEVEL_THRESHOLDS[level + 1] ?? current + 1
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
 * @param gained - 本次获得
 *
 * @example
 * applyExpGain(10, 20)
 * // { exp: 30, leveledUp: true, fromLevel: 1, toLevel: 2, stageChanged: false }
 */
export function applyExpGain(
  currentExp: number,
  gained: number,
): {
  exp: number
  leveledUp: boolean
  stageChanged: boolean
  fromLevel: number
  toLevel: number
} {
  const exp = Math.max(0, currentExp + Math.max(0, gained))
  const fromLevel = levelFromExp(currentExp)
  const toLevel = levelFromExp(exp)

  return {
    exp,
    leveledUp: toLevel > fromLevel,
    stageChanged: stageFromLevel(toLevel) > stageFromLevel(fromLevel),
    fromLevel,
    toLevel,
  }
}
