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
})
