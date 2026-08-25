/**
 * @file 算式文本处理测试
 * @layer domain
 *
 * ⭐ `isTrueEquation` 是一图四式干扰项的最后一道闸：算得通的候选一律弃用。
 * 它判错的后果是把一个「讲得通」的答案摆进错误选项，孩子选了被判错，
 * 而她其实没错——这在 iPad 上完全看不出来。
 */

import { describe, expect, it } from 'vitest'
import { equationParts, equationSpoken, isTrueEquation } from '@/domain/equation'

describe('equationParts', () => {
  it('四种运算都拼得出片段', () => {
    expect(equationParts('3 + 2 = 5')).toEqual(['num.3', 'op.plus', 'num.2', 'op.equals', 'num.5'])
    expect(equationParts('5 - 2 = 3')).toEqual(['num.5', 'op.minus', 'num.2', 'op.equals', 'num.3'])
    expect(equationParts('3 × 4 = 12')).toEqual([
      'num.3', 'op.times', 'num.4', 'op.equals', 'num.12',
    ])
    expect(equationParts('12 ÷ 3 = 4')).toEqual([
      'num.12', 'op.dividedBy', 'num.3', 'op.equals', 'num.4',
    ])
  })

  it('大数走 num() 的组合读法', () => {
    expect(equationParts('30 + 5 = 35')).toEqual([
      'num.3', 'num.10', 'op.plus', 'num.5', 'op.equals', 'num.3', 'num.10', 'num.5',
    ])
  })

  it('解析不了的返回 undefined，由调用方整句降级', () => {
    expect(equationParts('正方体')).toBeUndefined()
    expect(equationParts('3 + 2')).toBeUndefined()
    expect(equationParts('3+2=5'), '缺空格的格式不认').toBeUndefined()
  })
})

describe('equationSpoken', () => {
  it('符号念成词', () => {
    expect(equationSpoken('3 + 2 = 5')).toBe('3 加 2 等于 5')
    expect(equationSpoken('12 ÷ 3 = 4')).toBe('12 除以 3 等于 4')
    expect(equationSpoken('3 × 4 = 12')).toBe('3 乘 4 等于 12')
  })

  it('解析不了时原样返回，不产出半截句子', () => {
    expect(equationSpoken('正方体')).toBe('正方体')
  })
})

describe('⭐ isTrueEquation', () => {
  it('成立的算式', () => {
    expect(isTrueEquation('3 + 2 = 5')).toBe(true)
    expect(isTrueEquation('5 - 2 = 3')).toBe(true)
    expect(isTrueEquation('3 × 4 = 12')).toBe(true)
    expect(isTrueEquation('12 ÷ 3 = 4')).toBe(true)
  })

  it('不成立的算式', () => {
    expect(isTrueEquation('3 + 4 = 12')).toBe(false)
    expect(isTrueEquation('12 ÷ 3 = 5')).toBe(false)
    expect(isTrueEquation('12 - 3 = 4')).toBe(false)
  })

  it('⭐ 「2 组每组 2 个」那个巧合：4 - 2 = 2 确实成立', () => {
    // 正因为它成立，才不能拿来当那幅图的干扰项——
    // 「4 个拿走 2 个剩 2 个」讲得通，孩子选了不该算错
    expect(isTrueEquation('4 - 2 = 2')).toBe(true)
    expect(isTrueEquation('2 + 2 = 4')).toBe(true)
  })

  it('除不尽的不算成立', () => {
    expect(isTrueEquation('7 ÷ 2 = 3')).toBe(false)
    expect(isTrueEquation('7 ÷ 2 = 4')).toBe(false)
  })

  it('解析不了的当作不可信，返回 false', () => {
    expect(isTrueEquation('正方体')).toBe(false)
    expect(isTrueEquation('')).toBe(false)
  })
})
