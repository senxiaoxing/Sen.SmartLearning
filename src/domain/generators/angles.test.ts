/**
 * @file 认角生成器测试
 * @layer domain
 *
 * ⭐ 核心是那个「边长骗人」的选项：每道题都必须有一个**开口比正确答案小、
 * 边却明显更长**的角。它不在，这个单元最要紧的 `angle_side_length`
 * 就诊断不出来，题目退化成「四选一认图形」。
 */

import { describe, expect, it } from 'vitest'
import { isRenderableShapeKey } from '@/components/shape/MathShape'
import { angles } from '@/domain/generators/angles'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-3.2', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从 imageKey `angle:90:24:15` 解析出角的三个参数 */
function parseAngle(key: string): { degrees: number; arm: number; rotate: number } {
  const m = /^angle:(\d+):(\d+):(\d+)$/.exec(key)
  if (m === null) throw new Error(`不是角的 key: ${key}`)
  return { degrees: Number(m[1]), arm: Number(m[2]), rotate: Number(m[3]) }
}

function optionAngles(item: GeneratedItem) {
  return item.options.map((o) => ({ ...parseAngle(o.imageKey ?? ''), isCorrect: o.isCorrect, tag: o.misconceptionTag }))
}

describe('认直角（right）', () => {
  it('正确答案恒是 90 度', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = angles(ctx({ mode: 'right' }, seed))
      const correct = optionAngles(item).find((o) => o.isCorrect)!
      expect(correct.degrees).toBe(90)
    }
  })

})

describe('锐角与钝角（kind）', () => {
  it('问锐角时答案小于 90，问钝角时大于 90', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = angles(ctx({ mode: 'kind' }, seed))
      const correct = optionAngles(item).find((o) => o.isCorrect)!
      if (item.stem.text.includes('锐角')) {
        expect(correct.degrees, item.stem.text).toBeLessThan(90)
      } else {
        expect(correct.degrees, item.stem.text).toBeGreaterThan(90)
      }
    }
  })

  it('锐角和钝角两种问法都会出现', () => {
    const asks = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      asks.add(angles(ctx({ mode: 'kind' }, seed)).stem.text)
    }
    expect(asks.size, '两种问法都该出现').toBe(2)
  })

  it('⭐ 角度离直角至少 15 度 —— 88° 和 92° 在图上分不出来，那是考视力', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const o of optionAngles(angles(ctx({ mode: 'kind' }, seed)))) {
        if (o.degrees === 90) continue
        expect(Math.abs(o.degrees - 90), `${o.degrees}° 离直角太近`).toBeGreaterThanOrEqual(15)
      }
    }
  })
})

/** 一个角属于哪一类 */
function kindOf(degrees: number): 'acute' | 'right' | 'obtuse' {
  return degrees === 90 ? 'right' : degrees < 90 ? 'acute' : 'obtuse'
}

describe('⭐ 答案唯一性', () => {
  it('⭐ 干扰项里没有第二个同类角 —— 否则孩子选对了也被判错', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 100; seed++) {
        const opts = optionAngles(angles(ctx({ mode }, seed)))
        const correct = opts.find((o) => o.isCorrect)!
        const target = kindOf(correct.degrees)
        for (const o of opts) {
          if (o.isCorrect) continue
          expect(kindOf(o.degrees), `${mode} seed ${seed}: ${o.degrees}° 也是${target}`).not.toBe(
            target,
          )
        }
      }
    }
  })
})

describe('⭐ angle_side_length 的诱饵', () => {
  it('每道题恰好一个', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 80; seed++) {
        const decoys = optionAngles(angles(ctx({ mode }, seed))).filter(
          (o) => o.tag === 'angle_side_length',
        )
        expect(decoys, `${mode} seed ${seed} 缺少边长诱饵`).toHaveLength(1)
      }
    }
  })

  it('⭐ 靠边长蒙必然会错 —— 找大角时答案不是边最长的，找小角时不是最短的', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 100; seed++) {
        const item = angles(ctx({ mode }, seed))
        const opts = optionAngles(item)
        const correct = opts.find((o) => o.isCorrect)!
        const askSmall = item.stem.text.includes('锐角')

        if (askSmall) {
          // 找小角时错误直觉是「边短的小」，所以答案必须不是最短的
          const shortest = Math.min(...opts.map((o) => o.arm))
          expect(correct.arm, `${item.stem.text} seed ${seed}: 答案恰好是边最短的`).toBeGreaterThan(
            shortest,
          )
        } else {
          const longest = Math.max(...opts.map((o) => o.arm))
          expect(correct.arm, `${item.stem.text} seed ${seed}: 答案恰好是边最长的`).toBeLessThan(
            longest,
          )
        }
      }
    }
  })

  it('⭐ 诱饵的边长恰好符合错误直觉 —— 找大角时它最长，找小角时它最短', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 80; seed++) {
        const item = angles(ctx({ mode }, seed))
        const opts = optionAngles(item)
        const decoy = opts.find((o) => o.tag === 'angle_side_length')!
        const correct = opts.find((o) => o.isCorrect)!

        if (item.stem.text.includes('锐角')) {
          expect(decoy.arm, '诱饵的边该比答案短').toBeLessThan(correct.arm)
        } else {
          expect(decoy.arm, '诱饵的边该比答案长').toBeGreaterThan(correct.arm)
        }
      }
    }
  })

  it('认错类别的选项标 angle_kind_confusion，与边长诱饵分开', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const opts = optionAngles(angles(ctx({ mode: 'right' }, seed)))
      const kinds = opts.filter((o) => o.tag === 'angle_kind_confusion')
      expect(kinds.length, '类别错的选项该有两个').toBe(2)
    }
  })
})

describe('通用约束', () => {
  it('恰好 4 个选项、一个正确项，错误项都带标签', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = angles(ctx({ mode }, seed))
        expect(item.options).toHaveLength(4)
        expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `选项 ${opt.imageKey} 没有标签`).toBeDefined()
        }
      }
    }
  })

  it('⭐ 每个 imageKey 都画得出来', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const opt of angles(ctx({ mode }, seed)).options) {
          expect(isRenderableShapeKey(opt.imageKey ?? ''), `${opt.imageKey} 渲染不了`).toBe(true)
        }
      }
    }
  })

  it('选项的 imageKey 互不相同 —— 两张一样的图等于少一个选项', () => {
    for (const mode of ['right', 'kind'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const keys = angles(ctx({ mode }, seed)).options.map((o) => o.imageKey)
        expect(new Set(keys).size, `重复的图: ${keys.join(' / ')}`).toBe(keys.length)
      }
    }
  })

  it('同一个种子产出稳定', () => {
    const a = angles(ctx({ mode: 'kind' }, 29))
    const b = angles(ctx({ mode: 'kind' }, 29))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.imageKey)).toEqual(b.options.map((o) => o.imageKey))
  })
})
