/**
 * @file selectRetryItems 单测 —— 聚焦几个知识点、绝不升难度，是这一轮能否清掉错题的关键
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_RETRY_KNOWLEDGE_POINTS,
  selectRetryItems,
  type WrongKpCount,
} from '@/domain/scheduler/selectRetryItems'
import { DEFAULT_RESOLVE_STREAK } from '@/domain/report/hasStreakAfter'
import { isoFromString, nowIso } from '@/domain/time'
import type { Difficulty, Mastery } from '@/domain/types'

function mastery(kpId: string, currentDifficulty: Difficulty = 2): Mastery {
  return {
    id: crypto.randomUUID(),
    profileId: 'p1' as Mastery['profileId'],
    kpId,
    subject: 'math',
    state: 'learning',
    masteryScore: 0.5,
    currentDifficulty,
    totalAttempts: 10,
    correctAttempts: 6,
    consecutiveCorrect: 0,
    consecutiveWrong: 1,
    avgResponseTimeMs: 4000,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
    dueAt: isoFromString('2026-08-10T00:00:00Z'),
    misconceptionCounts: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

function mapOf(...kpIds: string[]): Map<string, Mastery> {
  return new Map(kpIds.map((id) => [id, mastery(id)]))
}

const TWO_KPS: WrongKpCount[] = [
  { kpId: 'M5.2', count: 3 },
  { kpId: 'M6.1', count: 1 },
]

describe('selectRetryItems', () => {
  it('没有待订正知识点时返回空', () => {
    expect(selectRetryItems({ wrongKps: [], count: 10, masteryMap: mapOf() })).toEqual([])
  })

  it('题量为 0 时返回空', () => {
    expect(
      selectRetryItems({ wrongKps: TWO_KPS, count: 0, masteryMap: mapOf('M5.2', 'M6.1') }),
    ).toEqual([])
  })

  it('排满请求的题量', () => {
    const plan = selectRetryItems({
      wrongKps: TWO_KPS,
      count: 10,
      masteryMap: mapOf('M5.2', 'M6.1'),
    })
    expect(plan).toHaveLength(10)
  })

  it('⭐ 轮流出题，不是分块', () => {
    const plan = selectRetryItems({
      wrongKps: TWO_KPS,
      count: 4,
      masteryMap: mapOf('M5.2', 'M6.1'),
    })
    expect(plan.map((p) => p.kpId)).toEqual(['M5.2', 'M6.1', 'M5.2', 'M6.1'])
  })

  it('错题多的知识点排在前面', () => {
    const plan = selectRetryItems({
      wrongKps: [
        { kpId: 'M6.1', count: 1 },
        { kpId: 'M5.2', count: 9 },
      ],
      count: 2,
      masteryMap: mapOf('M5.2', 'M6.1'),
    })
    expect(plan[0]?.kpId).toBe('M5.2')
  })

  describe(`⭐ 最多聚焦 ${MAX_RETRY_KNOWLEDGE_POINTS} 个知识点`, () => {
    const manyKps: WrongKpCount[] = [
      { kpId: 'M1.1', count: 5 },
      { kpId: 'M2.1', count: 4 },
      { kpId: 'M3.1', count: 3 },
      { kpId: 'M4.1', count: 2 },
      { kpId: 'M5.1', count: 1 },
    ]
    const map = mapOf('M1.1', 'M2.1', 'M3.1', 'M4.1', 'M5.1')

    it('只取错题最多的前几个', () => {
      const plan = selectRetryItems({ wrongKps: manyKps, count: 12, masteryMap: map })
      expect(new Set(plan.map((p) => p.kpId)).size).toBe(MAX_RETRY_KNOWLEDGE_POINTS)
      expect(new Set(plan.map((p) => p.kpId))).toEqual(new Set(['M1.1', 'M2.1', 'M3.1']))
    })

    it(`⭐ 一轮 10 题下，每个知识点的题数够达成连对 ${DEFAULT_RESOLVE_STREAK} 次`, () => {
      const plan = selectRetryItems({ wrongKps: manyKps, count: 10, masteryMap: map })

      const perKp = new Map<string, number>()
      for (const p of plan) perKp.set(p.kpId, (perKp.get(p.kpId) ?? 0) + 1)

      for (const [kpId, n] of perKp) {
        expect(n, `${kpId} 只排了 ${n} 题，清不掉错题`).toBeGreaterThanOrEqual(
          DEFAULT_RESOLVE_STREAK,
        )
      }
    })
  })

  describe('⭐ 难度绝不上调', () => {
    it('沿用该知识点当前档位', () => {
      const map = new Map([['M5.2', mastery('M5.2', 2)]])
      const plan = selectRetryItems({
        wrongKps: [{ kpId: 'M5.2', count: 1 }],
        count: 3,
        masteryMap: map,
      })
      expect(plan.every((p) => p.difficulty === 2)).toBe(true)
    })

    it('当前是难度 3 也不会更高（本来就是上限）', () => {
      const map = new Map([['M5.2', mastery('M5.2', 3)]])
      const plan = selectRetryItems({
        wrongKps: [{ kpId: 'M5.2', count: 1 }],
        count: 2,
        masteryMap: map,
      })
      expect(plan.every((p) => p.difficulty === 3)).toBe(true)
    })
  })

  it('source 一律标为 remedial', () => {
    const plan = selectRetryItems({
      wrongKps: TWO_KPS,
      count: 4,
      masteryMap: mapOf('M5.2', 'M6.1'),
    })
    expect(plan.every((p) => p.source === 'remedial')).toBe(true)
  })

  describe('排除出不了题的知识点', () => {
    it('没有掌握度记录的跳过', () => {
      const plan = selectRetryItems({
        wrongKps: TWO_KPS,
        count: 4,
        masteryMap: mapOf('M5.2'),
      })
      expect(new Set(plan.map((p) => p.kpId))).toEqual(new Set(['M5.2']))
    })

    it('⭐ 不在 answerableKpIds 里的跳过，否则组装阶段会静默少题', () => {
      const plan = selectRetryItems({
        wrongKps: TWO_KPS,
        count: 4,
        masteryMap: mapOf('M5.2', 'M6.1'),
        answerableKpIds: new Set(['M5.2']),
      })
      expect(new Set(plan.map((p) => p.kpId))).toEqual(new Set(['M5.2']))
    })

    it('全都出不了题时返回空，而不是排出做不了的计划', () => {
      const plan = selectRetryItems({
        wrongKps: TWO_KPS,
        count: 4,
        masteryMap: mapOf('M5.2', 'M6.1'),
        answerableKpIds: new Set<string>(),
      })
      expect(plan).toEqual([])
    })
  })
})
