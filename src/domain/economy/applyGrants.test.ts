/**
 * @file applyGrants 单测 —— balanceAfter 链是冗余字段，算错了没人发现，必须测死
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { applyGrants } from '@/domain/economy/applyGrants'
import { rewardsForAttempt } from '@/domain/economy/rewards'

describe('applyGrants', () => {
  it('空发放不产生条目，余额原样返回', () => {
    expect(applyGrants(27, [])).toEqual({ entries: [], balanceAfter: 27, totalDelta: 0 })
  })

  it('逐笔累加，每条都带当时的结余快照', () => {
    const result = applyGrants(10, [
      { delta: 2, reason: 'correct_answer' },
      { delta: 15, reason: 'kp_mastered' },
    ])

    expect(result.entries).toEqual([
      { delta: 2, reason: 'correct_answer', balanceAfter: 12 },
      { delta: 15, reason: 'kp_mastered', balanceAfter: 27 },
    ])
    expect(result.balanceAfter).toBe(27)
    expect(result.totalDelta).toBe(17)
  })

  it('⭐ balanceAfter 链必须连续：每条 = 上一条 + delta', () => {
    const grants = [
      { delta: 2, reason: 'correct_answer' as const },
      { delta: 5, reason: 'challenge_bonus' as const },
      { delta: 15, reason: 'kp_mastered' as const },
      { delta: 1, reason: 'retry_correct' as const },
    ]
    const { entries } = applyGrants(100, grants)

    let expected = 100
    for (const entry of entries) {
      expected += entry.delta
      expect(entry.balanceAfter).toBe(expected)
    }
  })

  it('最终余额等于起始余额加全部 delta', () => {
    const grants = [
      { delta: 2, reason: 'correct_answer' as const },
      { delta: 5, reason: 'challenge_bonus' as const },
    ]
    const sum = grants.reduce((s, g) => s + g.delta, 0)
    expect(applyGrants(40, grants).balanceAfter).toBe(40 + sum)
  })

  describe('⭐ 余额永不为负', () => {
    it('扣分超过余额时截断到 0', () => {
      const result = applyGrants(5, [{ delta: -100, reason: 'buy_item' }])
      expect(result.balanceAfter).toBe(0)
      expect(result.entries[0]?.balanceAfter).toBe(0)
    })

    it('起始余额为负时先归零再结算', () => {
      expect(applyGrants(-50, [{ delta: 2, reason: 'correct_answer' }]).balanceAfter).toBe(2)
    })

    it('截断后 totalDelta 反映真实变化，而非请求的 delta 之和', () => {
      // 请求扣 100 但只有 5 分，实际只减少了 5
      expect(applyGrants(5, [{ delta: -100, reason: 'buy_item' }]).totalDelta).toBe(-5)
    })
  })

  describe('与 rewardsForAttempt 串起来', () => {
    it('一轮 10 题全对（难度 2）累计 20 分', () => {
      let balance = 0
      for (let i = 0; i < 10; i++) {
        const grants = rewardsForAttempt({
          isCorrect: true,
          isRetry: false,
          difficulty: 2,
          justMastered: false,
        })
        balance = applyGrants(balance, grants).balanceAfter
      }
      expect(balance).toBe(20)
    })

    it('答错的那些题不影响余额', () => {
      const grants = rewardsForAttempt({
        isCorrect: false,
        isRetry: false,
        difficulty: 3,
        justMastered: false,
      })
      expect(applyGrants(42, grants).balanceAfter).toBe(42)
    })
  })
})
