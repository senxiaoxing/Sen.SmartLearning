/**
 * @file 摸底定位测试
 * @layer domain
 * @see src/domain/assessment/placement.ts
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { computePlacement } from '@/domain/assessment/placement'
import { PLACEMENT_PROBES, sequenceOf } from '@/domain/assessment/placementProbes'
import type { ProbeResult } from '@/domain/assessment/nextProbe'
import { GRADE_LEVELS, type GradeLevel, type Subject } from '@/domain/types'

const G1 = sequenceOf('math', 'G1')
const G2 = sequenceOf('math', 'G2')

const pass = (kpId: string, gradeLevel: GradeLevel = 'G1'): ProbeResult => ({
  kpId,
  isCorrect: true,
  gradeLevel,
  phase: 'probe',
})
const fail = (kpId: string, gradeLevel: GradeLevel = 'G1'): ProbeResult => ({
  kpId,
  isCorrect: false,
  gradeLevel,
  phase: 'probe',
})
const descend = (kpId: string, isCorrect: boolean): ProbeResult => ({
  kpId,
  isCorrect,
  gradeLevel: 'G1',
  phase: 'descend',
})
const safety = (kpId: string, isCorrect: boolean): ProbeResult => ({
  kpId,
  isCorrect,
  gradeLevel: 'G2',
  phase: 'safety',
})

describe('定位计算', () => {
  it('⭐ 答对的探测点连同全部前置一起判定为已掌握', () => {
    // 答对 M5.2「9 加几」说明凑十法与 10 的分与合都会，没必要从头练
    const outcome = computePlacement([pass('M5.2')], KNOWLEDGE_POINT_BY_ID, 'math', 'G1')

    expect(outcome.masteredKpIds).toContain('M5.2')
    expect(outcome.masteredKpIds, '凑十法是直接前置').toContain('M5.1')
    expect(outcome.masteredKpIds, '10 的分与合是间接前置').toContain('M3.3')
    expect(outcome.masteredKpIds, '数的组成是间接前置').toContain('M1.9')
  })

  it('第一个答错的探测点成为起点', () => {
    const outcome = computePlacement(
      [pass('M1.6'), pass('M1.9'), pass('M3.3'), fail('M4.5')],
      KNOWLEDGE_POINT_BY_ID,
      'math',
      'G1',
    )
    expect(outcome.startKpId).toBe('M4.5')
    expect(outcome.masteredKpIds).toContain('M3.3')
    expect(outcome.masteredKpIds).not.toContain('M4.5')
  })

  it('答错的探测点不会因为是别人的前置而被判为掌握', () => {
    const outcome = computePlacement(
      [fail('M4.5'), pass('M4.6')],
      KNOWLEDGE_POINT_BY_ID,
      'math',
      'G1',
    )
    expect(outcome.masteredKpIds).not.toContain('M4.5')
  })

  it('全部答对时没有起点限制', () => {
    const outcome = computePlacement(
      G1.map((id) => pass(id)),
      KNOWLEDGE_POINT_BY_ID,
      'math',
      'G1',
    )
    expect(outcome.startKpId).toBeUndefined()
    expect(outcome.masteredKpIds).toContain('M6.2')
  })

  it('全部答错时不判定任何掌握，起点为第一题', () => {
    const outcome = computePlacement(
      [fail('M1.6'), fail('M1.9')],
      KNOWLEDGE_POINT_BY_ID,
      'math',
      'G1',
    )
    expect(outcome.masteredKpIds).toHaveLength(0)
    expect(outcome.startKpId).toBe('M1.6')
  })
})

/**
 * ⭐ 跨年级下探之后，起点必须取自**实际停在的那一级**。
 *
 * 老规则是「全局第一个答错的」。二年级的孩子在 G2 头两题就错了、
 * 下探到 G1 才找到能做的——按老规则起点会被钉死在 G2 第一题上，
 * 而那正是她刚刚证明了自己做不了的地方。
 */
describe('⭐ 下探之后的起点', () => {
  const openingG2 = [fail(G2[0]!, 'G2'), fail(G2[1]!, 'G2'), safety(G2[0]!, false)]

  it('⭐ 起点落在下探那一级，不是本级第一题', () => {
    // 一年级最难的也不会，往回一题才做对 —— 她的真实水平在 G1 中段
    const results = [
      ...openingG2,
      descend(G1[G1.length - 1]!, false),
      descend(G1[G1.length - 2]!, true),
    ]
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID, 'math', 'G2')

    expect(G1, '起点必须落在她真正够得着的那一级').toContain(outcome.startKpId)
    expect(outcome.startKpId, '绝不能钉在她刚做不出来的地方').not.toBe(G2[0])
  })

  it('下探答对某题 → 起点是它在低一级序列里的下一个', () => {
    // 答对倒数第二个（G1[5]）→ 起点应是 G1[6]
    const results = [...openingG2, descend(G1[G1.length - 1]!, false), descend(G1[G1.length - 2]!, true)]
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID, 'math', 'G2')

    expect(outcome.startKpId).toBe(G1[G1.length - 1])
  })

  it('连低一级最难的都会 → 起点回到本级开头', () => {
    const results = [...openingG2, descend(G1[G1.length - 1]!, true)]
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID, 'math', 'G2')

    expect(outcome.startKpId).toBe(G2[0])
  })

  it('下探全错 → 起点是探到的最靠前那个', () => {
    const results = [
      ...openingG2,
      descend(G1[6]!, false),
      descend(G1[5]!, false),
      descend(G1[4]!, false),
    ]
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID, 'math', 'G2')

    expect(outcome.startKpId).toBe(G1[4])
  })

  it('⭐ 保底题答对（只是手滑）→ 起点仍在本级，且不受保底题影响', () => {
    const results = [fail(G2[0]!, 'G2'), fail(G2[1]!, 'G2'), safety(G2[0]!, true)]
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID, 'math', 'G2')

    expect(outcome.startKpId).toBe(G2[0])
    expect(outcome.masteredKpIds, '保底题答对了，那个知识点算会').toContain(G2[0])
  })
})

describe('探测序列本身', () => {
  const withProbes: [Subject, GradeLevel][] = []
  for (const subject of ['math', 'pinyin', 'english'] as Subject[]) {
    for (const grade of GRADE_LEVELS) {
      if (sequenceOf(subject, grade).length > 0) withProbes.push([subject, grade])
    }
  }

  it('每条序列的知识点都有生成器，否则那一站是道空白题', () => {
    for (const [subject, grade] of withProbes) {
      for (const kpId of sequenceOf(subject, grade)) {
        expect(ITEM_TEMPLATE_BY_KP.has(kpId), `${subject}/${grade} 的 ${kpId} 没有生成器模板`).toBe(
          true,
        )
      }
    }
  })

  it('⭐ 每条序列都按 order 严格递增 —— 整套流程都建立在「越往后越难」上', () => {
    for (const [subject, grade] of withProbes) {
      const seq = sequenceOf(subject, grade)
      const orders = seq.map((id) => KNOWLEDGE_POINT_BY_ID.get(id)!.order)
      for (let i = 1; i < orders.length; i += 1) {
        expect(orders[i]!, `${subject}/${grade} 的 ${seq[i]} 顺序不对`).toBeGreaterThan(
          orders[i - 1]!,
        )
      }
    }
  })

  it('探测点真的属于它挂着的那个年级', () => {
    for (const [subject, grade] of withProbes) {
      for (const kpId of sequenceOf(subject, grade)) {
        const kp = KNOWLEDGE_POINT_BY_ID.get(kpId)!
        expect(kp.grade.startsWith(grade.charAt(1)), `${kpId} 不属于 ${grade}`).toBe(true)
        expect(kp.subject, `${kpId} 不属于 ${subject}`).toBe(subject)
      }
    }
  })

  it('已开放年级的数学都有探测序列 —— 少一级会让那一级的孩子无法定位', () => {
    expect(PLACEMENT_PROBES.math.G1?.length).toBeGreaterThan(0)
    expect(PLACEMENT_PROBES.math.G2?.length).toBeGreaterThan(0)
  })
})
