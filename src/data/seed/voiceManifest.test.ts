/**
 * @file 语音片段清单的一致性测试
 * @layer data
 * @see src/data/seed/voiceManifest.ts
 * @see design/07-音频方案.md
 *
 * ⭐ 这个文件守的是**静音**。
 *
 * 生成器写了 `'phrase.foo'` 但清单里没有 → 生成脚本不会生成这个 mp3
 * → 运行时找不到片段 → 整句降级为 TTS。降级本身不致命（听得见），
 * 但它是**静默发生**的：没有报错、没有警告，只是那道题的音色忽然变了。
 * 一年级孩子不识字，题干全靠听，这类问题必须在开发期就暴露。
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { NICKNAME_PRESETS } from '@/data/seed/nicknamePresets'
import { hasClip, VOICE_CLIP_COUNT, VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import { nicknameClipFor, PET_SPEAKERS } from '@/domain/encourage/petSpeaker'
import { generateFromTemplate } from '@/domain/generators'
import { createRng } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { Difficulty } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]
/** 采样次数。要够多才能覆盖到各生成器的分支（如 0 的加减法、combine 模式） */
const SAMPLES = 25

describe('语音片段清单', () => {
  it('清单非空且键名符合 `<类别>.<标识>` 规范', () => {
    expect(VOICE_CLIP_COUNT).toBeGreaterThan(0)
    for (const key of Object.keys(VOICE_MANIFEST)) {
      expect(key, `${key} 不符合命名规范`).toMatch(/^[a-z]+\.[A-Za-z0-9]+$/)
    }
  })

  it('每个片段都有非空的朗读文本', () => {
    for (const [key, text] of Object.entries(VOICE_MANIFEST)) {
      expect(text.length, `${key} 的朗读文本为空`).toBeGreaterThan(0)
    }
  })

  it('数字 0~20 全部就位 —— 数学题的绝对主力', () => {
    for (let n = 0; n <= 20; n++) {
      expect(hasClip(`num.${n}`), `缺少 num.${n}`).toBe(true)
    }
  })

  it('num() 产出的 key 一定在清单里', () => {
    for (let n = 0; n <= 20; n++) {
      for (const key of num(n)) {
        expect(hasClip(key), `num(${n}) 产出的 ${key} 不在清单里`).toBe(true)
      }
    }
  })

  it('⭐ 每个预设昵称 × 每只伙伴都有音色变体片段', () => {
    // 缺一个变体的后果：宠物叫名字那句拼不齐片段，整句降级成机器音——
    // 而它偏偏出现在「见面第一句」这种情感浓度最高的位置
    for (const preset of NICKNAME_PRESETS) {
      for (const speaker of PET_SPEAKERS) {
        const key = nicknameClipFor(preset.clipKey, speaker)
        expect(hasClip(key), `缺少昵称变体 ${key}`).toBe(true)
      }
    }
  })
})

describe('⭐ 生成器用到的片段都必须在清单里', () => {
  it.each(ITEM_TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, template) => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SAMPLES; seed += 1) {
        const item = generateFromTemplate(template, difficulty, createRng(seed))
        const parts = item.stem.ttsParts
        if (parts === undefined) continue

        for (const key of parts) {
          expect(
            hasClip(key),
            `${template.id} 难度${difficulty}「${item.stem.text}」用了清单里没有的片段 ${key}`,
          ).toBe(true)
        }
      }
    }
  })

  it('有 ttsParts 的题目也必须保留 ttsText 兜底 —— 绝不能静音', () => {
    for (const template of ITEM_TEMPLATES) {
      for (const difficulty of DIFFICULTIES) {
        const item = generateFromTemplate(template, difficulty, createRng(3))
        expect(
          item.stem.ttsText.length,
          `${template.id} 缺少 ttsText 兜底`,
        ).toBeGreaterThan(0)
      }
    }
  })
})

describe('迁移进度', () => {
  /**
   * 这不是断言，是**进度指示器**。
   *
   * 还没迁移的生成器会整句走实时 TTS，音色与预生成片段不一致。
   * 数字往上走就说明迁移在推进；停滞不前说明这件事被忘了。
   */
  it('报告还有多少模板没接上预生成语音', () => {
    const migrated: string[] = []
    const pending: string[] = []

    for (const template of ITEM_TEMPLATES) {
      const item = generateFromTemplate(template, 2, createRng(1))
      ;(item.stem.ttsParts === undefined ? pending : migrated).push(template.id)
    }

    console.info(
      `\n  语音片段迁移：${migrated.length}/${ITEM_TEMPLATES.length} 条模板已接入` +
        (pending.length > 0 ? `\n  待迁移：${pending.join(', ')}` : ''),
    )
    expect(migrated.length + pending.length).toBe(ITEM_TEMPLATES.length)
  })
})
