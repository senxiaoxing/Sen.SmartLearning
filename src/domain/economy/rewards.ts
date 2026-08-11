/**
 * @file 积分发放规则 —— 一次作答该给几分、记什么理由
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.12  ledger 表与 LedgerReason 定义
 * @see CLAUDE.md 产品红线「每日任务」  奖励过程，不奖励结果
 *
 * 这里只决定「给多少」，不决定「怎么存」——
 * 流水的 balanceAfter 链在 domain/economy/applyGrants.ts，落库在 data/repositories/ledgerRepo.ts。
 */

import type { Difficulty, LedgerReason } from '@/domain/types'

/**
 * 各类行为的积分额度。数值来自 design/02-数据库Schema.md §3.12「积分经济平衡」。
 *
 * ⚠️ 调这些数值前先读那一节的平衡表：节奏目标是「每天能买几个食物 +
 * 攒 1~2 天买一件装扮」。太快失去目标感，太慢会放弃。
 * 改数值不需要动结构，但改完要重新对一遍平衡表。
 */
export const POINT_REWARDS = {
  /** 首次答对 */
  correctAnswer: 2,
  /** ⭐ 订正答对也给——否则孩子会回避错题（CLAUDE.md 产品红线） */
  retryCorrect: 1,
  /** ⭐ 挑战最高难度并答对，鼓励跳出舒适区 */
  challengeBonus: 5,
  /** 一个知识点跨过掌握门槛 */
  kpMastered: 15,
  /** 完成摸底测评 */
  assessmentComplete: 50,
} as const

/**
 * 「挑战难题」的难度门槛。
 *
 * 定在最高档而非中档：中档是调度器在掌握度 > 0.85 时的常规推进档位，
 * 给它发奖等于给日常操作发奖，奖励会迅速贬值。
 * 只有难度 3 才是真正意义上的「跳出舒适区」。
 */
const CHALLENGE_DIFFICULTY: Difficulty = 3

/** 一笔待记账的积分发放 */
export interface RewardGrant {
  /** 正数为收入。⚠️ 本模块永不产出负数，见 {@link rewardsForAttempt} */
  delta: number
  reason: LedgerReason
}

export interface AttemptRewardInput {
  isCorrect: boolean
  /** 是否为错题订正轮的作答 */
  isRetry: boolean
  difficulty: Difficulty
  /** 本次作答是否让该知识点**刚**跨过掌握门槛 */
  justMastered: boolean
}

/**
 * 算出一次作答应发放的积分。
 *
 * **答错返回空数组，绝不返回负数。** 扣分对一年级孩子是纯粹的惩罚信号，
 * 会让她倾向于只做有把握的题——那正好摧毁了自适应系统赖以工作的前提。
 * 答错的代价已经由「这题没得分」体现，不需要再加一层。
 *
 * 订正轮**只给 `retry_correct`**，不叠加挑战奖励与掌握奖励：
 * 订正是第二次看同一道题，答对不能等同于首次答对。这与
 * design/05-孩子反馈与响应.md「订正不参与复习排期」是同一个道理——
 * 刚错完立刻改对不代表记住了，给足额奖励会造成虚假的掌握感。
 *
 * @param input - 本次作答的判定结果
 * @returns 待记账的发放列表，可能为空；顺序即写入流水的顺序
 *
 * @example
 * // 首次答对一道难度 3 且刚好掌握了这个知识点
 * rewardsForAttempt({ isCorrect: true, isRetry: false, difficulty: 3, justMastered: true })
 * // [ { delta: 2,  reason: 'correct_answer'  },
 * //   { delta: 5,  reason: 'challenge_bonus' },
 * //   { delta: 15, reason: 'kp_mastered'     } ]  合计 +22
 *
 * @example
 * // 订正答对——只有 +1，不因难度或掌握再加码
 * rewardsForAttempt({ isCorrect: true, isRetry: true, difficulty: 3, justMastered: true })
 * // [ { delta: 1, reason: 'retry_correct' } ]
 *
 * @example
 * // 答错——什么都不发，也绝不扣分
 * rewardsForAttempt({ isCorrect: false, isRetry: false, difficulty: 2, justMastered: false })
 * // []
 */
export function rewardsForAttempt(input: AttemptRewardInput): RewardGrant[] {
  if (!input.isCorrect) return []

  if (input.isRetry) {
    return [{ delta: POINT_REWARDS.retryCorrect, reason: 'retry_correct' }]
  }

  const grants: RewardGrant[] = [
    { delta: POINT_REWARDS.correctAnswer, reason: 'correct_answer' },
  ]

  if (input.difficulty >= CHALLENGE_DIFFICULTY) {
    grants.push({ delta: POINT_REWARDS.challengeBonus, reason: 'challenge_bonus' })
  }

  if (input.justMastered) {
    grants.push({ delta: POINT_REWARDS.kpMastered, reason: 'kp_mastered' })
  }

  return grants
}
