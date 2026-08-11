/**
 * @file 拼音听音题的诊断性测试
 * @layer domain
 * @see src/domain/generators/pinyinListen.ts
 *
 * 这里查的是「这道题**考没考到该考的东西**」——契约测试查不出来的那一层。
 *
 * 实测抓到过两个都能通过契约测试、但教学上是废题的产出：
 * 1. P1.3「四声调」的干扰项给成了不同韵母 → 孩子靠韵母排除，声调根本没练到
 * 2. 声母题的易混表键名写错 → 平翘舌辨析全部退化成无诊断的兜底标签
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { generateFromTemplate } from '@/domain/generators'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, ItemTemplate } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]
const SAMPLES = 30

const LISTEN_TEMPLATES = ITEM_TEMPLATES.filter((t) => t.generator === 'pinyinListen')

function sampleAll(template: ItemTemplate) {
  const items = []
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 1; seed <= SAMPLES; seed += 1) {
      items.push(generateFromTemplate(template, difficulty, createRng(seed)))
    }
  }
  return items
}

describe('听音题基本盘', () => {
  it.each(LISTEN_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s 至少 3 个选项 —— 两选一是掷硬币',
    (_id, template) => {
      for (const item of sampleAll(template)) {
        expect(
          item.options.length,
          `${template.id}「${item.stem.ttsText}」只有 ${item.options.length} 个选项，` +
            `蒙对概率 ${Math.round(100 / item.options.length)}%，掌握度会被猜出来的分污染`,
        ).toBeGreaterThanOrEqual(3)
      }
    },
  )

  it.each(LISTEN_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s 题干不泄露答案',
    (_id, template) => {
      // 题面若显示拼音，这道题就变成「照着抄」，听力完全不参与
      for (const item of sampleAll(template)) {
        expect(item.stem.text, `${template.id} 题干里出现了答案`).not.toContain(item.answer)
      }
    },
  )

  it.each(LISTEN_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s 题干音频就是目标音节本身',
    (_id, template) => {
      for (const item of sampleAll(template)) {
        expect(item.stem.ttsParts, `${template.id} 缺少音节片段`).toHaveLength(1)
        expect(item.stem.ttsParts?.[0]).toMatch(/^pinyin\./)
      }
    },
  )
})

describe('⭐ 干扰项要考到该考的东西', () => {
  it('P1.3 四声调：干扰项必须是同一个音的其他声调', () => {
    const template = ITEM_TEMPLATES.find((t) => t.id === 'P1.3-listen')!
    for (const item of sampleAll(template)) {
      const wrong = item.options.filter((o) => !o.isCorrect)
      expect(wrong.length, '四声调题应有 3 个干扰项').toBe(3)
      for (const o of wrong) {
        expect(
          o.misconceptionTag,
          `「${item.stem.ttsText}」的干扰项「${o.text}」不是声调误区——` +
            `说明又退化成考韵母了`,
        ).toBe('tone_confusion')
      }
    }
  })

  it('P7.5 平翘舌：必须出现 flat_curl_confusion 干扰项', () => {
    const template = ITEM_TEMPLATES.find((t) => t.id === 'P7.5-listen')!
    const items = sampleAll(template)
    const withTag = items.filter((i) =>
      i.options.some((o) => o.misconceptionTag === 'flat_curl_confusion'),
    )
    // 不要求每一道都有（个别音节可能凑不齐），但绝大多数必须有，
    // 否则这个知识点的诊断等于没做
    expect(
      withTag.length / items.length,
      '平翘舌辨析题里带诊断标签的比例过低',
    ).toBeGreaterThan(0.8)
  })

  it('P5.3 前后鼻音：必须出现 nasal_confusion 干扰项', () => {
    const template = ITEM_TEMPLATES.find((t) => t.id === 'P5.3-listen')!
    const items = sampleAll(template)
    const withTag = items.filter((i) =>
      i.options.some((o) => o.misconceptionTag === 'nasal_confusion'),
    )
    expect(withTag.length / items.length).toBeGreaterThan(0.8)
  })

  it('P7.1 b/d：必须出现 bd_confusion —— 它是定向补救的触发条件', () => {
    // 调度器靠 misconceptionCounts['bd_confusion'] >= 3 自动插入 P7.1 专项，
    // 这个标签产不出来，整条定向补救链就断了
    // （见 design/01-知识点图谱.md §P7 说明）
    const template = ITEM_TEMPLATES.find((t) => t.id === 'P7.1-listen')!
    const items = sampleAll(template)
    const withTag = items.filter((i) =>
      i.options.some((o) => o.misconceptionTag === 'bd_confusion'),
    )
    expect(withTag.length / items.length).toBeGreaterThan(0.8)
  })
})
