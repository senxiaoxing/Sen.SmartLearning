/**
 * @file 宠物台词选择测试
 * @layer domain
 * @see src/domain/pet/personality.ts
 *
 * 守的主要是 `archived` 那条分支：它是**真机上看不出来**的那类错误——
 * 台词随机轮换，翻几次回忆才撞上一句，而且撞上了也只是「听着有点怪」。
 */

import { describe, expect, it } from 'vitest'
import { greetingMoment, pickLine } from '@/domain/pet/personality'
import { petDefinitionOf } from '@/data/seed/pets'
import { toIso } from '@/domain/time'

// 一律走 toIso()：品牌类型的唯一合法入口，手写 `as IsoDateTime` 是被禁的
const NOW = toIso(new Date('2026-08-27T10:00:00.000Z'))
const YESTERDAY = toIso(new Date('2026-08-26T10:00:00.000Z'))
const LONG_AGO = toIso(new Date('2026-06-01T10:00:00.000Z'))

describe('打招呼用哪一池', () => {
  it('刚见过 → 普通问候', () => {
    expect(greetingMoment(YESTERDAY, NOW)).toBe('greet')
  })

  it('好几天没见 → 想你了', () => {
    expect(greetingMoment(LONG_AGO, NOW)).toBe('comeback')
  })

  it('从没见过（刚创建的伙伴）→ 普通问候', () => {
    expect(greetingMoment(undefined, NOW)).toBe('greet')
  })

  /**
   * ⭐ 这条是 B 那个 bug 的回归测试。
   *
   * 往届伙伴不再结算经验，`lastSeenAt` 就此冻住，天数只会越拖越大——
   * 于是它**必然、且永久**命中 `comeback`。而「好几天没见到你了，我有点想你」
   * 出现在回忆页里的意思是「你抛弃我之后我一直在等」，
   * 恰恰是 §5.2 造出「回忆」这个地方要避免的负罪感。
   */
  it('⭐ 往届伙伴：不管冻了多久，都不能掉进「想你了」', () => {
    expect(greetingMoment(LONG_AGO, NOW, true)).toBe('archived')
    expect(greetingMoment(YESTERDAY, NOW, true)).toBe('archived')
    expect(greetingMoment(undefined, NOW, true)).toBe('archived')
  })
})

describe('挑一句台词', () => {
  const penguin = petDefinitionOf('math', 'G1')!.personality

  it('挑出来的一定在对应的池子里', () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.99]) {
      expect(penguin.archived).toContainEqual(pickLine(penguin, 'archived', seed))
      expect(penguin.correct).toContainEqual(pickLine(penguin, 'correct', seed))
    }
  })

  it('整池都轮得到 —— 只挑得出一句就等于没有池子', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i += 1) seen.add(pickLine(penguin, 'archived', i / 100).clipKey)
    expect(seen.size).toBe(penguin.archived.length)
  })

  it('seed 落在边界上也不越界', () => {
    expect(penguin.archived).toContainEqual(pickLine(penguin, 'archived', 1))
    expect(penguin.archived).toContainEqual(pickLine(penguin, 'archived', 0))
  })
})
