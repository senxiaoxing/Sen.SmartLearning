/**
 * @file 数角生成器测试
 * @layer domain
 *
 * ⭐ `total` 模式的关键干扰项是**图形的个数**：摆 3 个图形共 11 个角时，
 * 「3」是个很像样的错误答案——她数的是「有几个图形」而不是「有几个角」。
 * 那正是这道题要分辨的东西。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { cornerCount, cornersOf } from '@/domain/generators/cornerCount'
import { createRng } from '@/domain/generators/rng'
import type {
  Difficulty,
  GeneratedItem,
  GeneratorContext,
  PlaneShapeKind,
} from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 1,
): GeneratorContext {
  return { kpId: 'M2-3.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

function tagged(item: GeneratedItem, tag: string): number[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => Number(o.text))
}

describe('角数表', () => {
  it('与图形对得上：三角形 3、正方形与长方形 4、圆 0', () => {
    expect(cornersOf('triangle')).toBe(3)
    expect(cornersOf('square')).toBe(4)
    expect(cornersOf('rect')).toBe(4)
    expect(cornersOf('circle'), '圆没有角，这一条也要能被问到').toBe(0)
  })
})

describe('一个图形有几个角（single）', () => {
  it('答案与图形的角数一致', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = cornerCount(ctx({ mode: 'single' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'figure') throw new Error('没有配图')
      const kind = v.imageKey.replace('plane:', '') as PlaneShapeKind
      expect(Number(item.answer)).toBe(cornersOf(kind))
    }
  })

  it('四种图形都会轮到，包括圆', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      const v = cornerCount(ctx({ mode: 'single' }, seed)).visual
      if (v !== undefined && v.kind === 'figure') kinds.add(v.imageKey)
    }
    expect(kinds.size, '四种平面图形都该出现').toBe(4)
  })

  it('图形名复用现成片段，零新增', () => {
    const item = cornerCount(ctx({ mode: 'single' }, 3))
    expect(item.stem.ttsParts?.[0]).toMatch(/^word\./)
    expect(item.stem.ttsParts?.[1]).toBe('phrase.howManyCorners')
  })

  it('配图画得出来', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const v = cornerCount(ctx({ mode: 'single' }, seed)).visual
      if (v !== undefined && v.kind === 'figure') {
        expect(isRenderableShapeKey(v.imageKey), `${v.imageKey} 渲染不了`).toBe(true)
      }
    }
  })
})

describe('一共有几个角（total）', () => {
  it('答案是各图形角数之和', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = cornerCount(ctx({ mode: 'total' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'shapeScene') throw new Error('没有 shapeScene')
      const sum = v.pieces.reduce((s, p) => s + cornersOf(p.shape as PlaneShapeKind), 0)
      expect(Number(item.answer)).toBe(sum)
    }
  })

  it('⭐ 不摆圆 —— 0 个角的图形混进去只是干扰视线', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const v = cornerCount(ctx({ mode: 'total' }, seed)).visual
      if (v !== undefined && v.kind === 'shapeScene') {
        for (const p of v.pieces) {
          expect(p.shape, '不该摆圆').not.toBe('circle')
        }
      }
    }
  })

  it('⭐ 图形个数恒是干扰项 —— 她可能数的是「有几个图形」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = cornerCount(ctx({ mode: 'total' }, seed))
      const v = item.visual
      if (v === undefined || v.kind !== 'shapeScene') continue
      const count = v.pieces.length
      if (count !== Number(item.answer)) {
        expect(tagged(item, 'count_skip'), item.stem.text).toContain(count)
      }
    }
  })

  it('图形不重叠：坐标间距大于尺寸', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const v = cornerCount(ctx({ mode: 'total' }, seed)).visual
      if (v === undefined || v.kind !== 'shapeScene') continue
      const xs = v.pieces.map((p) => p.x).sort((a, b) => a - b)
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]! - xs[i - 1]!, '两个图形挨太近会看不清').toBeGreaterThanOrEqual(48)
      }
    }
  })

  it('画布宽度容得下所有图形', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const v = cornerCount(ctx({ mode: 'total' }, seed)).visual
      if (v === undefined || v.kind !== 'shapeScene') continue
      for (const p of v.pieces) {
        expect(p.x + (p.size ?? 24), '图形超出画布').toBeLessThanOrEqual(v.width)
      }
    }
  })
})

describe('通用约束', () => {
  it('恰好 4 个选项，错误项都带标签且非负', () => {
    for (const mode of ['single', 'total'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = cornerCount(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.text} 没有标签`).toBeDefined()
          expect(Number(opt.text)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = cornerCount(ctx({ mode: 'total' }, 13))
    const b = cornerCount(ctx({ mode: 'total' }, 13))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
