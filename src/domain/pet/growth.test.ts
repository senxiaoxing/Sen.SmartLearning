/**
 * @file 宠物成长曲线测试
 * @layer domain
 *
 * 成长节奏是宠物系统的命脉：升级太慢孩子看不到变化，
 * 太快则失去期待感。这些数值必须锁住，改动时要能立刻看出影响。
 */

import { describe, expect, it } from 'vitest'
import {
  EXP_REWARDS,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  STAGE_COUNT,
  applyExpGain,
  levelFromExp,
  levelProgress,
  stageFromLevel,
} from '@/domain/pet/growth'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'

/** 一轮 10 题全对能拿到的经验 */
const ONE_PERFECT_ROUND = 10 * EXP_REWARDS.correct + EXP_REWARDS.sessionComplete

describe('等级换算', () => {
  it('初始为 1 级', () => {
    expect(levelFromExp(0)).toBe(1)
  })

  it('⭐ 第一轮做完就能升级——孩子首次使用必须看到变化', () => {
    expect(ONE_PERFECT_ROUND).toBeGreaterThanOrEqual(LEVEL_THRESHOLDS[2]!)
    expect(levelFromExp(ONE_PERFECT_ROUND)).toBeGreaterThanOrEqual(2)
  })

  it('⭐ 第二轮就能看到第一次形态变化', () => {
    const twoRounds = ONE_PERFECT_ROUND * 2
    expect(levelFromExp(twoRounds)).toBeGreaterThanOrEqual(3)
    expect(stageFromLevel(levelFromExp(twoRounds)), '两轮后应已破壳').toBeGreaterThanOrEqual(1)
  })

  it('⭐ 满级所需经验与「学完一个年级」的题量匹配', () => {
    // 一年级数学的总题量估算
    const mathItems = KNOWLEDGE_POINTS.filter((kp) => kp.subject === 'math').reduce(
      (sum, kp) => sum + kp.estimatedItems,
      0,
    )
    const roundsInAYear = mathItems / 10
    const expInAYear =
      mathItems * EXP_REWARDS.correct + roundsInAYear * EXP_REWARDS.sessionComplete

    const maxExp = LEVEL_THRESHOLDS[MAX_LEVEL]!
    // 满级需求应落在「一年学习量」的合理区间内：
    // 太低则学到一半就满级失去目标，太高则学完一年还差得远
    expect(maxExp).toBeLessThanOrEqual(expInAYear)
    expect(maxExp).toBeGreaterThan(expInAYear * 0.5)
  })

  it('阈值单调递增，且后期间隔越来越大', () => {
    for (let lv = 2; lv <= MAX_LEVEL; lv++) {
      expect(LEVEL_THRESHOLDS[lv]!).toBeGreaterThan(LEVEL_THRESHOLDS[lv - 1]!)
    }
    const earlyGap = LEVEL_THRESHOLDS[3]! - LEVEL_THRESHOLDS[2]!
    const lateGap = LEVEL_THRESHOLDS[12]! - LEVEL_THRESHOLDS[11]!
    expect(lateGap).toBeGreaterThan(earlyGap)
  })

  it('不会超过最高等级', () => {
    expect(levelFromExp(999_999)).toBe(MAX_LEVEL)
  })
})

describe('形态划分', () => {
  it('⭐ 12 级分成 6 个形态，每 2 级一变', () => {
    expect(STAGE_COUNT).toBe(6)
    expect(stageFromLevel(1)).toBe(0)
    expect(stageFromLevel(2)).toBe(0)
    expect(stageFromLevel(3)).toBe(1)
    expect(stageFromLevel(5)).toBe(2)
    expect(stageFromLevel(7)).toBe(3)
    expect(stageFromLevel(9)).toBe(4)
    expect(stageFromLevel(11)).toBe(5)
    expect(stageFromLevel(MAX_LEVEL)).toBe(5)
  })

  it('形态序号不会越界', () => {
    expect(stageFromLevel(0)).toBe(0)
    expect(stageFromLevel(99)).toBe(STAGE_COUNT - 1)
  })

  it('每个形态恰好覆盖 2 个等级', () => {
    const perStage = new Map<number, number>()
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      const s = stageFromLevel(lv)
      perStage.set(s, (perStage.get(s) ?? 0) + 1)
    }
    expect(perStage.size).toBe(STAGE_COUNT)
    for (const count of perStage.values()) expect(count).toBe(2)
  })
})

describe('进度计算', () => {
  it('进度比例落在 0~1', () => {
    for (let exp = 0; exp <= 2000; exp += 37) {
      const p = levelProgress(exp)
      expect(p.ratio).toBeGreaterThanOrEqual(0)
      expect(p.ratio).toBeLessThanOrEqual(1)
    }
  })

  it('满级时进度为满，且不再要求经验', () => {
    const p = levelProgress(LEVEL_THRESHOLDS[MAX_LEVEL]!)
    expect(p.isMax).toBe(true)
    expect(p.ratio).toBe(1)
    expect(p.expToNextLevel).toBe(0)
  })

  it('刚升级时进度归零', () => {
    const p = levelProgress(LEVEL_THRESHOLDS[3]!)
    expect(p.level).toBe(3)
    expect(p.expInLevel).toBe(0)
  })
})

describe('经验结算', () => {
  it('识别出升级与形态变化', () => {
    const noLevel = applyExpGain(0, 5)
    expect(noLevel.leveledUp).toBe(false)

    const levelUp = applyExpGain(0, 20)
    expect(levelUp.leveledUp).toBe(true)
    expect(levelUp.stageChanged).toBe(false)

    // 跨到 3 级 = 破壳（形态每 2 级一变）
    const hatch = applyExpGain(LEVEL_THRESHOLDS[2]!, LEVEL_THRESHOLDS[3]! - LEVEL_THRESHOLDS[2]!)
    expect(hatch.toLevel).toBe(3)
    expect(hatch.stageChanged).toBe(true)
  })

  it('⭐ 经验只增不减，负数增益被忽略', () => {
    expect(applyExpGain(100, -50).exp).toBe(100)
    expect(applyExpGain(0, -10).exp).toBe(0)
  })

  it('订正答对也有经验，但低于首次答对', () => {
    expect(EXP_REWARDS.retryCorrect).toBeGreaterThan(0)
    expect(EXP_REWARDS.retryCorrect).toBeLessThan(EXP_REWARDS.correct)
  })
})
