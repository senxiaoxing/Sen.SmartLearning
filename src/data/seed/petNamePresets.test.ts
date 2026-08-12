/**
 * @file 宠物名字预设的一致性测试
 * @layer data
 * @see src/data/seed/petNamePresets.ts
 *
 * 守的与昵称、宠物台词同一件事：**改名之后不能掉进机器音**。
 * 起名只能从预设里挑，因此每个候选名都必须有片段——
 * 缺一条的后果是「选了这个名字的孩子，每次升级都听到音色突变」。
 */

import { describe, expect, it } from 'vitest'
import { PET_NAME_PRESETS } from '@/data/seed/petNamePresets'
import { PET_DEFINITIONS } from '@/data/seed/pets'
import { hasClip, petNameClipKey } from '@/data/seed/voiceManifest'

describe('宠物名字预设', () => {
  it('每个候选名都有语音片段', () => {
    for (const preset of PET_NAME_PRESETS) {
      expect(
        hasClip(preset.clipKey),
        `${preset.text} 的片段 ${preset.clipKey} 不在清单里`,
      ).toBe(true)
    }
  })

  it('clipKey 符合 petname.* 规范', () => {
    for (const preset of PET_NAME_PRESETS) {
      expect(preset.clipKey).toMatch(/^petname\.[a-z0-9]+$/)
    }
  })

  it('候选名互不重复，也不与默认名重复', () => {
    const texts = PET_NAME_PRESETS.map((p) => p.text)
    expect(new Set(texts).size).toBe(texts.length)
    // 默认名排在选择器第一位，池子里再出现就是两个一样的按钮
    for (const def of PET_DEFINITIONS) {
      expect(texts, `候选池不该包含默认名 ${def.defaultName}`).not.toContain(def.defaultName)
    }
  })

  it('petNameClipKey 对默认名与候选名都解析得到，旧的自由输入名拿不到', () => {
    for (const def of PET_DEFINITIONS) {
      expect(petNameClipKey(def.defaultName)).toBeDefined()
    }
    for (const preset of PET_NAME_PRESETS) {
      expect(petNameClipKey(preset.text)).toBe(preset.clipKey)
    }
    expect(petNameClipKey('阿旺')).toBeUndefined()
  })
})
