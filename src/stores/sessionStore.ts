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
import { ensureMasteryUpTo } from '@/data/repositories/masterySetup'
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
import { resolveAnswerSpeech } from '@/domain/resolveAnswerSpeech'
import { nowIso, todayLocal } from '@/domain/time'
import { newId } from '@/platform/newId'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
import {
  gradeLevelOf,
  type Attempt,
  type GradeLevel,
  type ItemType,
  type ScheduledItem,
  type SessionMode,
  type Subject,
  type Uuid,
} from '@/domain/types'

/**
 * 她**在读几年级**（档案事实）。唯一真相在 `profileStore`。
 *
 * ⭐ 宠物结算一律用它，**不用 `contentGradeLevel`**：
 * 三年级的孩子切回一年级复习几道题，经验该给她正在养的三年级伙伴，
 * 而不该让往届的团团重新开始长——「往届不再成长」是 design/08 §5.2 的红线。
 */
const profileGradeLevel = (): GradeLevel => gradeLevelOf(useProfileStore.getState().grade)

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
 * 听算题的「听题」时长（毫秒），从计时里扣掉。
 *
 * ⭐ **不扣会歪掉 SM-2 的排期。** `toRecallQuality` 拿本次耗时与该知识点的
 * 历史均值比，而听算题她得先听完才谈得上算——同一个知识点里听算恒定慢两秒，
 * 于是看算的题一律被判成「又快又对」（quality 5，间隔拉长），
 * 听算的一律「还在硬算」（quality 3，间隔压短），而这跟她会不会毫无关系。
 *
 * 2000ms 的来处：「9 加 5 等于几」是 4 个片段，裁静音后每条约 0.45 秒、
 * 间隔 80ms，合计约 2.0 秒（见 platform/speechClips.ts 的实测数据）。
 * ⚠️ 二年级的长题干会超出这个数，那时她的耗时会被算多一点——
 * 宁可偏这个方向：**低估听题时间只是让 quality 保守，高估则会虚报「又快又对」**。
 */
const LISTEN_LEAD_MS = 2000

/**
 * 这道题从什么时候开始计时。
 *
 * 听算题往后推 {@link LISTEN_LEAD_MS}，其余题型就是此刻。
 */
const timingStart = (type: ItemType | undefined): number =>
  Date.now() + (type === 'listen_number' ? LISTEN_LEAD_MS : 0)

/**
 * 当前确实出得了题的知识点。
 *
 * 图谱有 113 个知识点，但只有配了生成器模板的才能出题——
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
   * 正确答案是一张图时的 key（方格图案、钟面、角…）。
   *
   * ⚠️ 有它就**画出来**，别把 `correctText` 显示出去：图案类选项的 text
   * 存的就是 `grid:5:00.11.21.30` 这串画图用的 key，摆在孩子面前是天书。
   */
  correctImageKey?: string
  /**
   * 正确答案的语音片段——答错反馈用它把「答案是 X」整句拼成预生成音色。
   *
   * 三种取值对应三种播法，见 `domain/resolveAnswerSpeech.ts`：
   * 非空拼片段、`[]` 只说安慰语、`undefined` 整句降级为实时 TTS。
   */
  correctParts?: string[]
  /**
   * 朗读答案时用的文本（TTS 兜底）。⚠️ 与 `correctText` 可能不同：
   * 屏幕上是 🍎，念出来得是「苹果」。
   */
  correctSpokenText: string
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
  /**
   * ⭐ 这次要做**哪个年级**的题。`null` 表示跟随档案年级（`profileStore.grade`）。
   *
   * ⚠️ 与「她在读几年级」是两回事：三年级的孩子可以切回一年级复习，
   * 那时 `contentGradeLevel` 是 `'G1'`，而档案年级仍然是 `'G3'`。
   *
   * ⛔ **它不参与宠物结算**。经验永远算给档案年级的那批伙伴——
   * 否则她切回一年级做几道题，往届的团团就又开始长了，
   * 而「往届不再成长」是 design/08 §5.2 的红线。
   *
   * 做成可空而不是存一个具体年级：家长改了档案年级之后它自动跟上，
   * 不需要两个 store 互相同步。
   */
  contentGradeLevel: GradeLevel | null
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
  /**
   * 切到某个年级的答题区。传 `null` 回到「跟随档案年级」。
   *
   * 只影响出题范围，不影响宠物——理由见 {@link contentGradeLevel}。
   */
  setContentGrade: (gradeLevel: GradeLevel | null) => void
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
  /**
   * 直接写入余额。**只有商店买完东西时才调**——
   * 答题路径上的余额一律由 `answer` 从入账结果里带回来，
   * 绕过它去手工设置会让「做对一题得几分」和账本脱钩。
   *
   * 余额本身留在这里而不是搬去 shopStore：首页、小结页读的都是它，
   * 花掉之后那两处必须立刻跟上，否则孩子会看到一个已经不存在的数字。
   */
  setBalance: (balance: number) => void
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
  contentGradeLevel: null,
  masteredCount: 0,
  pointsEarned: 0,
  balance: 0,
  questionStartedAt: 0,
  ttsReplayCount: 0,

  /** 首次进入 App 时初始化数据库 */
  init: async () => {
    const profileId = await bootstrap()
    set({ profileId, balance: await getBalance(profileId) })
  },

  setContentGrade: (gradeLevel) => set({ contentGradeLevel: gradeLevel }),

  /** 开始一段学习：排期 → 生成题目 → 建会话记录 */
  start: async (mode = 'daily', subject = 'math') => {
    set({ status: 'loading' })

    const profileId = get().profileId ?? (await bootstrap())
    const gradeLevel = get().contentGradeLevel ?? profileGradeLevel()

    /**
     * ⚠️ 掌握度只铺到档案年级为止（见 data/bootstrap.ts 的 `ensureMastery`）。
     * 她从首页切到**更高**年级的答题区时，那一级还没有任何记录，
     * 而 `selectNextItems` 完全由 `masteryMap` 驱动——不补建的话
     * 那些知识点进不了任何池子，表现是「点了开始学习，一道题都没有」。
     *
     * 幂等，已经齐了不碰数据库；必须排在 `loadMasteryMap` **之前**。
     */
    await ensureMasteryUpTo(profileId, gradeLevel)

    const now = nowIso()
    const masteryMap = await loadMasteryMap(profileId, now)

    const plan = selectNextItems({
      profileId,
      mode,
      subject,
      // 新内容只从这个年级开；复习与回退仍然跨年级通行（见 ScheduleInput.gradeLevel）
      gradeLevel,
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
      questionStartedAt: timingStart(items[0]?.item.type),
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
      questionStartedAt: timingStart(wrong[0]?.item.type),
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
      // ⚠️ 夹到 0：听算题的计时起点是往后推的，她抢在念完前就答会得到负数
      responseTimeMs: Math.max(0, Date.now() - state.questionStartedAt),
      hintUsed: false,
      ttsReplayCount: state.ttsReplayCount,
      isRetry: state.isRetrySession,
      createdAt: nowIso(),
      localDate: todayLocal(),
    }

    const correctText = correctOption?.text ?? current.item.answer
    const speech = resolveAnswerSpeech(current.item)

    set({
      status: 'feedback',
      feedback: {
        isCorrect,
        selectedOptionId: optionId,
        correctText,
        correctSpokenText: speech.text,
        ...(correctOption?.imageKey !== undefined && { correctImageKey: correctOption.imageKey }),
        ...(speech.parts !== undefined && { correctParts: speech.parts }),
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
      questionStartedAt: timingStart(state.items[nextIndex]?.item.type),
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
        .settleSession(state.profileId, state.subject, profileGradeLevel(), {
          correct: state.correctCount,
          retryCorrect: 0,
          masteredCount: state.masteredCount,
        })
    } else if (state.profileId !== null && state.isRetrySession) {
      // 订正轮只按「订正答对」计经验，额度低于首次答对
      await usePetStore
        .getState()
        .settleSession(state.profileId, state.subject, profileGradeLevel(), {
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

  setBalance: (balance) => set({ balance }),
}))
