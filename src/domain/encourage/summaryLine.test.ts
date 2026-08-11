/**
 * @file 小结语的分支与红线测试
 * @layer domain
 * @see src/domain/encourage/summaryLine.ts
 *
 * 除了分支正确，这里还守一条产品红线：
 * **小结语里绝不出现「错了几题」**。数据就在参数里，随手念出来太容易了。
 */

import { describe, expect, it } from 'vitest'
import { NO_NICKNAME } from '@/domain/encourage/addressed'
import { summaryLine } from '@/domain/encourage/summaryLine'

const NICK = { text: '小恩宝', clipKey: 'name.xiaoenbao' }

describe('summaryLine', () => {
  it('一题没做：说今天没有需要练习的内容', () => {
    const line = summaryLine(NICK, { answered: 0, correct: 0, pendingWrong: 0 })

    expect(line.text).toBe('小恩宝，今天没有需要练习的内容')
    expect(line.utterance.parts).toEqual(['name.xiaoenbao', 'phrase.nothingToday'])
  })

  it('全对：给最响亮的那句', () => {
    const line = summaryLine(NICK, { answered: 10, correct: 10, pendingWrong: 0 })

    expect(line.text).toBe('小恩宝，全部答对，太棒了')
    expect(line.utterance.parts).toEqual(['name.xiaoenbao', 'phrase.allCorrect'])
  })

  it('有错题：报答对了几题，并邀请一起看错题', () => {
    const line = summaryLine(NICK, { answered: 10, correct: 8, pendingWrong: 2 })

    expect(line.text).toBe('小恩宝，答对了 8 题，我们一起看看错的题目')
    expect(line.utterance.parts).toEqual([
      'name.xiaoenbao',
      'phrase.youGot',
      'num.8',
      'phrase.questions',
      'phrase.reviewWrong',
    ])
  })

  it('⭐ 无论哪个分支都不提「错了几题」，也不提正确率', () => {
    const cases = [
      { answered: 10, correct: 3, pendingWrong: 7 },
      { answered: 10, correct: 0, pendingWrong: 10 },
      { answered: 1, correct: 0, pendingWrong: 1 },
    ]

    for (const stats of cases) {
      const { text } = summaryLine(NICK, stats)
      expect(text, `「${text}」提到了错题数`).not.toMatch(/错\s*\d|\d\s*题错|%|百分/)
    }
  })

  it('没设置昵称时退回原文案，一个字都不多', () => {
    const line = summaryLine(NO_NICKNAME, { answered: 10, correct: 10, pendingWrong: 0 })

    expect(line.text).toBe('全部答对，太棒了')
    expect(line.utterance.parts).toEqual(['phrase.allCorrect'])
  })
})

/**
 * 升级播报**必须**拼进小结这同一句话里。
 *
 * 它原先是升级横幅自己念的，而横幅与小结在同一次挂载里各自调用打断式的 `say()`，
 * 子组件 effect 先跑、父组件后跑，于是升级那句每次刚开口就被掐掉。
 */
describe('summaryLine + 升级播报', () => {
  const TUANTUAN = { petName: '团团', petNameClipKey: 'pet.tuantuan' }
  const ALL_CORRECT = { answered: 10, correct: 10, pendingWrong: 0 }

  it('变身：小结与升级连成一句，全程都是片段', () => {
    const line = summaryLine(NICK, ALL_CORRECT, { ...TUANTUAN, toLevel: 6, stageChanged: true })

    expect(line.text).toBe('小恩宝，全部答对，太棒了。团团变身啦')
    expect(line.utterance.parts).toEqual([
      'name.xiaoenbao',
      'phrase.allCorrect',
      'pet.tuantuan',
      'phrase.transformed',
    ])
  })

  it('普通升级：报出等级数字', () => {
    const line = summaryLine(NICK, ALL_CORRECT, { ...TUANTUAN, toLevel: 5, stageChanged: false })

    expect(line.text).toBe('小恩宝，全部答对，太棒了。团团升到 5 级啦')
    expect(line.utterance.parts).toEqual([
      'name.xiaoenbao',
      'phrase.allCorrect',
      'pet.tuantuan',
      'phrase.leveledTo',
      'num.5',
      'phrase.levelUnit',
    ])
  })

  it('⭐ 宠物改过名：整句降级为 TTS，绝不只播前半截', () => {
    // 只传小结那半截片段的话，say() 会认为「片段齐全」而念完小结就停，
    // 升级那半句连同兜底文本一起消失 —— 正是这次要修掉的老毛病
    const line = summaryLine(NICK, ALL_CORRECT, {
      petName: '毛毛',
      toLevel: 5,
      stageChanged: false,
    })

    expect(line.text).toBe('小恩宝，全部答对，太棒了。毛毛升到 5 级啦')
    expect(line.utterance.parts).toEqual([])
    expect(line.utterance.fallbackText).toBe('小恩宝，全部答对，太棒了。毛毛升到 5 级啦')
  })

  it('有错题的那一轮升级，同样连成一句', () => {
    const line = summaryLine(
      NICK,
      { answered: 10, correct: 7, pendingWrong: 3 },
      { ...TUANTUAN, toLevel: 4, stageChanged: true },
    )

    expect(line.text).toBe('小恩宝，答对了 7 题，我们一起看看错的题目。团团变身啦')
  })

  it('没升级时与原来完全一致', () => {
    expect(summaryLine(NICK, ALL_CORRECT).text).toBe('小恩宝，全部答对，太棒了')
  })
})
