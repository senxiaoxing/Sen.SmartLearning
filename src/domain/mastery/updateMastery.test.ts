/**
 * @file 掌握度更新测试
 * @layer domain
 *
 * 掌握度错了在 UI 上完全看不出来——孩子只会觉得「题目怎么老出这个」
 * 或「明明会了还不给过」。只有测试能验证公式和跃迁条件。
 */

import { describe, expect, it } from 'vitest'
import { createMastery, updateMastery } from '@/domain/mastery/updateMastery'
import { isoFromString } from '@/domain/time'
import type { Attempt, KnowledgePoint, Mastery, MisconceptionTag } from '@/domain/types'

const NOW = isoFromString('2026-08-05T10:00:00.000Z')

const normalKp: KnowledgePoint = {
  id: 'M4.5', subject: 'math', unit: 'M4', unitName: '10以内加减法', name: '6~10 的加法',
  grade: '1A', order: 1, prerequisites: ['M4.2'], itemTypes: ['input_number'], difficulty: 2,
  isKeyNode: false, targetMastery: 0.85, estimatedItems: 30, misconceptions: [],
  collectionCardId: 'card-M4.5',
}

const keyKp: KnowledgePoint = { ...normalKp, id: 'M3.3', isKeyNode: true, targetMastery: 0.95 }

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    id: 'a1', profileId: 'p1', sessionId: 's1', kpId: normalKp.id, itemId: 'M4.5#3+4',
    difficulty: 2, isCorrect: true, responseTimeMs: 5000, hintUsed: false, ttsReplayCount: 0,
    isRetry: false, createdAt: NOW, localDate: '2026-08-05' as Attempt['localDate'], ...over,
  }
}

function fresh(over: Partial<Mastery> = {}): Mastery {
  return { ...createMastery('m1', 'p1', normalKp, NOW), ...over }
}

/** 连续答对 n 次，返回最终掌握度 */
function answerCorrectly(start: Mastery, times: number, kp = normalKp): Mastery {
  let m = start
  for (let i = 0; i < times; i++) {
    m = updateMastery(m, attempt({ kpId: kp.id }), kp, NOW)
  }
  return m
}

describe('createMastery', () => {
  it('无前置的知识点直接可用，有前置的锁定', () => {
    const root = createMastery('m1', 'p1', { ...normalKp, prerequisites: [] }, NOW)
    expect(root.state).toBe('available')
    expect(createMastery('m2', 'p1', normalKp, NOW).state).toBe('locked')
  })

  it('初始分数为 0，难度为 1', () => {
    const m = createMastery('m1', 'p1', normalKp, NOW)
    expect(m.masteryScore).toBe(0)
    expect(m.currentDifficulty).toBe(1)
    expect(m.consecutiveWrong).toBe(0)
  })
})

describe('分数计算', () => {
  it('答对提升分数，答错降低分数', () => {
    const base = fresh({ state: 'learning', masteryScore: 0.5 })
    expect(updateMastery(base, attempt(), normalKp, NOW).masteryScore).toBeGreaterThan(0.5)
    expect(
      updateMastery(base, attempt({ isCorrect: false }), normalKp, NOW).masteryScore,
    ).toBeLessThan(0.5)
  })

  it('答对高难度题比答对低难度题加分多', () => {
    const base = fresh({ state: 'learning', masteryScore: 0.5 })
    const easy = updateMastery(base, attempt({ difficulty: 1 }), normalKp, NOW)
    const hard = updateMastery(base, attempt({ difficulty: 3 }), normalKp, NOW)
    expect(hard.masteryScore).toBeGreaterThan(easy.masteryScore)
  })

  it('答错低难度题比答错高难度题扣分多', () => {
    const base = fresh({ state: 'learning', masteryScore: 0.8 })
    const easy = updateMastery(base, attempt({ isCorrect: false, difficulty: 1 }), normalKp, NOW)
    const hard = updateMastery(base, attempt({ isCorrect: false, difficulty: 3 }), normalKp, NOW)
    expect(easy.masteryScore).toBeLessThan(hard.masteryScore)
  })

  it('分数始终落在 [0, 1] 且无浮点噪声', () => {
    let m = fresh({ state: 'learning' })
    for (let i = 0; i < 50; i++) {
      m = updateMastery(m, attempt({ isCorrect: i % 3 !== 0 }), normalKp, NOW)
      expect(m.masteryScore).toBeGreaterThanOrEqual(0)
      expect(m.masteryScore).toBeLessThanOrEqual(1)
      expect(String(m.masteryScore).replace('0.', '').length).toBeLessThanOrEqual(4)
    }
  })
})

describe('计数与认知误区', () => {
  it('连对连错计数互斥归零', () => {
    let m = answerCorrectly(fresh({ state: 'learning' }), 3)
    expect(m.consecutiveCorrect).toBe(3)
    expect(m.consecutiveWrong).toBe(0)

    m = updateMastery(m, attempt({ isCorrect: false }), normalKp, NOW)
    expect(m.consecutiveCorrect).toBe(0)
    expect(m.consecutiveWrong).toBe(1)
  })

  it('⭐ 认知误区累计，作为定向补救的触发依据', () => {
    let m = fresh({ state: 'learning' })
    const tag: MisconceptionTag = 'no_carry'
    for (let i = 0; i < 3; i++) {
      m = updateMastery(m, attempt({ isCorrect: false, misconceptionTag: tag }), normalKp, NOW)
    }
    expect(m.misconceptionCounts.no_carry).toBe(3)
  })

  it('答对时不记误区', () => {
    const m = updateMastery(fresh({ state: 'learning' }), attempt(), normalKp, NOW)
    expect(Object.keys(m.misconceptionCounts)).toHaveLength(0)
  })

  it('异常反应时间被截断，不污染基准', () => {
    const base = fresh({ state: 'learning', avgResponseTimeMs: 6000 })
    // 孩子走神 5 分钟
    const m = updateMastery(base, attempt({ responseTimeMs: 300_000 }), normalKp, NOW)
    expect(m.avgResponseTimeMs).toBeLessThan(12_000)
  })
})

describe('状态跃迁', () => {
  it('达成三项条件才判定掌握', () => {
    // 连对 8 次：分数超阈值、连对 ≥5、总量 ≥8
    const m = answerCorrectly(fresh({ state: 'learning' }), 8)
    expect(m.state).toBe('mastered')
    expect(m.masteredAt).toBe(NOW)
  })

  it('分数够但题量不足时不判定掌握', () => {
    const m = fresh({ state: 'learning', masteryScore: 0.9, consecutiveCorrect: 5, totalAttempts: 5 })
    expect(updateMastery(m, attempt(), normalKp, NOW).state).toBe('learning')
  })

  it('关键节点需要更高的分数阈值', () => {
    // 同样连对 8 次，普通节点已掌握，关键节点（0.95）仍在学习中
    expect(answerCorrectly(fresh({ state: 'learning' }), 8, normalKp).state).toBe('mastered')
    expect(answerCorrectly(fresh({ state: 'learning' }), 8, keyKp).state).toBe('learning')
  })

  it('复习答对回到 mastered，答错退回 learning', () => {
    const inReview = fresh({ state: 'review', masteryScore: 0.9, totalAttempts: 20 })
    expect(updateMastery(inReview, attempt(), normalKp, NOW).state).toBe('mastered')
    expect(updateMastery(inReview, attempt({ isCorrect: false }), normalKp, NOW).state).toBe(
      'learning',
    )
  })

  it('已掌握的知识点错一次不回退，连错两次才回退', () => {
    const mastered = fresh({ state: 'mastered', masteryScore: 0.9, totalAttempts: 20 })
    const once = updateMastery(mastered, attempt({ isCorrect: false }), normalKp, NOW)
    expect(once.state, '错一次应保持 mastered—孩子手滑很常见').toBe('mastered')

    const twice = updateMastery(once, attempt({ isCorrect: false }), normalKp, NOW)
    expect(twice.state).toBe('learning')
    expect(twice.masteredAt).toBeUndefined()
  })

  it('locked 状态不会被隐式解锁', () => {
    const locked = fresh({ state: 'locked' })
    expect(updateMastery(locked, attempt(), normalKp, NOW).state).toBe('locked')
  })
})

describe('间隔重复', () => {
  it('答对推进复习间隔', () => {
    const m1 = updateMastery(fresh({ state: 'learning' }), attempt(), normalKp, NOW)
    expect(m1.repetitions).toBe(1)
    expect(m1.intervalDays).toBe(1)

    const m2 = updateMastery(m1, attempt(), normalKp, NOW)
    expect(m2.repetitions).toBe(2)
    expect(m2.intervalDays).toBe(3)
  })

  it('答错重置间隔但保留难度因子', () => {
    const m = fresh({ state: 'learning', repetitions: 5, intervalDays: 20, easeFactor: 2.1 })
    const next = updateMastery(m, attempt({ isCorrect: false }), normalKp, NOW)
    expect(next.repetitions).toBe(0)
    expect(next.intervalDays).toBe(1)
    expect(next.easeFactor, '难度因子记录长期难度，不该因一次失误抹掉').toBe(2.1)
  })

  it('⭐ 订正不影响复习排期', () => {
    const m = fresh({ state: 'learning', repetitions: 3, intervalDays: 8, easeFactor: 2.5 })
    const next = updateMastery(m, attempt({ isRetry: true }), normalKp, NOW)
    expect(next.repetitions).toBe(3)
    expect(next.intervalDays).toBe(8)
    expect(next.dueAt).toBe(m.dueAt)
    // 但分数和计数照常更新——订正过程本身有学习价值
    expect(next.masteryScore).toBeGreaterThan(m.masteryScore)
    expect(next.totalAttempts).toBe(m.totalAttempts + 1)
  })

  it('秒答错与深思后答错都会重置间隔', () => {
    const m = fresh({ state: 'learning', repetitions: 3, intervalDays: 8 })
    for (const responseTimeMs of [800, 15_000]) {
      const next = updateMastery(m, attempt({ isCorrect: false, responseTimeMs }), normalKp, NOW)
      expect(next.intervalDays).toBe(1)
    }
  })
})

describe('不可变性', () => {
  it('不修改传入的掌握度对象', () => {
    const m = fresh({ state: 'learning', masteryScore: 0.5 })
    const snapshot = JSON.stringify(m)
    updateMastery(m, attempt(), normalKp, NOW)
    expect(JSON.stringify(m)).toBe(snapshot)
  })
})
