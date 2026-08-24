/**
 * @file 几时几分生成器测试
 * @layer domain
 *
 * ⭐ 这个单元的全部价值在 `minute_misread` 上：分针指向 3 是 15 分不是 3 分。
 * 那个干扰项要是没进选项，这道题就只是「读个钟面」，
 * 诊断不出她到底会不会「一大格 5 分」。
 */

import { describe, expect, it } from 'vitest'
import { clockMinutes } from '@/domain/generators/clockMinutes'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem, GeneratorContext } from '@/domain/types'

function ctx(
  params: Record<string, unknown>,
  seed: number,
  difficulty: Difficulty = 2,
): GeneratorContext {
  return { kpId: 'M2-6.1', difficulty, params, rng: createRng(seed), exclude: [] }
}

/** 从 imageKey `clock:3:15` 取出题面上画的时刻 */
function shownTime(item: GeneratedItem): { hour: number; minute: number } {
  const visual = item.visual
  const key = visual !== undefined && 'imageKey' in visual ? visual.imageKey : ''
  const m = /^clock:(\d+):(\d+)$/.exec(key ?? '')
  if (m === null) throw new Error(`没有钟面图: ${key}`)
  return { hour: Number(m[1]), minute: Number(m[2]) }
}

describe('读钟面（read）', () => {
  it('⭐ 分钟恒不是 0 也不是 30 —— 那是一年级的整时半时', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { minute } = shownTime(clockMinutes(ctx({}, seed)))
      expect(minute, '整时半时属于 M8，这里要练不整不半').not.toBe(0)
      expect(minute).not.toBe(30)
    }
  })

  it('默认五分五分地走，分钟恒是 5 的倍数', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const { minute } = shownTime(clockMinutes(ctx({}, seed)))
      expect(minute % 5, `${minute} 不是 5 的倍数`).toBe(0)
    }
  })

  it('答案与题面画的时刻一致', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({}, seed))
      const { hour, minute } = shownTime(item)
      expect(item.answer).toBe(`${hour} 点 ${minute} 分`)
    }
  })

  it('⭐ minute_misread 恒在选项里，且正是「格数当分钟」那个读数', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({}, seed))
      const { hour, minute } = shownTime(item)
      const asMark = `${hour} 点 ${minute / 5} 分`
      const misread = item.options.filter((o) => o.misconceptionTag === 'minute_misread')
      expect(misread.length, `${hour}:${minute} 一个 minute_misread 都没有`).toBeGreaterThan(0)
      expect(misread.map((o) => o.text), `${hour}:${minute} 缺少「格数当分钟」`).toContain(asMark)
    }
  })

  it('恰好一个正确选项，错误项都带标签', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({}, seed))
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag, `选项 ${opt.text} 没有误区标签`).toBeDefined()
      }
    }
  })

  it('选项文字互不重复 —— 两个一样的选项等于少一个干扰项', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const texts = clockMinutes(ctx({}, seed)).options.map((o) => o.text)
      expect(new Set(texts).size, `重复选项: ${texts.join(' / ')}`).toBe(texts.length)
    }
  })

  it('时刻读法拼得出片段：3 点 15 分 = 3 + 点 + 15 + 分', () => {
    const item = clockMinutes(ctx({}, 4))
    const correct = item.options.find((o) => o.isCorrect)!
    expect(correct.ttsParts).toContain('phrase.oclock')
    expect(correct.ttsParts).toContain('unit.min')
  })

  it('step:1 时可以出非 5 倍数的分钟', () => {
    const minutes = new Set<number>()
    for (let seed = 1; seed <= 60; seed++) {
      minutes.add(shownTime(clockMinutes(ctx({ step: 1 }, seed))).minute)
    }
    expect([...minutes].some((m) => m % 5 !== 0), '难度 3 应能出任意分钟').toBe(true)
  })
})

describe('分针指着几（minuteFromMark）', () => {
  it('答案恒是格数 × 5', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = clockMinutes(ctx({ mode: 'minuteFromMark' }, seed))
      const mark = Number(/分针指着 (\d+)/.exec(item.stem.text)![1])
      expect(mark).toBeGreaterThanOrEqual(1)
      expect(mark).toBeLessThanOrEqual(11)
      expect(Number(item.answer)).toBe(mark * 5)
    }
  })

  it('⭐ 格数本身恒是干扰项 —— 她选了它就说明「一大格 5 分」没建立', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = clockMinutes(ctx({ mode: 'minuteFromMark' }, seed))
      const mark = Number(/分针指着 (\d+)/.exec(item.stem.text)![1])
      const misread = item.options
        .filter((o) => o.misconceptionTag === 'minute_misread')
        .map((o) => Number(o.text))
      expect(misread, `分针指着 ${mark} 时缺少格数干扰项`).toContain(mark)
    }
  })
})

describe('经过时间（elapsed）', () => {
  it('答案的分钟恒在 0~59，跨整点时进到下一个钟头', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({ mode: 'elapsed' }, seed))
      const m = /^(\d+) 点 (\d+) 分$|^(\d+) 点整$|^(\d+) 点半$/.exec(item.answer)
      expect(m, `答案格式不对: ${item.answer}`).not.toBeNull()

      const start = shownTime(item)
      const delta = Number(/再过 (\d+) 分/.exec(item.stem.text)![1])
      const total = start.minute + delta
      const expectedHour = total >= 60 ? (start.hour % 12) + 1 : start.hour
      const expectedMinute = total % 60
      expect(item.answer).toBe(
        expectedMinute === 0
          ? `${expectedHour} 点整`
          : expectedMinute === 30
            ? `${expectedHour} 点半`
            : `${expectedHour} 点 ${expectedMinute} 分`,
      )
    }
  })

  it('⭐ 会跨整点 —— 不跨就考不到 60 进制那一步', () => {
    let crossed = 0
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({ mode: 'elapsed' }, seed))
      const start = shownTime(item)
      const delta = Number(/再过 (\d+) 分/.exec(item.stem.text)![1])
      if (start.minute + delta >= 60) crossed++
    }
    expect(crossed, '一道跨整点的题都没有').toBeGreaterThan(0)
  })

  it('恰好一个正确选项，错误项都带标签', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const item = clockMinutes(ctx({ mode: 'elapsed' }, seed))
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      for (const opt of item.options) {
        if (opt.isCorrect) continue
        expect(opt.misconceptionTag).toBeDefined()
      }
    }
  })
})

describe('稳定性', () => {
  it('同一个种子产出稳定', () => {
    const a = clockMinutes(ctx({}, 55))
    const b = clockMinutes(ctx({}, 55))
    expect(a.signature).toBe(b.signature)
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text))
  })
})
