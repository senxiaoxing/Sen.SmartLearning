/**
 * @file 积分流水结算 —— 把若干笔发放折算成连续的账本条目
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.12  账本式设计：余额由流水推导
 *
 * `balanceAfter` 是冗余字段，**只为查询性能存在**（取余额 = 取最新一条）。
 * 冗余字段的风险就是算错了没人发现，所以这段链式计算刻意抽成纯函数单独测。
 */

import type { RewardGrant } from '@/domain/economy/rewards'

/** 一笔已结算的流水，比 {@link RewardGrant} 多了结余快照 */
export interface SettledGrant extends RewardGrant {
  balanceAfter: number
}

export interface GrantSettlement {
  entries: SettledGrant[]
  /** 全部发放结算后的余额。`entries` 为空时等于 `startingBalance` */
  balanceAfter: number
  /** 本次发放的净变化，可用于「+22 分」这类即时展示 */
  totalDelta: number
}

/**
 * 依次结算若干笔发放，算出每一笔之后的余额。
 *
 * 逐笔累加而非一次性求和，是因为账本要能回答「这一笔发生时余额是多少」——
 * 家长报告与将来的商店退款都依赖这个逐笔快照。
 *
 * 余额下限为 0：即便将来出现扣分类 `reason`（商店消费、家长手动调整），
 * 也不允许把孩子的账户记成负数。欠债对一年级孩子没有任何教育意义，
 * 而一个负数余额在界面上无法解释。真正的余额不足应由调用方在扣分前拦截。
 *
 * @param startingBalance - 结算前的余额，通常取自流水最新一条的 `balanceAfter`
 * @param grants - 待结算的发放，按数组顺序入账
 * @returns 每笔的结余快照、最终余额与净变化
 *
 * @example
 * applyGrants(10, [
 *   { delta: 2,  reason: 'correct_answer'  },
 *   { delta: 15, reason: 'kp_mastered'     },
 * ])
 * // {
 * //   entries: [
 * //     { delta: 2,  reason: 'correct_answer', balanceAfter: 12 },
 * //     { delta: 15, reason: 'kp_mastered',    balanceAfter: 27 },
 * //   ],
 * //   balanceAfter: 27,
 * //   totalDelta: 17,
 * // }
 *
 * @example
 * // 空发放（答错时）不产生任何条目，余额原样返回
 * applyGrants(27, [])
 * // { entries: [], balanceAfter: 27, totalDelta: 0 }
 */
export function applyGrants(
  startingBalance: number,
  grants: readonly RewardGrant[],
): GrantSettlement {
  let balance = Math.max(0, startingBalance)
  const entries: SettledGrant[] = []

  for (const grant of grants) {
    balance = Math.max(0, balance + grant.delta)
    entries.push({ ...grant, balanceAfter: balance })
  }

  return {
    entries,
    balanceAfter: balance,
    totalDelta: balance - Math.max(0, startingBalance),
  }
}
