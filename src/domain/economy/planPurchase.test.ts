/**
 * @file 购买方案的单测
 * @layer domain
 *
 * 守两件事：**扣分永远是负数**，以及**三个品类各自落到正确的状态**。
 * 后者错了在界面上看不出来——现实券要是直接落成 `fulfilled`，
 * 家长的待兑现列表里根本不会出现它，冰淇淋就永远不会来。
 */

import { describe, expect, it } from 'vitest'
import { planPurchase } from '@/domain/economy/planPurchase'
import type { ShopItemKind } from '@/domain/types'

const ALL_KINDS: ShopItemKind[] = ['room', 'treat', 'real']

describe('扣分', () => {
  it('⭐ delta 恒为负数 —— 买东西绝不能变成加分', () => {
    for (const kind of ALL_KINDS) {
      expect(planPurchase(kind, 300).grant.delta).toBe(-300)
    }
  })

  it('各品类记各自的理由，家长报告里能分辨钱花在哪', () => {
    expect(planPurchase('room', 300).grant.reason).toBe('buy_item')
    expect(planPurchase('treat', 10).grant.reason).toBe('buy_food')
    expect(planPurchase('real', 300).grant.reason).toBe('redeem_real')
  })
})

describe('初始状态', () => {
  it('家具买了就永久拥有', () => {
    const plan = planPurchase('room', 300)
    expect(plan.status).toBe('owned')
    expect(plan.fulfilledNow).toBe(false)
  })

  it('零食买入即消耗，要立刻写兑现时间', () => {
    const plan = planPurchase('treat', 10)
    expect(plan.status).toBe('fulfilled')
    expect(plan.fulfilledNow).toBe(true)
  })

  it('⭐ 现实券落成 pending —— 直接 fulfilled 会让它从家长的待兑现列表里消失', () => {
    const plan = planPurchase('real', 300)
    expect(plan.status).toBe('pending')
    expect(plan.fulfilledNow, '还没兑现，不该有兑现时间').toBe(false)
  })

  it('fulfilledNow 与 status 始终一致', () => {
    for (const kind of ALL_KINDS) {
      const plan = planPurchase(kind, 100)
      expect(plan.fulfilledNow).toBe(plan.status === 'fulfilled')
    }
  })
})

describe('价格防线', () => {
  it('⭐ 负价抛错 —— 静默兜底会变成「买东西送分」', () => {
    expect(() => planPurchase('room', -100)).toThrow(/正整数/)
  })

  it('⭐ 零价抛错 —— 悄悄变成 0 元购，孩子会立刻发现并反复薅', () => {
    expect(() => planPurchase('treat', 0)).toThrow(/正整数/)
  })

  it('小数价抛错 —— 星星没有半颗', () => {
    expect(() => planPurchase('real', 99.5)).toThrow(/正整数/)
  })

  it('NaN 抛错', () => {
    expect(() => planPurchase('room', Number.NaN)).toThrow(/正整数/)
  })
})
