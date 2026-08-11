/**
 * @file 昵称拼接的降级行为测试
 * @layer domain
 * @see src/domain/encourage/addressed.ts
 *
 * ⭐ 这个文件守的是**「一句话里两个音色」**。
 *
 * 昵称没有专属音频时如果只是把它当成普通片段拼进去，`say()` 会发现
 * 该片段不在清单里而整句降级——听感上没问题。但如果哪天有人「优化」成
 * 「昵称走 TTS、后半句用片段」，孩子听到的就是机器声接真人声，
 * 而这种问题在 iPad 上要靠耳朵才能发现。这里把它钉死。
 */

import { describe, expect, it } from 'vitest'
import { addressed, NO_NICKNAME } from '@/domain/encourage/addressed'

const WITH_CLIP = { text: '小恩宝', clipKey: 'name.xiaoenbao' }
const WITHOUT_CLIP = { text: '小明' }

describe('addressed', () => {
  it('有专属片段：昵称片段排在最前，整句仍然全部是片段', () => {
    const line = addressed(WITH_CLIP, ['phrase.praise1'], '太棒了')

    expect(line.text).toBe('小恩宝，太棒了')
    expect(line.utterance.parts).toEqual(['name.xiaoenbao', 'phrase.praise1'])
    expect(line.utterance.fallbackText).toBe('小恩宝，太棒了')
  })

  it('⭐ 无专属片段：parts 必须清空，绝不留半截片段造成混播', () => {
    const line = addressed(WITHOUT_CLIP, ['phrase.praise1'], '太棒了')

    expect(line.text).toBe('小明，太棒了')
    expect(line.utterance.parts).toEqual([])
    expect(line.utterance.fallbackText).toBe('小明，太棒了')
  })

  it('没设置昵称：退回原样，与加这个功能之前完全一致', () => {
    const line = addressed(NO_NICKNAME, ['phrase.praise1'], '太棒了')

    expect(line.text).toBe('太棒了')
    expect(line.utterance.parts).toEqual(['phrase.praise1'])
  })

  it('只有空白的昵称按「没设置」处理，不会念出一个孤零零的逗号', () => {
    const line = addressed({ text: '   ' }, ['phrase.praise1'], '太棒了')

    expect(line.text).toBe('太棒了')
    expect(line.utterance.parts).toEqual(['phrase.praise1'])
  })

  it('嵌套的片段数组会被展平 —— num() 的产物可以直接传进来', () => {
    const line = addressed(WITH_CLIP, [['num.8'], 'phrase.questions'], '8 题')

    expect(line.utterance.parts).toEqual(['name.xiaoenbao', 'num.8', 'phrase.questions'])
  })

  it('⭐ 后半句没有片段时整句走 TTS，绝不只念出一个孤零零的名字', () => {
    // 宠物台词就是这种情况：它还没纳入片段清单，只能整句 TTS。
    // 若这里返回 parts: ['name.xiaoenbao']，say() 会认为片段齐全，
    // 结果是念完「小恩宝」就没声了，后半句彻底消失
    const line = addressed(WITH_CLIP, [], '我有点想你')

    expect(line.text).toBe('小恩宝，我有点想你')
    expect(line.utterance.parts).toEqual([])
    expect(line.utterance.fallbackText).toBe('小恩宝，我有点想你')
  })

  it('兜底文本永远非空 —— 孩子不识字，任何一条路径都不能通向静音', () => {
    for (const nickname of [WITH_CLIP, WITHOUT_CLIP, NO_NICKNAME]) {
      const line = addressed(nickname, ['phrase.praise1'], '太棒了')
      expect(line.utterance.fallbackText.length).toBeGreaterThan(0)
    }
  })
})
