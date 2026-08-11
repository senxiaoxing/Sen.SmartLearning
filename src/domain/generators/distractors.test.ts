/**
 * @file 干扰项构造测试
 * @layer domain
 *
 * 契约测试（index.test.ts）验证「格式对不对」，这里验证「策略对不对」——
 * 干扰项是否真的按认知误区生成、非法候选是否被正确剔除。
 */

import { describe, expect, it } from 'vitest'
import { buildNumericOptions, buildTextOptions } from '@/domain/generators/distractors'
import { createRng } from '@/domain/generators/rng'
import type { ItemOption } from '@/domain/types'

function textOf(options: ItemOption[]): string[] {
  return options.map((o) => o.text ?? '')
}

function tagOf(options: ItemOption[], text: string): string | undefined {
  return options.find((o) => o.text === text)?.misconceptionTag
}

describe('buildNumericOptions', () => {
  it('保留候选并绑定各自的认知误区', () => {
    const options = buildNumericOptions(
      14,
      [
        { value: 13, tag: 'no_carry' },
        { value: 10, tag: 'carry_lost' },
        { value: 4, tag: 'sub_instead' },
      ],
      createRng(1),
    )

    expect(textOf(options).sort()).toEqual(['10', '13', '14', '4'])
    expect(tagOf(options, '13')).toBe('no_carry')
    expect(tagOf(options, '10')).toBe('carry_lost')
    expect(tagOf(options, '4')).toBe('sub_instead')
    expect(tagOf(options, '14')).toBeUndefined()
  })

  it('剔除与正确答案相同的候选', () => {
    // 2 + 2 时 sub_instead 恰好也算出 0，但 no_carry 算出的 3 与答案 4 不同
    const options = buildNumericOptions(
      4,
      [
        { value: 4, tag: 'no_carry' }, // 与答案相同，应被剔除
        { value: 3, tag: 'carry_lost' },
      ],
      createRng(2),
    )
    const fours = options.filter((o) => o.text === '4')
    expect(fours).toHaveLength(1)
    expect(fours[0]!.isCorrect).toBe(true)
  })

  it('剔除负数候选', () => {
    const options = buildNumericOptions(
      2,
      [
        { value: -3, tag: 'sub_instead' },
        { value: 1, tag: 'off_by_one' },
      ],
      createRng(3),
    )
    for (const o of options) {
      expect(Number(o.text)).toBeGreaterThanOrEqual(0)
    }
  })

  it('候选重复时只保留先出现的（高优先级）', () => {
    const options = buildNumericOptions(
      10,
      [
        { value: 9, tag: 'no_carry' },
        { value: 9, tag: 'sub_instead' }, // 同值，应被丢弃
      ],
      createRng(4),
    )
    expect(tagOf(options, '9')).toBe('no_carry')
    expect(textOf(options).filter((t) => t === '9')).toHaveLength(1)
  })

  it('候选不足时用 off_by_one 补齐到 4 个', () => {
    const options = buildNumericOptions(7, [{ value: 5, tag: 'sub_instead' }], createRng(5))
    expect(options).toHaveLength(4)
    const padded = options.filter((o) => o.misconceptionTag === 'off_by_one')
    expect(padded.length).toBeGreaterThanOrEqual(2)
  })

  it('补位不会产生负数或重复', () => {
    // 正确答案为 0 时，-1、-2 等补位候选必须被跳过
    const options = buildNumericOptions(0, [], createRng(6))
    const values = options.map((o) => Number(o.text))
    expect(new Set(values).size).toBe(values.length)
    for (const v of values) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('正确答案位置随种子变化，不会固定在同一位', () => {
    const positions = new Set<number>()
    for (let seed = 1; seed <= 30; seed++) {
      const options = buildNumericOptions(
        14,
        [
          { value: 13, tag: 'no_carry' },
          { value: 10, tag: 'carry_lost' },
          { value: 4, tag: 'sub_instead' },
        ],
        createRng(seed),
      )
      positions.add(options.findIndex((o) => o.isCorrect))
    }
    // 若正确答案总在固定位置，孩子会学会「选第二个」而不是算答案
    expect(positions.size).toBeGreaterThan(1)
  })
})

describe('buildTextOptions', () => {
  it('比大小符号绑定 symbol_reversed', () => {
    const options = buildTextOptions(
      '>',
      [
        { text: '<', tag: 'symbol_reversed' },
        { text: '=', tag: 'off_by_one' },
      ],
      createRng(7),
    )
    expect(textOf(options).sort()).toEqual(['<', '=', '>'])
    expect(tagOf(options, '<')).toBe('symbol_reversed')
    expect(options.find((o) => o.text === '>')?.isCorrect).toBe(true)
  })

  it('剔除与正确答案重复的文本候选', () => {
    const options = buildTextOptions(
      '=',
      [
        { text: '=', tag: 'symbol_reversed' },
        { text: '>', tag: 'symbol_reversed' },
      ],
      createRng(8),
    )
    expect(textOf(options).filter((t) => t === '=')).toHaveLength(1)
  })
})
