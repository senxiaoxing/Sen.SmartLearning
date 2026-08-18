/**
 * @file 购买记录的查询 —— 小屋摆了什么、家长还欠什么、孩子买过什么
 * @layer data  唯一允许接触 Dexie 的层
 * @see design/02-数据库Schema.md §3.12b  purchases 表与索引
 * @see src/data/repositories/purchaseRepo.ts  写入侧（买 / 兑现 / 撤销）
 *
 * 与写入侧分成两个文件：那边是三个都要开事务的状态变更，
 * 这边全是只读查询。混在一起会让「哪些函数会改数据」变得不好一眼看出。
 */

import { db } from '@/data/db'
import type { Purchase, Uuid } from '@/domain/types'

/**
 * 小屋里已经摆上的家具。
 *
 * 返回 `Set` 而不是数组：渲染小屋时要对每个位置问一次「这件买了没」，
 * 用数组就是每个位置一次线性查找。
 *
 * @example
 * const owned = await ownedRoomItemIds(profileId)
 * {ROOM_SLOTS.map((slot) => owned.has(slot.itemId) && <slot.Art key={slot.id} />)}
 */
export async function ownedRoomItemIds(profileId: Uuid): Promise<Set<string>> {
  const rows = await db.purchases
    .where('[profileId+status]')
    .equals([profileId, 'owned'])
    .toArray()

  return new Set(rows.filter((p) => p.kind === 'room').map((p) => p.shopItemId))
}

/**
 * 等家长兑现的现实券，最早兑换的排在前面。
 *
 * 正序而非倒序：先兑换的先兑现，孩子等得最久的那张排在最上面。
 * 倒序会让新券一直压在旧券上头，而最该被看到的恰恰是等最久的那张。
 *
 * @example
 * const pending = await pendingRedemptions(profileId)
 * // → [{ label: '一个冰淇淋', createdAt: '2026-08-15…' }, …]
 */
export async function pendingRedemptions(profileId: Uuid): Promise<Purchase[]> {
  const rows = await db.purchases
    .where('[profileId+status]')
    .equals([profileId, 'pending'])
    .toArray()

  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * 某张现实券的兑换历史，用于冷却判定与「上次是什么时候换的」。
 *
 * @example
 * const history = await purchaseHistoryOf(profileId, 'real-icecream')
 */
export async function purchaseHistoryOf(
  profileId: Uuid,
  shopItemId: string,
): Promise<Purchase[]> {
  return db.purchases.where('[profileId+shopItemId]').equals([profileId, shopItemId]).toArray()
}

/**
 * 全部购买记录，最近的排在前面。孩子的「我买过什么」与家长的兑换记录都用它。
 *
 * @param limit - 最多返回多少条，默认不限
 *
 * @example
 * const recent = await recentPurchases(profileId, 20)
 */
export async function recentPurchases(profileId: Uuid, limit?: number): Promise<Purchase[]> {
  const collection = db.purchases.where('profileId').equals(profileId)
  const rows = await collection.toArray()
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return limit === undefined ? rows : rows.slice(0, limit)
}
