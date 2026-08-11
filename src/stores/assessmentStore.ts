/**
 * @file 摸底测评状态 —— 探测流程的编排
 * @layer stores
 * @see src/domain/assessment/placement.ts 定位逻辑
 */

import { create } from 'zustand'
import { bootstrap } from '@/data/bootstrap'
import { saveAndApplyPlacement } from '@/data/repositories/assessmentRepo'
import { primaryTemplateOf } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { computePlacement, nextProbeKpId, type ProbeResult } from '@/domain/assessment/placement'
import { generateFromTemplate } from '@/domain/generators'
import { createRng } from '@/domain/generators/rng'
import type { GeneratedItem, Uuid } from '@/domain/types'

/** 探测题统一用中等难度：太简单测不出上限，太难会误判 */
const PROBE_DIFFICULTY = 2

export type AssessmentStatus = 'idle' | 'active' | 'feedback' | 'done'

interface AssessmentState {
  profileId: Uuid | null
  status: AssessmentStatus
  currentItem: GeneratedItem | null
  results: ProbeResult[]
  lastCorrect: boolean | null
  /** 定位到的起点知识点名，完成后用于展示 */
  startKpName: string | null

  start: () => Promise<void>
  answer: (optionId: string) => void
  next: () => Promise<void>
  reset: () => void
}

/**
 * 按知识点生成一道探测题。
 *
 * ⚠️ 走 `primaryTemplateOf` 而不是随机轮换：摸底要考的是「她会不会」，
 * 不是「她能不能拖准」，且全程要控制在 5 分钟内。理由见那个函数的 JSDoc。
 */
function buildProbeItem(kpId: string): GeneratedItem | null {
  const template = primaryTemplateOf(kpId)
  if (template === undefined) return null
  return generateFromTemplate(template, PROBE_DIFFICULTY, createRng(Date.now() + kpId.length))
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  profileId: null,
  status: 'idle',
  currentItem: null,
  results: [],
  lastCorrect: null,
  startKpName: null,

  start: async () => {
    const profileId = await bootstrap()
    const firstKpId = nextProbeKpId([])
    set({
      profileId,
      status: 'active',
      results: [],
      lastCorrect: null,
      startKpName: null,
      currentItem: firstKpId === undefined ? null : buildProbeItem(firstKpId),
    })
  },

  answer: (optionId) => {
    const { currentItem, results, status } = get()
    if (currentItem === null || status !== 'active') return

    const option = currentItem.options.find((o) => o.id === optionId)
    if (option === undefined) return

    set({
      status: 'feedback',
      lastCorrect: option.isCorrect,
      results: [...results, { kpId: currentItem.kpId, isCorrect: option.isCorrect }],
    })
  },

  next: async () => {
    const { results, profileId } = get()
    const nextKpId = nextProbeKpId(results)

    if (nextKpId !== undefined) {
      const item = buildProbeItem(nextKpId)
      if (item !== null) {
        set({ status: 'active', currentItem: item, lastCorrect: null })
        return
      }
    }

    // 探测结束：计算定位并落库
    const outcome = computePlacement(results, KNOWLEDGE_POINT_BY_ID)
    if (profileId !== null) {
      await saveAndApplyPlacement(profileId, results, outcome)
    }

    set({
      status: 'done',
      currentItem: null,
      startKpName:
        outcome.startKpId === undefined
          ? null
          : (KNOWLEDGE_POINT_BY_ID.get(outcome.startKpId)?.name ?? null),
    })
  },

  reset: () =>
    set({ status: 'idle', currentItem: null, results: [], lastCorrect: null, startKpName: null }),
}))
