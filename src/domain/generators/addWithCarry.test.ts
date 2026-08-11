/**
 * @file 进位加法生成器测试 —— 验证凑十法的诊断策略
 * @layer domain
 *
 * M5 是自适应系统价值最集中的地方：孩子选了哪个错误选项，
 * 直接决定她该回去补凑十法（`carry_lost`）、补数感（`no_carry`）
 * 还是补运算符识别（`sub_instead`）。这里必须逐个断言标签绑定正确。
 */

import { describe, expect, it } from 'vitest'
import { addWithCarry } from '@/domain/generators/addWithCarry'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
  kpId = 'M5.2',
): GeneratorContext {
  return { kpId, difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从题干 `9 + 5 = ?` 解析出两个加数 */
function parseAddends(text: string): [number, number] {
  const m = /^(\d+) \+ (\d+)/.exec(text)
  if (m === null) throw new Error(`无法解析题干: ${text}`)
  return [Number(m[1]), Number(m[2])]
}

describe('直接计算模式', () => {
  it('和必须落在 (10, 20]，即真正构成进位', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = addWithCarry(ctx({ addends: [9, 8, 7, 6, 5, 4, 3, 2] }, seed))
      const [a, b] = parseAddends(item.stem.text)
      expect(a + b, `${a}+${b} 未构成进位`).toBeGreaterThan(10)
      expect(a + b).toBeLessThanOrEqual(20)
      expect(b).toBeLessThanOrEqual(9)
      expect(Number(item.answer)).toBe(a + b)
    }
  })

  it('干扰项绑定正确的认知误区', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = addWithCarry(ctx({ addends: [9] }, seed))
      const [a, b] = parseAddends(item.stem.text)
      const answer = a + b
      const byTag = new Map(
        item.options.filter((o) => !o.isCorrect).map((o) => [o.misconceptionTag, Number(o.text)]),
      )

      // 忘记进位 → 比正确答案少 1（9+5 当成 9+4）
      if (byTag.has('no_carry')) expect(byTag.get('no_carry')).toBe(answer - 1)
      // 凑十后忘记加剩余 → 停在 10
      if (byTag.has('carry_lost')) expect(byTag.get('carry_lost')).toBe(10)
      // 做成减法
      if (byTag.has('sub_instead')) expect(byTag.get('sub_instead')).toBe(Math.abs(a - b))
    }
  })

  it('digit_concat 只在最高难度出现', () => {
    const lowTags = new Set<string>()
    const highTags = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      for (const o of addWithCarry(ctx({ addends: [9] }, seed, 2)).options) {
        if (o.misconceptionTag) lowTags.add(o.misconceptionTag)
      }
      for (const o of addWithCarry(ctx({ addends: [9] }, seed, 3)).options) {
        if (o.misconceptionTag) highTags.add(o.misconceptionTag)
      }
    }
    // 20 以内题目里出现 95 这种两位数会被孩子一眼排除，
    // 让四选一退化成三选一，因此低难度不启用
    expect(lowTags.has('digit_concat')).toBe(false)
    expect(highTags.size).toBeGreaterThanOrEqual(lowTags.size)
  })

  it('签名包含知识点与算式，可用于去重', () => {
    const item = addWithCarry(ctx({ addends: [9] }, 11, 2, 'M5.2'))
    const [a, b] = parseAddends(item.stem.text)
    expect(item.signature).toBe(`M5.2#${a}+${b}`)
  })

  it('朗读文本用中文而非符号（孩子不识字，全靠听）', () => {
    const item = addWithCarry(ctx({ addends: [9] }, 12))
    expect(item.stem.ttsText).toContain('加')
    expect(item.stem.ttsText).not.toContain('+')
  })
})

describe('十格阵脚手架', () => {
  it('⭐ 只在难度 1 提供，难度 2、3 必须靠心算', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(addWithCarry(ctx({ addends: [9] }, seed, 1)).visual, '难度 1 应有脚手架').toBeDefined()
      expect(addWithCarry(ctx({ addends: [9] }, seed, 2)).visual, '难度 2 应撤除').toBeUndefined()
      expect(addWithCarry(ctx({ addends: [9] }, seed, 3)).visual, '难度 3 应撤除').toBeUndefined()
    }
  })

  it('脚手架数值与算式一致', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const item = addWithCarry(ctx({ addends: [9, 8, 7] }, seed, 1))
      const [a, b] = parseAddends(item.stem.text)
      expect(item.visual).toEqual({ kind: 'tenFrame', frame: a, loose: b })
    }
  })
})

describe('凑十法原理模式（M5.1）', () => {
  it('拆分结果正确：把 b 分成 (10-a) 和答案', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = addWithCarry(ctx({ makeTen: true, addends: [9, 8, 7] }, seed, 2, 'M5.1'))
      const m = /^(\d+) \+ (\d+)，把 \d+ 分成 (\d+) 和 \?$/.exec(item.stem.text)
      expect(m, `题干格式异常: ${item.stem.text}`).not.toBeNull()

      const a = Number(m![1])
      const b = Number(m![2])
      const toTen = Number(m![3])
      expect(toTen, '凑十补数应为 10 - a').toBe(10 - a)
      expect(Number(item.answer), '剩余部分应为 b - (10 - a)').toBe(b - toTen)
    }
  })

  it('签名与直接计算模式不冲突', () => {
    const makeTen = addWithCarry(ctx({ makeTen: true, addends: [9] }, 5, 2, 'M5.1'))
    expect(makeTen.signature).toContain('maketen')
  })
})

describe('参数校验', () => {
  it('无法构成进位的被加数会抛错而不是产出错题', () => {
    // 1 + 任意个位数都无法超过 10
    expect(() => addWithCarry(ctx({ addends: [1] }, 1))).toThrow(/无法构成/)
  })

  it('参数类型不符时抛错', () => {
    expect(() => addWithCarry(ctx({ addends: 'nine' }, 1))).toThrow(/应为非空数值数组/)
  })
})
