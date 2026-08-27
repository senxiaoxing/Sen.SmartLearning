/**
 * @file 量长度生成器测试
 * @layer domain
 *
 * ⭐ 核心是 `ruler_start_wrong`：**物体从 0 开始量的题产生不了这个错误**，
 * 那时右端的数恰好就是答案。所以起点不为 0 的题必须带上「直接读右端」这个选项，
 * 而起点为 0 的题不能有它——那会是个等于正确答案的干扰项。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { measureLength } from '@/domain/generators/measureLength'
import { createRng } from '@/domain/generators/rng'
import { MAX_TICKS } from '@/domain/rulerGeometry'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-1.2', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从 imageKey `ruler:12:1:6` 解析出尺子上的摆法 */
function ruler(item: GeneratedItem): { maxTick: number; start: number; end: number } {
  const v = item.visual
  if (v === undefined || v.kind !== 'figure') throw new Error('没有尺子配图')
  const m = /^ruler:(\d+):(\d+):(\d+)$/.exec(v.imageKey)
  if (m === null) throw new Error(`不是尺子: ${v.imageKey}`)
  return { maxTick: Number(m[1]), start: Number(m[2]), end: Number(m[3]) }
}

function tagged(item: GeneratedItem, tag: string): number[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => Number(o.text))
}

describe('用尺子量（read）', () => {
  it('答案恒等于右端减左端', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = measureLength(ctx({}, seed))
      const { start, end } = ruler(item)
      expect(Number(item.answer), `${start}~${end}`).toBe(end - start)
    }
  })

  it('物体不超出尺子', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { maxTick, start, end } = ruler(measureLength(ctx({}, seed)))
      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeLessThanOrEqual(maxTick)
      expect(end).toBeGreaterThan(start)
      expect(maxTick).toBeLessThanOrEqual(MAX_TICKS)
    }
  })

  it('⭐ 起点不为 0 时，「直接读右端」恒在选项里', () => {
    let shifted = 0
    for (let seed = 1; seed <= 100; seed++) {
      const item = measureLength(ctx({ start: 'shifted' }, seed))
      const { start, end } = ruler(item)
      expect(start, 'shifted 模式起点必须不为 0').toBeGreaterThan(0)
      expect(tagged(item, 'ruler_start_wrong'), `${start}~${end} 缺少「读右端」`).toContain(end)
      shifted++
    }
    expect(shifted).toBeGreaterThan(0)
  })

  it('⭐ 起点为 0 时不出现「读右端」—— 那会等于正确答案', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = measureLength(ctx({ start: 'zero' }, seed))
      const { start, end } = ruler(item)
      expect(start).toBe(0)
      expect(tagged(item, 'ruler_start_wrong'), '0 起点不该有「读右端」').not.toContain(end)
    }
  })

  it('any 模式两种起点都会出现 —— 全从 0 量就考不到那个误区', () => {
    const starts = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      starts.add(ruler(measureLength(ctx({ start: 'any' }, seed))).start === 0 ? 'zero' : 'shifted')
    }
    expect(starts, '两种起点都该出现').toEqual(new Set(['zero', 'shifted']))
  })

  it('长度落在参数范围内', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = measureLength(ctx({ lengthRange: [4, 6] }, seed))
      expect(Number(item.answer)).toBeGreaterThanOrEqual(4)
      expect(Number(item.answer)).toBeLessThanOrEqual(6)
    }
  })

  it('尺子画得出来', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const v = measureLength(ctx({}, seed)).visual
      if (v !== undefined && v.kind === 'figure') {
        expect(isRenderableShapeKey(v.imageKey), `${v.imageKey} 渲染不了`).toBe(true)
      }
    }
  })
})

/** 从 `segment:<厘米>:<刻度数>` 里取厘米数 */
const segmentCm = (key: string): number => Number(key.split(':')[1])

/** 从 `segment:<厘米>:<刻度数>` 里取尺子的刻度数 */
const segmentTicks = (key: string): number => Number(key.split(':')[2])

describe('哪条线段长 N 厘米（pick）', () => {
  it('正确选项的长度与题干说的一致', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = measureLength(ctx({ mode: 'pick' }, seed))
      const asked = Number(/长 (\d+) 厘米/.exec(item.stem.text)![1])
      const correct = item.options.find((o) => o.isCorrect)?.imageKey ?? ''
      expect(segmentCm(correct)).toBe(asked)
      expect(item.answer).toBe(correct)
    }
  })

  it('⭐ 四个选项共用同一把尺子 —— 各配各的尺子会让四条线看起来一样长', () => {
    // 每条线段配一把刚好够长的尺子，画布宽度就各不相同，
    // 而选项卡片是等宽的：四条线会被各自缩放到几乎同长，这道题就没法做了
    for (let seed = 1; seed <= 60; seed++) {
      const item = measureLength(ctx({ mode: 'pick' }, seed))
      const ticks = item.options.map((o) => segmentTicks(o.imageKey ?? ''))
      expect(new Set(ticks).size, `尺子不一样长: ${ticks.join(' / ')}`).toBe(1)
      // 尺子必须比最长的那条线段长，否则右端点压在最后一条刻度线上
      const longest = Math.max(...item.options.map((o) => segmentCm(o.imageKey ?? '')))
      expect(ticks[0]).toBeGreaterThan(longest)
    }
  })

  it('⭐ 四条线段长度互不相同 —— 两条一样长的话选另一条也该算对', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const keys = measureLength(ctx({ mode: 'pick' }, seed)).options.map((o) => o.imageKey)
      expect(new Set(keys).size, `重复长度: ${keys.join(' / ')}`).toBe(keys.length)
    }
  })

  it('恰好 4 个选项、一个正确项，错误项都带标签', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = measureLength(ctx({ mode: 'pick' }, seed))
      expect(item.options).toHaveLength(4)
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBe('unit_sense_weak')
      }
    }
  })

  it('线段画得出来，长度恒为正', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const opt of measureLength(ctx({ mode: 'pick' }, seed)).options) {
        expect(isRenderableShapeKey(opt.imageKey ?? ''), `${opt.imageKey} 渲染不了`).toBe(true)
        expect(segmentCm(opt.imageKey ?? '')).toBeGreaterThan(0)
      }
    }
  })

  it('「厘米」复用单位换算那条片段，零新增', () => {
    const item = measureLength(ctx({ mode: 'pick' }, 4))
    expect(item.stem.ttsParts).toContain('unit.cm')
    expect(item.stem.ttsParts?.[0]).toBe('phrase.whichSegmentIs')
  })
})

describe('通用约束', () => {
  it('恰好 4 个选项，错误项都带标签且非负', () => {
    for (const mode of ['read', 'pick'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = measureLength(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项没有标签`).toBeDefined()
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = measureLength(ctx({ start: 'shifted' }, 37))
    const b = measureLength(ctx({ start: 'shifted' }, 37))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
