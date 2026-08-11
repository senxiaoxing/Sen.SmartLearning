/**
 * @file dailyTrend 单测 —— 断档天必须可见，连续天数不能多算
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { buildDailyTrend, currentStreak } from '@/domain/report/dailyTrend'
import { addLocalDays, isoFromString, localDateFromString } from '@/domain/time'
import type { Attempt } from '@/domain/types'

function attemptOn(day: string, isCorrect = true): Attempt {
  return {
    id: crypto.randomUUID(),
    profileId: 'p1' as Attempt['profileId'],
    sessionId: 's1' as Attempt['sessionId'],
    kpId: 'M5.2',
    itemId: 'M5.2-gen#9+5',
    difficulty: 2,
    isCorrect,
    selectedOptionId: 'a',
    responseTimeMs: 4000,
    hintUsed: false,
    ttsReplayCount: 0,
    isRetry: false,
    createdAt: isoFromString(`${day}T10:00:00Z`),
    localDate: localDateFromString(day),
  }
}

const TODAY = localDateFromString('2026-08-09')

describe('buildDailyTrend', () => {
  it('长度恒等于天数，含当天', () => {
    expect(buildDailyTrend([], TODAY, 7)).toHaveLength(7)
  })

  it('按日期升序，最后一个是 endDate', () => {
    const trend = buildDailyTrend([], TODAY, 3)
    expect(trend.map((d) => d.localDate)).toEqual(['2026-08-07', '2026-08-08', '2026-08-09'])
  })

  it('⭐ 没做题的那天也要出现，断档不能被跳过', () => {
    const trend = buildDailyTrend(
      [attemptOn('2026-08-07'), attemptOn('2026-08-09')],
      TODAY,
      3,
    )
    expect(trend.map((d) => d.total)).toEqual([1, 0, 1])
  })

  it('分别统计总数与答对数', () => {
    const trend = buildDailyTrend(
      [
        attemptOn('2026-08-09', true),
        attemptOn('2026-08-09', true),
        attemptOn('2026-08-09', false),
      ],
      TODAY,
      1,
    )
    expect(trend[0]).toMatchObject({ total: 3, correct: 2 })
  })

  it('区间之外的作答不计入', () => {
    const trend = buildDailyTrend([attemptOn('2026-07-01')], TODAY, 7)
    expect(trend.every((d) => d.total === 0)).toBe(true)
  })

  it('跨月边界正确回推', () => {
    const trend = buildDailyTrend([], localDateFromString('2026-09-01'), 3)
    expect(trend.map((d) => d.localDate)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01'])
  })
})

describe('currentStreak', () => {
  it('从没做过题时为 0', () => {
    expect(currentStreak([], TODAY)).toBe(0)
  })

  it('连续三天算 3', () => {
    const attempts = ['2026-08-07', '2026-08-08', '2026-08-09'].map((d) => attemptOn(d))
    expect(currentStreak(attempts, TODAY)).toBe(3)
  })

  it('⭐ 今天还没做不算断——她可能只是还没开始', () => {
    const attempts = ['2026-08-07', '2026-08-08'].map((d) => attemptOn(d))
    expect(currentStreak(attempts, TODAY)).toBe(2)
  })

  it('中间断一天就只数到断点', () => {
    const attempts = ['2026-08-05', '2026-08-06', '2026-08-08', '2026-08-09'].map((d) =>
      attemptOn(d),
    )
    expect(currentStreak(attempts, TODAY)).toBe(2)
  })

  it('今天和昨天都没做则为 0', () => {
    expect(currentStreak([attemptOn('2026-08-01')], TODAY)).toBe(0)
  })

  it('同一天做很多题只算一天', () => {
    const attempts = [attemptOn('2026-08-09'), attemptOn('2026-08-09'), attemptOn('2026-08-09')]
    expect(currentStreak(attempts, TODAY)).toBe(1)
  })

  it('跨月连续也能数对', () => {
    const end = localDateFromString('2026-09-01')
    const attempts = [end, addLocalDays(end, -1), addLocalDays(end, -2)].map((d) => attemptOn(d))
    expect(currentStreak(attempts, end)).toBe(3)
  })
})
