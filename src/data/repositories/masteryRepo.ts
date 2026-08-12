/**
 * @file 掌握度仓储 —— 读取与持久化 Mastery，并结算这次作答的积分
 * @layer data  唯一允许接触 Dexie 的层
 * @see design/02-数据库Schema.md §3.8 mastery 表
 * @see design/02-数据库Schema.md §3.12 ledger 表
 */

import { db } from '@/data/db'
import { appendGrants } from '@/data/repositories/ledgerRepo'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { rewardsForAttempt } from '@/domain/economy/rewards'
import { updateMastery } from '@/domain/mastery/updateMastery'
import { applyDueTransition } from '@/domain/mastery/stateMachine'
import { nowIso } from '@/domain/time'
import type { Attempt, IsoDateTime, Mastery, Uuid } from '@/domain/types'

/** 取某档案的全部掌握度记录 */
export async function loadAllMastery(profileId: Uuid): Promise<Mastery[]> {
  return db.mastery.where('profileId').equals(profileId).toArray()
}

/**
 * 取掌握度索引，并顺带把到期的 `mastered` 转为 `review`。
 *
 * 到期转换在读取时做而非定时任务：复习到期是纯时间驱动的，
 * 孩子不打开 App 它也会到期，没必要为此维护后台任务。
 *
 * @param profileId - 档案 ID
 * @param now - 当前时间
 * @returns kpId → Mastery 的索引
 */
export async function loadMasteryMap(
  profileId: Uuid,
  now: IsoDateTime = nowIso(),
): Promise<Map<string, Mastery>> {
  const all = await loadAllMastery(profileId)
  const changed: Mastery[] = []

  const map = new Map<string, Mastery>()
  for (const m of all) {
    const state = applyDueTransition(m, now)
    const next = state === m.state ? m : { ...m, state, updatedAt: now }
    if (next !== m) changed.push(next)
    map.set(m.kpId, next)
  }

  if (changed.length > 0) await db.mastery.bulkPut(changed)
  return map
}

/** 一次作答落库后的全部结果，供 store 决定要展示什么 */
export interface AttemptOutcome {
  /** 更新后的掌握度；知识点或掌握度记录不存在时为 undefined */
  mastery: Mastery | undefined
  /** 本次作答是否让该知识点**刚**跨过掌握门槛 */
  justMastered: boolean
  /** 本次作答赚到的积分，答错为 0 */
  pointsEarned: number
  /** 入账后的积分余额 */
  balanceAfter: number
}

/**
 * 记录一次作答：写入 attempt、更新掌握度、结算积分。
 *
 * 三件事在**同一个事务**内完成。`attempts` 表 append-only，掌握度整条覆盖，
 * 积分追加流水。任何一件单独成功都会造成不一致：只写 attempt 会让自适应失效，
 * 只更新掌握度会丢失错题记录，而漏发积分对孩子而言就是「我明明做对了却没给分」。
 *
 * 掌握度记录缺失（数据异常）时**依然照常发积分**——答对了就该给分，
 * 这和系统内部有没有建好那条记录无关，不能因为程序自己的问题少给孩子分。
 *
 * @param attempt - 本次作答，`id` 由调用方用 `newId()` 生成
 * @param now - 当前时间
 * @returns 掌握度、是否刚掌握、本次积分与余额
 *
 * @example
 * const { mastery, justMastered, pointsEarned } = await recordAttempt(attempt)
 * if (justMastered) showCollectionCardUnlocked(mastery.kpId)
 * // 难度 3 首次答对且刚掌握 → pointsEarned 22（2 + 5 + 15）
 */
export async function recordAttempt(
  attempt: Attempt,
  now: IsoDateTime = nowIso(),
): Promise<AttemptOutcome> {
  const kp = KNOWLEDGE_POINT_BY_ID.get(attempt.kpId)

  return db.transaction('rw', db.attempts, db.mastery, db.ledger, async () => {
    await db.attempts.add(attempt)

    const current =
      kp === undefined
        ? undefined
        : await db.mastery
            .where('[profileId+kpId]')
            .equals([attempt.profileId, attempt.kpId])
            .first()

    let next: Mastery | undefined
    if (kp !== undefined && current !== undefined) {
      next = updateMastery(current, attempt, kp, now)
      await db.mastery.put(next)
    }

    // 「刚」掌握的判定依赖 masteredAt 恰好等于本次作答时刻——
    // 之前就已 mastered 的知识点每次答对都会满足 state 判断，但 masteredAt 是旧的
    const justMastered = next?.state === 'mastered' && next.masteredAt === attempt.createdAt

    const grants = rewardsForAttempt({
      isCorrect: attempt.isCorrect,
      isRetry: attempt.isRetry,
      difficulty: attempt.difficulty,
      justMastered,
    })
    const settlement = await appendGrants(attempt.profileId, grants, {
      refId: attempt.id,
      now: attempt.createdAt,
      localDate: attempt.localDate,
    })

    return {
      mastery: next,
      justMastered,
      pointsEarned: settlement.totalDelta,
      balanceAfter: settlement.balanceAfter,
    }
  })
}

/** 今日作答统计，用于主页进度显示 */
export async function countTodayAttempts(
  profileId: Uuid,
  localDate: string,
): Promise<{ total: number; correct: number }> {
  const attempts = await db.attempts
    .where('[profileId+localDate]')
    .equals([profileId, localDate])
    .toArray()

  return {
    total: attempts.length,
    correct: attempts.filter((a) => a.isCorrect).length,
  }
}
