/**
 * @file wrongBook 单测 —— 去重与「已改对」判定错了，家长会盯着已解决的题反复补救
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_RESOLVE_STREAK } from '@/domain/report/hasStreakAfter'
import { collectWrongItems } from '@/domain/report/wrongBook'
import { isoFromString, localDateFromString } from '@/domain/time'
import type { Attempt } from '@/domain/types'

/** 构造一条作答。`at` 用 `'2026-08-09T10:00:00Z'` 这种形式 */
function attempt(over: Partial<Attempt> & { at: string }): Attempt {
  const createdAt = isoFromString(over.at)
  return {
    id: crypto.randomUUID(),
    profileId: 'p1' as Attempt['profileId'],
    sessionId: 's1' as Attempt['sessionId'],
    kpId: 'M5.2',
    itemId: 'M5.2-gen#9+5',
    itemSnapshot: {
      stem: '9 + 5 = ?',
      options: [
        { id: 'a', text: '14' },
        { id: 'b', text: '13', misconceptionTag: 'no_carry' },
      ],
      answer: '14',
    },
    difficulty: 2,
    isCorrect: false,
    selectedOptionId: 'b',
    misconceptionTag: 'no_carry',
    responseTimeMs: 5000,
    hintUsed: false,
    ttsReplayCount: 0,
    isRetry: false,
    localDate: localDateFromString(over.at.slice(0, 10)),
    ...over,
    createdAt,
  }
}

describe('collectWrongItems', () => {
  it('没有错题时返回空数组', () => {
    expect(collectWrongItems([attempt({ at: '2026-08-09T10:00:00Z', isCorrect: true })])).toEqual([])
  })

  it('⭐ 还原家长做诊断需要的三件事：题干、正确答案、她选了什么', () => {
    const [item] = collectWrongItems([attempt({ at: '2026-08-09T10:00:00Z' })])

    expect(item).toMatchObject({
      kpId: 'M5.2',
      stem: '9 + 5 = ?',
      correctAnswer: '14',
      selectedText: '13',
      misconceptionTag: 'no_carry',
    })
    expect(item?.resolvedBy).toBeUndefined()
  })

  describe('同一道题只保留最近一次错误', () => {
    it('错三遍只出现一行', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z' }),
        attempt({ at: '2026-08-08T10:00:00Z' }),
        attempt({ at: '2026-08-09T10:00:00Z' }),
      ])

      expect(items).toHaveLength(1)
      expect(items[0]?.createdAt).toBe(isoFromString('2026-08-09T10:00:00Z'))
    })

    it('不同题各占一行', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-09T10:00:00Z', itemId: 'M5.2-gen#9+5' }),
        attempt({ at: '2026-08-09T10:01:00Z', itemId: 'M5.2-gen#9+7' }),
      ])
      expect(items).toHaveLength(2)
    })
  })

  describe('⭐ 解决方式一：这道题本身做对了', () => {
    it('错了之后又做对，就从错题本里消失', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-09T10:00:00Z' }),
        attempt({ at: '2026-08-09T10:05:00Z', isCorrect: true, isRetry: true }),
      ])
      expect(items).toEqual([])
    })

    it('订正轮之外后来又遇到做对了，同样算解决', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z' }),
        attempt({ at: '2026-08-09T10:00:00Z', isCorrect: true, isRetry: false }),
      ])
      expect(items).toEqual([])
    })

    it('⚠️ 先做对后来又错了，仍要出现——那说明她其实没记住', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z', isCorrect: true }),
        attempt({ at: '2026-08-09T10:00:00Z', isCorrect: false }),
      ])
      expect(items).toHaveLength(1)
      expect(items[0]?.resolvedBy).toBeUndefined()
    })

    it('includeResolved 时保留，并标记解决方式', () => {
      const items = collectWrongItems(
        [
          attempt({ at: '2026-08-09T10:00:00Z' }),
          attempt({ at: '2026-08-09T10:05:00Z', isCorrect: true, isRetry: true }),
        ],
        { includeResolved: true },
      )

      expect(items).toHaveLength(1)
      expect(items[0]?.resolvedBy).toBe('same_item')
    })
  })

  describe('⭐ 解决方式二：同知识点连续答对（这道题可能再也不会出现）', () => {
    /** 同知识点、不同算式的一次答对 */
    const otherCorrect = (at: string) =>
      attempt({ at, itemId: `M5.2-gen#other-${at}`, isCorrect: true })

    it(`连对 ${DEFAULT_RESOLVE_STREAK} 次就视为解决，哪怕原题再没出现过`, () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z' }),
        otherCorrect('2026-08-08T10:00:00Z'),
        otherCorrect('2026-08-08T10:01:00Z'),
        otherCorrect('2026-08-08T10:02:00Z'),
      ])
      expect(items).toEqual([])
    })

    it('差一次不算', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z' }),
        otherCorrect('2026-08-08T10:00:00Z'),
        otherCorrect('2026-08-08T10:01:00Z'),
      ])
      expect(items).toHaveLength(1)
    })

    it('中间又错了会重新计数', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z' }),
        otherCorrect('2026-08-08T10:00:00Z'),
        otherCorrect('2026-08-08T10:01:00Z'),
        attempt({ at: '2026-08-08T10:02:00Z', itemId: 'M5.2-gen#interrupt' }),
        otherCorrect('2026-08-08T10:03:00Z'),
      ])
      // 原题仍未解决；被打断的那道新错题自己也进了清单
      expect(items.some((i) => i.itemId === 'M5.2-gen#9+5')).toBe(true)
    })

    it('⚠️ 只看这次错误之后的作答，之前连对多少次都不算', () => {
      const items = collectWrongItems([
        otherCorrect('2026-08-06T10:00:00Z'),
        otherCorrect('2026-08-06T10:01:00Z'),
        otherCorrect('2026-08-06T10:02:00Z'),
        attempt({ at: '2026-08-07T10:00:00Z' }),
      ])
      expect(items).toHaveLength(1)
    })

    it('⚠️ 别的知识点连对再多也不能解决这个知识点的错题', () => {
      const items = collectWrongItems([
        attempt({ at: '2026-08-07T10:00:00Z', kpId: 'M5.2' }),
        attempt({ at: '2026-08-08T10:00:00Z', kpId: 'M6.1', itemId: 'x1', isCorrect: true }),
        attempt({ at: '2026-08-08T10:01:00Z', kpId: 'M6.1', itemId: 'x2', isCorrect: true }),
        attempt({ at: '2026-08-08T10:02:00Z', kpId: 'M6.1', itemId: 'x3', isCorrect: true }),
      ])
      expect(items).toHaveLength(1)
      expect(items[0]?.kpId).toBe('M5.2')
    })

    it('标记为 kp_streak，与「这道题改对了」区分开', () => {
      const items = collectWrongItems(
        [
          attempt({ at: '2026-08-07T10:00:00Z' }),
          otherCorrect('2026-08-08T10:00:00Z'),
          otherCorrect('2026-08-08T10:01:00Z'),
          otherCorrect('2026-08-08T10:02:00Z'),
        ],
        { includeResolved: true },
      )
      expect(items[0]?.resolvedBy).toBe('kp_streak')
    })

    it('resolveStreak 可调，设为 0 时关闭这条通路', () => {
      const attempts = [
        attempt({ at: '2026-08-07T10:00:00Z' }),
        otherCorrect('2026-08-08T10:00:00Z'),
        otherCorrect('2026-08-08T10:01:00Z'),
        otherCorrect('2026-08-08T10:02:00Z'),
      ]
      expect(collectWrongItems(attempts, { resolveStreak: 0 })).toHaveLength(1)
    })
  })

  it('按时间倒序，最近的错题排最前', () => {
    const items = collectWrongItems([
      attempt({ at: '2026-08-07T10:00:00Z', itemId: 'a' }),
      attempt({ at: '2026-08-09T10:00:00Z', itemId: 'b' }),
      attempt({ at: '2026-08-08T10:00:00Z', itemId: 'c' }),
    ])
    expect(items.map((i) => i.itemId)).toEqual(['b', 'c', 'a'])
  })

  it('没有 itemSnapshot 时降级为空文本，不崩', () => {
    const [item] = collectWrongItems([
      attempt({ at: '2026-08-09T10:00:00Z', itemSnapshot: undefined }),
    ])

    expect(item?.stem).toBe('')
    expect(item?.correctAnswer).toBe('')
    expect(item?.selectedText).toBeUndefined()
  })
})
