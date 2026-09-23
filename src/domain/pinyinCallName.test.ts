/**
 * @file 本音表的防漂移测试
 * @layer domain
 * @see src/domain/pinyinCallName.ts
 * @see design/11-拼音真人录音方案.md §3.2
 *
 * 表在 domain、音节数据在 data，分层不允许反向 import，一致性只能靠这里守。
 * 漂移的表现是「答案是 g」那句忽然变成机器音或念错——两者在开发机上都看不出来。
 */

import { describe, expect, it } from 'vitest'
import { INITIALS, SINGLE_FINALS, COMPOUND_FINALS } from '@/data/seed/pinyinSyllables'
import { hasClip } from '@/data/seed/voiceManifest'
import { authenticKey, initialOf } from '@/domain/pinyin'
import { pinyinCallName } from '@/domain/pinyinCallName'

describe('本音片段', () => {
  it('每个声母的本音都指向 authenticKey 算出来的那一条', () => {
    for (const s of INITIALS) {
      const letter = initialOf(s.base)
      expect(pinyinCallName(letter), `声母 ${letter} 的本音对不上`).toBe(authenticKey(letter))
    }
  })

  it('每个韵母的本音都指向 authenticKey 算出来的那一条', () => {
    for (const s of [...SINGLE_FINALS, ...COMPOUND_FINALS]) {
      // ong 刻意不进表——见 pinyinCallName.ts 的说明
      if (s.char === undefined) continue
      expect(pinyinCallName(s.base), `韵母 ${s.base} 的本音对不上`).toBe(authenticKey(s.base))
    }
  })

  it('产出的片段都在语音清单里 —— 否则那句答案会静默降级成机器音', () => {
    for (const s of [...INITIALS, ...SINGLE_FINALS, ...COMPOUND_FINALS]) {
      const clip = pinyinCallName(initialOf(s.base) || s.base)
      if (clip === undefined) continue
      expect(hasClip(clip), `${clip} 不在语音清单里`).toBe(true)
    }
  })

  /**
   * ⭐ `ong` 刻意不进这张表。
   *
   * 它从前缺席是因为「没有干净载体、TTS 念不准」；现在 `pinyinv3.ong`
   * 有干净录音了，那个理由已经消失——**但要不要接进来是独立决定**，
   * 这条用例只是把「现状」钉住，免得它被悄悄改掉。
   */
  it('ong 刻意不进表', () => {
    expect(pinyinCallName('ong')).toBeUndefined()
  })
})
