/**
 * @file 单位换算与量感生成器测试
 * @layer domain
 *
 * 量感题最容易出的错是**有两个正确答案**：问「哪个大约长 2 米」时，
 * 若干扰项里也有一个 2 米的东西，孩子选它被判错，而她其实是对的。
 * 这类错误在 iPad 上看起来完全正常（四个 emoji 摆得好好的），
 * 只有孩子会觉得「这个 App 有毛病」。
 */

import { describe, expect, it } from 'vitest'
import { MEASURABLES } from '@/domain/generators/measurables'
import { createRng } from '@/domain/generators/rng'
import { unitConvert } from '@/domain/generators/unitConvert'
import type { Difficulty, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-1.3', difficulty, params, rng: createRng(seed), exclude: [] }
}

describe('物品表本身', () => {
  it('⭐ 同一种量里没有两个物品量级完全相同 —— 否则题目会有两个正确答案', () => {
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const m of MEASURABLES) {
      const key = `${m.quantity}|${m.value}|${m.unit}`
      const owner = seen.get(key)
      if (owner !== undefined) clashes.push(`${m.name} 与 ${owner} 都是 ${m.value}${m.unit}`)
      seen.set(key, m.name)
    }
    expect(clashes).toEqual([])
  })

  it('每种量至少 4 个物品 —— 不够就凑不齐四个选项', () => {
    for (const q of ['length', 'mass'] as const) {
      expect(MEASURABLES.filter((m) => m.quantity === q).length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('换算（convert）', () => {
  it('长度：大→小恒是乘 100', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = unitConvert(ctx({ quantity: 'length', direction: 'down' }, seed))
      const m = /^(\d+) 米 = \? 厘米$/.exec(item.stem.text)
      expect(m, item.stem.text).not.toBeNull()
      expect(Number(item.answer)).toBe(Number(m![1]) * 100)
    }
  })

  it('质量：大→小恒是乘 1000；时间：1 时 = 60 分', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const mass = unitConvert(ctx({ quantity: 'mass', direction: 'down' }, seed))
      const mm = /^(\d+) 千克 = \? 克$/.exec(mass.stem.text)!
      expect(Number(mass.answer)).toBe(Number(mm[1]) * 1000)

      const time = unitConvert(ctx({ quantity: 'time', direction: 'down' }, seed))
      const tm = /^(\d+) 时 = \? 分$/.exec(time.stem.text)!
      expect(Number(time.answer)).toBe(Number(tm[1]) * 60)
    }
  })

  it('小→大方向答案正确', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = unitConvert(ctx({ quantity: 'length', direction: 'up' }, seed))
      const m = /^(\d+) 厘米 = \? 米$/.exec(item.stem.text)!
      expect(Number(item.answer)).toBe(Number(m[1]) / 100)
    }
  })

  it('⭐ unit_conversion 里恒有「把进率记成 10」那一项', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = unitConvert(ctx({ quantity: 'length', direction: 'down' }, seed))
      const base = Number(/^(\d+) 米/.exec(item.stem.text)![1])
      const wrong = item.options
        .filter((o) => o.misconceptionTag === 'unit_conversion')
        .map((o) => Number(o.text))
      expect(wrong, `${item.stem.text} 缺少「进率记成 10」`).toContain(base * 10)
    }
  })

  it('语音只多出单位名，「等于几」是复用的', () => {
    const item = unitConvert(ctx({ quantity: 'length' }, 3))
    expect(item.stem.ttsParts).toContain('unit.m')
    expect(item.stem.ttsParts).toContain('unit.cm')
    expect(item.stem.ttsParts).toContain('phrase.equalsWhat')
  })

  it('both 方向两种都会出现', () => {
    const dirs = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const item = unitConvert(ctx({ quantity: 'length', direction: 'both' }, seed))
      dirs.add(item.stem.text.includes('米 = ? 厘米') ? 'down' : 'up')
    }
    expect(dirs.size).toBe(2)
  })
})

describe('量感（chooseUnit）', () => {
  it('⭐ 四个选项里只有一个符合题干说的量级', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const quantity of ['length', 'mass'] as const) {
        const item = unitConvert(ctx({ mode: 'chooseUnit', quantity }, seed))
        const m = /大约[长重] (\d+) (\S+)？$/.exec(item.stem.text)!
        const askedValue = Number(m[1])
        const askedUnit = m[2]

        const matching = item.options.filter((opt) => {
          const found = MEASURABLES.find((x) => x.emoji === opt.text)
          return found?.value === askedValue && found.unit === askedUnit
        })
        expect(matching, `${item.stem.text} 有多个符合的选项`).toHaveLength(1)
        expect(matching[0]!.isCorrect, '符合量级的那个应该是正确答案').toBe(true)
      }
    }
  })

  it('恰好 4 个选项，错误项都带 unit_sense_weak', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = unitConvert(ctx({ mode: 'chooseUnit' }, seed))
      expect(item.options).toHaveLength(4)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBe('unit_sense_weak')
      }
    }
  })

  it('每个选项都有物品名作小字说明', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = unitConvert(ctx({ mode: 'chooseUnit' }, seed))
      for (const opt of item.options) {
        expect(opt.caption, `选项 ${opt.text} 没有说明`).toBeTruthy()
      }
    }
  })

  it('时间没有实物可估，退回长度题', () => {
    const item = unitConvert(ctx({ mode: 'chooseUnit', quantity: 'time' }, 9))
    expect(item.stem.text).toContain('长')
  })
})

describe('稳定性', () => {
  it('同一个种子产出稳定', () => {
    const a = unitConvert(ctx({ mode: 'chooseUnit' }, 17))
    const b = unitConvert(ctx({ mode: 'chooseUnit' }, 17))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
