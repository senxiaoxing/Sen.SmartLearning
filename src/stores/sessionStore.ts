/**
 * @file 学习会话状态 —— 连接 UI 与 domain 的编排层
 * @layer stores  Zustand，只做编排，业务计算一律委托给 domain
 * @see design/03-技术方案.md §2 架构分层
 *
 * 会话生命周期：
 * ```
 * idle ──start()──> active ──answer()──> feedback ──next()──> active
 *                                                      └────> finished
 * ```
 */

import { create } from 'zustand'
import { bootstrap } from '@/data/bootstrap'
import { buildSessionItems, type SessionItem } from '@/data/buildSessionItems'
import { db } from '@/data/db'
import { getBalance } from '@/data/repositories/ledgerRepo'
import { loadMasteryMap, recordAttempt } from '@/data/repositories/masteryRepo'
import { loadPendingRetry } from '@/data/repositories/reportRepo'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { createRng } from '@/domain/generators/rng'
import { selectNextItems } from '@/domain/scheduler/selectNextItems'
import { selectRetryItems } from '@/domain/scheduler/selectRetryItems'
import { answerParts } from '@/domain/speech'
import { nowIso, todayLocal } from '@/domain/time'
import { newId } from '@/platform/newId'
import { usePetStore } from '@/stores/petStore'
import {
  gradeLevelOf,
  type Attempt,
  type GradeLevel,
  type ScheduledItem,
  type SessionMode,
  type Subject,
  type Uuid,
} from '@/domain/types'

/**
 * 一轮的题量。
 *
 * ⚠️ 从 25 降到 10 —— 孩子实测反馈「怎么还没做完啊」。
 *
 * 25 题是按「15 分钟一段」推算的，但成人的时间感和一年级孩子完全不同：
 * 25 题对她是一条看不到头的路。10 题一轮 + 结束后问「还要再来一轮吗」，
 * 让「完成」这件事频繁发生（目标梯度效应），一天能体验三次成就感
 * 而不是一次漫长跋涉。每日总量靠多轮累计，并不减少。
 */
const DEFAULT_ITEM_COUNT = 10

/**
 * 当前确实出得了题的知识点。
 *
 * 图谱有 112 个知识点，但只有配了生成器模板的才能出题——
 * M2 位置、M7 图形、M8 钟表、M9 应用题在等图片资源，
 * 英语 E1.6/E1.7/E1.9 在等各自的新题型。
 * 调度器必须知道这个边界，否则会排出一堆无法组装的计划。
 */
const ANSWERABLE_KP_IDS: ReadonlySet<string> = new Set(ITEM_TEMPLATE_BY_KP.keys())

export type SessionStatus = 'idle' | 'loading' | 'active' | 'feedback' | 'finished'

export interface AnswerFeedback {
  isCorrect: boolean
  selectedOptionId: string
  /** 正确答案文本，答错时展示 */
  correctText: string
  /**
   * 正确答案的语音片段——答错反馈用它把「答案是 X」整句拼成预生成音色。
   * 取正确选项自带的 `ttsParts`，纯数字答案由 `answerParts` 推导；
   * 都拿不到（如拼音书写规则题）则缺省，那句反馈整句走 TTS 兜底。
   */
  correctParts?: string[]
}

interface SessionState {
  profileId: Uuid | null
  status: SessionStatus
  sessionId: Uuid | null
  items: SessionItem[]
  index: number
  feedback: AnswerFeedback | null

  correctCount: number
  answeredCount: number

  /**
   * 本轮答错的题目，供小结页做错题回顾与订正。
   *
   * 孩子明确要求「做完后要能看错题」——她主动想复盘，这是很好的学习意识，
   * 必须接住。数据本来就有（`Attempt.itemSnapshot`），这里只是留在内存里方便即时回顾。
   */
  wrongItems: SessionItem[]
  /** 当前是否为订正轮。订正的作答会标记 `isRetry`，不影响复习排期 */
  isRetrySession: boolean
  /** 本轮科目，结算经验时决定加给哪只宠物 */
  subject: Subject
  /** 当前年级。宠物按「科目 × 年级」划分，结算时需要它定位 */
  gradeLevel: GradeLevel
  /** 本轮新掌握的知识点数，用于经验结算 */
  masteredCount: number

  /**
   * 本轮已赚到的积分，逐题累加。
   *
   * 积分在**每题落库时**就已入账（与 attempt 同事务），这里只是把当轮的份额
   * 留在内存里供小结页展示。⚠️ 不要反过来在小结时才统一发放——
   * 中途退出会让已经做对的题一分都拿不到。
   */
  pointsEarned: number
  /** 入账后的积分总余额，答题过程中持续更新 */
  balance: number

  /** 本题开始时间，用于计算反应时长 */
  questionStartedAt: number
  /** 本题重听次数——反复重听说明题目理解有困难，而非知识点没掌握 */
  ttsReplayCount: number

  init: () => Promise<void>
  start: (mode?: SessionMode, subject?: Subject) => Promise<void>
  /**
   * 由排期计划启动一段会话。`start` 与 `startWrongBookRetry` 的公共部分，
   * 一般不直接从 UI 调用。
   */
  startWithPlan: (mode: SessionMode, subject: Subject, plan: ScheduledItem[]) => Promise<void>
  /**
   * ⭐ 开一轮错题订正：针对错题本里还没解决的知识点重新出题。
   *
   * 与小结页的 {@link startRetry} 是**两件事**，区别见实现处的注释。
   */
  startWrongBookRetry: () => Promise<void>
  startRetry: () => void
  answer: (optionId: string) => Promise<void>
  next: () => void
  finish: () => Promise<void>
  reset: () => void
  countReplay: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  profileId: null,
  status: 'idle',
  sessionId: null,
  items: [],
  index: 0,
  feedback: null,
  correctCount: 0,
  answeredCount: 0,
  wrongItems: [],
  isRetrySession: false,
  subject: 'math',
  gradeLevel: 'G1',
  masteredCount: 0,
  pointsEarned: 0,
  balance: 0,
  questionStartedAt: 0,
  ttsReplayCount: 0,

  /** 首次进入 App 时初始化数据库 */
  init: async () => {
    const profileId = await bootstrap()
    const profile = await db.profiles.get(profileId)
    set({
      profileId,
      gradeLevel: gradeLevelOf(profile?.grade ?? '1A'),
      balance: await getBalance(profileId),
    })
  },

  /** 开始一段学习：排期 → 生成题目 → 建会话记录 */
  start: async (mode = 'daily', subject = 'math') => {
    set({ status: 'loading' })

    const profileId = get().profileId ?? (await bootstrap())
    const now = nowIso()
    const masteryMap = await loadMasteryMap(profileId, now)

    const plan = selectNextItems({
      profileId,
      mode,
      subject,
      count: DEFAULT_ITEM_COUNT,
      masteryMap,
      knowledgePoints: KNOWLEDGE_POINTS,
      now,
      // 只排真正出得了题的知识点，否则组装阶段跳过会让题量对不上
      answerableKpIds: ANSWERABLE_KP_IDS,
    })
    await get().startWithPlan(mode, subject, plan)
  },

  /**
   * 开一轮错题订正。
   *
   * ⚠️ 与小结页的 `startRetry` 是两件事，别混：
   *
   * |            | 小结页订正            | 这里（错题本订正）        |
   * |------------|----------------------|--------------------------|
   * | 题目        | **原封不动的那几道题** | 同知识点**新生成**的题     |
   * | isRetry     | `true`               | `false`                  |
   * | 复习排期    | 不参与                | 正常参与                  |
   *
   * 标 `isRetry: false` 是刻意的：design/05「订正不参与复习排期」针对的是
   * **刚错完立刻重做同一道题**——那时改对不代表记住了。而这里隔了些时候、
   * 换了新题目，就是一次货真价实的练习，理应正常计入掌握度与积分。
   *
   * 一轮只练一个科目：宠物经验要结算给具体某一只，跨科目一轮无法归属。
   * 取待订正最多的那一科，练完下次自然轮到别科。
   */
  startWrongBookRetry: async () => {
    set({ status: 'loading' })

    const profileId = get().profileId ?? (await bootstrap())
    const [target] = await loadPendingRetry(profileId)
    if (target === undefined) {
      set({ status: 'finished', items: [], profileId })
      return
    }

    const masteryMap = await loadMasteryMap(profileId, nowIso())
    const plan = selectRetryItems({
      wrongKps: target.kps,
      count: DEFAULT_ITEM_COUNT,
      masteryMap,
      answerableKpIds: ANSWERABLE_KP_IDS,
    })
    await get().startWithPlan('remedial', target.subject, plan)
  },

  startWithPlan: async (mode, subject, plan) => {
    const profileId = get().profileId ?? (await bootstrap())
    const items = buildSessionItems(plan, createRng(Date.now()))

    if (items.length === 0) {
      set({ status: 'finished', items: [], profileId })
      return
    }

    const now = nowIso()
    const sessionId = newId()
    await db.sessions.add({
      id: sessionId,
      profileId,
      mode,
      subject,
      startedAt: now,
      durationMs: 0,
      activeDurationMs: 0,
      itemCount: 0,
      correctCount: 0,
      pointsEarned: 0,
      kpIdsTouched: [...new Set(items.map((i) => i.item.kpId))],
      completedNormally: false,
      localDate: todayLocal(),
    })

    set({
      profileId,
      sessionId,
      items,
      index: 0,
      status: 'active',
      feedback: null,
      correctCount: 0,
      answeredCount: 0,
      wrongItems: [],
      isRetrySession: false,
      subject,
      masteredCount: 0,
      pointsEarned: 0,
      questionStartedAt: Date.now(),
      ttsReplayCount: 0,
    })
  },

  /**
   * 开始订正：把本轮错题重新做一遍。
   *
   * 复用当前会话记录而不新建，因为订正是这一轮的延续。
   * 订正答对会记 `isRetry: true`——⭐ 订正也给积分，否则孩子会回避错题；
   * 但它**不参与复习排期**，刚错完立刻改对不代表记住了。
   */
  startRetry: () => {
    const wrong = get().wrongItems
    if (wrong.length === 0) return

    set({
      items: wrong,
      index: 0,
      status: 'active',
      feedback: null,
      correctCount: 0,
      answeredCount: 0,
      wrongItems: [],
      isRetrySession: true,
      // 订正是独立的一轮，积分重新计——小结页要显示的是「这次订正赚了多少」
      pointsEarned: 0,
      questionStartedAt: Date.now(),
      ttsReplayCount: 0,
    })
  },

  /** 提交答案：判定 → 落库 → 进入反馈态 */
  answer: async (optionId) => {
    const state = get()
    const current = state.items[state.index]
    if (current === undefined || state.profileId === null || state.sessionId === null) return
    if (state.status !== 'active') return

    const option = current.item.options.find((o) => o.id === optionId)
    if (option === undefined) return

    const isCorrect = option.isCorrect
    const correctOption = current.item.options.find((o) => o.isCorrect)

    const attempt: Attempt = {
      id: newId(),
      profileId: state.profileId,
      sessionId: state.sessionId,
      kpId: current.item.kpId,
      itemId: current.item.signature,
      // 生成题必须存快照，否则错题本无法还原「她当时看到的是什么」
      itemSnapshot: {
        stem: current.item.stem.text,
        options: current.item.options.map((o) => ({
          id: o.id,
          text: o.text ?? '',
          ...(o.misconceptionTag !== undefined && { misconceptionTag: o.misconceptionTag }),
        })),
        answer: current.item.answer,
      },
      difficulty: current.item.difficulty,
      isCorrect,
      selectedOptionId: optionId,
      ...(option.misconceptionTag !== undefined && { misconceptionTag: option.misconceptionTag }),
      responseTimeMs: Date.now() - state.questionStartedAt,
      hintUsed: false,
      ttsReplayCount: state.ttsReplayCount,
      isRetry: state.isRetrySession,
      createdAt: nowIso(),
      localDate: todayLocal(),
    }

    const correctText = correctOption?.text ?? current.item.answer
    const correctParts = correctOption?.ttsParts ?? answerParts(correctText)

    set({
      status: 'feedback',
      feedback: {
        isCorrect,
        selectedOptionId: optionId,
        correctText,
        ...(correctParts !== undefined && { correctParts }),
      },
      correctCount: state.correctCount + (isCorrect ? 1 : 0),
      answeredCount: state.answeredCount + 1,
      wrongItems: isCorrect ? state.wrongItems : [...state.wrongItems, current],
    })

    // 落库放在状态更新之后：反馈动画要立刻出现，不能等数据库
    const outcome = await recordAttempt(attempt)

    set((s) => ({
      // 刚跨过掌握门槛的知识点计入本轮成果，结算时给额外经验
      masteredCount: s.masteredCount + (outcome.justMastered ? 1 : 0),
      pointsEarned: s.pointsEarned + outcome.pointsEarned,
      balance: outcome.balanceAfter,
    }))
  },

  /** 进入下一题，已是最后一题则结束会话 */
  next: () => {
    const state = get()
    const nextIndex = state.index + 1

    if (nextIndex >= state.items.length) {
      void get().finish()
      return
    }

    set({
      index: nextIndex,
      status: 'active',
      feedback: null,
      questionStartedAt: Date.now(),
      ttsReplayCount: 0,
    })
  },

  /** 结束会话：回写统计并把学习成果结算成宠物经验 */
  finish: async () => {
    const state = get()
    set({ status: 'finished' })

    // 订正轮不重复结算经验——那些题在首轮已经算过一次了
    if (state.profileId !== null && !state.isRetrySession && state.answeredCount > 0) {
      await usePetStore
        .getState()
        .settleSession(state.profileId, state.subject, state.gradeLevel, {
          correct: state.correctCount,
          retryCorrect: 0,
          masteredCount: state.masteredCount,
        })
    } else if (state.profileId !== null && state.isRetrySession) {
      // 订正轮只按「订正答对」计经验，额度低于首次答对
      await usePetStore
        .getState()
        .settleSession(state.profileId, state.subject, state.gradeLevel, {
          correct: 0,
          retryCorrect: state.correctCount,
          masteredCount: 0,
        })
    }

    if (state.sessionId === null) return
    const session = await db.sessions.get(state.sessionId)
    if (session === undefined) return

    const endedAt = nowIso()
    await db.sessions.put({
      ...session,
      endedAt,
      durationMs: Date.now() - new Date(session.startedAt).getTime(),
      activeDurationMs: Date.now() - new Date(session.startedAt).getTime(),
      itemCount: state.answeredCount,
      correctCount: state.correctCount,
      // 逐题入账的积分在这里汇总回写，供家长报告按「一轮」统计
      pointsEarned: state.pointsEarned,
      completedNormally: state.answeredCount >= state.items.length,
    })
  },

  reset: () => {
    set({
      status: 'idle',
      sessionId: null,
      items: [],
      index: 0,
      feedback: null,
      correctCount: 0,
      answeredCount: 0,
      wrongItems: [],
      isRetrySession: false,
      masteredCount: 0,
      pointsEarned: 0,
      ttsReplayCount: 0,
    })
  },

  countReplay: () => set((s) => ({ ttsReplayCount: s.ttsReplayCount + 1 })),
}))
