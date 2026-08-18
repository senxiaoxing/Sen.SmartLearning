/**
 * @file 积分流水仓储的集成测试
 * @layer data
 *
 * 账本的正确性靠两件事撑着：**余额永远等于流水累加**，
 * 以及**发分与写 attempt 同生共死**。这两条错了，表现是孩子的分对不上，
 * 而对不上的账没有任何办法事后修复——流水就是唯一真相。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import { appendGrants, getBalance, sumEarnedOnDate } from '@/data/repositories/ledgerRepo'
import { recordAttempt } from '@/data/repositories/masteryRepo'
import { POINT_REWARDS } from '@/domain/economy/rewards'
import { localDateFromString, nowIso, todayLocal } from '@/domain/time'
import type { Attempt, Difficulty, Uuid } from '@/domain/types'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

/** 构造一次作答。kpId 固定用 M3.1，bootstrap 后一定有对应的掌握度记录 */
function attemptOf(
  profileId: Uuid,
  overrides: Partial<Attempt> = {},
): Attempt {
  return {
    id: crypto.randomUUID(),
    profileId,
    sessionId: 'test-session',
    kpId: 'M3.1',
    itemId: 'M3.1-gen#test',
    difficulty: 2 as Difficulty,
    isCorrect: true,
    selectedOptionId: 'opt-1',
    responseTimeMs: 4000,
    hintUsed: false,
    ttsReplayCount: 0,
    isRetry: false,
    createdAt: nowIso(),
    localDate: todayLocal(),
    ...overrides,
  }
}

describe('getBalance', () => {
  it('从未有过流水时余额为 0', async () => {
    const profileId = await bootstrap()
    expect(await getBalance(profileId)).toBe(0)
  })

  it('取的是最新一条的 balanceAfter，不是第一条', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }])
    await appendGrants(profileId, [{ delta: 15, reason: 'kp_mastered' }])
    expect(await getBalance(profileId)).toBe(17)
  })

  it('⭐ 不串档案：另一个档案的流水不计入本档案余额', async () => {
    const profileId = await bootstrap()
    const otherId = crypto.randomUUID()

    await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }])
    // 后写入的他人流水在 createdAt 索引上更靠后，反向游标会先撞到它
    await appendGrants(otherId, [{ delta: 999, reason: 'manual_adjust' }])

    expect(await getBalance(profileId)).toBe(2)
    expect(await getBalance(otherId)).toBe(999)
  })
})

describe('appendGrants', () => {
  it('空发放不写任何记录，但返回当前真实余额', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 42, reason: 'correct_answer' }])

    const result = await appendGrants(profileId, [])

    expect(result.entries).toEqual([])
    expect(result.totalDelta).toBe(0)
    expect(result.balanceAfter, '答错时也要返回真实余额').toBe(42)
    expect(await db.ledger.count()).toBe(1)
  })

  it('多笔发放各写一条，balanceAfter 链连续', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [
      { delta: 2, reason: 'correct_answer' },
      { delta: 5, reason: 'challenge_bonus' },
      { delta: 15, reason: 'kp_mastered' },
    ])

    const rows = await db.ledger.orderBy('createdAt').toArray()
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.balanceAfter)).toEqual([2, 7, 22])
    expect(await getBalance(profileId)).toBe(22)
  })

  it('每条都带 refId 与本地日期，供家长报告按天/按题回溯', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }], {
      refId: 'attempt-123',
    })

    const row = await db.ledger.toCollection().first()
    expect(row?.refId).toBe('attempt-123')
    expect(row?.localDate).toBe(todayLocal())
    expect(row?.id, '用户数据必须是 UUID，不能是自增').toMatch(/^[0-9a-f-]{36}$/i)
  })

  /**
   * 回归测试：曾经同一批流水共用一个 `createdAt`，导致「最新一条」由 UUID 主键
   * 随机决定，读余额可能读到中间那条，之后每一笔都建立在错误的基数上。
   * 毫秒精度不足以区分连续两次写入——这个断言就是防它复发的。
   */
  it('⭐ 同档案内 createdAt 严格递增，「最新一条」才有确定含义', async () => {
    const profileId = await bootstrap()

    // 一次多笔（模拟答对 + 挑战 + 掌握）
    await appendGrants(profileId, [
      { delta: 2, reason: 'correct_answer' },
      { delta: 5, reason: 'challenge_bonus' },
      { delta: 15, reason: 'kp_mastered' },
    ])
    // 紧接着的第二批，极可能落在同一毫秒
    await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }])

    const stamps = (await db.ledger.where('profileId').equals(profileId).toArray())
      .map((r) => new Date(r.createdAt).getTime())
      .sort((a, b) => a - b)

    expect(new Set(stamps).size, 'createdAt 不允许重复').toBe(stamps.length)
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i]!).toBeGreaterThan(stamps[i - 1]!)
    }
  })

  it('⭐ 连续多批发放后，余额仍等于全部 delta 之和', async () => {
    const profileId = await bootstrap()
    // 不加 await 之间的间隔，刻意制造同毫秒写入
    for (let i = 0; i < 30; i++) {
      await appendGrants(profileId, [
        { delta: 2, reason: 'correct_answer' },
        { delta: 5, reason: 'challenge_bonus' },
      ])
    }

    const rows = await db.ledger.where('profileId').equals(profileId).toArray()
    expect(rows).toHaveLength(60)
    expect(await getBalance(profileId)).toBe(rows.reduce((s, r) => s + r.delta, 0))
  })

  it('⭐ 余额从流水推导：逐条累加 delta 必须等于最终余额', async () => {
    const profileId = await bootstrap()
    for (let i = 0; i < 20; i++) {
      await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }])
    }

    const rows = await db.ledger.where('profileId').equals(profileId).toArray()
    const sum = rows.reduce((s, r) => s + r.delta, 0)
    expect(await getBalance(profileId)).toBe(sum)
  })
})

describe('⭐ 作答与积分同事务', () => {
  it('答对写 attempt 的同时入账', async () => {
    const profileId = await bootstrap()

    const outcome = await recordAttempt(attemptOf(profileId))

    expect(outcome.pointsEarned).toBe(POINT_REWARDS.correctAnswer)
    expect(outcome.balanceAfter).toBe(POINT_REWARDS.correctAnswer)
    expect(await db.attempts.count()).toBe(1)
    expect(await db.ledger.count()).toBe(1)
  })

  it('⭐ 答错记录 attempt 但不发分，也绝不扣分', async () => {
    const profileId = await bootstrap()
    await recordAttempt(attemptOf(profileId, { isCorrect: true }))

    const outcome = await recordAttempt(attemptOf(profileId, { isCorrect: false }))

    expect(outcome.pointsEarned).toBe(0)
    expect(outcome.balanceAfter, '答错后余额不变').toBe(POINT_REWARDS.correctAnswer)
    expect(await db.attempts.count()).toBe(2)
    expect(await db.ledger.count(), '答错不产生流水').toBe(1)
  })

  it('难度 3 答对额外给挑战奖励', async () => {
    const profileId = await bootstrap()

    const outcome = await recordAttempt(attemptOf(profileId, { difficulty: 3 }))

    expect(outcome.pointsEarned).toBe(
      POINT_REWARDS.correctAnswer + POINT_REWARDS.challengeBonus,
    )
    const reasons = (await db.ledger.toArray()).map((r) => r.reason)
    expect(reasons).toContain('challenge_bonus')
  })

  it('订正答对给 retry_correct，额度低于首次答对', async () => {
    const profileId = await bootstrap()

    const outcome = await recordAttempt(attemptOf(profileId, { isRetry: true, difficulty: 3 }))

    expect(outcome.pointsEarned).toBe(POINT_REWARDS.retryCorrect)
    const row = await db.ledger.toCollection().first()
    expect(row?.reason).toBe('retry_correct')
  })

  it('ledger 的 refId 指回那条 attempt', async () => {
    const profileId = await bootstrap()
    const attempt = attemptOf(profileId)

    await recordAttempt(attempt)

    const row = await db.ledger.toCollection().first()
    expect(row?.refId).toBe(attempt.id)
  })

  it('掌握度记录缺失时仍照常发分——不因系统自身问题少给孩子分', async () => {
    const profileId = await bootstrap()
    await db.mastery.where('[profileId+kpId]').equals([profileId, 'M3.1']).delete()

    const outcome = await recordAttempt(attemptOf(profileId))

    expect(outcome.mastery).toBeUndefined()
    expect(outcome.pointsEarned).toBe(POINT_REWARDS.correctAnswer)
  })

  it('连续作答的余额单调不减', async () => {
    const profileId = await bootstrap()
    let last = 0

    for (const isCorrect of [true, false, true, true, false, true]) {
      const outcome = await recordAttempt(attemptOf(profileId, { isCorrect }))
      expect(outcome.balanceAfter).toBeGreaterThanOrEqual(last)
      last = outcome.balanceAfter
    }
  })
})

describe('sumEarnedOnDate', () => {
  it('只统计当天的收入', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 2, reason: 'correct_answer' }])
    const pastDay = localDateFromString('2020-01-01')
    await appendGrants(profileId, [{ delta: 15, reason: 'kp_mastered' }], {
      localDate: pastDay,
    })

    expect(await sumEarnedOnDate(profileId, todayLocal())).toBe(2)
    expect(await sumEarnedOnDate(profileId, pastDay)).toBe(15)
  })

  it('支出不冲减「今天赚了多少」', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 20, reason: 'correct_answer' }])
    await appendGrants(profileId, [{ delta: -10, reason: 'buy_food' }])

    expect(await sumEarnedOnDate(profileId, todayLocal())).toBe(20)
    expect(await getBalance(profileId), '余额仍要反映支出').toBe(10)
  })

  it('⭐ 退款不算「赚到」—— 否则买错再撤销会显示成又赚了一笔', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 300, reason: 'correct_answer' }])
    await appendGrants(profileId, [{ delta: -300, reason: 'buy_item' }])
    await appendGrants(profileId, [{ delta: 300, reason: 'purchase_refund' }])

    expect(await sumEarnedOnDate(profileId, todayLocal()), '仍然只赚了 300').toBe(300)
    expect(await getBalance(profileId), '钱退回来了').toBe(300)
  })

  it('家长手动加分算「赚到」—— 在孩子视角就是我得到了分', async () => {
    const profileId = await bootstrap()
    await appendGrants(profileId, [{ delta: 50, reason: 'manual_adjust' }])

    expect(await sumEarnedOnDate(profileId, todayLocal())).toBe(50)
  })
})
