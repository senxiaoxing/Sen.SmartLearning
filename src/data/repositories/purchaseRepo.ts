/**
 * @file 购买仓储 —— 买东西、家长兑现、家长撤销
 * @layer data  唯一允许接触 Dexie 的层
 * @see design/02-数据库Schema.md §3.12b  purchases 表与状态流转
 * @see src/domain/economy/canPurchase.ts  能不能买的判定（纯函数）
 * @see src/domain/economy/planPurchase.ts 扣多少分、落什么状态（纯函数）
 *
 * ⚠️ 扣分与写购买记录**必须同事务**，理由同 `masteryRepo.recordAttempt`：
 * 只扣分不给东西是「星星白花了」，只给东西不扣分是「白拿」——
 * 前者孩子会立刻发现并失去信任，后者会悄悄把整个经济系统废掉。
 */

import { db } from '@/data/db'
import { appendGrants, getBalance } from '@/data/repositories/ledgerRepo'
import { canPurchase, type PurchaseVerdict } from '@/domain/economy/canPurchase'
import { planPurchase } from '@/domain/economy/planPurchase'
import { isoToLocalDate, nowIso } from '@/domain/time'
import { newId } from '@/platform/newId'
import type { IsoDateTime, Purchase, ShopItemKind, Uuid } from '@/domain/types'

/** 被拦下的判定。从 {@link PurchaseVerdict} 里取出 `ok: false` 的那几支 */
export type BlockedPurchase = Extract<PurchaseVerdict, { ok: false }>

/**
 * 一次购买请求。
 *
 * 刻意**不接收 `ShopItem` 整体**：商品定义属于静态内容（`data/seed/`），
 * 而这里只需要成交所必需的那几个字段。解耦之后，现实券由家长配置、
 * 虚拟商品由 seed 表内置这两条不同的来源，可以走同一个入口。
 */
export interface BuyRequest {
  profileId: Uuid
  /** 语义 ID，如 `'room-rug'` */
  shopItemId: string
  kind: ShopItemKind
  /** 名称，将冻结进购买记录 */
  label: string
  price: number
  /** 现实券的冷却天数，家长设定 */
  cooldownDays?: number
  /** 现实券是否在架 */
  listed?: boolean
}

export type BuyOutcome =
  | { ok: true; purchase: Purchase; balanceAfter: number }
  | { ok: false; blocked: BlockedPurchase; balanceAfter: number }

/**
 * 买一件东西。
 *
 * 判定与写入在**同一个事务**里：先读余额与该商品的历史，跑纯函数判定，
 * 通过了才扣分并写记录。判定不通过时一个字都不写，余额原样返回——
 * 调用方据此更新「再攒 N 颗」的提示，不需要再查一次库。
 *
 * @param request - 商品与价格
 * @param now - 当前时刻，测试可注入
 * @returns 成功时给出购买记录与新余额；被拦下时给出原因与当前余额
 *
 * @example
 * const outcome = await buyShopItem({
 *   profileId, shopItemId: 'room-rug', kind: 'room', label: '地毯', price: 300,
 * })
 * if (!outcome.ok && outcome.blocked.reason === 'insufficient_balance') {
 *   showHint(`再攒 ${outcome.blocked.shortBy} 颗就能换啦`)
 * }
 */
export async function buyShopItem(
  request: BuyRequest,
  now: IsoDateTime = nowIso(),
): Promise<BuyOutcome> {
  const { profileId, shopItemId, kind, label, price } = request
  const today = isoToLocalDate(now)

  return db.transaction('rw', db.ledger, db.purchases, async () => {
    const balance = await getBalance(profileId)
    const history = await db.purchases
      .where('[profileId+shopItemId]')
      .equals([profileId, shopItemId])
      .toArray()

    const verdict = canPurchase({
      kind,
      price,
      balance,
      history,
      today,
      ...(request.cooldownDays !== undefined && { cooldownDays: request.cooldownDays }),
      ...(request.listed !== undefined && { listed: request.listed }),
    })
    if (!verdict.ok) return { ok: false, blocked: verdict, balanceAfter: balance }

    const plan = planPurchase(kind, price)
    const settlement = await appendGrants(profileId, [plan.grant], {
      refId: shopItemId,
      now,
      localDate: today,
    })

    const ledgerEntryId = settlement.entryIds[0]
    if (ledgerEntryId === undefined) {
      // 判定已通过、金额为正，appendGrants 必然写了一条。走到这里说明账本层
      // 出了预期外的问题，此时抛错会回滚整个事务——比写一条指不回去的购买记录好
      throw new Error(`扣分未产生流水，购买中止：${shopItemId}`)
    }

    const purchase: Purchase = {
      id: newId(),
      profileId,
      shopItemId,
      kind,
      label,
      pricePaid: price,
      status: plan.status,
      ledgerEntryId,
      createdAt: now,
      localDate: today,
      ...(plan.fulfilledNow && { fulfilledAt: now }),
    }
    await db.purchases.add(purchase)

    return { ok: true, purchase, balanceAfter: settlement.balanceAfter }
  })
}

/**
 * 家长把一张现实券标记为已兑现（冰淇淋买回来了）。
 *
 * 幂等：已经是 `fulfilled` 的记录原样返回，不覆盖第一次的兑现时间。
 * 家长多点一次是很可能的，而把时间改成第二次点击的时刻会让记录失真。
 *
 * @returns 更新后的记录；ID 不存在时返回 `undefined`
 */
export async function markFulfilled(
  purchaseId: Uuid,
  now: IsoDateTime = nowIso(),
): Promise<Purchase | undefined> {
  return db.transaction('rw', db.purchases, async () => {
    const purchase = await db.purchases.get(purchaseId)
    if (purchase === undefined || purchase.status === 'fulfilled') return purchase

    const next: Purchase = { ...purchase, status: 'fulfilled', fulfilledAt: now }
    await db.purchases.put(next)
    return next
  })
}

/**
 * 家长撤销一笔购买：删除记录并按**成交价**原额退分。
 *
 * ⭐ 为什么必须有这个功能：一年级孩子会手滑，88pt 触控加二次确认也拦不住全部。
 * 手滑的代价不该由她承担——见 CLAUDE.md 产品红线的整体取向。
 *
 * ⭐ 为什么是删除而不是标记作废：孩子的「我买过什么」里出现一条划掉的记录，
 * 传达的是「你买错了」。退分之后这笔交易就当没发生过，这才是撤销该有的样子。
 *
 * 退的是 `pricePaid` 而非当前价格：中间家长可能调过价，
 * 按新价退会凭空多给或少给。
 *
 * @returns 退回的分数与新余额；ID 不存在时返回 `undefined`
 */
export async function refundPurchase(
  purchaseId: Uuid,
  now: IsoDateTime = nowIso(),
): Promise<{ refunded: number; balanceAfter: number } | undefined> {
  return db.transaction('rw', db.ledger, db.purchases, async () => {
    const purchase = await db.purchases.get(purchaseId)
    if (purchase === undefined) return undefined

    const settlement = await appendGrants(
      purchase.profileId,
      [{ delta: purchase.pricePaid, reason: 'purchase_refund' }],
      { refId: purchase.shopItemId, now, localDate: isoToLocalDate(now) },
    )
    await db.purchases.delete(purchaseId)

    return { refunded: purchase.pricePaid, balanceAfter: settlement.balanceAfter }
  })
}
