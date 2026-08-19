/**
 * @file 家长门禁题目的单测
 * @layer domain
 *
 * ⭐ **这个文件的存在本身就是那个 bug 的教训。**
 *
 * 原先的实现是拒绝采样（`while ((a%10) + (b%10) < 10) b = pick()`），
 * 在 `a` 的个位为 0 时永远退不出——主线程卡死、浏览器弹「页面无响应」。
 * 它藏了很久，因为九次里有八次是好的：重开一次页面就「好了」，
 * 看起来像偶发的浏览器毛病，而不像代码的问题。
 *
 * 所以这里第一条测的不是「题目对不对」，而是**「它一定会返回」**。
 */

import { describe, expect, it } from 'vitest'
import { newParentChallenge } from '@/domain/parent/parentChallenge'

/** 把一串固定的 [0,1) 值当作随机源，用完循环复用 */
function seeded(values: readonly number[]): () => number {
  let i = 0
  return () => values[i++ % values.length] as number
}

describe('⭐ 一定会终止', () => {
  it('穷举所有极值组合都能返回，不会挂住', () => {
    // rng 的四个取值分别喂给 aOnes / bOnes / aTens / bTens。
    // 0 与 0.999… 是两端，正是拒绝采样最容易卡死的地方
    const edges = [0, 0.0001, 0.5, 0.9999]
    for (const v0 of edges) {
      for (const v1 of edges) {
        for (const v2 of edges) {
          for (const v3 of edges) {
            const challenge = newParentChallenge(seeded([v0, v1, v2, v3]))
            expect(Number.isInteger(challenge.a)).toBe(true)
            expect(Number.isInteger(challenge.b)).toBe(true)
          }
        }
      }
    }
  })

  it('两千次真随机调用全部返回', () => {
    // 旧实现在这个规模下必然卡死（单次触发率约 9%）
    for (let i = 0; i < 2000; i += 1) {
      expect(newParentChallenge(Math.random)).toBeDefined()
    }
  })
})

describe('⭐ 必然进位', () => {
  it('两千次随机结果的个位之和都不小于 10', () => {
    for (let i = 0; i < 2000; i += 1) {
      const { a, b } = newParentChallenge(Math.random)
      expect((a % 10) + (b % 10), `${a} + ${b} 没有进位`).toBeGreaterThanOrEqual(10)
    }
  })

  it('不进位的加法（如 21+34）孩子掰手指也能凑出来，所以一个都不能出现', () => {
    const results = Array.from({ length: 500 }, () => newParentChallenge(Math.random))
    const noCarry = results.filter(({ a, b }) => (a % 10) + (b % 10) < 10)
    expect(noCarry).toHaveLength(0)
  })
})

describe('难度落在一年级之外、家长心算之内', () => {
  it('两个加数都是两位数', () => {
    for (let i = 0; i < 500; i += 1) {
      const { a, b } = newParentChallenge(Math.random)
      expect(a).toBeGreaterThanOrEqual(21)
      expect(a).toBeLessThanOrEqual(79)
      expect(b).toBeGreaterThanOrEqual(21)
      expect(b).toBeLessThanOrEqual(79)
    }
  })

  it('和超出 20 以内 —— 一年级上学期学的就是 20 以内', () => {
    for (let i = 0; i < 500; i += 1) {
      const { a, b } = newParentChallenge(Math.random)
      expect(a + b).toBeGreaterThan(20)
    }
  })

  it('题目会变化，不是每次都同一道', () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => {
        const { a, b } = newParentChallenge(Math.random)
        return `${a}+${b}`
      }),
    )
    expect(seen.size).toBeGreaterThan(50)
  })
})

describe('随机源可注入', () => {
  it('同一个随机序列得到同一道题', () => {
    const values = [0.3, 0.7, 0.2, 0.9]
    expect(newParentChallenge(seeded(values))).toEqual(newParentChallenge(seeded(values)))
  })

  it('rng 恒为 0 时取每一段的下界', () => {
    // aOnes=1 → bOnes 从 9 起跳 → 1 + 9 = 10，仍然进位
    expect(newParentChallenge(() => 0)).toEqual({ a: 21, b: 29 })
  })
})
