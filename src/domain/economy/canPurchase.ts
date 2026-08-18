/**
 * @file 购买前置判定 —— 这件东西现在能不能买，不能的话差在哪
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.12b  purchases 表与状态流转
 * @see src/domain/economy/applyGrants.ts  余额下限只是兜底，真正的拦截在这里
 *
 * ⭐ 拒绝时必须带上**还差多少**（`shortBy` / `daysLeft`）。
 * 买不起的商品不灰掉藏起来，而是显示「再攒 30 颗就能换」——
 * 这与图鉴要显示未解锁空位是同一条原理（design/02 §3.13）：
 * **看得见的差距驱动行为，消失的选项只制造困惑。**
 */

import { cooldownDaysLeft } from '@/domain/economy/cooldownDaysLeft'
import type { LocalDate, Purchase, ShopItemKind } from '@/domain/types'

export interface PurchaseCheckInput {
  kind: ShopItemKind
  /** 成交价 */
  price: number
  /** 当前积分余额 */
  balance: number
  /**
   * **同一个 `shopItemId`** 的历史购买记录，顺序不限。
   *
   * 由调用方查库传入而不是在这里查——`domain/` 不碰 Dexie。
   * 传全量也能工作，但那会让 `already_owned` 把别的商品也算进来。
   */
  history: readonly Purchase[]
  /** 现实券的冷却天数，家长设定。其他品类忽略此项 */
  cooldownDays?: number
  /** 现实券是否在架。家长可随时下架，`false` 时即便余额充足也不能兑 */
  listed?: boolean
  today: LocalDate
}

/**
 * 拒绝购买的判定结果。刻意做成可辨识联合：
 * UI 必须先 narrow 到具体 `reason` 才能读到 `shortBy` / `daysLeft`，
 * 从类型上杜绝「提示语里显示 undefined」。
 */
export type PurchaseVerdict =
  | { ok: true }
  /** 星星不够。`shortBy` 用于「再攒 N 颗就能换」 */
  | { ok: false; reason: 'insufficient_balance'; shortBy: number }
  /** 现实券冷却中。`daysLeft` 用于「再等 N 天就能换啦」 */
  | { ok: false; reason: 'cooling_down'; daysLeft: number }
  /** 小屋家具已经买过 */
  | { ok: false; reason: 'already_owned' }
  /** 现实券已被家长下架 */
  | { ok: false; reason: 'not_listed' }

/**
 * 判断一件商品现在能不能买。
 *
 * 判定顺序是**硬阻断在前、差一点在后**：已拥有 / 已下架 / 冷却中都是
 * 「攒再多分也没用」，必须先说；余额不足则是「再攒攒就行」，
 * 放最后才不会被前面的硬条件盖掉。反过来的话，一件已经买过的家具
 * 会提示「再攒 300 颗」，那是纯粹的误导。
 *
 * ⚠️ 本函数是余额不足的**唯一真正防线**。`applyGrants` 的 0 下限只是兜底，
 * 靠它拦截会让孩子花掉不存在的分，然后余额被悄悄夹到 0——
 * 账面上等于凭空蒸发了一笔，而流水里找不到这笔钱去哪了。
 *
 * @param input - 商品、余额与该商品的历史购买记录
 * @returns 可购买，或不可购买及其原因
 *
 * @example
 * // 余额差 30 分
 * canPurchase({ kind: 'room', price: 300, balance: 270, history: [], today: '2026-08-18' })
 * // { ok: false, reason: 'insufficient_balance', shortBy: 30 }
 *
 * @example
 * // 家具只能买一次
 * canPurchase({ kind: 'room', price: 300, balance: 9999, history: [rugPurchase], today })
 * // { ok: false, reason: 'already_owned' }
 *
 * @example
 * // 零食可以反复买，买过不影响
 * canPurchase({ kind: 'treat', price: 10, balance: 50, history: [cookiePurchase], today })
 * // { ok: true }
 */
export function canPurchase(input: PurchaseCheckInput): PurchaseVerdict {
  const { kind, price, balance, history, today } = input

  if (kind === 'real' && input.listed === false) {
    return { ok: false, reason: 'not_listed' }
  }

  // 家具是永久拥有的，买第二件既没有位置摆、也纯属浪费她攒的分。
  // 零食（吃掉了）和现实券（可以再兑）都不受此限。
  if (kind === 'room' && history.length > 0) {
    return { ok: false, reason: 'already_owned' }
  }

  if (kind === 'real') {
    const daysLeft = cooldownDaysLeft(
      lastRedeemedOn(history),
      input.cooldownDays ?? 0,
      today,
    )
    if (daysLeft > 0) return { ok: false, reason: 'cooling_down', daysLeft }
  }

  if (balance < price) {
    return { ok: false, reason: 'insufficient_balance', shortBy: price - balance }
  }

  return { ok: true }
}

/**
 * 历史记录里最近一次兑换的本地日期。
 *
 * 取 `localDate` 的最大值而非「数组最后一条」：调用方的查询顺序不作保证，
 * 而按 `[profileId+shopItemId]` 索引取出来的顺序是主键序（UUID），基本等于随机。
 * 字符串比较对 `'YYYY-MM-DD'` 就是日期比较，不需要转 Date。
 */
function lastRedeemedOn(history: readonly Purchase[]): LocalDate | undefined {
  let latest: LocalDate | undefined
  for (const p of history) {
    if (latest === undefined || p.localDate > latest) latest = p.localDate
  }
  return latest
}
