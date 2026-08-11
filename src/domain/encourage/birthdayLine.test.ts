/**
 * @file 生日判定与问候测试
 * @layer domain
 * @see src/domain/encourage/birthdayLine.ts
 *
 * 生日一年只来一次——错过了就是错过了，没有第二次机会在真机上发现。
 * 所以这里把日期边界全部钉死，尤其是闰日。
 */

import { describe, expect, it } from 'vitest'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import { NO_NICKNAME } from '@/domain/encourage/addressed'
import { birthdayLine, isBirthday } from '@/domain/encourage/birthdayLine'

const NICK = { text: '小恩宝', clipKey: 'name.xiaoenbao' }

describe('isBirthday', () => {
  it('月日相同就是生日，与年份无关', () => {
    expect(isBirthday('2019-08-11', '2026-08-11')).toBe(true)
    expect(isBirthday('2019-08-11', '2030-08-11')).toBe(true)
  })

  it('不是那天就不是', () => {
    expect(isBirthday('2019-08-11', '2026-08-10')).toBe(false)
    expect(isBirthday('2019-08-11', '2026-08-12')).toBe(false)
    expect(isBirthday('2019-08-11', '2026-11-08')).toBe(false)
  })

  it('没设置生日时永远是 false', () => {
    expect(isBirthday(undefined, '2026-08-11')).toBe(false)
  })

  it('格式不对的一律按没设置处理，不去猜', () => {
    for (const bad of ['', '2019/08/11', '08-11', '2019-8-1', 'yesterday']) {
      expect(isBirthday(bad, '2026-08-11')).toBe(false)
    }
  })

  describe('⭐ 闰日生日', () => {
    it('闰年当天过', () => {
      expect(isBirthday('2020-02-29', '2024-02-29')).toBe(true)
      expect(isBirthday('2020-02-29', '2028-02-29')).toBe(true)
    })

    it('平年提前到 2 月 28 日 —— 否则四年才过一次，孩子只会觉得被忘了', () => {
      expect(isBirthday('2020-02-29', '2026-02-28')).toBe(true)
      expect(isBirthday('2020-02-29', '2027-02-28')).toBe(true)
    })

    it('闰年的 2 月 28 日不提前庆祝，那天真正的生日还没到', () => {
      expect(isBirthday('2020-02-29', '2024-02-28')).toBe(false)
    })

    it('百年不闰、四百年再闰的规则也照顾到', () => {
      expect(isBirthday('2020-02-29', '2100-02-28'), '2100 不是闰年').toBe(true)
      expect(isBirthday('2020-02-29', '2000-02-28'), '2000 是闰年').toBe(false)
    })

    it('2 月 28 日出生的人不受影响，永远在 28 号过', () => {
      expect(isBirthday('2019-02-28', '2026-02-28')).toBe(true)
      expect(isBirthday('2019-02-28', '2024-02-29')).toBe(false)
    })
  })
})

describe('birthdayLine', () => {
  it('带昵称，且全部是预生成片段', () => {
    const line = birthdayLine(NICK)

    expect(line.text).toBe('小恩宝，生日快乐')
    expect(line.utterance.parts).toEqual(['name.xiaoenbao', 'phrase.happyBirthday'])
  })

  it('没昵称也说得出口', () => {
    expect(birthdayLine(NO_NICKNAME).text).toBe('生日快乐')
  })

  it('生日片段在清单里', () => {
    expect(VOICE_MANIFEST['phrase.happyBirthday']).toBe('生日快乐')
  })
})
