/**
 * @file shapes 单测 —— 立体/平面的干扰项必须跨族，否则主要误区无从诊断
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { createRng } from '@/domain/generators/rng'
import { shapes } from '@/domain/generators/shapes'
import type { GeneratedItem } from '@/domain/types'

function gen(family: string, seed: number, kpId = 'M7.1'): GeneratedItem {
  return shapes({ kpId, difficulty: 1, params: { family }, rng: createRng(seed) })
}

function allSeeds(family: string, kpId = 'M7.1'): GeneratedItem[] {
  return Array.from({ length: 40 }, (_, i) => gen(family, i + 1, kpId))
}

describe('shapes', () => {
  it('固定种子可复现', () => {
    expect(gen('solid', 3).signature).toBe(gen('solid', 3).signature)
  })

  it('恰好一个正确选项', () => {
    for (const item of [...allSeeds('solid'), ...allSeeds('plane', 'M7.3')]) {
      expect(item.options.filter((o) => o.isCorrect), item.signature).toHaveLength(1)
    }
  })

  it('选项图形互不重复——两个一样的图无法作答', () => {
    for (const item of [...allSeeds('solid'), ...allSeeds('plane', 'M7.3')]) {
      const keys = item.options.map((o) => o.imageKey)
      expect(new Set(keys).size, `${item.signature} 有重复图形`).toBe(keys.length)
    }
  })

  describe('⭐ 干扰项必须跨族，否则 solid_plane_confusion 没机会发生', () => {
    it('立体题里一定掺着平面图形', () => {
      for (const item of allSeeds('solid')) {
        const hasPlane = item.options.some((o) => o.imageKey?.startsWith('plane:') === true)
        expect(hasPlane, `${item.signature} 全是立体图形，诊断不出立体/平面混淆`).toBe(true)
      }
    })

    it('平面题里一定掺着立体图形', () => {
      for (const item of allSeeds('plane', 'M7.3')) {
        const hasSolid = item.options.some((o) => o.imageKey?.startsWith('solid:') === true)
        expect(hasSolid, `${item.signature} 全是平面图形`).toBe(true)
      }
    })

    it('⭐ 掺进来的是名字最像的那个（正方体 ↔ 正方形），不是随便一个', () => {
      const item = allSeeds('solid').find((i) => i.answer === '正方体')
      expect(item).toBeDefined()
      const planeKeys = item!.options
        .filter((o) => o.imageKey?.startsWith('plane:') === true)
        .map((o) => o.imageKey)
      expect(planeKeys).toContain('plane:square')
    })

    it('每个错误选项都带 misconceptionTag', () => {
      for (const item of allSeeds('solid')) {
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(o.misconceptionTag, `${item.signature}`).toBe('solid_plane_confusion')
        }
      }
    })
  })

  describe('图形面', () => {
    it('全部 imageKey 都能渲染', () => {
      for (const item of [...allSeeds('solid'), ...allSeeds('plane', 'M7.3')]) {
        for (const o of item.options) {
          expect(isRenderableShapeKey(o.imageKey ?? ''), `坏 key: ${o.imageKey}`).toBe(true)
        }
      }
    })

    it('⭐ 选项带中文名但那是给错题本用的，答案与它一致', () => {
      for (const item of allSeeds('solid')) {
        const correct = item.options.find((o) => o.isCorrect)
        expect(correct?.text).toBe(item.answer)
      }
    })

    it('题干问的就是正确答案那个图形', () => {
      for (const item of allSeeds('plane', 'M7.3')) {
        expect(item.stem.text).toBe(`哪个是${item.answer}？`)
      }
    })
  })

  it('四个选项，不多不少', () => {
    for (const item of [...allSeeds('solid'), ...allSeeds('plane', 'M7.3')]) {
      expect(item.options.length, item.signature).toBe(4)
    }
  })

  /**
   * ⭐ M2-3.1「认识角」借这套认图形题作题型轮换，但**圆没有角**。
   *
   * 「哪个是圆」答对了说明不了任何与角有关的事，掌握度却照涨——
   * 这是 2026-08-27 在真机上抓到的：一道挂在「认识角」名下的题问的是圆。
   */
  describe('⭐ corneredOnly：认识角不能问出「哪个是圆」', () => {
    const cornered = (seed: number): GeneratedItem =>
      shapes({
        kpId: 'M2-3.1',
        difficulty: 2,
        params: { family: 'plane', corneredOnly: true },
        rng: createRng(seed),
      })
    const many = Array.from({ length: 60 }, (_, i) => cornered(i + 1))

    it('正确答案永远不是圆', () => {
      for (const item of many) {
        expect(item.answer, `${item.signature} 把圆当成了考点`).not.toBe('圆')
        expect(item.options.find((o) => o.isCorrect)?.imageKey).not.toBe('plane:circle')
      }
    })

    it('三种有角的图形都轮得到 —— 只出一种等于没有题库', () => {
      const answers = new Set(many.map((i) => i.answer))
      expect(answers).toEqual(new Set(['正方形', '长方形', '三角形']))
    })

    /**
     * ⚠️ 圆必须**留在干扰项里**：问「哪个是三角形」时选了圆，
     * 恰恰说明她还分不清有角和没角，那是这个知识点最该抓的错。
     */
    it('⭐ 圆仍然会作为干扰项出现', () => {
      const withCircle = many.filter((i) =>
        i.options.some((o) => o.imageKey === 'plane:circle' && !o.isCorrect),
      )
      expect(withCircle.length, '圆被整个排除了，最有诊断价值的那个错就没机会发生').toBeGreaterThan(
        0,
      )
    })

    it('不传这个参数时行为不变 —— 一年级的 M7.3 照旧会问圆', () => {
      const answers = new Set(allSeeds('plane', 'M7.3').map((i) => i.answer))
      expect(answers).toContain('圆')
    })
  })
})
