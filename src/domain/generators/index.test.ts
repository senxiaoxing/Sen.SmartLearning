/**
 * @file 生成器契约合规性测试 —— 参数化覆盖全部模板 × 全部难度 × 多种子
 * @layer domain
 *
 * 这是生成器最重要的一层防线：新增生成器或模板后**自动纳入检查**，不需要补测试。
 *
 * 检查的都是「在 iPad 上肉眼看不出来、但会毁掉题目」的问题：
 * 负数选项、选项重复导致四选一退化成三选一、错误选项漏了诊断标签、
 * 正确答案与选项对不上。这些错误只有系统化的随机采样能发现。
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES, primaryTemplateOf } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { PLACEMENT_PROBES } from '@/domain/assessment/placement'
import { generateFromTemplate, isGeneratorRegistered } from '@/domain/generators'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty, GeneratedItem } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]
/** 每个 模板×难度 组合的采样次数。够大才能覆盖到边界参数组合 */
const SAMPLES = 40

/**
 * 拖拽题型。它们的 `options` **不是渲染出来的按钮**，
 * 而是一张「摆法 → 认知误区」的查找表（见 domain/generators/arrangements.ts）。
 *
 * 因此「最多 4 个选项」那条不适用于它们：那条约束的理由是
 * 「一年级孩子的注意力容纳不了 4 个以上**选项**」，而这里孩子一个也看不到。
 * 凑十法要同时覆盖 no_carry / carry_lost / ten_split_wrong 三类误区，
 * 4 个位置根本不够，硬砍就得丢掉诊断能力。
 *
 * 其余每一条契约（唯一正确项、ID 顺序、错误项必带标签、文本不重复）**照常适用**。
 */
const DRAG_TYPES = new Set(['drag_order', 'drag_match', 'drag_combine'])

function sample(templateIndex: number, difficulty: Difficulty, seed: number): GeneratedItem {
  const template = ITEM_TEMPLATES[templateIndex]!
  return generateFromTemplate(template, difficulty, createRng(seed))
}

describe('模板配置完整性', () => {
  it('所有模板引用的生成器都已注册', () => {
    for (const t of ITEM_TEMPLATES) {
      expect(isGeneratorRegistered(t.generator), `${t.id} 引用了未注册的 ${t.generator}`).toBe(
        true,
      )
    }
  })

  it('所有模板的知识点都存在于图谱中', () => {
    for (const t of ITEM_TEMPLATES) {
      expect(KNOWLEDGE_POINT_BY_ID.has(t.kpId), `${t.id} 的知识点 ${t.kpId} 不存在`).toBe(true)
    }
  })

  // ⚠️ 这里原先断言「每个知识点最多一条模板」。该约束已被**有意推翻**：
  // 一个知识点现在可以同时挂填空版和拖拽版，出题时轮换，
  // 这是对孩子「答题界面单一」那条反馈的正面回应
  // （见 design/05-孩子反馈与响应.md 第 4 条）。
  // 下面两条是取而代之的新不变量。
  it('模板 ID 全局唯一', () => {
    const ids = ITEM_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size, `模板 ID 重复: ${ids.join(', ')}`).toBe(ids.length)
  })

  it('⭐ 摸底探测点的主模板不能是拖拽题', () => {
    // 摸底要在 5 分钟内问完 7 题定位起点，考的是「她会不会」而不是「她能不能拖准」。
    // 出拖拽题会拉长一倍时长，还可能把手指不灵活误判成不会做——
    // 那正是这套测评最不能犯的错，见 design/05-孩子反馈与响应.md 第 3 条。
    //
    // ⚠️ 只约束探测点，不约束全部知识点：P3.1「两拼音节」的题型本来就**只有**
    // 拖拽一种（设计文档如此指定），要求它有非拖拽主模板等于逼着造一个凑数的题型。
    for (const kpId of PLACEMENT_PROBES) {
      const first = primaryTemplateOf(kpId)
      expect(first, `探测点 ${kpId} 取不到主模板`).toBeDefined()
      expect(
        DRAG_TYPES.has(first!.type),
        `探测点 ${kpId} 的主模板是拖拽题 ${first!.type}`,
      ).toBe(false)
    }
  })

  it('每条模板都配齐了三档难度参数', () => {
    for (const t of ITEM_TEMPLATES) {
      for (const d of DIFFICULTIES) {
        expect(t.params[d], `${t.id} 缺少难度 ${d} 的参数`).toBeDefined()
      }
    }
  })

  it('未注册的生成器会抛错而不是静默失败', () => {
    expect(() =>
      generateFromTemplate(
        { id: 'X-gen', kpId: 'X', generator: 'nope', type: 'input_number', params: { 1: {}, 2: {}, 3: {} } },
        1,
        createRng(1),
      ),
    ).toThrow(/未注册的生成器/)
  })
})

describe.each(ITEM_TEMPLATES.map((t, i) => [t.id, i] as const))(
  '生成器契约: %s',
  (_id, index) => {
    const template = ITEM_TEMPLATES[index]!

    it.each(DIFFICULTIES)('难度 %i 的产出满足全部契约', (difficulty) => {
      for (let seed = 1; seed <= SAMPLES; seed++) {
        const item = sample(index, difficulty, seed)
        const where = `${template.id} 难度${difficulty} 种子${seed} 题干「${item.stem.text}」`

        // —— 基本结构
        expect(item.kpId, where).toBe(template.kpId)
        expect(item.difficulty, where).toBe(difficulty)
        expect(item.signature.startsWith(template.kpId), where).toBe(true)
        expect(item.stem.text.length, where).toBeGreaterThan(0)
        expect(item.stem.ttsText.length, where).toBeGreaterThan(0)

        // —— 选项：恰好一个正确，且与 answer 一致
        const correct = item.options.filter((o) => o.isCorrect)
        expect(correct, `${where} 正确选项不唯一`).toHaveLength(1)
        expect(correct[0]!.text, `${where} answer 与正确选项不一致`).toBe(item.answer)

        // —— 选项数量与 ID
        expect(item.options.length, where).toBeGreaterThanOrEqual(2)
        if (!DRAG_TYPES.has(item.type)) {
          expect(item.options.length, where).toBeLessThanOrEqual(4)
        }
        const ids = item.options.map((o) => o.id)
        expect(new Set(ids).size, `${where} 选项 ID 重复`).toBe(ids.length)
        expect(ids, `${where} 选项 ID 应为 a/b/c/d 顺序`).toEqual(
          ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].slice(0, ids.length),
        )

        // —— ⭐ 拖拽题：每个选项都必须有排列键，且互不重复。
        //    重复的键会让先出现的那个永远吃掉后面的匹配，
        //    表现为「某个误区从来没被诊断到」——静默失效，最难发现的一类 bug
        if (DRAG_TYPES.has(item.type)) {
          const keys = item.options.map((o) => o.arrangementKey)
          expect(keys.every((k) => k !== undefined), `${where} 有选项缺少 arrangementKey`).toBe(true)
          expect(new Set(keys).size, `${where} 排列键重复: ${keys.join('/')}`).toBe(keys.length)
          expect(
            item.options.some((o) => o.arrangementKey === 'other'),
            `${where} 缺少兜底排列项，孩子摆出未枚举的结果时会点了没反应`,
          ).toBe(true)
        }

        // —— ⭐ 每个错误选项都必须带诊断标签，否则这道题失去诊断价值
        for (const opt of item.options) {
          if (opt.isCorrect) continue
          expect(opt.misconceptionTag, `${where} 选项「${opt.text}」缺少 misconceptionTag`).toBeDefined()
        }

        // —— 选项文本互不重复，否则四选一会退化成三选一
        const texts = item.options.map((o) => o.text)
        expect(new Set(texts).size, `${where} 选项文本重复: ${texts.join('/')}`).toBe(texts.length)

        // —— 数值题不得出现负数：一年级不学负数，出现即为逻辑错误
        for (const opt of item.options) {
          const n = Number(opt.text)
          if (Number.isNaN(n)) continue
          expect(n, `${where} 出现负数选项 ${opt.text}`).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('固定种子可复现', () => {
      const a = sample(index, 2, 12345)
      const b = sample(index, 2, 12345)
      expect(a).toEqual(b)
    })
  },
)

describe('去重重试', () => {
  it('exclude 中的签名会被避开', () => {
    // M5.5 参数空间足够大，重试必然能撞出不同算式
    const template = ITEM_TEMPLATES.find((t) => t.kpId === 'M5.5')!
    const first = generateFromTemplate(template, 3, createRng(7))
    const second = generateFromTemplate(template, 3, createRng(7), [first.signature])
    expect(second.signature).not.toBe(first.signature)
  })

  it('参数空间耗尽时不死循环，接受重复', () => {
    // M5.2 固定 addends=[9]，b 只有 2~9 共 8 种，全部排除后必然重复
    const template = ITEM_TEMPLATES.find((t) => t.kpId === 'M5.2')!
    const all = Array.from({ length: 8 }, (_, i) => `M5.2#9+${i + 2}`)
    const item = generateFromTemplate(template, 2, createRng(3), all)
    expect(all).toContain(item.signature)
  })
})
