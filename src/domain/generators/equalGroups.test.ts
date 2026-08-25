/**
 * @file 「几个几」生成器测试
 * @layer domain
 *
 * ⭐ 最要紧的一条在 `equation` 那组：**绝不能拿交换后的写法当干扰项**。
 * 数学上 `4 × 3` 与 `3 × 4` 都对，把它摆进错误选项会把一个正确答案判成错的，
 * 而孩子完全不知道自己错在哪——这是所有题里最伤人的一种错。
 */

import { describe, expect, it } from 'vitest'
import { equalGroups } from '@/domain/generators/equalGroups'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-4.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 取出图上摆的组数与每组个数 */
function shown(item: GeneratedItem): { groups: number; perGroup: number } {
  const v = item.visual
  if (v === undefined || v.kind !== 'equalGroups') throw new Error('没有 equalGroups 配图')
  return { groups: v.groups, perGroup: v.perGroup }
}

function tagged(item: GeneratedItem, tag: string): string[] {
  return item.options.filter((o) => o.misconceptionTag === tag).map((o) => o.text ?? '')
}

describe('配图', () => {
  it('每道题都配 equalGroups 图，组数与每组个数都在范围内', () => {
    for (const mode of ['times', 'equation', 'share', 'groupCount'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const { groups, perGroup } = shown(equalGroups(ctx({ mode }, seed)))
        expect(groups).toBeGreaterThanOrEqual(2)
        expect(groups).toBeLessThanOrEqual(5)
        expect(perGroup).toBeGreaterThanOrEqual(2)
        expect(perGroup).toBeLessThanOrEqual(5)
      }
    }
  })

  it('⭐ 物体总数压在 25 以内 —— 再多在 iPad 上是一片糊，她会去数而不是想「几个几」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { groups, perGroup } = shown(equalGroups(ctx({}, seed)))
      expect(groups * perGroup).toBeLessThanOrEqual(25)
    }
  })

  it('参数能收窄范围', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { groups, perGroup } = shown(
        equalGroups(ctx({ groupsRange: [3, 3], perGroupRange: [4, 4] }, seed)),
      )
      expect(groups).toBe(3)
      expect(perGroup).toBe(4)
    }
  })
})

describe('一共有几个（times）', () => {
  it('答案是组数乘每组个数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'times' }, seed))
      const { groups, perGroup } = shown(item)
      expect(Number(item.answer)).toBe(groups * perGroup)
    }
  })

  it('⭐ mul_as_add 恒是两数相加 —— 红线要求它必须占一个选项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'times' }, seed))
      const { groups, perGroup } = shown(item)
      if (groups + perGroup !== groups * perGroup) {
        expect(tagged(item, 'mul_as_add').map(Number)).toContain(groups + perGroup)
      }
    }
  })

  it('题干只有一句话，物品全靠图', () => {
    const item = equalGroups(ctx({ mode: 'times' }, 3))
    expect(item.stem.text).toBe('一共有几个？')
    expect(item.stem.ttsParts, '复用一年级那条，零新增').toEqual(['phrase.altogetherHowMany'])
  })
})

describe('哪个算式说的是这幅图（equation）', () => {
  it('正确答案是「组数 × 每组几个」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'equation' }, seed))
      const { groups, perGroup } = shown(item)
      expect(item.answer).toBe(`${groups} × ${perGroup}`)
    }
  })

  it('⭐ 干扰项里绝不出现交换写法 —— 4×3 与 3×4 都对，摆进去会把正确答案判成错', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = equalGroups(ctx({ mode: 'equation' }, seed))
      const { groups, perGroup } = shown(item)
      const swapped = `${perGroup} × ${groups}`
      const wrong = item.options.filter((o) => !o.isCorrect).map((o) => o.text)
      // 组数与每组个数相同时交换写法就是正确答案本身，不算违规
      if (groups !== perGroup) {
        expect(wrong, `${swapped} 不该出现在错误选项里`).not.toContain(swapped)
      }
    }
  })

  it('mul_as_add 是「几加几」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'equation' }, seed))
      const { groups, perGroup } = shown(item)
      expect(tagged(item, 'mul_as_add')).toContain(`${groups} + ${perGroup}`)
    }
  })

  it('复用一图四式那条题干，零新增语音', () => {
    const item = equalGroups(ctx({ mode: 'equation' }, 3))
    expect(item.stem.ttsParts).toEqual(['phrase.whichEquationFits'])
  })
})

describe('平均分（share）与包含除（groupCount）', () => {
  it('share 问「每份几个」，答案是每组个数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'share' }, seed))
      const { groups, perGroup } = shown(item)
      expect(Number(item.answer)).toBe(perGroup)
      expect(item.stem.text).toContain(`平均分成 ${groups} 份`)
    }
  })

  it('groupCount 问「能分几组」，答案是组数', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'groupCount' }, seed))
      const { groups, perGroup } = shown(item)
      expect(Number(item.answer)).toBe(groups)
      expect(item.stem.text).toContain(`${perGroup} 个分一组`)
    }
  })

  it('⭐ 两种除法共用同一幅图 —— 只是问的东西不同', () => {
    const share = equalGroups(ctx({ mode: 'share', groupsRange: [3, 3], perGroupRange: [4, 4] }, 7))
    const group = equalGroups(
      ctx({ mode: 'groupCount', groupsRange: [3, 3], perGroupRange: [4, 4] }, 7),
    )
    expect(shown(share)).toEqual(shown(group))
    expect(Number(share.answer)).toBe(4)
    expect(Number(group.answer)).toBe(3)
  })

  it('div_as_sub 恒是「总数减去分的份数」', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = equalGroups(ctx({ mode: 'share' }, seed))
      const { groups, perGroup } = shown(item)
      const bySub = groups * perGroup - groups
      if (bySub !== perGroup) {
        expect(tagged(item, 'div_as_sub').map(Number)).toContain(bySub)
      }
    }
  })
})

describe('通用约束', () => {
  const ALL = ['times', 'equation', 'share', 'groupCount'] as const

  it('恰好 4 个选项，错误项都带标签', () => {
    for (const mode of ALL) {
      for (let seed = 1; seed <= 40; seed++) {
        const item = equalGroups(ctx({ mode }, seed))
        expect(item.options, `${mode} seed ${seed}`).toHaveLength(4)
        expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
        }
      }
    }
  })

  it('选项互不重复', () => {
    for (const mode of ALL) {
      for (let seed = 1; seed <= 40; seed++) {
        const texts = equalGroups(ctx({ mode }, seed)).options.map((o) => o.text)
        expect(new Set(texts).size, `${mode} 有重复选项: ${texts.join(' / ')}`).toBe(texts.length)
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = equalGroups(ctx({ mode: 'share' }, 19))
    const b = equalGroups(ctx({ mode: 'share' }, 19))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
