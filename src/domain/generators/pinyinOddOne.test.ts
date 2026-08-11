/**
 * @file pinyinOddOne 单测 —— 池子凑不出「3 同 1 异」时这道题就没有意义
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { pinyinOddOne } from '@/domain/generators/pinyinOddOne'
import { createRng } from '@/domain/generators/rng'
import type { Syllable } from '@/domain/pinyin'
import type { GeneratedItem } from '@/domain/types'

/** 与生成器内部一致的特征提取，测试独立实现一遍以免被同一个 bug 蒙蔽 */
function feature(base: string, tone: number, axis: string): string {
  if (axis === 'tone') return String(tone)
  const two = ['zh', 'ch', 'sh'].find((p) => base.startsWith(p))
  const initial = two ?? (/^[bpmfdtnlgkhjqxrzcsyw]/.test(base) ? base[0] ?? '' : '')
  return axis === 'initial' ? initial : base.slice(initial.length)
}

/** 全部 pinyinOddOne 模板 */
const ODD_TEMPLATES = ITEM_TEMPLATES.filter((t) => t.generator === 'pinyinOddOne')

describe('pinyinOddOne', () => {
  it('确实注册了「找不同」模板', () => {
    expect(ODD_TEMPLATES.length).toBeGreaterThan(0)
  })

  describe('⭐⭐ 每条模板的池子都必须能凑出「3 同 + 1 异」', () => {
    /**
     * 凑不出时生成器会退化成「随机取 4 个、指定第一个为答案」，
     * 那道题**没有正确答案可言**——四个音节两两都不同，
     * 说哪个「和其他三个不一样」都成立。孩子做了也是白做。
     *
     * 典型反例（都曾被这条测试挡下）：
     * - 四声调组按 tone 找不同：ā á ǎ à 声调各不相同
     * - z/zh/c/ch/s/sh 按声母找不同：六个声母各出现一次
     */
    it.each(ODD_TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, tpl) => {
      for (const d of [1, 2, 3] as const) {
        const params = tpl.params[d]
        const pool = params['syllables'] as Syllable[]
        const axis = params['axis'] as string

        const counts = new Map<string, number>()
        for (const s of pool) {
          const f = feature(s.base, s.tone, axis)
          counts.set(f, (counts.get(f) ?? 0) + 1)
        }

        const groupable = [...counts.entries()].filter(([, n]) => n >= 3)
        expect(
          groupable.length,
          `${tpl.id} 难度${d}：按 ${axis} 分组后没有任何一组够 3 个，凑不出「3 同 1 异」`,
        ).toBeGreaterThan(0)

        // 还要有组外的音节可以当那个「不一样的」
        const hasOutsider = groupable.some(([f]) =>
          pool.some((s) => feature(s.base, s.tone, axis) !== f),
        )
        expect(hasOutsider, `${tpl.id} 难度${d}：所有音节特征相同，没有「不一样的」`).toBe(true)
      }
    })
  })

  describe('产出的题目', () => {
    const items: GeneratedItem[] = ODD_TEMPLATES.flatMap((tpl) =>
      Array.from({ length: 40 }, (_, i) =>
        pinyinOddOne({
          kpId: tpl.kpId,
          difficulty: 2,
          params: tpl.params[2],
          rng: createRng(i + 1),
        }),
      ),
    )

    it('恰好一个正确选项', () => {
      for (const item of items) {
        expect(item.options.filter((o) => o.isCorrect), item.signature).toHaveLength(1)
      }
    })

    it('四个选项，文本互不重复', () => {
      for (const item of items) {
        expect(item.options).toHaveLength(4)
        const texts = item.options.map((o) => o.text)
        expect(new Set(texts).size, `${item.signature} 有重复选项`).toBe(texts.length)
      }
    })

    it('⭐ 选项必须可点读，且走预生成片段——孩子要反复听着比', () => {
      for (const item of items) {
        for (const o of item.options) {
          expect(o.ttsParts, `${item.signature} 的选项没有语音片段`).toBeDefined()
          expect(o.ttsParts?.[0]).toMatch(/^pinyin\./)
        }
      }
    })

    it('每个错误选项都带 misconceptionTag', () => {
      for (const item of items) {
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(o.misconceptionTag, item.signature).toBeDefined()
        }
      }
    })

    it('固定种子可复现', () => {
      const tpl = ODD_TEMPLATES[0]!
      const make = () =>
        pinyinOddOne({ kpId: tpl.kpId, difficulty: 2, params: tpl.params[2], rng: createRng(9) })
      expect(make().signature).toBe(make().signature)
    })
  })
})
