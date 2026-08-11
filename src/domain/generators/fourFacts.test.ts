/**
 * @file fourFacts 单测 —— 一幅图对应四个算式，干扰项踩中任何一个都会冤枉孩子
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { fourFacts } from '@/domain/generators/fourFacts'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem } from '@/domain/types'

function gen(seed: number, range = [4, 9]): GeneratedItem {
  return fourFacts({
    kpId: 'M4.10',
    difficulty: 2,
    params: { totalRange: range },
    rng: createRng(seed),
  })
}

const ALL = Array.from({ length: 300 }, (_, i) => gen(i + 1))

/** 从 visual 还原这幅图的两组数量 */
function groupsOf(item: GeneratedItem): [number, number] {
  if (item.visual?.kind !== 'storyGroups') throw new Error('缺少配图')
  const [a = 0, b = 0] = item.visual.groups
  return [a, b]
}

/** 这幅图对应的全部四个正确算式 */
function factsOf(item: GeneratedItem): Set<string> {
  const [a, b] = groupsOf(item)
  const t = a + b
  return new Set([`${a} + ${b} = ${t}`, `${b} + ${a} = ${t}`, `${t} - ${a} = ${b}`, `${t} - ${b} = ${a}`])
}

describe('fourFacts', () => {
  it('固定种子可复现', () => {
    expect(gen(11).signature).toBe(gen(11).signature)
  })

  it('恰好一个正确选项', () => {
    for (const item of ALL) {
      expect(item.options.filter((o) => o.isCorrect), item.signature).toHaveLength(1)
    }
  })

  describe('⭐⭐ 干扰项不能是这幅图的另一个正确算式', () => {
    /**
     * 一幅 3+2=5 的图同时成立四个算式。若把 `2 + 3 = 5` 塞进干扰项，
     * 孩子选了它会被判错——**但她答的是对的**，掌握度和错题本会记一笔冤枉账。
     */
    it('每个错误选项都不属于这幅图的四式', () => {
      for (const item of ALL) {
        const facts = factsOf(item)
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(
            facts.has(o.text ?? ''),
            `${item.signature} 的干扰项「${o.text}」其实也是这幅图的算式`,
          ).toBe(false)
        }
      }
    })

    it('正确选项确实属于这幅图的四式', () => {
      for (const item of ALL) {
        const correct = item.options.find((o) => o.isCorrect)
        expect(factsOf(item).has(correct?.text ?? ''), item.signature).toBe(true)
      }
    })

    it('a = b 这类对称的图也不会出问题', () => {
      // 3+3=6 时四式只有两种写法，最容易撞车
      const items = Array.from({ length: 200 }, (_, i) => gen(i + 1, [6, 6]))
      for (const item of items) {
        const facts = factsOf(item)
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(facts.has(o.text ?? ''), `${item.signature}：${o.text}`).toBe(false)
        }
      }
    })
  })

  describe('干扰项本身要合法', () => {
    it('不出现负数结果', () => {
      for (const item of ALL) {
        for (const o of item.options) {
          const result = Number((o.text ?? '').split('=')[1]?.trim())
          expect(result, `${item.signature}：${o.text}`).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('选项互不重复', () => {
      for (const item of ALL) {
        const texts = item.options.map((o) => o.text)
        expect(new Set(texts).size, `${item.signature} 有重复选项`).toBe(texts.length)
      }
    })

    it('每个错误选项都带 misconceptionTag', () => {
      for (const item of ALL) {
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(o.misconceptionTag, `${item.signature}：${o.text}`).toBeDefined()
        }
      }
    })

    it('至少三个选项，不退化成二选一', () => {
      for (const item of ALL) {
        expect(item.options.length, item.signature).toBeGreaterThanOrEqual(3)
      }
    })
  })

  it('算式能点读——孩子认得数字但读不出符号', () => {
    for (const item of ALL.slice(0, 30)) {
      for (const o of item.options) {
        expect(o.ttsText, `${o.text} 没有朗读文本`).toBeTruthy()
        expect(o.ttsText).not.toContain('+')
        expect(o.ttsText).not.toContain('=')
      }
    }
  })
})
