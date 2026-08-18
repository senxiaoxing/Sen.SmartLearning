/**
 * @file 购买前置判定的单测
 * @layer domain
 *
 * 这是余额不足的**唯一真正防线**，也是「再攒 30 颗就能换」那句提示的来源。
 * 两个方向的错都很贵：拦太松会让孩子花掉不存在的分（余额被夹到 0，
 * 账面上凭空蒸发一笔），拦太严则是明明够钱却点不动，而她问不出为什么。
 */

import { describe, expect, it } from 'vitest'
import { canPurchase } from '@/domain/economy/canPurchase'
import { localDateFromString } from '@/domain/time'
import type { Purchase, ShopItemKind } from '@/domain/types'

const TODAY = localDateFromString('2026-08-18')

function purchaseOn(date: string, overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: crypto.randomUUID(),
    profileId: 'p1',
    shopItemId: 'real-icecream',
    kind: 'real',
    label: '一个冰淇淋',
    pricePaid: 300,
    status: 'pending',
    ledgerEntryId: crypto.randomUUID(),
    createdAt: `${date}T09:00:00.000Z` as Purchase['createdAt'],
    localDate: localDateFromString(date),
    ...overrides,
  }
}

describe('余额', () => {
  it('够钱就能买', () => {
    const verdict = canPurchase({
      kind: 'room',
      price: 300,
      balance: 300,
      history: [],
      today: TODAY,
    })
    expect(verdict.ok).toBe(true)
  })

  it('⭐ 不够钱要说出还差多少 —— 这就是「再攒 30 颗」的来源', () => {
    const verdict = canPurchase({
      kind: 'room',
      price: 300,
      balance: 270,
      history: [],
      today: TODAY,
    })
    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.reason).toBe('insufficient_balance')
    if (verdict.reason !== 'insufficient_balance') return
    expect(verdict.shortBy).toBe(30)
  })

  it('余额为 0 时差额等于全价', () => {
    const verdict = canPurchase({
      kind: 'treat',
      price: 10,
      balance: 0,
      history: [],
      today: TODAY,
    })
    if (verdict.ok || verdict.reason !== 'insufficient_balance') throw new Error('应判为余额不足')
    expect(verdict.shortBy).toBe(10)
  })
})

describe('小屋家具只能买一次', () => {
  it('⭐ 买过就不能再买 —— 第二件既没位置摆，也是白花她攒的分', () => {
    const owned = purchaseOn('2026-08-10', {
      shopItemId: 'room-rug',
      kind: 'room',
      status: 'owned',
    })
    const verdict = canPurchase({
      kind: 'room',
      price: 300,
      balance: 9999,
      history: [owned],
      today: TODAY,
    })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('already_owned')
  })

  it('⭐ 已拥有的判定必须盖过余额不足 —— 否则会提示「再攒 300 颗」，纯误导', () => {
    const owned = purchaseOn('2026-08-10', {
      shopItemId: 'room-rug',
      kind: 'room',
      status: 'owned',
    })
    const verdict = canPurchase({
      kind: 'room',
      price: 300,
      balance: 0,
      history: [owned],
      today: TODAY,
    })
    if (verdict.ok) throw new Error('应被拦下')
    expect(verdict.reason).toBe('already_owned')
  })
})

describe('零食可以反复买', () => {
  it('买过再买照样通过 —— 吃掉了就没了', () => {
    const eaten = purchaseOn('2026-08-18', {
      shopItemId: 'treat-cookie',
      kind: 'treat',
      status: 'fulfilled',
    })
    const verdict = canPurchase({
      kind: 'treat',
      price: 10,
      balance: 50,
      history: [eaten],
      today: TODAY,
    })
    expect(verdict.ok).toBe(true)
  })

  it('⭐ 虚拟商品不受冷却影响 —— 冷却只为现实里的约束存在', () => {
    const eaten = purchaseOn('2026-08-18', { kind: 'treat', status: 'fulfilled' })
    const verdict = canPurchase({
      kind: 'treat',
      price: 10,
      balance: 50,
      history: [eaten],
      cooldownDays: 30,
      today: TODAY,
    })
    expect(verdict.ok, '就算传了冷却天数也不该拦').toBe(true)
  })
})

describe('现实券', () => {
  it('冷却中要说出还要等几天', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 9999,
      history: [purchaseOn('2026-08-17')],
      cooldownDays: 3,
      today: TODAY,
    })
    if (verdict.ok || verdict.reason !== 'cooling_down') throw new Error('应判为冷却中')
    expect(verdict.daysLeft).toBe(2)
  })

  it('冷却过了就能再兑', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 9999,
      history: [purchaseOn('2026-08-15')],
      cooldownDays: 3,
      today: TODAY,
    })
    expect(verdict.ok).toBe(true)
  })

  it('⭐ 取历史里最近的一次，不依赖数组顺序', () => {
    // 按 [profileId+shopItemId] 索引查出来是主键序（UUID），基本等于随机
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 9999,
      history: [purchaseOn('2026-08-01'), purchaseOn('2026-08-17'), purchaseOn('2026-08-05')],
      cooldownDays: 3,
      today: TODAY,
    })
    if (verdict.ok || verdict.reason !== 'cooling_down') throw new Error('应按 8/17 算冷却')
    expect(verdict.daysLeft).toBe(2)
  })

  it('⭐ 家长下架后即便钱够也不能兑 —— 上架才是承诺', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 9999,
      history: [],
      listed: false,
      today: TODAY,
    })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('not_listed')
  })

  it('不传 listed 视为在架', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 300,
      history: [],
      today: TODAY,
    })
    expect(verdict.ok).toBe(true)
  })

  it('下架的判定盖过冷却与余额 —— 攒再多分也没用，必须先说', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 0,
      history: [purchaseOn('2026-08-18')],
      cooldownDays: 30,
      listed: false,
      today: TODAY,
    })
    if (verdict.ok) throw new Error('应被拦下')
    expect(verdict.reason).toBe('not_listed')
  })

  it('冷却的判定盖过余额不足 —— 钱够了也不能买，先说这个更准确', () => {
    const verdict = canPurchase({
      kind: 'real',
      price: 300,
      balance: 0,
      history: [purchaseOn('2026-08-18')],
      cooldownDays: 3,
      today: TODAY,
    })
    if (verdict.ok) throw new Error('应被拦下')
    expect(verdict.reason).toBe('cooling_down')
  })
})

describe('拒绝理由是可辨识联合', () => {
  it('每个 reason 都带齐它该带的数据，不会漏成 undefined', () => {
    const kinds: ShopItemKind[] = ['room', 'treat', 'real']
    for (const kind of kinds) {
      const verdict = canPurchase({ kind, price: 100, balance: 1, history: [], today: TODAY })
      if (verdict.ok) throw new Error('余额 1 买 100 应被拦下')
      if (verdict.reason === 'insufficient_balance') {
        expect(verdict.shortBy).toBe(99)
      }
    }
  })
})
