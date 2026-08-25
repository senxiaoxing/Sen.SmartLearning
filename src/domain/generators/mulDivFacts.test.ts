/**
 * @file 乘除版一图四式测试
 * @layer domain
 *
 * ⭐ 两条断言撑起这个生成器：
 * **干扰项不能是这幅图的另一个正确算式**（一幅图对应四个，塞进另一个会把
 * 答对的孩子判错），以及 **干扰项必须算不通**——一幅「2 组、每组 2 个」的图，
 * `4 - 2 = 2` 既成立又讲得通，把它当干扰项同样是冤枉。
 */

import { describe, expect, it } from 'vitest'
import { isTrueEquation } from '@/domain/equation'
import { mulDivFacts } from '@/domain/generators/mulDivFacts'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 3,
): GeneratorContext {
  return { kpId: 'M2-9.5', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 取出图上摆的组数与每组个数 */
function shown(item: GeneratedItem): { groups: number; perGroup: number } {
  const v = item.visual
  if (v === undefined || v.kind !== 'equalGroups') throw new Error('没有 equalGroups 配图')
  return { groups: v.groups, perGroup: v.perGroup }
}

/** 这幅图对应的四个正确算式 */
function factsOf(groups: number, perGroup: number): string[] {
  const total = groups * perGroup
  return [
    `${groups} × ${perGroup} = ${total}`,
    `${perGroup} × ${groups} = ${total}`,
    `${total} ÷ ${groups} = ${perGroup}`,
    `${total} ÷ ${perGroup} = ${groups}`,
  ]
}

describe('题目结构', () => {
  it('正确答案恒是这幅图的四式之一', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = mulDivFacts(ctx({}, seed))
      const { groups, perGroup } = shown(item)
      expect(factsOf(groups, perGroup), `${item.answer} 不是这幅图的算式`).toContain(item.answer)
    }
  })

  it('四个算式都会轮到 —— 只出乘法就练不到「乘除互逆」', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      kinds.add(mulDivFacts(ctx({}, seed)).answer.includes('×') ? 'mul' : 'div')
    }
    expect(kinds, '乘法和除法两个方向都要出现').toEqual(new Set(['mul', 'div']))
  })

  it('配图与算式对得上', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = mulDivFacts(ctx({}, seed))
      const { groups, perGroup } = shown(item)
      expect(groups * perGroup).toBeGreaterThan(0)
      expect(item.answer).toContain(String(groups * perGroup))
    }
  })
})

describe('⭐ 干扰项的两道关', () => {
  it('① 绝不是这幅图的另一个正确算式 —— 那会把答对的孩子判错', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = mulDivFacts(ctx({}, seed))
      const { groups, perGroup } = shown(item)
      const facts = factsOf(groups, perGroup)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(facts, `「${opt.text}」也是这幅图的算式，不能当干扰项`).not.toContain(opt.text)
      }
    }
  })

  it('② 恒是算不通的等式 —— 算得通的会有「讲得通」的歧义', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = mulDivFacts(ctx({}, seed))
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(isTrueEquation(opt.text ?? ''), `「${opt.text}」算得通，不该当干扰项`).toBe(false)
      }
    }
  })

  it('恰好 4 个选项、一个正确项，错误项都带标签', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = mulDivFacts(ctx({}, seed))
      expect(item.options, `seed ${seed} 选项数不对`).toHaveLength(4)
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
      }
    }
  })

  it('选项互不重复', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const texts = mulDivFacts(ctx({}, seed)).options.map((o) => o.text)
      expect(new Set(texts).size, `重复选项: ${texts.join(' / ')}`).toBe(texts.length)
    }
  })

  it('⭐ 极端参数（2 组每组 2 个）下仍凑得齐四个选项', () => {
    // 这一组最容易出事：2 + 2 = 4 恰好成立，mul_as_add 那条会被筛掉
    for (let seed = 1; seed <= 40; seed++) {
      const item = mulDivFacts(ctx({ groupsRange: [2, 2], perGroupRange: [2, 2] }, seed))
      expect(item.options).toHaveLength(4)
    }
  })
})

describe('语音', () => {
  it('算式选项念得出来', () => {
    const item = mulDivFacts(ctx({}, 5))
    for (const opt of item.options) {
      expect(opt.ttsParts, `「${opt.text}」拼不出片段`).toBeDefined()
      expect(opt.ttsText).toMatch(/等于/)
    }
  })

  it('题干复用一图四式那条，零新增', () => {
    expect(mulDivFacts(ctx({}, 5)).stem.ttsParts).toEqual(['phrase.whichEquationFits'])
  })
})

describe('稳定性', () => {
  it('同一个种子产出稳定', () => {
    const a = mulDivFacts(ctx({}, 23))
    const b = mulDivFacts(ctx({}, 23))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
