/**
 * @file clock 单测 —— 指针角度与 hand_swap 干扰项
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { clock } from '@/domain/generators/clock'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem } from '@/domain/types'

function gen(mode: string, seed: number, kpId = 'M8.2'): GeneratedItem {
  return clock({ kpId, difficulty: 2, params: { mode }, rng: createRng(seed) })
}

/** 把足够多的种子跑一遍，覆盖 12 个小时 × 整点/半点 */
function allSeeds(mode: string, kpId = 'M8.2'): GeneratedItem[] {
  return Array.from({ length: 80 }, (_, i) => gen(mode, i + 1, kpId))
}

describe('clock', () => {
  it('固定种子可复现', () => {
    expect(gen('oclock', 7).signature).toBe(gen('oclock', 7).signature)
  })

  describe('⭐ 回归：12 点整的指针交换后读数不变', () => {
    /**
     * 12 点整时时针分针都指向 12，交换后仍是 12 点整。
     * 曾经这个重复项会在去重时把**正确选项挤掉**，
     * 整道题一个正确答案都没有，孩子怎么点都是错的。
     */
    it('任何时刻都恰好有一个正确选项', () => {
      for (const mode of ['oclock', 'half', 'parts']) {
        for (const item of allSeeds(mode, mode === 'parts' ? 'M8.1' : 'M8.2')) {
          expect(
            item.options.filter((o) => o.isCorrect),
            `${mode} ${item.signature} 的正确选项数不对`,
          ).toHaveLength(1)
        }
      }
    })

    it('选项文本互不重复', () => {
      for (const item of allSeeds('half')) {
        const texts = item.options.map((o) => o.text)
        expect(new Set(texts).size, `${item.signature} 有重复选项`).toBe(texts.length)
      }
    })

    it('认钟面题的图形 key 互不重复——两个一样的钟面无法作答', () => {
      for (const item of allSeeds('parts', 'M8.1')) {
        const keys = item.options.map((o) => o.imageKey)
        expect(new Set(keys).size, `${item.signature} 有重复钟面`).toBe(keys.length)
      }
    })
  })

  describe('⭐ 干扰项诊断性', () => {
    it('每个错误选项都带 misconceptionTag', () => {
      for (const item of allSeeds('oclock')) {
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(o.misconceptionTag, `${item.signature} 有无标签的错误项`).toBe('hand_swap')
        }
      }
    })

    it('至少有两个干扰项，不能退化成二选一', () => {
      for (const item of allSeeds('half')) {
        expect(item.options.length, `${item.signature} 选项太少`).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('题干与图', () => {
    it('读时刻题的题干配一个钟面图', () => {
      const item = gen('oclock', 5)
      expect(item.visual?.kind).toBe('figure')
      if (item.visual?.kind === 'figure') {
        expect(isRenderableShapeKey(item.visual.imageKey)).toBe(true)
      }
    })

    it('⭐ 认钟面题反过来：题干是文字，选项是钟面图', () => {
      const item = gen('parts', 5, 'M8.1')
      expect(item.visual).toBeUndefined()
      for (const o of item.options) {
        expect(o.imageKey, '选项应当是钟面').toBeDefined()
        expect(isRenderableShapeKey(o.imageKey ?? '')).toBe(true)
      }
    })

    it('全部产出的图形 key 都能渲染', () => {
      for (const mode of ['oclock', 'half', 'parts']) {
        for (const item of allSeeds(mode, mode === 'parts' ? 'M8.1' : 'M8.2')) {
          if (item.visual?.kind === 'figure') {
            expect(isRenderableShapeKey(item.visual.imageKey)).toBe(true)
          }
          for (const o of item.options) {
            if (o.imageKey !== undefined) {
              expect(isRenderableShapeKey(o.imageKey), `坏 key: ${o.imageKey}`).toBe(true)
            }
          }
        }
      }
    })
  })

  describe('难度模式', () => {
    it('oclock 只出整点', () => {
      for (const item of allSeeds('oclock')) {
        expect(item.answer).toMatch(/点整$/)
      }
    })

    it('half 会出现半点', () => {
      const answers = allSeeds('half').map((i) => i.answer)
      expect(answers.some((a) => a.endsWith('点半'))).toBe(true)
      expect(answers.some((a) => a.endsWith('点整'))).toBe(true)
    })

    it('小时数落在 1~12，不会出现 0 点', () => {
      for (const item of allSeeds('half')) {
        const hour = Number(item.answer.split(' ')[0])
        expect(hour, `${item.answer} 的小时数越界`).toBeGreaterThanOrEqual(1)
        expect(hour).toBeLessThanOrEqual(12)
      }
    })
  })
})
