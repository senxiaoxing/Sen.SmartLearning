/**
 * @file 摸底定位测试
 * @layer domain
 */

import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import {
  PLACEMENT_PROBES,
  computePlacement,
  nextProbeKpId,
  shouldContinueProbing,
  type ProbeResult,
} from '@/domain/assessment/placement'

const pass = (kpId: string): ProbeResult => ({ kpId, isCorrect: true })
const fail = (kpId: string): ProbeResult => ({ kpId, isCorrect: false })

describe('探测流程控制', () => {
  it('从第一道探测题开始', () => {
    expect(nextProbeKpId([])).toBe(PLACEMENT_PROBES[0])
  })

  it('答对则继续往难处探', () => {
    expect(nextProbeKpId([pass('M1.6')])).toBe(PLACEMENT_PROBES[1])
  })

  it('错一题仍继续——可能只是手滑或没听清', () => {
    expect(shouldContinueProbing([fail('M1.6')])).toBe(true)
  })

  it('⭐ 连错两题立即停止，不把孩子考到崩溃', () => {
    expect(shouldContinueProbing([fail('M1.6'), fail('M1.9')])).toBe(false)
    expect(nextProbeKpId([fail('M1.6'), fail('M1.9')])).toBeUndefined()
  })

  it('中间错一题后又答对，连错计数归零', () => {
    expect(shouldContinueProbing([fail('M1.6'), pass('M1.9'), fail('M3.3')])).toBe(true)
  })

  it('探完全部题目后停止', () => {
    const all = PLACEMENT_PROBES.map((id) => pass(id))
    expect(shouldContinueProbing(all)).toBe(false)
    expect(nextProbeKpId(all)).toBeUndefined()
  })
})

describe('定位计算', () => {
  it('⭐ 答对的探测点连同全部前置一起判定为已掌握', () => {
    // 答对 M5.2「9 加几」说明凑十法与 10 的分与合都会，没必要从头练
    const outcome = computePlacement([pass('M5.2')], KNOWLEDGE_POINT_BY_ID)

    expect(outcome.masteredKpIds).toContain('M5.2')
    expect(outcome.masteredKpIds, '凑十法是直接前置').toContain('M5.1')
    expect(outcome.masteredKpIds, '10 的分与合是间接前置').toContain('M3.3')
    expect(outcome.masteredKpIds, '数的组成是间接前置').toContain('M1.9')
  })

  it('第一个答错的探测点成为起点', () => {
    const outcome = computePlacement(
      [pass('M1.6'), pass('M1.9'), pass('M3.3'), fail('M4.5')],
      KNOWLEDGE_POINT_BY_ID,
    )
    expect(outcome.startKpId).toBe('M4.5')
    expect(outcome.masteredKpIds).toContain('M3.3')
    expect(outcome.masteredKpIds).not.toContain('M4.5')
  })

  it('答错的探测点不会因为是别人的前置而被判为掌握', () => {
    // M4.5 答错，即使后面 M5.2 答对也不该把 M4.5 算作掌握
    const outcome = computePlacement([fail('M4.5'), pass('M4.6')], KNOWLEDGE_POINT_BY_ID)
    expect(outcome.masteredKpIds).not.toContain('M4.5')
  })

  it('全部答对时没有起点限制', () => {
    const outcome = computePlacement(
      PLACEMENT_PROBES.map((id) => pass(id)),
      KNOWLEDGE_POINT_BY_ID,
    )
    expect(outcome.startKpId).toBeUndefined()
    expect(outcome.masteredKpIds).toContain('M6.2')
  })

  it('全部答错时不判定任何掌握，起点为第一题', () => {
    const outcome = computePlacement([fail('M1.6'), fail('M1.9')], KNOWLEDGE_POINT_BY_ID)
    expect(outcome.masteredKpIds).toHaveLength(0)
    expect(outcome.startKpId).toBe('M1.6')
  })

  it('探测点全部有对应的生成器，否则出不出题', async () => {
    const { ITEM_TEMPLATE_BY_KP } = await import('@/data/seed/itemTemplates')
    for (const kpId of PLACEMENT_PROBES) {
      expect(ITEM_TEMPLATE_BY_KP.has(kpId), `${kpId} 没有生成器模板`).toBe(true)
    }
  })

  it('探测点按难度递增排列', () => {
    const orders = PLACEMENT_PROBES.map((id) => KNOWLEDGE_POINT_BY_ID.get(id)!.order)
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]!, `${PLACEMENT_PROBES[i]} 顺序不对`).toBeGreaterThan(orders[i - 1]!)
    }
  })
})
