/**
 * @file 鼓励语轮换与兜底测试
 * @layer domain
 * @see src/domain/encourage/praiseLine.ts
 *
 * ⭐ 这里同时校验**真实的鼓励语池**（`data/seed/voiceManifest.ts` 的 `PRAISE_POOL`）：
 * 池空了、或者片段 key 与文本对不上，表现是孩子答对后听到的东西不对，
 * 而这类问题在 iPad 上只能靠耳朵发现。
 */

import { describe, expect, it } from 'vitest'
import { PRAISE_POOL, VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import { NO_NICKNAME } from '@/domain/encourage/addressed'
import { praiseLine } from '@/domain/encourage/praiseLine'

const NICK = { text: '小恩宝', clipKey: 'name.xiaoenbao' }

describe('praiseLine', () => {
  it('带昵称：昵称片段在前，鼓励语片段在后', () => {
    const line = praiseLine(NICK, PRAISE_POOL, 0)

    expect(line.text.startsWith('小恩宝，')).toBe(true)
    expect(line.utterance.parts[0]).toBe('name.xiaoenbao')
    expect(line.utterance.parts).toHaveLength(2)
  })

  it('轮换：不同随机种子能取到池里不止一句', () => {
    const seen = new Set(
      Array.from({ length: 20 }, (_, i) => praiseLine(NO_NICKNAME, PRAISE_POOL, i / 20).text),
    )

    expect(seen.size).toBe(PRAISE_POOL.length)
  })

  it('种子取到边界值也不越界', () => {
    for (const seed of [0, 0.999999, 1]) {
      const line = praiseLine(NO_NICKNAME, PRAISE_POOL, seed)
      expect(line.text.length).toBeGreaterThan(0)
      expect(line.utterance.parts).toHaveLength(1)
    }
  })

  it('池为空时给兜底句，绝不返回空字符串 —— 答对了却没有回应最伤', () => {
    const line = praiseLine(NICK, [], 0.5)

    expect(line.text).toBe('小恩宝，答对啦')
    expect(line.utterance.fallbackText.length).toBeGreaterThan(0)
  })
})

describe('PRAISE_POOL', () => {
  it('非空，且每一句的片段与文本都在总清单里对得上', () => {
    expect(PRAISE_POOL.length).toBeGreaterThan(0)

    for (const praise of PRAISE_POOL) {
      expect(VOICE_MANIFEST[praise.clipKey], `${praise.clipKey} 不在清单里`).toBe(praise.text)
    }
  })
})
