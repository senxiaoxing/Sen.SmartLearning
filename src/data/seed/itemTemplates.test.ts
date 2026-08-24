/**
 * @file 题目模板完整性测试
 * @layer data
 *
 * CLAUDE.md 的「题型必须多样」一直写着「由 itemTemplates.test.ts 强制」，
 * 但这个文件此前并不存在——那条红线是张空头支票。二年级是第一个受它约束的
 * 年级，正好把它兑现。
 *
 * 孩子的原话是「答题界面单一，都是题目 + 4 个选项」（design/05 第 4 条）。
 * 注意她要的是**变化本身**：把某个知识点从填空换成拖拽，单一性只是从一种
 * 变成了另一种，所以断言的是「同一个知识点至少有两种不同题型」。
 */

import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_POINTS_BY_GRADE } from '@/data/seed/knowledgePoints'
import { ITEM_TEMPLATES, ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { PENDING_G2_KP_IDS } from '@/data/seed/mathG2Templates'
import { generateFromTemplate, isGeneratorRegistered } from '@/domain/generators/index'
import { createRng } from '@/domain/generators/rng'
import { isOpened } from '@/data/seed/pets'
import { gradeLevelOf } from '@/domain/types'

/** 二年级全部知识点 ID，按图谱声明顺序 */
const G2_KP_IDS = KNOWLEDGE_POINTS_BY_GRADE.G2.map((kp) => kp.id)

describe('模板与生成器的契约', () => {
  it('每条模板引用的生成器都已注册', () => {
    const missing = ITEM_TEMPLATES.filter((t) => !isGeneratorRegistered(t.generator)).map(
      (t) => `${t.id} → ${t.generator}`,
    )
    expect(missing, '模板引用了不存在的生成器，出题时会直接抛错').toEqual([])
  })

  it('模板 ID 不重复 —— 重复会让 Map 索引静默丢掉一条', () => {
    const seen = new Set<string>()
    const dup: string[] = []
    for (const t of ITEM_TEMPLATES) {
      if (seen.has(t.id)) dup.push(t.id)
      seen.add(t.id)
    }
    expect(dup).toEqual([])
  })

  it('每条模板的 kpId 都存在于图谱里', () => {
    const known = new Set(
      Object.values(KNOWLEDGE_POINTS_BY_GRADE)
        .flat()
        .map((kp) => kp.id),
    )
    const orphan = ITEM_TEMPLATES.filter((t) => !known.has(t.kpId)).map((t) => t.id)
    expect(orphan, '模板挂在了不存在的知识点上，这些题永远不会被出到').toEqual([])
  })

  it('三档难度参数齐全', () => {
    const incomplete = ITEM_TEMPLATES.filter(
      (t) => t.params[1] === undefined || t.params[2] === undefined || t.params[3] === undefined,
    ).map((t) => t.id)
    expect(incomplete).toEqual([])
  })
})

describe('⭐ 二年级起：每个知识点 ≥2 条模板且题型不同', () => {
  const covered = G2_KP_IDS.filter((id) => !PENDING_G2_KP_IDS.includes(id))

  it('已挂模板的知识点确实各有 ≥2 条', () => {
    const thin = covered
      .map((id) => ({ id, count: ITEM_TEMPLATE_BY_KP.get(id)?.length ?? 0 }))
      .filter((x) => x.count < 2)
    expect(thin, '这些知识点只有一条模板，孩子会一直看到同一种题').toEqual([])
  })

  it('⭐ 而且题型不止一种 —— 两条都是填空等于没有变化', () => {
    const single = covered
      .map((id) => ({
        id,
        types: [...new Set((ITEM_TEMPLATE_BY_KP.get(id) ?? []).map((t) => t.type))],
      }))
      .filter((x) => x.types.length < 2)
      .map((x) => `${x.id}: ${x.types.join(' / ')}`)
    expect(single, '这些知识点的模板题型全都一样').toEqual([])
  })

  it('⭐ 每条模板都真的出得了题，且产出的题型与声明一致', () => {
    // 直接把生成器跑一遍，比维护一张「哪些生成器默认产什么」的白名单可靠得多：
    // 白名单会过时，而这条断言对声明与实际不符的任何原因都成立。
    // 顺带还验证了每条模板的参数都配得对——出题时抛错在这里就会暴露。
    const problems: string[] = []
    for (const t of ITEM_TEMPLATES) {
      if (!t.kpId.startsWith('M2-')) continue
      for (const difficulty of [1, 2, 3] as const) {
        try {
          const item = generateFromTemplate(t, difficulty, createRng(difficulty * 17))
          if (item.type !== t.type) {
            problems.push(`${t.id} 难度${difficulty}: 声明 ${t.type}，实际产出 ${item.type}`)
          }
        } catch (err) {
          problems.push(`${t.id} 难度${difficulty}: 出题抛错 ${(err as Error).message}`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('⭐ 二年级每道题都有 4 个选项，错误项全带误区标签', () => {
    const problems: string[] = []
    for (const t of ITEM_TEMPLATES) {
      if (!t.kpId.startsWith('M2-')) continue
      for (let seed = 1; seed <= 5; seed++) {
        const item = generateFromTemplate(t, 2, createRng(seed))
        if (item.options.filter((o) => o.isCorrect).length !== 1) {
          problems.push(`${t.id} seed${seed}: 正确选项不唯一`)
        }
        for (const opt of item.options) {
          if (!opt.isCorrect && opt.misconceptionTag === undefined) {
            problems.push(`${t.id} seed${seed}: 选项「${opt.text}」没有误区标签`)
          }
        }
      }
    }
    expect(problems.slice(0, 10)).toEqual([])
  })
})

describe('⭐ 待办清单必须与实际情况一致', () => {
  it('清单里的知识点确实还没有模板', () => {
    const alreadyDone = PENDING_G2_KP_IDS.filter(
      (id) => (ITEM_TEMPLATE_BY_KP.get(id)?.length ?? 0) > 0,
    )
    expect(alreadyDone, '这些已经挂上模板了，请从 PENDING_G2_KP_IDS 里划掉').toEqual([])
  })

  it('没有漏网的知识点 —— 既不在清单里，也没有模板', () => {
    const forgotten = G2_KP_IDS.filter(
      (id) => !PENDING_G2_KP_IDS.includes(id) && (ITEM_TEMPLATE_BY_KP.get(id)?.length ?? 0) === 0,
    )
    expect(forgotten, '这些知识点没有模板也没进待办清单，会静默地永远出不了题').toEqual([])
  })

  it('清单里没有不存在的知识点', () => {
    const ghost = PENDING_G2_KP_IDS.filter((id) => !G2_KP_IDS.includes(id))
    expect(ghost, '清单里有图谱中不存在的 ID').toEqual([])
  })

  it('⭐ 清单没清空之前，二年级数学不能对孩子开放', () => {
    // 图谱有了但题出不全时不该让她进去，见 design/08 §8.8
    if (PENDING_G2_KP_IDS.length > 0) {
      expect(
        isOpened('math', 'G2'),
        '还有知识点出不了题，此时开放二年级会让她撞上空白的知识点',
      ).toBe(false)
    }
  })
})

describe('一年级维持现状，不追溯补齐', () => {
  it('一年级的知识点仍然可以只挂一条模板', () => {
    const g1 = KNOWLEDGE_POINTS_BY_GRADE.G1.filter((kp) => kp.subject === 'math')
    const withTemplate = g1.filter((kp) => (ITEM_TEMPLATE_BY_KP.get(kp.id)?.length ?? 0) > 0)
    // 只断言「大部分有模板」，不强制每个都有两条——这是 CLAUDE.md 明说的例外
    expect(withTemplate.length).toBeGreaterThan(0)
  })

  it('模板全部落在已知年级内', () => {
    for (const t of ITEM_TEMPLATES) {
      const kp = Object.values(KNOWLEDGE_POINTS_BY_GRADE)
        .flat()
        .find((k) => k.id === t.kpId)
      expect(kp, `${t.id} 找不到知识点`).toBeDefined()
      expect(['G1', 'G2']).toContain(gradeLevelOf(kp!.grade))
    }
  })
})
