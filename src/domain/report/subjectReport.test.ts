/**
 * @file subjectReport 单测 —— 正确率的空态与误区排序是家长看到的第一屏
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { MAX_REPORTED_MISCONCEPTIONS, buildSubjectReport } from '@/domain/report/subjectReport'
import { isoFromString, localDateFromString, nowIso } from '@/domain/time'
import type { Mastery, MisconceptionTag, Session } from '@/domain/types'

function mastery(over: Partial<Mastery> = {}): Mastery {
  return {
    id: crypto.randomUUID(),
    profileId: 'p1' as Mastery['profileId'],
    kpId: 'M5.2',
    subject: 'math',
    state: 'learning',
    masteryScore: 0.5,
    currentDifficulty: 2,
    totalAttempts: 10,
    correctAttempts: 7,
    consecutiveCorrect: 1,
    consecutiveWrong: 0,
    avgResponseTimeMs: 4000,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
    dueAt: isoFromString('2026-08-10T00:00:00Z'),
    misconceptionCounts: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...over,
  }
}

function session(activeDurationMs: number): Session {
  return {
    id: crypto.randomUUID(),
    profileId: 'p1' as Session['profileId'],
    mode: 'daily',
    subject: 'math',
    startedAt: nowIso(),
    durationMs: activeDurationMs + 60_000,
    activeDurationMs,
    itemCount: 10,
    correctCount: 8,
    pointsEarned: 16,
    kpIdsTouched: ['M5.2'],
    completedNormally: true,
    localDate: localDateFromString('2026-08-09'),
  }
}

const EMPTY_INPUT = {
  subject: 'math' as const,
  masteryList: [],
  sessions: [],
  answerableKpIds: new Set<string>(),
}

describe('buildSubjectReport', () => {
  describe('⭐ 正确率的空态', () => {
    it('一道题都没做时 accuracy 为 null，而不是 0', () => {
      expect(buildSubjectReport(EMPTY_INPUT).accuracy).toBeNull()
    })

    it('掌握度记录存在但一题没做过，仍是 null', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [mastery({ totalAttempts: 0, correctAttempts: 0 })],
      })
      expect(report.accuracy).toBeNull()
    })

    it('全做错时才是 0', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [mastery({ totalAttempts: 4, correctAttempts: 0 })],
      })
      expect(report.accuracy).toBe(0)
    })

    it('题量跨知识点累加，正确率等于答对数除以总数', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [
          mastery({ kpId: 'M5.2', totalAttempts: 3, correctAttempts: 3 }),
          mastery({ kpId: 'M5.3', totalAttempts: 1, correctAttempts: 0 }),
        ],
      })
      expect(report.totalAttempts).toBe(4)
      expect(report.correctAttempts).toBe(3)
      expect(report.accuracy).toBe(0.75)
    })
  })

  describe('掌握进度', () => {
    it('mastered 与 review 都算已掌握——review 是到期复习，不是倒退', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [
          mastery({ kpId: 'M1.1', state: 'mastered' }),
          mastery({ kpId: 'M1.2', state: 'review' }),
          mastery({ kpId: 'M1.3', state: 'learning' }),
          mastery({ kpId: 'M1.4', state: 'locked' }),
        ],
      })
      expect(report.masteredCount).toBe(2)
      expect(report.learningKpIds).toEqual(['M1.3'])
    })

    it('分母是「出得了题的知识点数」，不是图谱总数', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        answerableKpIds: new Set(['M5.1', 'M5.2', 'M5.3']),
      })
      expect(report.answerableCount).toBe(3)
    })
  })

  describe('⭐ 薄弱点统计', () => {
    it('同一误区跨知识点累加，并记下涉及哪些知识点', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [
          mastery({ kpId: 'M5.2', misconceptionCounts: { no_carry: 4 } }),
          mastery({ kpId: 'M5.3', misconceptionCounts: { no_carry: 3 } }),
        ],
      })

      expect(report.topMisconceptions).toHaveLength(1)
      expect(report.topMisconceptions[0]).toMatchObject({ tag: 'no_carry', count: 7 })
      expect(report.topMisconceptions[0]?.kpIds).toEqual(['M5.2', 'M5.3'])
    })

    it('按次数降序——家长要先管最严重的那个', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [
          mastery({
            misconceptionCounts: { no_carry: 2, carry_lost: 9, ten_split_wrong: 5 },
          }),
        ],
      })
      expect(report.topMisconceptions.map((m) => m.tag)).toEqual([
        'carry_lost',
        'ten_split_wrong',
        'no_carry',
      ])
    })

    it('计数为 0 的误区不出现', () => {
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [mastery({ misconceptionCounts: { no_carry: 0 } })],
      })
      expect(report.topMisconceptions).toEqual([])
    })

    it(`最多列 ${MAX_REPORTED_MISCONCEPTIONS} 条，列太多等于没有重点`, () => {
      const counts: Partial<Record<MisconceptionTag, number>> = {
        no_carry: 9,
        carry_lost: 8,
        ten_split_wrong: 7,
        no_borrow: 6,
        borrow_lost: 5,
        digit_concat: 4,
        sub_instead: 3,
      }
      const report = buildSubjectReport({
        ...EMPTY_INPUT,
        masteryList: [mastery({ misconceptionCounts: counts })],
      })
      expect(report.topMisconceptions).toHaveLength(MAX_REPORTED_MISCONCEPTIONS)
    })
  })

  it('专注时长取 activeDurationMs 之和，不含挂机', () => {
    const report = buildSubjectReport({
      ...EMPTY_INPUT,
      sessions: [session(300_000), session(600_000)],
    })
    expect(report.activeDurationMs).toBe(900_000)
  })
})
