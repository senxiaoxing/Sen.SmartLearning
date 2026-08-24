/**
 * @file 汉字数字测试
 * @layer domain
 *
 * ⭐ 最后一组是这个文件存在的理由：写法与念法必须指向同一个数。
 * 屏幕上写「三千零五」、耳朵里听到「三千五」，孩子只会觉得自己听错了，
 * 而这类错在 iPad 上永远看不出来——题面看着完全正常。
 */

import { describe, expect, it } from 'vitest'
import { chineseNumber, MAX_CHINESE_NUMBER } from '@/domain/chineseNumber'
import { num } from '@/domain/speech'

describe('基本写法', () => {
  it('0~10 各一个字', () => {
    const expected = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    expected.forEach((text, n) => expect(chineseNumber(n)).toBe(text))
  })

  it('十一~十九不写「一十几」', () => {
    expect(chineseNumber(11)).toBe('十一')
    expect(chineseNumber(15)).toBe('十五')
    expect(chineseNumber(19)).toBe('十九')
  })

  it('两位数：整十不带尾巴', () => {
    expect(chineseNumber(20)).toBe('二十')
    expect(chineseNumber(30)).toBe('三十')
    expect(chineseNumber(25)).toBe('二十五')
    expect(chineseNumber(99)).toBe('九十九')
  })

  it('三位数', () => {
    expect(chineseNumber(100)).toBe('一百')
    expect(chineseNumber(300)).toBe('三百')
    expect(chineseNumber(325)).toBe('三百二十五')
  })

  it('⭐ 零占位：305 是三百零五，不能和 35 撞', () => {
    expect(chineseNumber(305)).toBe('三百零五')
    expect(chineseNumber(35)).toBe('三十五')
    expect(chineseNumber(305)).not.toBe(chineseNumber(35))
  })

  it('⭐ 一十：110 是一百一十，而单独的 10 只写「十」', () => {
    expect(chineseNumber(10)).toBe('十')
    expect(chineseNumber(110)).toBe('一百一十')
    expect(chineseNumber(115)).toBe('一百一十五')
  })

  it('四位数', () => {
    expect(chineseNumber(1000)).toBe('一千')
    expect(chineseNumber(3520)).toBe('三千五百二十')
    expect(chineseNumber(3502)).toBe('三千五百零二')
  })

  it('⭐ 四位数的零占位', () => {
    expect(chineseNumber(3005)).toBe('三千零五')
    expect(chineseNumber(3050)).toBe('三千零五十')
    expect(chineseNumber(9999)).toBe('九千九百九十九')
  })
})

describe('范围保护', () => {
  it('超出范围抛错，不静默写出错的数', () => {
    expect(() => chineseNumber(MAX_CHINESE_NUMBER + 1)).toThrow()
    expect(() => chineseNumber(-1)).toThrow()
    expect(() => chineseNumber(1.5)).toThrow()
  })

  it('全范围都写得出来，不抛错也不产生空串', () => {
    for (let n = 0; n <= MAX_CHINESE_NUMBER; n++) {
      expect(chineseNumber(n).length, `${n} 写出来是空的`).toBeGreaterThan(0)
    }
  })

  it('⭐ 任意两个不同的数写法都不同', () => {
    const seen = new Map<string, number>()
    const clashes: string[] = []
    for (let n = 0; n <= MAX_CHINESE_NUMBER; n++) {
      const text = chineseNumber(n)
      const owner = seen.get(text)
      if (owner !== undefined) clashes.push(`${n} 与 ${owner} 都写作「${text}」`)
      seen.set(text, n)
    }
    expect(clashes.slice(0, 10)).toEqual([])
  })
})

describe('⭐ 写法与念法指向同一个数', () => {
  /** 把片段序列还原成汉字，用来和 chineseNumber 对照 */
  function spokenAsText(n: number): string {
    const map: Record<string, string> = {
      'num.hundred': '百',
      'num.thousand': '千',
    }
    return num(n)
      .map((key) => {
        if (key in map) return map[key]!
        const digit = Number(key.replace('num.', ''))
        return chineseNumber(digit)
      })
      .join('')
  }

  it.each([0, 5, 10, 15, 20, 30, 35, 99, 100, 110, 115, 305, 325, 1000, 3005, 3050, 3502, 9999])(
    '%i 的写法与念法一致',
    (n) => {
      // 「十五」念作 num.15 → 还原也是「十五」；「三十五」念作 三+十+五
      expect(spokenAsText(n), `${n}：念法与写法对不上`).toBe(chineseNumber(n))
    },
  )
})
