/**
 * @file 拖拽题排列机制的单测 —— 含跨生成器的「摆得出来」不变量
 * @layer domain
 * @see src/domain/generators/arrangements.ts
 *
 * ⭐ 本文件最重要的是最后一组「排列可达性」测试。
 *
 * 写这三个生成器的过程中**两次**踩到同一个坑：枚举了一个认知误区对应的摆法，
 * 但孩子手上的卡片根本摆不出它（破十法枚举了 `13+0`，可卡片最大只有 10）。
 * 这种 bug 不会报错、不会崩溃——它只是让某个误区**永远不会被诊断到**，
 * 而诊断正是这套系统的全部价值。类型检查、契约测试都抓不到，只有这里能。
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { generateFromTemplate } from '@/domain/generators'
import {
  buildArrangementOptions,
  matchArrangement,
  OTHER_ARRANGEMENT_KEY,
} from '@/domain/generators/arrangements'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, ItemVisual } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]
const SAMPLES = 30

const DRAG_TEMPLATES = ITEM_TEMPLATES.filter((t) =>
  ['drag_order', 'drag_match', 'drag_combine'].includes(t.type),
)

describe('buildArrangementOptions', () => {
  const correct = { key: '1+4', text: '1 和 4' }

  it('正确项在首位且带排列键', () => {
    const options = buildArrangementOptions(correct, [], { tag: 'count_skip', text: '不对' })
    expect(options[0]?.isCorrect).toBe(true)
    expect(options[0]?.arrangementKey).toBe('1+4')
  })

  it('选项 ID 沿用 a/b/c 顺序，与其他题型一致', () => {
    const options = buildArrangementOptions(
      correct,
      [{ key: '0+5', tag: 'no_carry', text: '没补' }],
      { tag: 'ten_split_wrong', text: '不对' },
    )
    expect(options.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })

  it('⭐ 与正确排列相同的干扰项会被剔除 —— 否则摆对了会被判错', () => {
    const options = buildArrangementOptions(
      correct,
      [{ key: '1+4', tag: 'no_carry', text: '撞车了' }],
      { tag: 'ten_split_wrong', text: '不对' },
    )
    expect(options.filter((o) => o.arrangementKey === '1+4')).toHaveLength(1)
    expect(options.find((o) => o.arrangementKey === '1+4')?.isCorrect).toBe(true)
  })

  it('文本重复的干扰项会被剔除，避免错题本出现两行一样的说明', () => {
    const options = buildArrangementOptions(
      correct,
      [
        { key: '0+5', tag: 'no_carry', text: '拆错了' },
        { key: '5+0', tag: 'carry_lost', text: '拆错了' },
      ],
      { tag: 'ten_split_wrong', text: '再想想' },
    )
    expect(new Set(options.map((o) => o.text)).size).toBe(options.length)
  })

  it('⭐ 一定有兜底项，且带诊断标签', () => {
    const options = buildArrangementOptions(correct, [], { tag: 'count_skip', text: '顺序不对' })
    const fallback = options.find((o) => o.arrangementKey === OTHER_ARRANGEMENT_KEY)
    expect(fallback).toBeDefined()
    expect(fallback?.misconceptionTag).toBe('count_skip')
  })

  it('每个错误选项都带 misconceptionTag', () => {
    const options = buildArrangementOptions(
      correct,
      [{ key: '0+5', tag: 'no_carry', text: '没补' }],
      { tag: 'ten_split_wrong', text: '不对' },
    )
    for (const o of options.filter((x) => !x.isCorrect)) {
      expect(o.misconceptionTag, `选项「${o.text}」缺少标签`).toBeDefined()
    }
  })
})

describe('matchArrangement', () => {
  const options = buildArrangementOptions(
    { key: '1+4', text: '1 和 4' },
    [{ key: '0+5', tag: 'no_carry', text: '没补' }],
    { tag: 'ten_split_wrong', text: '不对' },
  )

  it('命中已枚举的排列返回对应选项 ID', () => {
    expect(matchArrangement(options, '1+4')).toBe('a')
    expect(matchArrangement(options, '0+5')).toBe('b')
  })

  it('⭐ 没枚举到的摆法落进兜底项，而不是返回 undefined', () => {
    // 返回 undefined 会让 sessionStore.answer() 直接 return，
    // 表现为「孩子摆完点确认，App 毫无反应」——最难排查的一类故障
    expect(matchArrangement(options, '2+3')).toBe('c')
    expect(options.find((o) => o.id === 'c')?.misconceptionTag).toBe('ten_split_wrong')
  })
})

describe('⭐ 排列可达性：每个枚举的摆法孩子都摆得出来', () => {
  it.each(DRAG_TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, template) => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SAMPLES; seed += 1) {
        const item = generateFromTemplate(template, difficulty, createRng(seed))
        const where = `${template.id} 难度${difficulty} 种子${seed}「${item.stem.text}」`

        for (const option of item.options) {
          const key = option.arrangementKey
          if (key === undefined || key === OTHER_ARRANGEMENT_KEY) continue
          expect(isReachable(item, key), `${where} 的排列「${key}」摆不出来`).toBe(true)
        }
      }
    }
  })
})

/** 这个排列能否用题目给孩子的那些卡片/元素摆出来 */
function isReachable(item: GeneratedItem, key: string): boolean {
  const visual = item.visual
  if (visual === undefined) return false

  switch (visual.kind) {
    case 'ordering':
      return sameMultiset(key.split(',').map(Number), visual.cards)
    case 'splitting':
      return isSplitReachable(key, visual)
    case 'matching':
      return isMatchReachable(key, visual)
    case 'blending':
      return isBlendReachable(key, visual)
    default:
      return false
  }
}

/**
 * 拼读：每一段都必须在对应的那组卡片里。
 *
 * 两拼是「声母+韵母」两段，三拼（P3.2）是「声母+介母+韵母」三段——
 * 段数由 `medials` 在不在决定，与 `PinyinBlend` 组件算槽数的方式一致。
 */
function isBlendReachable(key: string, visual: Extract<ItemVisual, { kind: 'blending' }>): boolean {
  const parts = key.split('+')
  const medials = visual.medials ?? []
  const isTriple = medials.length > 0

  if (parts.length !== (isTriple ? 3 : 2)) return false

  if (!isTriple) {
    const [initial, final] = parts as [string, string]
    return visual.initials.includes(initial) && visual.finals.includes(final)
  }

  const [initial, medial, final] = parts as [string, string, string]
  return (
    visual.initials.includes(initial) &&
    medials.includes(medial) &&
    visual.finals.includes(final)
  )
}

/** 拆分：两份都得有对应的卡，且合起来还是原来那个数 */
function isSplitReachable(key: string, visual: Extract<ItemVisual, { kind: 'splitting' }>): boolean {
  const parts = key.split('+').map(Number)
  if (parts.length !== 2 || parts.some((n) => !Number.isInteger(n))) return false

  const [first, second] = parts as [number, number]
  if (first + second !== visual.total) return false
  return visual.cards.includes(first) && visual.cards.includes(second)
}

/** 配对：左列必须是给定的那些，右列必须是给定右列的一个排列 */
function isMatchReachable(key: string, visual: Extract<ItemVisual, { kind: 'matching' }>): boolean {
  const pairs = key.split(',').map((p) => p.split('-').map(Number))
  if (pairs.some((p) => p.length !== 2 || p.some((n) => !Number.isInteger(n)))) return false

  return (
    sameMultiset(pairs.map((p) => p[0] as number), visual.left) &&
    sameMultiset(pairs.map((p) => p[1] as number), visual.right)
  )
}

function sameMultiset(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortNum = (x: number, y: number) => x - y
  return [...a].sort(sortNum).join(',') === [...b].sort(sortNum).join(',')
}
