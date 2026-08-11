/**
 * @file 间隔重复排期（SM-2 变体）—— 决定一个知识点何时该复习
 * @layer domain  纯函数
 * @see design/02-数据库Schema.md §3.8 SM-2 间隔计算
 *
 * 原版 SM-2 要求学习者主观自评「刚才回忆得有多顺」（0~5 分）。
 * 一年级孩子做不到这种元认知判断，因此本实现改为**由正确性和反应时间自动推导**：
 * 又快又对 = 记牢了，对但很慢 = 还在算，秒答错 = 在乱点。
 */

import { clamp } from '@/domain/numeric'
import { addDays } from '@/domain/time'
import type { IsoDateTime, Mastery } from '@/domain/types'

/** SM-2 的回忆质量评分。>= 3 视为成功回忆 */
export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5

/** 难度因子下限。低于此值间隔增长过慢，同一知识点会没完没了地重复 */
const MIN_EASE_FACTOR = 1.3
/** 难度因子上限。高于此值间隔膨胀过快，孩子会在真正遗忘后才被安排复习 */
const MAX_EASE_FACTOR = 2.8
/** 新知识点的初始难度因子（SM-2 标准值） */
export const DEFAULT_EASE_FACTOR = 2.5

/** 首次成功复习后的间隔（天） */
const FIRST_INTERVAL_DAYS = 1
/** 第二次成功复习后的间隔（天） */
const SECOND_INTERVAL_DAYS = 3

/** 没有历史数据时的基准反应时间（毫秒）。一年级孩子读题+作答的典型耗时 */
export const DEFAULT_BASELINE_MS = 8000

/**
 * 由作答结果推导回忆质量。
 *
 * | 情况 | 质量 | 含义 |
 * |---|---|---|
 * | 对，且明显快于基准 | 5 | 已自动化，可以拉长间隔 |
 * | 对，接近基准 | 4 | 掌握了，正常推进 |
 * | 对，但明显慢于基准 | 3 | 还在硬算，间隔不宜拉太长 |
 * | 错，但认真想过 | 2 | 真的不会，需要重来 |
 * | 错，且秒答 | 1 | 在乱点，比不会更需要干预 |
 *
 * 区分「秒答错」和「想了很久答错」很重要：前者是注意力问题（该休息了或题目太枯燥），
 * 后者是知识问题（该回退到前置知识点）。两者的补救完全不同。
 *
 * @param isCorrect - 是否答对
 * @param responseTimeMs - 本次作答耗时
 * @param baselineMs - 该知识点的基准耗时，通常取 `mastery.avgResponseTimeMs`
 *
 * @example
 * toRecallQuality(true, 3000, 8000)   // 5 —— 又快又对
 * toRecallQuality(false, 900, 8000)   // 1 —— 秒答错，在乱点
 */
export function toRecallQuality(
  isCorrect: boolean,
  responseTimeMs: number,
  baselineMs: number = DEFAULT_BASELINE_MS,
): RecallQuality {
  const base = baselineMs > 0 ? baselineMs : DEFAULT_BASELINE_MS

  if (!isCorrect) {
    return responseTimeMs < base * 0.5 ? 1 : 2
  }
  if (responseTimeMs < base * 0.7) return 5
  if (responseTimeMs < base * 1.5) return 4
  return 3
}

/** SM-2 计算出的排期结果 */
export interface ScheduleResult {
  repetitions: number
  intervalDays: number
  easeFactor: number
  dueAt: IsoDateTime
}

/**
 * 计算下次复习时间。
 *
 * 回忆失败（quality < 3）时**间隔重置为 1 天、重复计数归零**，
 * 但难度因子保留——难度因子记录的是这个知识点对这个孩子的长期难度，
 * 不该因一次失误就抹掉。
 *
 * @param mastery - 当前掌握度记录
 * @param quality - 本次回忆质量，由 {@link toRecallQuality} 推导
 * @param now - 当前时间，由调用方注入以保证可测试
 * @returns 新的排期参数，调用方合并进 `Mastery`
 *
 * @example
 * // 第三次成功复习，间隔从 3 天按难度因子放大
 * nextSchedule({ ...m, repetitions: 2, intervalDays: 3, easeFactor: 2.5 }, 4, now)
 * // → { repetitions: 3, intervalDays: 8, easeFactor: 2.5, dueAt: now + 8 天 }
 */
export function nextSchedule(
  mastery: Mastery,
  quality: RecallQuality,
  now: IsoDateTime,
): ScheduleResult {
  if (quality < 3) {
    return {
      repetitions: 0,
      intervalDays: FIRST_INTERVAL_DAYS,
      easeFactor: mastery.easeFactor,
      dueAt: addDays(now, FIRST_INTERVAL_DAYS),
    }
  }

  // SM-2 原式：EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const gap = 5 - quality
  const easeFactor = clamp(
    mastery.easeFactor + (0.1 - gap * (0.08 + gap * 0.02)),
    MIN_EASE_FACTOR,
    MAX_EASE_FACTOR,
  )

  const repetitions = mastery.repetitions + 1
  const intervalDays =
    repetitions === 1
      ? FIRST_INTERVAL_DAYS
      : repetitions === 2
        ? SECOND_INTERVAL_DAYS
        : Math.max(1, Math.round(mastery.intervalDays * easeFactor))

  return {
    repetitions,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    dueAt: addDays(now, intervalDays),
  }
}
