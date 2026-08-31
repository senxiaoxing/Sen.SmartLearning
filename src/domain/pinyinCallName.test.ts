/**
 * @file 呼读音表的防漂移测试
 * @layer domain
 * @see src/domain/pinyinCallName.ts
 *
 * 表在 domain、音节数据在 data，分层不允许反向 import，一致性只能靠这里守。
 * 漂移的表现是「答案是 g」那句忽然变成机器音或念错——两者在开发机上都看不出来。
 */

import { describe, expect, it } from 'vitest'
import { INITIALS, SINGLE_FINALS, COMPOUND_FINALS } from '@/data/seed/pinyinSyllables'
import { hasClip } from '@/data/seed/voiceManifest'
import { initialOf, syllableKey } from '@/domain/pinyin'
import { pinyinCallName } from '@/domain/pinyinCallName'

describe('呼读音片段', () => {
  it('每个声母的呼读音都指向音节表里的那一条', () => {
    for (const s of INITIALS) {
      const letter = initialOf(s.base)
      expect(pinyinCallName(letter), `声母 ${letter} 的呼读音对不上`).toBe(
        syllableKey(s.base, s.tone),
      )
    }
  })

  it('每个韵母的呼读音都指向音节表里的那一条', () => {
    for (const s of [...SINGLE_FINALS, ...COMPOUND_FINALS]) {
      // ong 没有汉字载体，刻意不进表——见 pinyinCallName.ts 的说明
      if (s.char === undefined) continue
      expect(pinyinCallName(s.base), `韵母 ${s.base} 的呼读音对不上`).toBe(
        syllableKey(s.base, s.tone),
      )
    }
  })

  it('产出的片段都在语音清单里 —— 否则那句答案会静默降级成机器音', () => {
    for (const s of [...INITIALS, ...SINGLE_FINALS, ...COMPOUND_FINALS]) {
      const clip = pinyinCallName(initialOf(s.base) || s.base)
      if (clip === undefined) continue
      expect(hasClip(clip), `${clip} 不在语音清单里`).toBe(true)
    }
  })

  it('没有载体字的韵母不给片段，宁可不念也不教错读音', () => {
    expect(pinyinCallName('ong')).toBeUndefined()
  })
})
