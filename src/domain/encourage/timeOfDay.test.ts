/**
 * @file 时段划分与问候语测试
 * @layer domain
 * @see src/domain/encourage/timeOfDay.ts
 */

import { describe, expect, it } from 'vitest'
import { NO_NICKNAME } from '@/domain/encourage/addressed'
import { greetingLine } from '@/domain/encourage/greetingLine'
import { greetingOf, timeOfDay, type TimeOfDay } from '@/domain/encourage/timeOfDay'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'

const NICK = { text: '小恩宝', clipKey: 'name.xiaoenbao' }
const ALL: TimeOfDay[] = ['morning', 'noon', 'afternoon', 'evening']

describe('timeOfDay', () => {
  it.each([
    [5, 'morning'],
    [7, 'morning'],
    [10, 'morning'],
    [11, 'noon'],
    [13, 'noon'],
    [14, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [22, 'evening'],
  ])('%i 点属于 %s', (hour, expected) => {
    expect(timeOfDay(hour)).toBe(expected)
  })

  it('凌晨算作「昨晚还没结束」，绝不说早上好', () => {
    // 0 点说「早上好」比说「晚上好」更不对劲
    for (const hour of [0, 1, 3, 4]) {
      expect(timeOfDay(hour)).toBe('evening')
    }
  })

  it('24 小时全覆盖，没有说不出话的时刻', () => {
    for (let hour = 0; hour <= 23; hour += 1) {
      expect(ALL, `${hour} 点落到了未知时段`).toContain(timeOfDay(hour))
    }
  })
})

describe('问候语', () => {
  it('每个时段的问候词都有语音片段', () => {
    for (const when of ALL) {
      const hello = greetingOf(when)
      expect(VOICE_MANIFEST[hello.clipKey], `${hello.clipKey} 不在清单里`).toBe(hello.text)
    }
  })

  it('带昵称与时段：三个片段顺序拼成一句', () => {
    const line = greetingLine(NICK, 'morning')

    expect(line.text).toBe('小恩宝，早上好呀，今天想学点什么')
    expect(line.utterance.parts).toEqual([
      'name.xiaoenbao',
      'phrase.goodMorning',
      'phrase.whatToLearn',
    ])
  })

  it('不传时段时退回原来那一句，行为不变', () => {
    expect(greetingLine(NICK).text).toBe('小恩宝，今天想学点什么')
    expect(greetingLine(NO_NICKNAME).text).toBe('今天想学点什么')
  })

  it('没昵称也能带时段', () => {
    const line = greetingLine(NO_NICKNAME, 'evening')

    expect(line.text).toBe('晚上好呀，今天想学点什么')
    expect(line.utterance.parts).toEqual(['phrase.goodEvening', 'phrase.whatToLearn'])
  })
})
