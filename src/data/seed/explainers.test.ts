/**
 * @file 讲解脚本完整性测试
 * @layer data
 * @see src/data/seed/explainers.ts
 *
 * ⭐ 守的是**讲解掉回机械合成音**。
 *
 * 少一个片段、或者片段念的和 `ttsText` 对不上，表现只是「这一步声音怪怪的」——
 * 不报错、不白屏。而讲解的全部价值就在于「听懂原理」，
 * 机械音念一段三十来个字的推理，孩子听两句就走神，那道讲解等于白做。
 */

import { describe, expect, it } from 'vitest'
import { EXPLAINERS } from '@/data/seed/explainers'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'

const ALL = [...EXPLAINERS.values()]

describe('讲解脚本', () => {
  it.each(ALL.map((e) => [e.kpId, e] as const))('%s 每一步都有语音片段', (_kpId, explainer) => {
    expect(VOICE_MANIFEST[explainer.titleClipKey], '标题片段缺失').toBe(explainer.title)

    for (const [i, step] of explainer.steps.entries()) {
      expect(
        VOICE_MANIFEST[step.clipKey],
        `第 ${i + 1} 步的片段 ${step.clipKey} 与 ttsText 对不上`,
      ).toBe(step.ttsText)
    }
  })

  it('片段 key 全局唯一 —— 撞了会让两步共用同一段录音', () => {
    const keys = ALL.flatMap((e) => [e.titleClipKey, ...e.steps.map((s) => s.clipKey)])

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('⭐ 朗读文本与屏幕文字是两回事，不能偷懒写成同一句', () => {
    // 屏幕上是短句（她认不全但家长要能扫一眼），
    // 念出来的要是完整的推理。写成一样等于把讲解砍掉一半信息
    for (const explainer of ALL) {
      for (const step of explainer.steps) {
        expect(step.ttsText.length, `${step.clipKey} 的朗读文本短于屏幕文字`).toBeGreaterThanOrEqual(
          step.text.length,
        )
      }
    }
  })

  it('每一步都有非空的朗读文本 —— 孩子不识字，静音等于这一步没讲', () => {
    for (const explainer of ALL) {
      for (const step of explainer.steps) {
        expect(step.ttsText.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
