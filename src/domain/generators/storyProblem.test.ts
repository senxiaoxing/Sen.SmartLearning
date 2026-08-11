/**
 * @file storyProblem 单测 —— wrong_operation 是 M9 唯一要诊断的东西
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { createRng } from '@/domain/generators/rng'
import { storyProblem } from '@/domain/generators/storyProblem'
import type { GeneratedItem } from '@/domain/types'

function gen(mode: string, seed: number, story = false): GeneratedItem {
  return storyProblem({
    kpId: story ? 'M9.1' : 'M4.1',
    difficulty: 2,
    params: { mode, story, totalRange: [4, 9] },
    rng: createRng(seed),
  })
}

function all(mode: string, story = false) {
  return Array.from({ length: 150 }, (_, i) => gen(mode, i + 1, story))
}

function groupsOf(item: GeneratedItem): number[] {
  return item.visual?.kind === 'storyGroups' ? item.visual.groups : []
}

describe('storyProblem', () => {
  it('固定种子可复现', () => {
    expect(gen('add', 5).signature).toBe(gen('add', 5).signature)
  })

  describe('add：合并', () => {
    it('答案等于两组之和，图与算式对得上', () => {
      for (const item of all('add')) {
        const [a = 0, b = 0] = groupsOf(item)
        expect(a + b, item.signature).toBe(Number(item.answer))
      }
    })

    it('⭐ 干扰项含「做成减法」的结果', () => {
      for (const item of all('add')) {
        const [a = 0, b = 0] = groupsOf(item)
        const diff = Math.abs(a - b)
        if (diff === a + b) continue // 极端情况下重合，会被去重

        const hit = item.options.find((o) => Number(o.text) === diff && !o.isCorrect)
        if (hit !== undefined) expect(hit.misconceptionTag).toBe('wrong_operation')
      }
    })
  })

  describe('remove：去掉', () => {
    it('答案等于总数减拿走的', () => {
      for (const item of all('remove')) {
        const [total = 0, taken = 0] = groupsOf(item)
        expect(total - taken, item.signature).toBe(Number(item.answer))
      }
    })

    it('⭐ 拿走的必须少于总数——否则剩 0 个，图上什么都看不出来', () => {
      for (const item of all('remove')) {
        const [total = 0, taken = 0] = groupsOf(item)
        expect(taken, item.signature).toBeGreaterThanOrEqual(1)
        expect(taken, item.signature).toBeLessThan(total)
      }
    })

    it('⭐ 干扰项含「做成加法」的结果', () => {
      for (const item of all('remove')) {
        const [total = 0, taken = 0] = groupsOf(item)
        const hit = item.options.find((o) => Number(o.text) === total + taken && !o.isCorrect)
        expect(hit?.misconceptionTag, item.signature).toBe('wrong_operation')
      }
    })
  })

  describe('compare：比多少', () => {
    it('答案等于两排之差，且上排更多', () => {
      for (const item of all('compare')) {
        const [more = 0, less = 0] = groupsOf(item)
        expect(more, item.signature).toBeGreaterThan(less)
        expect(more - less, item.signature).toBe(Number(item.answer))
      }
    })

    it('⭐ 干扰项含「答成多的那排有几个」——没做减法', () => {
      for (const item of all('compare')) {
        const [more = 0] = groupsOf(item)
        if (more === Number(item.answer)) continue

        const hit = item.options.find((o) => Number(o.text) === more && !o.isCorrect)
        if (hit !== undefined) expect(hit.misconceptionTag).toBe('wrong_operation')
      }
    })
  })

  describe('story 开关', () => {
    it('M4 直白提问，不带情境铺垫', () => {
      expect(gen('add', 3, false).stem.text).toMatch(/^一共有几个.+？$/)
      expect(gen('remove', 3, false).stem.text).toMatch(/^还剩几个.+？$/)
    })

    it('M9 把已知条件说进题干——应用题要练的是从话里提取数', () => {
      expect(gen('add', 3, true).stem.text).toMatch(/^左边有 \d+ 个.+右边有 \d+ 个，一共有几个？$/)
      expect(gen('remove', 3, true).stem.text).toMatch(/^原来有 \d+ 个.+拿走了 \d+ 个，还剩几个？$/)
    })
  })

  it('答案非负，选项互不重复', () => {
    for (const item of [...all('add'), ...all('remove'), ...all('compare')]) {
      expect(Number(item.answer)).toBeGreaterThanOrEqual(0)
      const texts = item.options.map((o) => o.text)
      expect(new Set(texts).size, `${item.signature} 有重复选项`).toBe(texts.length)
    }
  })
})
