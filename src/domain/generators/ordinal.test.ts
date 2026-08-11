/**
 * @file ordinal 单测 —— 基数序数混淆是 M1.4 唯一要诊断的东西
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { ordinal } from '@/domain/generators/ordinal'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem } from '@/domain/types'

function gen(seed: number, params: Record<string, unknown> = {}): GeneratedItem {
  return ordinal({ kpId: 'M1.4', difficulty: 2, params, rng: createRng(seed) })
}

const ALL = Array.from({ length: 200 }, (_, i) => gen(i + 1, { allowFromRight: true }))

function rowOf(item: GeneratedItem) {
  if (item.visual?.kind !== 'ordinalRow') throw new Error('缺少配图')
  return item.visual
}

describe('ordinal', () => {
  it('固定种子可复现', () => {
    expect(gen(7).signature).toBe(gen(7).signature)
  })

  it('⭐ 干扰项里一定有「总数」——那正是基数序数混淆的表现', () => {
    for (const item of ALL) {
      const count = rowOf(item).emojis.length
      const answer = Number(item.answer)
      // 位次等于总数时两者重合，此时该干扰项被去重剔除，属于正常
      if (answer === count) continue

      const hit = item.options.find((o) => Number(o.text) === count && !o.isCorrect)
      expect(hit, `${item.signature} 缺少「答成总数」的干扰项`).toBeDefined()
      expect(hit?.misconceptionTag).toBe('ordinal_cardinal_confusion')
    }
  })

  it('一排物体互不相同——一排一样的东西问「它排第几」认不出是哪个', () => {
    for (const item of ALL) {
      const emojis = rowOf(item).emojis
      expect(new Set(emojis).size, item.signature).toBe(emojis.length)
    }
  })

  it('答案落在 1~总数之间', () => {
    for (const item of ALL) {
      const answer = Number(item.answer)
      expect(answer).toBeGreaterThanOrEqual(1)
      expect(answer).toBeLessThanOrEqual(rowOf(item).emojis.length)
    }
  })

  it('⭐ 避开首尾——第一个和最后一个不用数就看得出来', () => {
    for (const item of ALL) {
      const count = rowOf(item).emojis.length
      const answer = Number(item.answer)
      expect(answer, `${item.signature} 问了第一个`).not.toBe(1)
      expect(answer, `${item.signature} 问了最后一个`).not.toBe(count)
    }
  })

  it('题干说明了从哪边数', () => {
    for (const item of ALL) {
      expect(item.stem.text).toMatch(/^从[左右]边数/)
    }
  })

  it('难度 1 只从左边数——方向本身是难度 2 才引入的变量', () => {
    const items = Array.from({ length: 60 }, (_, i) => gen(i + 1, { countRange: [4, 5] }))
    for (const item of items) {
      expect(rowOf(item).fromRight).toBeUndefined()
      expect(item.stem.text).toMatch(/^从左边数/)
    }
  })

  it('被指的位置与题干里的动物对得上', () => {
    for (const item of ALL) {
      const row = rowOf(item)
      const arrayIndex = row.fromRight === true
        ? row.emojis.length - 1 - row.targetIndex
        : row.targetIndex
      expect(arrayIndex).toBeGreaterThanOrEqual(0)
      expect(arrayIndex).toBeLessThan(row.emojis.length)
      // targetIndex 是 0-based，答案是 1-based
      expect(row.targetIndex + 1).toBe(Number(item.answer))
    }
  })
})
