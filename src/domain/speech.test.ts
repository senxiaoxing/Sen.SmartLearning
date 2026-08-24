/**
 * @file 数字读法测试 —— 中文数字拼错了只有「听」才发现，必须用测试锁住
 * @layer domain
 *
 * 一年级只到 20，`num()` 一条单片段就够了。二年级要念到 9999，
 * 中文数字的三个坑（零占位 / 一十 / 整十不带尾）全都进来了，
 * 而拼错的表现是「读出来的数和题面对不上」——在 iPad 上看题面完全正常。
 */

import { describe, expect, it } from 'vitest'
import { hasClip } from '@/data/seed/voiceManifest'
import { answerParts, MAX_SPOKEN_NUMBER, num } from '@/domain/speech'

describe('num() 中文数字读法', () => {
  it('0~20 各是一条独立片段', () => {
    for (let n = 0; n <= 20; n++) {
      expect(num(n), `${n} 应该是单片段`).toEqual([`num.${n}`])
    }
  })

  it('两位数：三十五 = 三 十 五', () => {
    expect(num(35)).toEqual(['num.3', 'num.10', 'num.5'])
    expect(num(21)).toEqual(['num.2', 'num.10', 'num.1'])
    expect(num(99)).toEqual(['num.9', 'num.10', 'num.9'])
  })

  it('整十不带尾巴 —— 三十，不是「三十零」', () => {
    expect(num(30)).toEqual(['num.3', 'num.10'])
    expect(num(90)).toEqual(['num.9', 'num.10'])
  })

  it('三位数：三百二十五', () => {
    expect(num(325)).toEqual(['num.3', 'num.hundred', 'num.2', 'num.10', 'num.5'])
    expect(num(300)).toEqual(['num.3', 'num.hundred'])
  })

  it('⭐ 零的占位：305 是「三百零五」，不能和 35 听起来一样', () => {
    expect(num(305)).toEqual(['num.3', 'num.hundred', 'num.0', 'num.5'])
    expect(num(305)).not.toEqual(num(35))
  })

  it('⭐ 一十：110 是「一百一十」，不是「一百十」', () => {
    // 单独的 10 读「十」，但夹在百位后面必须读「一十」
    expect(num(10)).toEqual(['num.10'])
    expect(num(110)).toEqual(['num.1', 'num.hundred', 'num.1', 'num.10'])
    expect(num(115)).toEqual(['num.1', 'num.hundred', 'num.1', 'num.10', 'num.5'])
  })

  it('四位数：三千五百二十', () => {
    expect(num(3520)).toEqual([
      'num.3', 'num.thousand', 'num.5', 'num.hundred', 'num.2', 'num.10',
    ])
    expect(num(2000)).toEqual(['num.2', 'num.thousand'])
  })

  it('⭐ 四位数的零占位：3005 三千零五 · 3050 三千零五十', () => {
    expect(num(3005)).toEqual(['num.3', 'num.thousand', 'num.0', 'num.5'])
    expect(num(3050)).toEqual(['num.3', 'num.thousand', 'num.0', 'num.5', 'num.10'])
    expect(num(3502)).toEqual([
      'num.3', 'num.thousand', 'num.5', 'num.hundred', 'num.0', 'num.2',
    ])
  })

  it('⭐ 0~9999 每个数拼出的片段都真实存在 —— 拼出缺失的 key 就等于静音', () => {
    const missing: string[] = []
    for (let n = 0; n <= MAX_SPOKEN_NUMBER; n++) {
      for (const key of num(n)) {
        if (!hasClip(key)) missing.push(`${n} → ${key}`)
      }
    }
    expect(missing.slice(0, 10), '这些片段没有音频，孩子会听到一段静音').toEqual([])
  })

  it('⭐ 万以内任意两个不同的数，读法都不相同', () => {
    // 零占位漏掉的典型后果就是 305 和 35 撞车。全量扫一遍才挡得住
    const seen = new Map<string, number>()
    const collisions: string[] = []
    for (let n = 0; n <= MAX_SPOKEN_NUMBER; n++) {
      const key = num(n).join(' ')
      const owner = seen.get(key)
      if (owner !== undefined) collisions.push(`${n} 与 ${owner} 读法相同：${key}`)
      seen.set(key, n)
    }
    expect(collisions.slice(0, 10)).toEqual([])
  })
})

describe('answerParts() 的上限跟着 num() 放宽', () => {
  it('二年级的答案念得出来', () => {
    expect(answerParts('35')).toEqual(['num.3', 'num.10', 'num.5'])
    expect(answerParts('3005')).toEqual(['num.3', 'num.thousand', 'num.0', 'num.5'])
  })

  it('超出上限整句降级，不拼错的读法', () => {
    expect(answerParts(String(MAX_SPOKEN_NUMBER + 1))).toBeUndefined()
  })

  it('非数字答案仍然交给选项自带的 ttsParts', () => {
    expect(answerParts('正方体')).toBeUndefined()
  })
})
