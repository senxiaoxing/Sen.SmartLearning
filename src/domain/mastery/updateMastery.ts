/**
 * @file 掌握度更新 —— 一次作答如何改变对某个知识点的掌握判断
 * @layer domain  纯函数
 * @see design/02-数据库Schema.md §3.8 masteryScore 更新公式
 *
 * 这是自适应系统的心脏：调度器出什么题、什么时候复习、家长报告说什么，
 * 全部由这里产出的 `Mastery` 决定。
 */

import {
  nextSchedule,
  toRecallQuality,
  DEFAULT_BASELINE_MS,
  DEFAULT_EASE_FACTOR,
} from '@/domain/mastery/spacedRepetition'
import { nextMasteryState } from '@/domain/mastery/stateMachine'
import { clamp, ema, roundTo } from '@/domain/numeric'
import { addDays } from '@/domain/time'
import type { Attempt, IsoDateTime, KnowledgePoint, Mastery, Uuid } from '@/domain/types'

/**
 * 掌握度分数的 EMA 权重。
 *
 * 0.3 是实测手感最好的取值：低于此值对孩子的进步反应太迟钝（要十几道题才看出变化），
 * 高于此值又会因一次手滑答错而大幅回退，让孩子觉得「明明会了却被打回去」。
 */
const SCORE_ALPHA = 0.3

/** 反应时间的 EMA 权重。比分数更平滑，避免一次走神就把基准拉偏 */
const RESPONSE_TIME_ALPHA = 0.2

/** 反应时间的有效区间（毫秒）。超出即视为异常样本并截断 */
const MIN_VALID_RESPONSE_MS = 500
const MAX_VALID_RESPONSE_MS = 30_000

/**
 * 难度加权系数。
 *
 * 答对高难度题加分更多，答错低难度题扣分更多——
 * 否则孩子刷一堆难度 1 的题也能把掌握度刷到 0.95，而那并不代表掌握。
 */
function difficultyWeight(difficulty: 1 | 2 | 3, isCorrect: boolean): number {
  return isCorrect ? 0.7 + difficulty * 0.15 : 1.3 - difficulty * 0.15
}

/**
 * 创建一条新的掌握度记录。
 *
 * 新知识点默认为 `locked`，由 `scheduler/unlockGraph.ts` 依据前置完成情况解锁。
 * 无前置的入口知识点会被立刻置为 `available`。
 *
 * @param id - 预生成的 UUID（由调用方用 `crypto.randomUUID()` 提供，保持本函数纯净）
 * @param profileId - 档案 ID
 * @param kp - 知识点
 * @param now - 当前时间
 *
 * @example
 * createMastery(crypto.randomUUID(), profileId, kp, nowIso())
 */
export function createMastery(
  id: Uuid,
  profileId: Uuid,
  kp: KnowledgePoint,
  now: IsoDateTime,
): Mastery {
  return {
    id,
    profileId,
    kpId: kp.id,
    subject: kp.subject,
    state: kp.prerequisites.length === 0 ? 'available' : 'locked',
    masteryScore: 0,
    currentDifficulty: 1,
    totalAttempts: 0,
    correctAttempts: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    avgResponseTimeMs: DEFAULT_BASELINE_MS,
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    dueAt: addDays(now, 1),
    misconceptionCounts: {},
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 依据一次作答更新掌握度。
 *
 * 处理顺序：
 * 1. 计数（总数、正确数、连对、连错）
 * 2. 分数（难度加权的 EMA）
 * 3. 反应时间基准（截断异常值后 EMA）
 * 4. 认知误区累计 —— ⭐ 定向补救的触发依据
 * 5. 间隔重复排期（SM-2）
 * 6. 状态跃迁
 *
 * ⚠️ **订正（`attempt.isRetry`）不参与间隔重复排期**：
 * 刚做错马上重做，答对了也不代表记住了，让它拉长复习间隔会造成虚假的掌握感。
 * 但它仍计入分数与误区统计——订正过程本身有学习价值。
 *
 * @param current - 当前掌握度记录
 * @param attempt - 本次作答
 * @param kp - 对应知识点，提供 `targetMastery` 阈值
 * @param now - 当前时间，由调用方注入以保证可测试
 * @returns 更新后的掌握度记录（新对象，不修改入参）
 *
 * @example
 * // 答对一道难度 2 的题，分数从 0.5 升到约 0.65
 * const next = updateMastery(current, correctAttempt, kp, now)
 * // 若命中 no_carry，next.misconceptionCounts.no_carry 加 1
 */
export function updateMastery(
  current: Mastery,
  attempt: Attempt,
  kp: KnowledgePoint,
  now: IsoDateTime,
): Mastery {
  const { isCorrect, difficulty } = attempt

  const totalAttempts = current.totalAttempts + 1
  const correctAttempts = current.correctAttempts + (isCorrect ? 1 : 0)
  const consecutiveCorrect = isCorrect ? current.consecutiveCorrect + 1 : 0
  const consecutiveWrong = isCorrect ? 0 : current.consecutiveWrong + 1

  const target = isCorrect ? 1 : 0
  const weighted = ema(
    current.masteryScore,
    target,
    SCORE_ALPHA * difficultyWeight(difficulty, isCorrect),
  )
  const masteryScore = roundTo(clamp(weighted, 0, 1))

  const validResponseMs = clamp(
    attempt.responseTimeMs,
    MIN_VALID_RESPONSE_MS,
    MAX_VALID_RESPONSE_MS,
  )
  const avgResponseTimeMs = Math.round(
    ema(current.avgResponseTimeMs, validResponseMs, RESPONSE_TIME_ALPHA),
  )

  const misconceptionCounts = { ...current.misconceptionCounts }
  if (attempt.misconceptionTag !== undefined) {
    const tag = attempt.misconceptionTag
    misconceptionCounts[tag] = (misconceptionCounts[tag] ?? 0) + 1
  }

  const withCounters: Mastery = {
    ...current,
    totalAttempts,
    correctAttempts,
    consecutiveCorrect,
    consecutiveWrong,
    masteryScore,
    avgResponseTimeMs,
    misconceptionCounts,
    currentDifficulty: difficulty,
    firstPracticedAt: current.firstPracticedAt ?? now,
    lastPracticedAt: now,
    updatedAt: now,
  }

  // 订正不影响复习排期，避免「刚错完立刻改对」被当成长期记忆
  const schedule = attempt.isRetry
    ? {
        repetitions: current.repetitions,
        intervalDays: current.intervalDays,
        easeFactor: current.easeFactor,
        dueAt: current.dueAt,
      }
    : nextSchedule(
        withCounters,
        toRecallQuality(isCorrect, attempt.responseTimeMs, current.avgResponseTimeMs),
        now,
      )

  const scheduled: Mastery = { ...withCounters, ...schedule }
  const state = nextMasteryState(scheduled, kp, isCorrect)

  return {
    ...scheduled,
    state,
    masteredAt:
      state === 'mastered' && current.state !== 'mastered'
        ? now
        : state === 'mastered'
          ? current.masteredAt
          : undefined,
  }
}
