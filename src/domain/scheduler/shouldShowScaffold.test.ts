/**
 * @file shouldShowScaffold 的单测 —— 锁住「按状态给帮助」的四条边界
 * @layer domain
 * @see design/09-竞品借鉴.md §4
 */

import { describe, expect, it } from 'vitest'
import { shouldShowScaffold } from '@/domain/scheduler/shouldShowScaffold'
import type { Difficulty, ItemType } from '@/domain/types'

const ask = (
  difficulty: Difficulty,
  extra: { wrong?: number; correct?: number; type?: ItemType } = {},
): boolean =>
  shouldShowScaffold({
    difficulty,
    type: extra.type ?? 'input_number',
    ...(extra.wrong !== undefined && { consecutiveWrong: extra.wrong }),
    ...(extra.correct !== undefined && { consecutiveCorrect: extra.correct }),
  })

describe('没有历史时按难度走（摸底、预览、第一次接触）', () => {
  it('⭐ 难度 1 必给 —— 初次接触进位加法不能是纯抽象的', () => {
    expect(ask(1)).toBe(true)
  })

  it('难度 2、3 不给，靠心算', () => {
    expect(ask(2)).toBe(false)
    expect(ask(3)).toBe(false)
  })
})

describe('连错自动挂上', () => {
  it('⭐ 连错 2 次，难度 2、3 也给 —— 她卡住了，跟题目多难无关', () => {
    expect(ask(2, { wrong: 2 })).toBe(true)
    expect(ask(3, { wrong: 2 })).toBe(true)
  })

  it('只错 1 次不给 —— 一次错很可能是手滑，不是不会', () => {
    expect(ask(2, { wrong: 1 })).toBe(false)
    expect(ask(3, { wrong: 1 })).toBe(false)
  })

  it('错得更多仍然给', () => {
    expect(ask(3, { wrong: 7 })).toBe(true)
  })
})

describe('连对自动撤掉', () => {
  it('⭐ 难度 1 连对 2 次就撤 —— 「逐步撤除」真正发生的地方', () => {
    expect(ask(1, { correct: 2 })).toBe(false)
  })

  it('连对 1 次还不撤', () => {
    expect(ask(1, { correct: 1 })).toBe(true)
  })

  it('⭐ 撤掉之后再连错 2 次会回来 —— 迟滞闭环，不是永久剥夺', () => {
    // 连对撤掉 → 之后答错，consecutiveCorrect 归零、consecutiveWrong 累加
    expect(ask(1, { correct: 0, wrong: 2 })).toBe(true)
  })
})

describe('⛔ 听算题一律不给', () => {
  it('难度 1 也不给 —— 题面藏着，挂上就只剩一幅没有问题的图', () => {
    expect(ask(1, { type: 'listen_number' })).toBe(false)
  })

  it('⭐ 连错再多也不给 —— 听算卡住的补救是回到看算，不是给听算配图', () => {
    // 这条锁的是判据顺序：若「连错 ≥2」排在听算之前，这里会是 true
    expect(ask(1, { type: 'listen_number', wrong: 5 })).toBe(false)
    expect(ask(3, { type: 'listen_number', wrong: 5 })).toBe(false)
  })
})
