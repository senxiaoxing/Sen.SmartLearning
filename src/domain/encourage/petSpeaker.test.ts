/**
 * @file 说话者判定的单元测试
 * @layer domain
 * @see src/domain/encourage/petSpeaker.ts
 */

import { describe, expect, it } from 'vitest'
import { nicknameClipFor, PET_SPEAKERS, speakerOfParts } from '@/domain/encourage/petSpeaker'

describe('speakerOfParts', () => {
  it('从台词片段认出三只伙伴', () => {
    expect(speakerOfParts(['petline.penguinG1Correct0'])).toBe('penguin')
    expect(speakerOfParts(['petline.dragonG1Greet1'])).toBe('dragon')
    expect(speakerOfParts(['petline.pandaG1Catchphrase'])).toBe('panda')
  })

  it('旁白的句子（无台词片段）返回 undefined', () => {
    expect(speakerOfParts(['phrase.praise1'])).toBeUndefined()
    expect(speakerOfParts(['num.9', 'op.plus', 'num.5'])).toBeUndefined()
    expect(speakerOfParts([])).toBeUndefined()
  })

  it('台词片段不在句首也认得出来', () => {
    expect(speakerOfParts(['phrase.answerIs', 'petline.pandaG1Wrong0'])).toBe('panda')
  })
})

describe('nicknameClipFor', () => {
  it('按说话者构造音色变体 key', () => {
    expect(nicknameClipFor('name.xiaoenbao', 'penguin')).toBe('name.penguinXiaoenbao')
    expect(nicknameClipFor('name.baobei', 'dragon')).toBe('name.dragonBaobei')
    expect(nicknameClipFor('name.xiaopengyou', 'panda')).toBe('name.pandaXiaopengyou')
  })

  it('旁白（undefined）原样返回', () => {
    expect(nicknameClipFor('name.xiaoenbao', undefined)).toBe('name.xiaoenbao')
  })

  it('变体 key 仍符合清单的命名规范', () => {
    for (const speaker of PET_SPEAKERS) {
      expect(nicknameClipFor('name.xiaoenbao', speaker)).toMatch(/^[a-z]+\.[A-Za-z0-9]+$/)
    }
  })
})
