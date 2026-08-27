/**
 * @file 升年级过场文案测试
 * @layer domain
 * @see src/domain/encourage/gradeUpLine.ts
 *
 * 这一句一年只说一次，说错了没有第二次机会——她升二年级就那一天。
 * 而它同时背着两条产品红线：**必须说清旧伙伴的去向**（§5.2），
 * 以及**不能说成告别**（§6.3 升年级是仪式，不是断崖）。
 */

import { describe, expect, it } from 'vitest'
import { gradeUpLine } from '@/domain/encourage/gradeUpLine'
import { NO_NICKNAME, type Nickname } from '@/domain/encourage/addressed'
import { GRADE_LEVELS } from '@/domain/types'

const XIAOENBAO: Nickname = { text: '小恩宝', clipKey: 'name.xiaoenbao' }

describe('升年级过场', () => {
  it('叫名字 —— 升年级是最正向的语境', () => {
    // CLAUDE.md：昵称只出现在正向语境。这一句是全 App 最正向的一句
    expect(gradeUpLine(XIAOENBAO, 'G2').text.startsWith('小恩宝，')).toBe(true)
  })

  it('没设置昵称时退回不带称呼的整句，不留下空的逗号', () => {
    const line = gradeUpLine(NO_NICKNAME, 'G2')
    expect(line.text.startsWith('，')).toBe(false)
    expect(line.text.startsWith('你已经是二年级')).toBe(true)
  })

  it('说得出升到了几年级', () => {
    expect(gradeUpLine(XIAOENBAO, 'G2').text).toContain('二年级')
    expect(gradeUpLine(XIAOENBAO, 'G3').text).toContain('三年级')
  })

  /**
   * ⭐ 这条守的是 §5.2 的落点。
   *
   * 「往届存档存在」和「她知道存档存在」是两回事：她不识字、翻不到那一页，
   * 那存档等于不存在。这句话是那两者之间唯一的桥——
   * 少了它，养到满级的团团在她的感受里就是凭空消失了。
   */
  it('⭐ 每个年级都说清了旧伙伴去了哪里', () => {
    for (const grade of GRADE_LEVELS) {
      const { text } = gradeUpLine(XIAOENBAO, grade)
      expect(text, `${grade} 的过场没说旧伙伴去哪了`).toContain('以前的伙伴没有走')
      expect(text, `${grade} 的过场没指路`).toContain('我的伙伴')
    }
  })

  it('⭐ 不说告别，也不说「长大了就不能……」', () => {
    // 这一句的全部任务是把「失去」讲成「长大」。任何暗示旧伙伴离开了的说法，
    // 都会把 §5.2 辛苦保住的那批伙伴重新推下悬崖
    const forbidden = ['再见', '拜拜', '不能再', '不会再', '离开', '走了', '结束']
    for (const grade of GRADE_LEVELS) {
      const { text } = gradeUpLine(XIAOENBAO, grade)
      for (const word of forbidden) {
        expect(text.includes(word), `${grade} 的过场含告别词「${word}」`).toBe(false)
      }
    }
  })

  it('念出来的文本里没有书名号 —— 引号是给识字的人看的', () => {
    // 「『我的伙伴』」念出来就是「我的伙伴」，屏幕上却多两个她看不懂的符号
    const { text } = gradeUpLine(XIAOENBAO, 'G2')
    for (const mark of ['「', '」', '《', '》', '"', '"']) {
      expect(text.includes(mark), `过场文案里出现了 ${mark}`).toBe(false)
    }
  })
})

describe('语音片段', () => {
  it('二年级有预生成片段，全程少女声', () => {
    const { utterance } = gradeUpLine(XIAOENBAO, 'G2')
    expect(utterance.parts).toEqual([
      'name.xiaoenbao',
      'ceremony.gradeUpG2',
      'ceremony.oldPetsStay',
    ])
  })

  /**
   * ⭐ 守的是「念了半句就没了」这个最坏情况。
   *
   * `say()` 判断片段是否齐全看的是 `parts.every(hasClip)`。只塞半边片段
   * （比如有「以前的伙伴没有走」却没有「你已经是三年级的大孩子啦」）时，
   * 它会认为齐全，于是念完那半句就停——比整句机器音严重得多。
   */
  it('⭐ 还没做语音的年级：parts 必须全空，整句交给 TTS', () => {
    for (const grade of GRADE_LEVELS) {
      const { utterance, text } = gradeUpLine(XIAOENBAO, grade)
      if (grade === 'G2') continue
      expect(utterance.parts, `${grade} 只有半套片段，会念半句就断`).toEqual([])
      expect(utterance.fallbackText, `${grade} 的兜底文本必须是完整那句`).toBe(text)
    }
  })

  it('兜底文本永远等于屏幕上那句话', () => {
    const { utterance, text } = gradeUpLine(XIAOENBAO, 'G2')
    expect(utterance.fallbackText).toBe(text)
  })
})
