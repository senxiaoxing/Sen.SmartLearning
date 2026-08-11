/**
 * @file 单科学习报告 —— 把作答与掌握度汇总成家长看得懂的几个数
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.7 attempts、§3.8 mastery
 * @see src/data/seed/misconceptionLabels.ts  误区标签的中文说明
 *
 * 报告只回答家长真正会问的四件事：
 * 学了多久 · 做了多少 · 掌握到哪了 · **她到底卡在哪**。
 * 最后一条是这个 App 相对普通题库的全部价值所在，因此 `topMisconceptions`
 * 是本报告的主角，其余三项是背景。
 */

import type { Mastery, MisconceptionTag, Session, Subject } from '@/domain/types'

/** 一个误区在本科目的累计表现 */
export interface MisconceptionStat {
  tag: MisconceptionTag
  /** 累计出现次数，跨知识点合并 */
  count: number
  /** 在哪些知识点上犯过。同一个误区跨多个知识点出现，说明它是系统性的 */
  kpIds: string[]
}

export interface SubjectReport {
  subject: Subject
  totalAttempts: number
  correctAttempts: number
  /**
   * 正确率 0~1。**没做过题时为 `null` 而不是 0**——
   * 「还没开始」和「全做错了」是两件完全不同的事，
   * 用 0 表示两者会让家长看到一个 0% 而慌张。
   */
  accuracy: number | null
  /** 已掌握的知识点数 */
  masteredCount: number
  /** 当前有题可出的知识点数。⚠️ 不是图谱总数——拿没做完的内容当分母是在骗自己 */
  answerableCount: number
  /** 正在学（`learning`）的知识点 */
  learningKpIds: string[]
  /** 真实专注时长，剔除挂机。见 design/02-数据库Schema.md §3.9 */
  activeDurationMs: number
  /** ⭐ 最需要关注的误区，按累计次数降序 */
  topMisconceptions: MisconceptionStat[]
}

/** 报告里最多列几条薄弱点。列太多等于没有重点，家长会不知道先管哪个 */
export const MAX_REPORTED_MISCONCEPTIONS = 5

export interface SubjectReportInput {
  subject: Subject
  /** 本科目的掌握度记录 */
  masteryList: readonly Mastery[]
  /** 本科目的学习会话 */
  sessions: readonly Session[]
  /** 本科目当前出得了题的知识点 ID */
  answerableKpIds: ReadonlySet<string>
}

/**
 * 汇总一个科目的学习报告。
 *
 * 输入必须是**已按科目过滤**的数据——过滤需要 `kpId → subject` 的映射，
 * 那是 data 层的职责（见 reportRepo）。
 *
 * ⭐ 题量与误区统计都取自 `mastery` 而非扫描 `attempts`：
 * 掌握度引擎已经在逐题维护这些累计值，而 attempts 一年约 4 万条
 * （design/02-数据库Schema.md §7），每次进报告页全表扫一遍不可接受。
 * mastery 每科最多几十条，代价可以忽略。
 *
 * ⚠️ 代价是：若某条 mastery 记录缺失（数据异常），它对应的作答不计入总量。
 * 这是刻意的取舍——报告是给家长看趋势的，不是对账，差几题不影响判断。
 *
 * @param input - 已按科目过滤的掌握度与会话
 * @returns 单科报告
 *
 * @example
 * buildSubjectReport({
 *   subject: 'math',
 *   masteryList, sessions,
 *   answerableKpIds: new Set(['M5.1', 'M5.2']),
 * })
 * // {
 * //   subject: 'math', totalAttempts: 120, correctAttempts: 96, accuracy: 0.8,
 * //   masteredCount: 12, answerableCount: 28,
 * //   topMisconceptions: [{ tag: 'no_carry', count: 7, kpIds: ['M5.2', 'M5.3'] }],
 * //   ...
 * // }
 */
export function buildSubjectReport(input: SubjectReportInput): SubjectReport {
  const { subject, masteryList, sessions, answerableKpIds } = input

  const byTag = new Map<MisconceptionTag, MisconceptionStat>()
  let masteredCount = 0
  let totalAttempts = 0
  let correctAttempts = 0
  const learningKpIds: string[] = []

  for (const m of masteryList) {
    totalAttempts += m.totalAttempts
    correctAttempts += m.correctAttempts
    if (m.state === 'mastered' || m.state === 'review') masteredCount++
    if (m.state === 'learning') learningKpIds.push(m.kpId)

    for (const [rawTag, count] of Object.entries(m.misconceptionCounts)) {
      if (count === undefined || count <= 0) continue
      const tag = rawTag as MisconceptionTag
      const existing = byTag.get(tag)
      if (existing === undefined) {
        byTag.set(tag, { tag, count, kpIds: [m.kpId] })
      } else {
        existing.count += count
        existing.kpIds.push(m.kpId)
      }
    }
  }

  const topMisconceptions = [...byTag.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, MAX_REPORTED_MISCONCEPTIONS)

  return {
    subject,
    totalAttempts,
    correctAttempts,
    accuracy: totalAttempts === 0 ? null : correctAttempts / totalAttempts,
    masteredCount,
    answerableCount: answerableKpIds.size,
    learningKpIds,
    activeDurationMs: sessions.reduce((ms, s) => ms + s.activeDurationMs, 0),
    topMisconceptions,
  }
}
