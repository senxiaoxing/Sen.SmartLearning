/**
 * @file rewards 单测 —— 重点守住「答错不扣分」与「订正不叠加」两条产品红线
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { POINT_REWARDS, rewardsForAttempt } from '@/domain/economy/rewards'
import type { Difficulty } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]

/** 求一次作答的总分，测试里反复要用 */
function totalFor(input: Parameters<typeof rewardsForAttempt>[0]): number {
  return rewardsForAttempt(input).reduce((sum, g) => sum + g.delta, 0)
}

describe('rewardsForAttempt', () => {
  describe('⭐ 答错绝不扣分', () => {
    it.each(DIFFICULTIES)('难度 %i 答错返回空数组', (difficulty) => {
      expect(
        rewardsForAttempt({ isCorrect: false, isRetry: false, difficulty, justMastered: false }),
      ).toEqual([])
    })

    it('订正轮答错同样不扣分', () => {
      expect(
        rewardsForAttempt({ isCorrect: false, isRetry: true, difficulty: 3, justMastered: false }),
      ).toEqual([])
    })

    it('任何输入组合都不会产出负数 delta', () => {
      for (const isCorrect of [true, false]) {
        for (const isRetry of [true, false]) {
          for (const difficulty of DIFFICULTIES) {
            for (const justMastered of [true, false]) {
              const grants = rewardsForAttempt({ isCorrect, isRetry, difficulty, justMastered })
              for (const g of grants) expect(g.delta).toBeGreaterThan(0)
            }
          }
        }
      }
    })
  })

  describe('首次答对', () => {
    it('难度 1/2 只给基础分', () => {
      for (const difficulty of [1, 2] as Difficulty[]) {
        const grants = rewardsForAttempt({
          isCorrect: true,
          isRetry: false,
          difficulty,
          justMastered: false,
        })
        expect(grants).toEqual([
          { delta: POINT_REWARDS.correctAnswer, reason: 'correct_answer' },
        ])
      }
    })

    it('⭐ 难度 3 追加挑战奖励', () => {
      const grants = rewardsForAttempt({
        isCorrect: true,
        isRetry: false,
        difficulty: 3,
        justMastered: false,
      })
      expect(grants.map((g) => g.reason)).toEqual(['correct_answer', 'challenge_bonus'])
      expect(totalFor({ isCorrect: true, isRetry: false, difficulty: 3, justMastered: false })).toBe(
        POINT_REWARDS.correctAnswer + POINT_REWARDS.challengeBonus,
      )
    })

    it('刚掌握知识点追加掌握奖励', () => {
      const grants = rewardsForAttempt({
        isCorrect: true,
        isRetry: false,
        difficulty: 1,
        justMastered: true,
      })
      expect(grants.map((g) => g.reason)).toEqual(['correct_answer', 'kp_mastered'])
    })

    it('难度 3 + 刚掌握三项全给', () => {
      expect(totalFor({ isCorrect: true, isRetry: false, difficulty: 3, justMastered: true })).toBe(
        POINT_REWARDS.correctAnswer +
          POINT_REWARDS.challengeBonus +
          POINT_REWARDS.kpMastered,
      )
    })
  })

  describe('⭐ 订正答对只给 retry_correct，不叠加任何加码', () => {
    it.each(DIFFICULTIES)('难度 %i 订正答对恒为 retry_correct', (difficulty) => {
      expect(
        rewardsForAttempt({ isCorrect: true, isRetry: true, difficulty, justMastered: true }),
      ).toEqual([{ delta: POINT_REWARDS.retryCorrect, reason: 'retry_correct' }])
    })

    it('订正分值低于首次答对——否则孩子会故意先答错再订正', () => {
      expect(POINT_REWARDS.retryCorrect).toBeLessThan(POINT_REWARDS.correctAnswer)
    })

    it('⭐ 先答错再订正的总收益，必须低于一次就答对', () => {
      const wrongThenRetry =
        totalFor({ isCorrect: false, isRetry: false, difficulty: 2, justMastered: false }) +
        totalFor({ isCorrect: true, isRetry: true, difficulty: 2, justMastered: false })
      const correctFirstTry = totalFor({
        isCorrect: true,
        isRetry: false,
        difficulty: 2,
        justMastered: false,
      })
      expect(wrongThenRetry).toBeLessThan(correctFirstTry)
    })
  })
})
