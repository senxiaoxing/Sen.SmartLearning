/**
 * @file 摸底测评状态 —— 探测流程的编排
 * @layer stores
 * @see src/domain/assessment/placement.ts 定位逻辑
 */

import { create } from 'zustand'
import { bootstrap } from '@/data/bootstrap'
import { loadGrade } from '@/data/repositories/profileRepo'
import { saveAndApplyPlacement } from '@/data/repositories/assessmentRepo'
import { primaryTemplateOf } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { computePlacement } from '@/domain/assessment/placement'
import { nextProbe, type NextProbe, type ProbeResult } from '@/domain/assessment/nextProbe'
import { generateFromTemplate } from '@/domain/generators'
import { createRng } from '@/domain/generators/rng'
import { gradeLevelOf, type Difficulty, type GeneratedItem, type GradeLevel, type Uuid } from '@/domain/types'

/** 探测题统一用中等难度：太简单测不出上限，太难会误判 */
const PROBE_DIFFICULTY: Difficulty = 2

/**
 * 保底题的难度。
 *
 * ⭐ 刻意压到最低：这道题的任务不是「测出她会不会」，而是把**手滑**和
 * **真不会**分开。它必须是她只要清醒着就能做对的那种题，
 * 否则起不到任何区分作用，只是又一次挫败。见 `nextProbe.ts` 的 ② 段。
 */
const SAFETY_DIFFICULTY: Difficulty = 1

/** 摸底只考数学 —— 拼音与英语的起点靠「从第一课开始」就够了 */
const ASSESSMENT_SUBJECT = 'math' as const

export type AssessmentStatus = 'idle' | 'active' | 'feedback' | 'done'

interface AssessmentState {
  profileId: Uuid | null
  status: AssessmentStatus
  currentItem: GeneratedItem | null
  results: ProbeResult[]
  lastCorrect: boolean | null
  /** 定位到的起点知识点名，完成后用于展示 */
  startKpName: string | null
  /**
   * 她**在读**几年级 —— 探测从这一级的序列开始。
   *
   * ⚠️ 是「孩子几年级」而不是「题目属于几年级」。下探到低年级之后，
   * 这个值**不跟着变**：它同时是将来判断「播不播语音」的依据
   * （design/08 §7），按题目年级判会出现「做着做着突然开始说话」。
   */
  startGrade: GradeLevel
  /** 当前这道题取自哪一级、哪一段，作答时连同结果一起记下来 */
  pending: NextProbe | null

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
function buildProbeItem(probe: NextProbe): GeneratedItem | null {
  const template = primaryTemplateOf(probe.kpId)
  if (template === undefined) return null

  const difficulty = probe.phase === 'safety' ? SAFETY_DIFFICULTY : PROBE_DIFFICULTY
  return generateFromTemplate(template, difficulty, createRng(Date.now() + probe.kpId.length))
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  profileId: null,
  status: 'idle',
  currentItem: null,
  results: [],
  lastCorrect: null,
  startKpName: null,
  startGrade: 'G1',
  pending: null,

  start: async () => {
    const profileId = await bootstrap()
    // 从她**在读**的那一级开始探，不是永远从一年级开始 ——
    // 这正是「三年级孩子进来往下探」这件事的入口
    const startGrade = gradeLevelOf(await loadGrade(profileId))
    const first = nextProbe(ASSESSMENT_SUBJECT, startGrade, [])

    set({
      profileId,
      startGrade,
      status: 'active',
      results: [],
      lastCorrect: null,
      startKpName: null,
      pending: first ?? null,
      currentItem: first === undefined ? null : buildProbeItem(first),
    })
  },

  answer: (optionId) => {
    const { currentItem, results, status, pending } = get()
    if (currentItem === null || pending === null || status !== 'active') return

    const option = currentItem.options.find((o) => o.id === optionId)
    if (option === undefined) return

    set({
      status: 'feedback',
      lastCorrect: option.isCorrect,
      // 带上这道题的来源（哪一级、哪一段）—— 定位起点全靠它区分
      results: [...results, { ...pending, isCorrect: option.isCorrect }],
    })
  },

  next: async () => {
    const { results, profileId, startGrade } = get()
    const upcoming = nextProbe(ASSESSMENT_SUBJECT, startGrade, results)

    if (upcoming !== undefined) {
      const item = buildProbeItem(upcoming)
      if (item !== null) {
        set({ status: 'active', currentItem: item, pending: upcoming, lastCorrect: null })
        return
      }
    }

    // 探测结束：计算定位并落库
    const outcome = computePlacement(
      results,
      KNOWLEDGE_POINT_BY_ID,
      ASSESSMENT_SUBJECT,
      startGrade,
    )
    if (profileId !== null) {
      await saveAndApplyPlacement(profileId, results, outcome)
    }

    set({
      status: 'done',
      currentItem: null,
      pending: null,
      startKpName:
        outcome.startKpId === undefined
          ? null
          : (KNOWLEDGE_POINT_BY_ID.get(outcome.startKpId)?.name ?? null),
    })
  },

  reset: () =>
    set({
      status: 'idle',
      currentItem: null,
      results: [],
      lastCorrect: null,
      startKpName: null,
      pending: null,
    }),
}))
