/**
 * @file 最近若干天的学习趋势 —— 回答家长「她这周有没有在坚持」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.7  attempts.localDate 按本地时区冻结
 *
 * 按 `localDate` 而非 `createdAt` 分组：晚上 8 点做的题必须算今天。
 * `localDate` 在写入时就按本地时区冻结了，这里直接用，**永不重算**。
 */

import { addLocalDays } from '@/domain/time'
import type { Attempt, LocalDate } from '@/domain/types'

export interface DayStat {
  localDate: LocalDate
  total: number
  correct: number
}

/** 趋势默认看多少天。7 天正好是一周，家长能对上「这周」的直觉 */
export const DEFAULT_TREND_DAYS = 7

/**
 * 统计最近若干天每天的作答量。
 *
 * **没做题的那天也会出现在结果里**（`total: 0`），而不是被跳过——
 * 趋势的意义有一半在于看见空档，跳过空天会让断了三天看起来像连续学习。
 *
 * @param attempts - 作答记录，可以是单科的也可以是全部
 * @param endDate - 区间的最后一天，通常是今天
 * @param days - 往前看几天，含 `endDate` 当天
 * @returns 按日期升序排列，长度恒等于 `days`
 *
 * @example
 * buildDailyTrend(attempts, '2026-08-09', 3)
 * // [ { localDate: '2026-08-07', total: 20, correct: 17 },
 * //   { localDate: '2026-08-08', total: 0,  correct: 0  },   ← 断档也要显示
 * //   { localDate: '2026-08-09', total: 10, correct: 9  } ]
 */
export function buildDailyTrend(
  attempts: readonly Attempt[],
  endDate: LocalDate,
  days: number = DEFAULT_TREND_DAYS,
): DayStat[] {
  const buckets = new Map<string, DayStat>()

  for (let i = days - 1; i >= 0; i--) {
    const localDate = addLocalDays(endDate, -i)
    buckets.set(localDate, { localDate, total: 0, correct: 0 })
  }

  for (const attempt of attempts) {
    const bucket = buckets.get(attempt.localDate)
    if (bucket === undefined) continue
    bucket.total++
    if (attempt.isCorrect) bucket.correct++
  }

  return [...buckets.values()]
}

/**
 * 截至某天的连续学习天数（含当天，当天没做则从前一天算起为 0）。
 *
 * 只统计**连续**：中间断一天就归零。这个数字是给家长看的事实，
 * ⚠️ 不要拿它去做「断签惩罚」——CLAUDE.md 产品红线里宠物不惩罚，
 * 打卡同理，断了就是断了，重新开始即可。
 *
 * @param attempts - 作答记录
 * @param today - 今天的本地日期
 * @returns 连续天数；今天和昨天都没做则为 0
 *
 * @example
 * // 8/7、8/8、8/9 都做过题
 * currentStreak(attempts, '2026-08-09')   // 3
 */
export function currentStreak(attempts: readonly Attempt[], today: LocalDate): number {
  const practiced = new Set(attempts.map((a) => a.localDate))
  if (practiced.size === 0) return 0

  // 今天还没做不算断——她可能只是还没开始，从昨天往前数
  let cursor = practiced.has(today) ? today : addLocalDays(today, -1)
  let streak = 0

  while (practiced.has(cursor)) {
    streak++
    cursor = addLocalDays(cursor, -1)
  }

  return streak
}
