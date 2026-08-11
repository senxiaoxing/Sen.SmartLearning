/**
 * @file 掌握度状态机 —— locked / available / learning / mastered / review 的跃迁判定
 * @layer domain  纯函数
 * @see design/02-数据库Schema.md §3.8 状态跃迁条件
 * @see design/01-知识点图谱.md §1.4 掌握度状态机
 *
 * ```
 * locked ──前置全部 mastered──> available ──首次作答──> learning
 *                                                          │
 *                                          达成三项条件     │
 *                                                          ↓
 *                                                      mastered ⇄ review
 * ```
 */

import { isDue } from '@/domain/time'
import type { IsoDateTime, KnowledgePoint, Mastery, MasteryState } from '@/domain/types'

/**
 * 判定「已掌握」需要同时满足的三个条件。
 *
 * 三条缺一不可：
 * - 只看分数 → 蒙对几道高难度题就能达标
 * - 只看连对 → 连对 5 道简单题不代表掌握
 * - 不看总量 → 做过 3 道题就判定掌握，样本太小
 */
const MASTERED_MIN_CONSECUTIVE_CORRECT = 5
const MASTERED_MIN_ATTEMPTS = 8

/**
 * 已掌握的知识点连续答错几次会回退到 learning。
 *
 * 设为 2 而不是 1：孩子手滑点错、走神一次很常见，
 * 一次失误就把辛苦掌握的知识点打回去，既不准确也打击积极性。
 */
const MASTERED_REGRESSION_WRONG_STREAK = 2

/**
 * 计算作答后的新状态。
 *
 * ⚠️ 本函数**不处理 `locked → available`**——解锁需要检查前置知识点的掌握情况，
 * 那是整张图谱层面的判定，属于 `scheduler/unlockGraph.ts` 的职责。
 * 这里只处理「这个知识点自身作答后」的状态变化。
 *
 * @param mastery - 已更新过分数与连对/连错计数的掌握度记录
 * @param kp - 对应知识点，提供 `targetMastery` 阈值
 * @param isCorrect - 本次是否答对
 * @returns 新状态
 *
 * @example
 * // 达标：分数 0.9 ≥ 0.85，连对 6 ≥ 5，总题量 12 ≥ 8
 * nextMasteryState({ ...m, state: 'learning', masteryScore: 0.9,
 *   consecutiveCorrect: 6, totalAttempts: 12 }, kp, true)   // 'mastered'
 */
export function nextMasteryState(
  mastery: Mastery,
  kp: KnowledgePoint,
  isCorrect: boolean,
): MasteryState {
  // locked 状态下不应该出题，若真的收到作答说明调度器有 bug，保持原状不做隐式解锁
  if (mastery.state === 'locked') return 'locked'

  if (isCorrect) {
    // 复习答对 → 回到已掌握，间隔由 SM-2 拉长
    if (mastery.state === 'review') return 'mastered'
    if (mastery.state === 'mastered') return 'mastered'
    return hasReachedMastery(mastery, kp) ? 'mastered' : 'learning'
  }

  // 复习答错 → 说明真的忘了，退回学习中重练
  if (mastery.state === 'review') return 'learning'

  // 已掌握但连续错 2 次 → 掌握度回退
  if (mastery.state === 'mastered') {
    return mastery.consecutiveWrong >= MASTERED_REGRESSION_WRONG_STREAK ? 'learning' : 'mastered'
  }

  return 'learning'
}

/**
 * 是否达到「已掌握」标准。三个条件必须同时满足。
 *
 * @param mastery - 掌握度记录
 * @param kp - 知识点，关键节点的 `targetMastery` 为 0.95，普通节点 0.85
 *
 * @example
 * hasReachedMastery({ masteryScore: 0.9, consecutiveCorrect: 5, totalAttempts: 10 }, normalKp) // true
 * hasReachedMastery({ masteryScore: 0.9, consecutiveCorrect: 5, totalAttempts: 10 }, keyNodeKp) // false（需 0.95）
 */
export function hasReachedMastery(mastery: Mastery, kp: KnowledgePoint): boolean {
  return (
    mastery.masteryScore >= kp.targetMastery &&
    mastery.consecutiveCorrect >= MASTERED_MIN_CONSECUTIVE_CORRECT &&
    mastery.totalAttempts >= MASTERED_MIN_ATTEMPTS
  )
}

/**
 * 把到期的 `mastered` 记录转为 `review`。
 *
 * 由会话开始时批量调用，而非作答时——复习到期是时间驱动的，
 * 孩子不碰这个知识点它也会到期。
 *
 * @param mastery - 掌握度记录
 * @param now - 当前时间
 * @returns 到期则返回 `'review'`，否则返回原状态
 *
 * @example
 * applyDueTransition({ state: 'mastered', dueAt: '2026-08-01T00:00:00Z' }, '2026-08-05T00:00:00Z')
 * // 'review'
 */
export function applyDueTransition(mastery: Mastery, now: IsoDateTime): MasteryState {
  if (mastery.state === 'mastered' && isDue(mastery.dueAt, now)) {
    return 'review'
  }
  return mastery.state
}
