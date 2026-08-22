/**
 * @file 宠物成长曲线测试
 * @layer domain
 *
 * 成长节奏是宠物系统的命脉：升级太慢孩子看不到变化，
 * 太快则失去期待感。这些数值必须锁住，改动时要能立刻看出影响。
 *
 * ⭐ 两端校验对**每个已经有内容的年级**各跑一遍。
 * 曲线是一个年级一条（见 levelCurves.ts），而曲线偏了在 iPad 上完全看不出来——
 * 只会表现为「宠物好久没动静了」，那时孩子已经失去兴趣。
 */

import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_POINTS_BY_GRADE } from '@/data/seed/knowledgePoints'
import {
  EXP_REWARDS,
  applyExpGain,
  levelFromExp,
  levelProgress,
  stageFromLevel,
} from '@/domain/pet/growth'
import { curveOf, MAX_LEVEL, STAGE_COUNT } from '@/domain/pet/levelCurves'
import { GRADE_LEVELS, type GradeLevel } from '@/domain/types'

/** 一轮 10 题全对能拿到的经验 */
const ONE_PERFECT_ROUND = 10 * EXP_REWARDS.correct + EXP_REWARDS.sessionComplete

/** 一年级是当前唯一有内容的年级，单只测试默认用它 */
const G1: GradeLevel = 'G1'

/**
 * 学完某年级某科目大约能拿多少经验。
 *
 * 用数学科：三科里题量最大、也是唯一每个年级都必然存在的一科。
 * 返回 0 表示这个年级还没有内容。
 */
function expForAYearOf(gradeLevel: GradeLevel): number {
  const items = KNOWLEDGE_POINTS_BY_GRADE[gradeLevel]
    .filter((kp) => kp.subject === 'math')
    .reduce((sum, kp) => sum + kp.estimatedItems, 0)
  if (items === 0) return 0

  const rounds = items / 10
  return items * EXP_REWARDS.correct + rounds * EXP_REWARDS.sessionComplete
}

/** 已经有内容、因此曲线必须校准过的年级 */
const GRADES_WITH_CONTENT = GRADE_LEVELS.filter((g) => expForAYearOf(g) > 0)

describe('⭐ 每个有内容的年级，曲线两端都要守住', () => {
  it('当前至少有一个年级有内容（否则下面几条会静默空跑）', () => {
    expect(GRADES_WITH_CONTENT.length).toBeGreaterThan(0)
    expect(GRADES_WITH_CONTENT).toContain('G1')
  })

  it.each(GRADES_WITH_CONTENT)('%s：第一轮做完就能升级', (grade) => {
    expect(ONE_PERFECT_ROUND).toBeGreaterThanOrEqual(curveOf(grade)[2]!)
    expect(levelFromExp(ONE_PERFECT_ROUND, grade)).toBeGreaterThanOrEqual(2)
  })

  it.each(GRADES_WITH_CONTENT)('%s：第二轮就能看到第一次形态变化', (grade) => {
    const twoRounds = ONE_PERFECT_ROUND * 2
    expect(levelFromExp(twoRounds, grade)).toBeGreaterThanOrEqual(3)
    expect(
      stageFromLevel(levelFromExp(twoRounds, grade)),
      '两轮后应已破壳',
    ).toBeGreaterThanOrEqual(1)
  })

  it.each(GRADES_WITH_CONTENT)('%s：满级所需经验与「学完这个年级」的题量匹配', (grade) => {
    const expInAYear = expForAYearOf(grade)
    const maxExp = curveOf(grade)[MAX_LEVEL]!

    // 太低则学到一半就满级、剩下半年宠物毫无反应；
    // 太高则学完一整年还差得远，最终形态永远见不到
    expect(maxExp, `${grade} 的曲线太长，学完一年也到不了满级`).toBeLessThanOrEqual(expInAYear)
    expect(maxExp, `${grade} 的曲线太短，学到一半就满级了`).toBeGreaterThan(expInAYear * 0.5)
  })

  it.each(GRADES_WITH_CONTENT)('%s：阈值单调递增，且后期间隔越来越大', (grade) => {
    const curve = curveOf(grade)
    for (let lv = 2; lv <= MAX_LEVEL; lv++) {
      expect(curve[lv]!).toBeGreaterThan(curve[lv - 1]!)
    }
    expect(curve[MAX_LEVEL]! - curve[MAX_LEVEL - 1]!).toBeGreaterThan(curve[3]! - curve[2]!)
  })
})

describe('曲线表本身', () => {
  it('六个年级都有曲线，长度一致', () => {
    for (const grade of GRADE_LEVELS) {
      expect(curveOf(grade), `${grade} 缺曲线`).toHaveLength(MAX_LEVEL + 1)
    }
  })

  it('⭐ 有内容的年级必须有自己校准过的曲线，不能共用别人的', () => {
    // G2~G6 目前是 G1 的占位副本。只要其中某个年级做出了内容，
    // 这条就会红——它是「加年级时别忘了校准曲线」的强制提醒。
    //
    // 光靠上面的两端校验不够：那个区间是 [0.5x, 1x]，
    // 二年级内容量要到一年级的两倍才会越界，而偏 1.5 倍已经足以
    // 让孩子在学年过半时就满级了。
    const seen = new Map<readonly number[], GradeLevel>()
    for (const grade of GRADES_WITH_CONTENT) {
      const curve = curveOf(grade)
      const owner = seen.get(curve)
      expect(
        owner,
        `${grade} 与 ${owner} 共用同一条曲线——加年级时必须按该年级的实际题量校准`,
      ).toBeUndefined()
      seen.set(curve, grade)
    }
  })
})

describe('等级换算', () => {
  it('初始为 1 级', () => {
    expect(levelFromExp(0, G1)).toBe(1)
  })

  it('不会超过最高等级', () => {
    expect(levelFromExp(999_999, G1)).toBe(MAX_LEVEL)
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
      const p = levelProgress(exp, G1)
      expect(p.ratio).toBeGreaterThanOrEqual(0)
      expect(p.ratio).toBeLessThanOrEqual(1)
    }
  })

  it('满级时进度为满，且不再要求经验', () => {
    const p = levelProgress(curveOf(G1)[MAX_LEVEL]!, G1)
    expect(p.isMax).toBe(true)
    expect(p.ratio).toBe(1)
    expect(p.expToNextLevel).toBe(0)
  })

  it('刚升级时进度归零', () => {
    const p = levelProgress(curveOf(G1)[3]!, G1)
    expect(p.level).toBe(3)
    expect(p.expInLevel).toBe(0)
  })
})

describe('经验结算', () => {
  it('识别出升级与形态变化', () => {
    const curve = curveOf(G1)
    expect(applyExpGain(0, 5, G1).leveledUp).toBe(false)

    const levelUp = applyExpGain(0, 20, G1)
    expect(levelUp.leveledUp).toBe(true)
    expect(levelUp.stageChanged).toBe(false)

    // 跨到 3 级 = 破壳（形态每 2 级一变）
    const hatch = applyExpGain(curve[2]!, curve[3]! - curve[2]!, G1)
    expect(hatch.toLevel).toBe(3)
    expect(hatch.stageChanged).toBe(true)
  })

  it('⭐ 经验只增不减，负数增益被忽略', () => {
    expect(applyExpGain(100, -50, G1).exp).toBe(100)
    expect(applyExpGain(0, -10, G1).exp).toBe(0)
  })

  it('订正答对也有经验，但低于首次答对', () => {
    expect(EXP_REWARDS.retryCorrect).toBeGreaterThan(0)
    expect(EXP_REWARDS.retryCorrect).toBeLessThan(EXP_REWARDS.correct)
  })
})
