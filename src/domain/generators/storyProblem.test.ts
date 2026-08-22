/**
 * @file storyProblem 单测 —— wrong_operation 是 M9 唯一要诊断的东西
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { STORY_FRAMES } from '@/data/seed/storyFrames'
import { COUNTABLES } from '@/domain/generators/countables'
import { createRng } from '@/domain/generators/rng'
import { storyProblem } from '@/domain/generators/storyProblem'
import { framesFor } from '@/domain/storyFrame'
import type { GeneratedItem } from '@/domain/types'

function gen(mode: string, seed: number, story = false): GeneratedItem {
  return storyProblem({
    kpId: story ? 'M9.1' : 'M4.1',
    difficulty: 2,
    params: { mode, story, totalRange: [4, 9], frames: STORY_FRAMES },
    rng: createRng(seed),
  })
}

function all(mode: string, story = false) {
  return Array.from({ length: 150 }, (_, i) => gen(mode, i + 1, story))
}

function groupsOf(item: GeneratedItem): number[] {
  return item.visual?.kind === 'storyGroups' ? item.visual.groups : []
}

/** 把数字与物品名抹掉，剩下的就是句式本身，用来数「换了几种说法」 */
function frameOf(item: GeneratedItem): string {
  let text = item.stem.text.replace(/\d+/g, 'N')
  for (const c of COUNTABLES) text = text.replaceAll(c.name, 'X')
  return text
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
    /**
     * ⚠️ 这两条刻意**不断言具体措辞**，只断言 story 开关的真正含义：
     * 条件在图里还是在话里。句式已经是数据（`storyFrames.ts`），
     * 写死某一句话会让「加个新说法」变成「测试红了」。
     */
    it('M4 直白提问，条件全在图里，题干不出现数字', () => {
      for (const mode of ['add', 'remove']) {
        for (const item of all(mode, false)) {
          expect(item.stem.text, item.stem.text).not.toMatch(/\d/)
        }
      }
    })

    it('M9 把已知条件说进题干——应用题要练的是从话里提取数', () => {
      for (const mode of ['add', 'remove']) {
        for (const item of all(mode, true)) {
          const numbers = item.stem.text.match(/\d+/g) ?? []
          expect(numbers.length, item.stem.text).toBe(2)
        }
      }
    })
  })

  describe('⭐ 换着说法问 —— 孩子的原话是「重复的题目有点多」', () => {
    it('同一个知识点会轮到句式表里的每一种说法', () => {
      for (const [mode, story] of [
        ['add', false],
        ['add', true],
        ['remove', false],
        ['remove', true],
        ['compare', false],
      ] as const) {
        const expected = framesFor(STORY_FRAMES, mode, story).length
        const seen = new Set(all(mode, story).map(frameOf))
        expect(seen.size, `${mode}/story=${story} 只轮到了 ${[...seen].join(' | ')}`).toBe(expected)
      }
    })

    it('⭐ 动词挑得动物品 ——「吃掉了 3 颗星星」不该出现', () => {
      const edible = COUNTABLES.filter((c) => c.kind === 'edible').map((c) => c.name)

      for (const item of all('remove', true)) {
        if (!item.stem.text.includes('吃掉了')) continue
        expect(
          edible.some((name) => item.stem.text.includes(name)),
          `「${item.stem.text}」——只有能吃的东西才吃得掉`,
        ).toBe(true)
      }
    })

    it('题干朗读片段与显示文本同步替换，不会漏掉槽位', () => {
      for (const item of [...all('add', true), ...all('remove', true)]) {
        expect(item.stem.ttsParts, item.stem.text).toBeDefined()
        expect(item.stem.ttsParts!.some((p) => p.startsWith('{')), '槽位没被展开').toBe(false)
        expect(item.stem.ttsText).not.toMatch(/[？?]$/)
      }
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
