/**
 * @file 购买方案 —— 一次购买该扣多少分、记什么理由、落成什么状态
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.12b  purchases 表与状态流转
 * @see src/domain/economy/rewards.ts  对称的另一半：积分怎么赚
 *
 * 与 `rewards.ts` 成对：那边定义收入，这边定义支出。
 * 两个文件都只决定「多少」，不决定「怎么存」——落库在 data/repositories/。
 */

import type { RewardGrant } from '@/domain/economy/rewards'
import type { PurchaseStatus, ShopItemKind } from '@/domain/types'

/** 一次购买的完整方案：一笔扣分流水 + 购买记录的初始状态 */
export interface PurchasePlan {
  /** ⚠️ `delta` 恒为负数 */
  grant: RewardGrant
  status: PurchaseStatus
  /**
   * 是否买入即完成。`true` 时调用方须同时写 `fulfilledAt`。
   *
   * 由 `status` 推导本可省掉这个字段，但那要求每个调用方都记得
   * 「fulfilled 意味着要写时间戳」——漏写不会报错，只会让记录里少一个时间，
   * 等发现时已经攒了一堆。显式声明让调用方无从漏掉。
   */
  fulfilledNow: boolean
}

/**
 * 各商品大类的购买后果。三行表把全部差异摊平在一处，
 * 加新品类时只需在这里加一行，不必去翻散落各处的 `if (kind === ...)`。
 */
const PLAN_BY_KIND: Readonly<
  Record<ShopItemKind, { reason: RewardGrant['reason']; status: PurchaseStatus }>
> = {
  /** 小屋家具：买了就永久摆着 */
  room: { reason: 'buy_item', status: 'owned' },
  /** 宠物零食：三只一起吃掉，播个动画就没了 */
  treat: { reason: 'buy_food', status: 'fulfilled' },
  /** 现实券：等家长在现实里兑现 */
  real: { reason: 'redeem_real', status: 'pending' },
}

/**
 * 算出一次购买的扣分与初始状态。
 *
 * @param kind - 商品大类
 * @param price - 成交价，**必须为正整数**
 * @returns 待记账的扣分流水与购买记录的初始状态
 *
 * @throws 价格非正或非整数时抛错。**刻意不静默兜底成 0**：
 *         负价会让 `delta` 变成正数，等于买东西反而送分；
 *         而悄悄改成 0 就是「这个东西不要钱」，孩子会立刻发现并反复薅。
 *         这类错误只可能来自 seed 表写错，必须在开发期就炸出来。
 *
 * @example
 * planPurchase('room', 300)
 * // { grant: { delta: -300, reason: 'buy_item' }, status: 'owned', fulfilledNow: false }
 *
 * @example
 * // 现实券要等家长兑现，所以落成 pending
 * planPurchase('real', 300)
 * // { grant: { delta: -300, reason: 'redeem_real' }, status: 'pending', fulfilledNow: false }
 *
 * @example
 * // 零食买入即消耗
 * planPurchase('treat', 10)
 * // { grant: { delta: -10, reason: 'buy_food' }, status: 'fulfilled', fulfilledNow: true }
 */
export function planPurchase(kind: ShopItemKind, price: number): PurchasePlan {
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error(`商品价格必须是正整数，收到：${price}`)
  }

  const { reason, status } = PLAN_BY_KIND[kind]
  return {
    grant: { delta: -price, reason },
    status,
    fulfilledNow: status === 'fulfilled',
  }
}
