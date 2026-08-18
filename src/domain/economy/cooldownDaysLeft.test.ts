/**
 * @file 现实券冷却判定的单测
 * @layer domain
 *
 * 这里守的是一条对孩子的承诺：**冷却必须能用「天」说清楚**。
 * 算错了不会崩，只会让她某天点下去发现不行、过一会儿又行了——
 * 那看起来就是坏了，而她没有办法追问。
 */

import { describe, expect, it } from 'vitest'
import { cooldownDaysLeft } from '@/domain/economy/cooldownDaysLeft'
import { localDateFromString } from '@/domain/time'

const d = localDateFromString

describe('没有冷却的情况', () => {
  it('从没兑过 —— 随时可兑', () => {
    expect(cooldownDaysLeft(undefined, 30, d('2026-08-18'))).toBe(0)
  })

  it('家长没设冷却 —— 兑过也不拦', () => {
    expect(cooldownDaysLeft(d('2026-08-18'), 0, d('2026-08-18'))).toBe(0)
  })

  it('冷却天数为负同样视作不限', () => {
    expect(cooldownDaysLeft(d('2026-08-18'), -5, d('2026-08-18'))).toBe(0)
  })
})

describe('冷却倒数', () => {
  it('当天兑过，冷却 3 天 —— 还要等 3 天', () => {
    expect(cooldownDaysLeft(d('2026-08-18'), 3, d('2026-08-18'))).toBe(3)
  })

  it('逐天递减', () => {
    const last = d('2026-08-18')
    expect(cooldownDaysLeft(last, 3, d('2026-08-19'))).toBe(2)
    expect(cooldownDaysLeft(last, 3, d('2026-08-20'))).toBe(1)
    expect(cooldownDaysLeft(last, 3, d('2026-08-21'))).toBe(0)
  })

  it('隔满之后一直是 0，不会变成负数', () => {
    expect(cooldownDaysLeft(d('2026-08-18'), 3, d('2026-09-30'))).toBe(0)
  })

  it('糖果的长冷却（家长会设很长）也照常倒数', () => {
    expect(cooldownDaysLeft(d('2026-08-18'), 14, d('2026-08-25'))).toBe(7)
  })
})

describe('日历天而非 24 小时', () => {
  it('⭐ 同一天内的先后不影响判定 —— 冷却只看日期', () => {
    // 「昨天下午 5 点兑的，今天下午 5 点前不行」对孩子无法解释：
    // 同一个「今天」一会儿不行一会儿又行，看起来就是坏了
    const last = d('2026-08-18')
    expect(cooldownDaysLeft(last, 1, d('2026-08-19'))).toBe(0)
  })

  it('跨月正常', () => {
    expect(cooldownDaysLeft(d('2026-08-30'), 5, d('2026-09-02'))).toBe(2)
  })

  it('跨年正常', () => {
    expect(cooldownDaysLeft(d('2026-12-30'), 5, d('2027-01-02'))).toBe(2)
  })
})

describe('设备日期被改动', () => {
  it('⭐ 日期往回调不会算出荒唐的等待天数', () => {
    // 不夹上限的话会得到「还要等 400 天」，那个数字没法向孩子解释
    const left = cooldownDaysLeft(d('2027-08-18'), 3, d('2026-08-18'))
    expect(left).toBe(3)
    expect(left, '最坏也只是从头再等一个完整冷却期').toBeLessThanOrEqual(3)
  })
})
