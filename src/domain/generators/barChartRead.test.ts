/**
 * @file 读条形图生成器测试
 * @layer domain
 *
 * ⭐ 「哪个最多」要求最大值唯一，「相差几个」要求两根不等——
 * 前者会有两个正确答案，后者答案是 0、那道题问不出东西。
 */

import { describe, expect, it } from 'vitest'
import { barChartRead } from '@/domain/generators/barChartRead'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-8.2', difficulty, params, rng: createRng(seed), exclude: [] }
}

function chart(item: GeneratedItem) {
  const v = item.visual
  if (v === undefined || v.kind !== 'barChart') throw new Error('没有条形图')
  return v
}

describe('图本身', () => {
  it('柱子数与数值都在参数范围内', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const v = chart(barChartRead(ctx({ barCount: [3, 4], valueRange: [1, 6] }, seed)))
      expect(v.bars.length).toBeGreaterThanOrEqual(3)
      expect(v.bars.length).toBeLessThanOrEqual(4)
      for (const b of v.bars) {
        expect(b.count).toBeGreaterThanOrEqual(1)
        expect(b.count).toBeLessThanOrEqual(7)
      }
    }
  })

  it('⭐ 纵轴留出余量 —— 顶格的柱子看不出到没到顶', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const v = chart(barChartRead(ctx({}, seed)))
      expect(v.maxScale, `seed ${seed}`).toBeGreaterThan(Math.max(...v.bars.map((b) => b.count)))
    }
  })

  it('每根柱子都有 emoji 与名字（不识字的孩子靠 emoji 认类别）', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const b of chart(barChartRead(ctx({}, seed))).bars) {
        expect(b.emoji.length).toBeGreaterThan(0)
        expect(b.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('类别不重复', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const names = chart(barChartRead(ctx({}, seed))).bars.map((b) => b.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

describe('读一根柱子（count）', () => {
  it('答案等于那根柱子的高度', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'count' }, seed))
      const asked = /^(.+)有几个？$/.exec(item.stem.text)![1]!
      const bar = chart(item).bars.find((b) => b.name === asked)
      expect(bar, `题问的是 ${asked}，图里没有`).toBeDefined()
      expect(Number(item.answer)).toBe(bar!.count)
    }
  })
})

describe('哪个最多（most）', () => {
  it('⭐ 最大值唯一 —— 否则两个选项都对', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const counts = chart(barChartRead(ctx({ mode: 'most' }, seed))).bars.map((b) => b.count)
      const top = Math.max(...counts)
      expect(counts.filter((c) => c === top), `seed ${seed} 有并列最高`).toHaveLength(1)
    }
  })

  it('正确选项就是最高那根', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'most' }, seed))
      const v = chart(item)
      const top = v.bars.reduce((a, b) => (b.count > a.count ? b : a))
      expect(item.answer).toBe(top.emoji)
      expect(item.options.find((o) => o.isCorrect)?.text).toBe(top.emoji)
    }
  })

  it('选项数等于柱子数，每个都有名字作小字', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = barChartRead(ctx({ mode: 'most' }, seed))
      expect(item.options).toHaveLength(chart(item).bars.length)
      for (const opt of item.options) expect(opt.caption).toBeTruthy()
    }
  })
})

describe('一共有几个（total）', () => {
  it('答案是所有柱子之和', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'total' }, seed))
      const sum = chart(item).bars.reduce((s, b) => s + b.count, 0)
      expect(Number(item.answer)).toBe(sum)
    }
  })

  it('⭐ 「数成了有几种」恒是干扰项', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'total' }, seed))
      const kinds = chart(item).bars.length
      if (kinds !== Number(item.answer)) {
        expect(item.options.map((o) => Number(o.text)), item.stem.text).toContain(kinds)
      }
    }
  })
})

describe('相差几个（diff）', () => {
  it('⭐ 两根不等 —— 相差 0 那道题问不出东西', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = barChartRead(ctx({ mode: 'diff' }, seed))
      expect(Number(item.answer), `seed ${seed}`).toBeGreaterThan(0)
    }
  })

  it('答案等于题干说的两个类别之差', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'diff' }, seed))
      const m = /^(.+)和(.+)相差几个？$/.exec(item.stem.text)!
      const bars = chart(item).bars
      const a = bars.find((b) => b.name === m[1])!
      const b = bars.find((x) => x.name === m[2])!
      expect(Number(item.answer)).toBe(Math.abs(a.count - b.count))
    }
  })

  it('⭐ 「相差做成了相加」恒是干扰项', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = barChartRead(ctx({ mode: 'diff' }, seed))
      const m = /^(.+)和(.+)相差几个？$/.exec(item.stem.text)!
      const bars = chart(item).bars
      const sum = bars.find((b) => b.name === m[1])!.count + bars.find((b) => b.name === m[2])!.count
      const wrong = item.options
        .filter((o) => o.misconceptionTag === 'wrong_operation')
        .map((o) => Number(o.text))
      expect(wrong, item.stem.text).toContain(sum)
    }
  })
})

describe('通用约束', () => {
  it('恰好一个正确项，错误项都带标签', () => {
    for (const mode of ['count', 'most', 'total', 'diff'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = barChartRead(ctx({ mode }, seed))
        expect(item.options.filter((o) => o.isCorrect), `${mode} seed ${seed}`).toHaveLength(1)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag).toBeDefined()
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = barChartRead(ctx({ mode: 'diff' }, 51))
    const b = barChartRead(ctx({ mode: 'diff' }, 51))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
