/**
 * @file 购买仓储的集成测试
 * @layer data
 *
 * 守两条底线：
 * 1. **扣分与写记录同生共死** —— 只扣分不给东西是「星星白花了」，
 *    只给东西不扣分会悄悄废掉整个经济系统
 * 2. **判定不通过时一个字都不写** —— 半成品记录会让孩子看到一件她并没买到的东西
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import { appendGrants, getBalance } from '@/data/repositories/ledgerRepo'
import {
  ownedRoomItemIds,
  pendingRedemptions,
  recentPurchases,
} from '@/data/repositories/purchaseQueries'
import {
  buyShopItem,
  markFulfilled,
  refundPurchase,
  type BuyRequest,
} from '@/data/repositories/purchaseRepo'
import { isoFromString } from '@/domain/time'
import type { Uuid } from '@/domain/types'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

/** 先给孩子攒够分，否则任何购买都会撞在余额不足上 */
async function withBalance(amount: number): Promise<Uuid> {
  const profileId = await bootstrap()
  await appendGrants(profileId, [{ delta: amount, reason: 'correct_answer' }])
  return profileId
}

const RUG = (profileId: Uuid): BuyRequest => ({
  profileId,
  shopItemId: 'room-rug',
  kind: 'room',
  label: '地毯',
  price: 300,
})

const ICECREAM = (profileId: Uuid): BuyRequest => ({
  profileId,
  shopItemId: 'real-icecream',
  kind: 'real',
  label: '一个冰淇淋',
  price: 300,
})

describe('买东西', () => {
  it('扣分与购买记录同时落库', async () => {
    const profileId = await withBalance(500)

    const outcome = await buyShopItem(RUG(profileId))

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.balanceAfter).toBe(200)
    expect(await getBalance(profileId)).toBe(200)
    expect(await db.purchases.count()).toBe(1)
  })

  it('⭐ 购买记录指回那笔扣分流水 —— 撤销时靠它精确反查', async () => {
    const profileId = await withBalance(500)

    const outcome = await buyShopItem(RUG(profileId))
    if (!outcome.ok) throw new Error('应当买成功')

    const entry = await db.ledger.get(outcome.purchase.ledgerEntryId)
    expect(entry?.delta).toBe(-300)
    expect(entry?.reason).toBe('buy_item')
  })

  it('冻结名称与成交价', async () => {
    const profileId = await withBalance(500)

    const outcome = await buyShopItem(RUG(profileId))
    if (!outcome.ok) throw new Error('应当买成功')

    expect(outcome.purchase.label).toBe('地毯')
    expect(outcome.purchase.pricePaid).toBe(300)
    expect(outcome.purchase.id, '用户数据必须是 UUID').toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('零食买入即完成，带上兑现时间', async () => {
    const profileId = await withBalance(50)

    const outcome = await buyShopItem({
      profileId,
      shopItemId: 'treat-cookie',
      kind: 'treat',
      label: '小饼干',
      price: 10,
    })
    if (!outcome.ok) throw new Error('应当买成功')

    expect(outcome.purchase.status).toBe('fulfilled')
    expect(outcome.purchase.fulfilledAt).toBe(outcome.purchase.createdAt)
  })

  it('⭐ 现实券落成待兑现，且不带兑现时间', async () => {
    const profileId = await withBalance(500)

    const outcome = await buyShopItem(ICECREAM(profileId))
    if (!outcome.ok) throw new Error('应当兑换成功')

    expect(outcome.purchase.status).toBe('pending')
    expect(outcome.purchase.fulfilledAt).toBeUndefined()
  })
})

describe('⭐ 判定不通过时什么都不写', () => {
  it('余额不足：不扣分、不写记录，并说出还差多少', async () => {
    const profileId = await withBalance(270)

    const outcome = await buyShopItem(RUG(profileId))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.blocked.reason).toBe('insufficient_balance')
    if (outcome.blocked.reason === 'insufficient_balance') {
      expect(outcome.blocked.shortBy).toBe(30)
    }
    expect(outcome.balanceAfter, '余额原样').toBe(270)
    expect(await db.purchases.count(), '不留半成品记录').toBe(0)
    // `reason` 不是 ledger 的索引（见 db.ts），内存过滤即可——流水本就只有几条
    const spent = (await db.ledger.toArray()).filter((e) => e.delta < 0)
    expect(spent, '一分钱都不该扣').toHaveLength(0)
  })

  it('⭐ 余额绝不会被扣成 0 —— 拦截必须发生在扣分之前', async () => {
    // applyGrants 的 0 下限只是兜底。靠它拦会让孩子花掉不存在的分，
    // 余额被悄悄夹到 0，流水里却找不到这笔钱去哪了
    const profileId = await withBalance(10)

    await buyShopItem(RUG(profileId))

    expect(await getBalance(profileId)).toBe(10)
  })

  it('家具买过第二次被拦下，钱也不会再扣', async () => {
    const profileId = await withBalance(1000)
    await buyShopItem(RUG(profileId))

    const second = await buyShopItem(RUG(profileId))

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.blocked.reason).toBe('already_owned')
    expect(await getBalance(profileId)).toBe(700)
    expect(await db.purchases.count()).toBe(1)
  })

  it('现实券冷却中被拦下', async () => {
    const profileId = await withBalance(1000)
    await buyShopItem(ICECREAM(profileId), isoFromString('2026-08-18T09:00:00Z'))

    const second = await buyShopItem(
      { ...ICECREAM(profileId), cooldownDays: 3 },
      isoFromString('2026-08-19T09:00:00Z'),
    )

    expect(second.ok).toBe(false)
    if (!second.ok && second.blocked.reason === 'cooling_down') {
      expect(second.blocked.daysLeft).toBe(2)
    }
  })

  it('零食可以连着买，不受冷却影响', async () => {
    const profileId = await withBalance(100)
    const snack: BuyRequest = {
      profileId,
      shopItemId: 'treat-cookie',
      kind: 'treat',
      label: '小饼干',
      price: 10,
    }

    await buyShopItem(snack)
    const second = await buyShopItem(snack)

    expect(second.ok).toBe(true)
    expect(await db.purchases.count()).toBe(2)
    expect(await getBalance(profileId)).toBe(80)
  })
})

describe('家长兑现', () => {
  it('标记已兑现，写上兑现时间', async () => {
    const profileId = await withBalance(500)
    const outcome = await buyShopItem(ICECREAM(profileId))
    if (!outcome.ok) throw new Error('应当兑换成功')

    const done = await markFulfilled(outcome.purchase.id)

    expect(done?.status).toBe('fulfilled')
    expect(done?.fulfilledAt).toBeDefined()
  })

  it('⭐ 幂等：多点一次不会覆盖第一次的兑现时间', async () => {
    const profileId = await withBalance(500)
    const outcome = await buyShopItem(ICECREAM(profileId))
    if (!outcome.ok) throw new Error('应当兑换成功')

    const first = await markFulfilled(outcome.purchase.id, isoFromString('2026-08-19T10:00:00Z'))
    const again = await markFulfilled(outcome.purchase.id, isoFromString('2026-08-25T10:00:00Z'))

    expect(again?.fulfilledAt).toBe(first?.fulfilledAt)
  })

  it('ID 不存在时返回 undefined，不抛错', async () => {
    await bootstrap()
    expect(await markFulfilled(crypto.randomUUID())).toBeUndefined()
  })
})

describe('家长撤销', () => {
  it('⭐ 退回成交价并删除记录 —— 手滑的代价不该由孩子承担', async () => {
    const profileId = await withBalance(500)
    const outcome = await buyShopItem(RUG(profileId))
    if (!outcome.ok) throw new Error('应当买成功')
    expect(await getBalance(profileId)).toBe(200)

    const result = await refundPurchase(outcome.purchase.id)

    expect(result?.refunded).toBe(300)
    expect(result?.balanceAfter).toBe(500)
    expect(await getBalance(profileId), '钱全额回来了').toBe(500)
    expect(await db.purchases.count(), '不留划掉的记录').toBe(0)
  })

  it('⭐ 撤销后那件家具能重新买 —— 否则等于既退了钱又占着位置', async () => {
    const profileId = await withBalance(500)
    const first = await buyShopItem(RUG(profileId))
    if (!first.ok) throw new Error('应当买成功')
    await refundPurchase(first.purchase.id)

    const again = await buyShopItem(RUG(profileId))

    expect(again.ok).toBe(true)
  })

  it('退款记的是 purchase_refund，家长报告里能与「赚到」分开', async () => {
    const profileId = await withBalance(500)
    const outcome = await buyShopItem(RUG(profileId))
    if (!outcome.ok) throw new Error('应当买成功')

    await refundPurchase(outcome.purchase.id)

    const reasons = (await db.ledger.toArray()).map((r) => r.reason)
    expect(reasons).toContain('purchase_refund')
  })

  it('⭐ 按成交价退，不受之后改价影响', async () => {
    // 现实券由家长维护，中间完全可能调过价。按新价退会凭空多给或少给
    const profileId = await withBalance(500)
    const outcome = await buyShopItem({ ...ICECREAM(profileId), price: 300 })
    if (!outcome.ok) throw new Error('应当兑换成功')

    const result = await refundPurchase(outcome.purchase.id)

    expect(result?.refunded, '退的是买当时的 300').toBe(300)
  })

  it('ID 不存在时返回 undefined，不动账本', async () => {
    const profileId = await withBalance(100)

    expect(await refundPurchase(crypto.randomUUID())).toBeUndefined()
    expect(await getBalance(profileId)).toBe(100)
  })
})

describe('查询', () => {
  it('小屋只列已拥有的家具，零食和现实券不掺进来', async () => {
    const profileId = await withBalance(1000)
    await buyShopItem(RUG(profileId))
    await buyShopItem({
      profileId,
      shopItemId: 'treat-cookie',
      kind: 'treat',
      label: '小饼干',
      price: 10,
    })
    await buyShopItem(ICECREAM(profileId))

    const owned = await ownedRoomItemIds(profileId)

    expect([...owned]).toEqual(['room-rug'])
  })

  it('⭐ 待兑现按兑换先后正序 —— 等最久的那张排最上面', async () => {
    const profileId = await withBalance(2000)
    await buyShopItem(
      { ...ICECREAM(profileId), shopItemId: 'real-book', label: '一本书' },
      isoFromString('2026-08-10T09:00:00Z'),
    )
    await buyShopItem(ICECREAM(profileId), isoFromString('2026-08-18T09:00:00Z'))

    const pending = await pendingRedemptions(profileId)

    expect(pending.map((p) => p.label)).toEqual(['一本书', '一个冰淇淋'])
  })

  it('已兑现的不再出现在待兑现列表里', async () => {
    const profileId = await withBalance(500)
    const outcome = await buyShopItem(ICECREAM(profileId))
    if (!outcome.ok) throw new Error('应当兑换成功')

    await markFulfilled(outcome.purchase.id)

    expect(await pendingRedemptions(profileId)).toHaveLength(0)
  })

  it('兑换记录按时间倒序，最近的在前', async () => {
    const profileId = await withBalance(2000)
    await buyShopItem(RUG(profileId), isoFromString('2026-08-10T09:00:00Z'))
    await buyShopItem(ICECREAM(profileId), isoFromString('2026-08-18T09:00:00Z'))

    const recent = await recentPurchases(profileId)

    expect(recent.map((p) => p.label)).toEqual(['一个冰淇淋', '地毯'])
  })

  it('不串档案', async () => {
    const profileId = await withBalance(1000)
    const otherId = crypto.randomUUID()
    await appendGrants(otherId, [{ delta: 1000, reason: 'correct_answer' }])
    await buyShopItem(RUG(profileId))
    await buyShopItem({ ...RUG(profileId), profileId: otherId })

    expect(await recentPurchases(profileId)).toHaveLength(1)
    expect(await recentPurchases(otherId)).toHaveLength(1)
  })
})
