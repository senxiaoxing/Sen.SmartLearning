/**
 * @file 家长报告与错题本的数据读取 —— 按科目分组后交给 domain 汇总
 * @layer data  唯一允许接触 Dexie 的层
 * @see src/domain/report/subjectReport.ts  单科汇总（纯函数）
 * @see src/domain/report/wrongBook.ts      错题筛选（纯函数）
 *
 * `Attempt` 上没有 `subject` 字段，按科目分组要靠 `kpId → 知识点 → subject`，
 * 而知识点表是 data 层的静态内容。这就是分组放在这里、而不是 domain 的原因。
 */

import { db } from '@/data/db'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINT_BY_ID, KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { SUBJECT_ORDER } from '@/data/seed/subjects'
import { buildDailyTrend, currentStreak, DEFAULT_TREND_DAYS, type DayStat } from '@/domain/report/dailyTrend'
import { buildSubjectReport, type SubjectReport } from '@/domain/report/subjectReport'
import { collectWrongItems, type WrongItem } from '@/domain/report/wrongBook'
import type { WrongKpCount } from '@/domain/scheduler/selectRetryItems'
import { addLocalDays, todayLocal } from '@/domain/time'
import type { Attempt, Subject, Uuid } from '@/domain/types'

/**
 * 各科当前出得了题的知识点。
 *
 * 与 `sessionStore` 的 `ANSWERABLE_KP_IDS` 同源：报告里的「掌握 12/28」
 * 分母必须是**真正能练的**知识点数。拿图谱总数 112 当分母，
 * 家长看到的进度会被 M7 图形、M8 钟表这些还没做的内容永久拖住。
 */
const ANSWERABLE_BY_SUBJECT: Record<Subject, ReadonlySet<string>> = (() => {
  const map = { math: new Set<string>(), pinyin: new Set<string>(), english: new Set<string>() }
  for (const kp of KNOWLEDGE_POINTS) {
    if (ITEM_TEMPLATE_BY_KP.has(kp.id)) map[kp.subject].add(kp.id)
  }
  return map
})()

/** 错题本默认回溯多少天。比趋势的 7 天长——错题的价值在于「还没解决」，不在于新鲜 */
export const WRONG_BOOK_DAYS = 30

function subjectOf(kpId: string): Subject | undefined {
  return KNOWLEDGE_POINT_BY_ID.get(kpId)?.subject
}

/** 按 `[profileId+localDate]` 索引取一段日期内的作答，避免全表扫描 */
async function attemptsSince(profileId: Uuid, days: number): Promise<Attempt[]> {
  const today = todayLocal()
  const from = addLocalDays(today, -(days - 1))
  return db.attempts
    .where('[profileId+localDate]')
    .between([profileId, from], [profileId, today], true, true)
    .toArray()
}

/** 一个科目的报告分区：汇总数字 + 自己的趋势 */
export interface SubjectSection {
  report: SubjectReport
  trend: DayStat[]
}

export interface FullReport {
  /** 按 {@link SUBJECT_ORDER} 固定顺序，⚠️ 绝不按成绩排序 */
  sections: SubjectSection[]
  /** 连续学习天数，跨科目合并统计 */
  streak: number
  /** 趋势区间长度 */
  trendDays: number
  /** 是否一条作答记录都没有 */
  isEmpty: boolean
}

/**
 * 读取完整的家长报告。
 *
 * 掌握度与会话读全量（每科几十条，代价可忽略），
 * 作答只读趋势区间内的（一年 4 万条，全读会卡住页面）。
 *
 * @param profileId - 档案 ID
 * @param trendDays - 趋势回溯天数
 * @returns 三科分区 + 连续天数
 *
 * @example
 * const { sections, streak } = await loadReport(profileId)
 * sections[0].report.topMisconceptions   // 数学最需要关注的薄弱点
 */
export async function loadReport(
  profileId: Uuid,
  trendDays: number = DEFAULT_TREND_DAYS,
): Promise<FullReport> {
  const [masteryList, sessions, recentAttempts] = await Promise.all([
    db.mastery.where('profileId').equals(profileId).toArray(),
    db.sessions.where('profileId').equals(profileId).toArray(),
    attemptsSince(profileId, trendDays),
  ])

  const today = todayLocal()
  const sections = SUBJECT_ORDER.map((subject) => ({
    report: buildSubjectReport({
      subject,
      masteryList: masteryList.filter((m) => m.subject === subject),
      // session.subject 可选：早期或异常数据可能没有，归不到任何科目
      sessions: sessions.filter((s) => s.subject === subject),
      answerableKpIds: ANSWERABLE_BY_SUBJECT[subject],
    }),
    trend: buildDailyTrend(
      recentAttempts.filter((a) => subjectOf(a.kpId) === subject),
      today,
      trendDays,
    ),
  }))

  return {
    sections,
    streak: currentStreak(recentAttempts, today),
    trendDays,
    isEmpty: sections.every((s) => s.report.totalAttempts === 0),
  }
}

export interface WrongBookSection {
  subject: Subject
  items: WrongItem[]
}

/**
 * 读取错题本，按科目分组。
 *
 * 只回溯 {@link WRONG_BOOK_DAYS} 天：更早的错题要么已经在后续练习中改对了
 * （会被 `collectWrongItems` 过滤掉），要么孩子早就忘了当时错在哪，
 * 拿出来说反而像翻旧账。
 *
 * @param profileId - 档案 ID
 * @param days - 回溯天数
 * @returns 按 {@link SUBJECT_ORDER} 排序，**空科目也保留**便于 UI 显示「这科没有错题」
 *
 * @example
 * const sections = await loadWrongBook(profileId)
 * sections.find((s) => s.subject === 'math')?.items   // 数学还没改对的题
 */
export async function loadWrongBook(
  profileId: Uuid,
  days: number = WRONG_BOOK_DAYS,
): Promise<WrongBookSection[]> {
  const attempts = await attemptsSince(profileId, days)

  return SUBJECT_ORDER.map((subject) => ({
    subject,
    items: collectWrongItems(attempts.filter((a) => subjectOf(a.kpId) === subject)),
  }))
}

/** 一个科目待订正的知识点汇总 */
export interface PendingRetryGroup {
  subject: Subject
  /** 待订正的知识点及各自的错题数 */
  kps: WrongKpCount[]
  /** 该科待订正错题总数 */
  total: number
}

/**
 * 取待订正错题，按科目汇总。
 *
 * 供主页的「再练一练」入口使用：孩子端一轮只练一个科目
 * （宠物经验要归属到具体某一只，跨科目一轮无法结算），
 * 因此这里按待订正数降序返回，调用方取第一个即可。
 *
 * @param profileId - 档案 ID
 * @param days - 回溯天数
 * @returns 按待订正数降序，**没有错题的科目不出现**
 *
 * @example
 * const groups = await loadPendingRetry(profileId)
 * groups[0]   // { subject: 'math', kps: [{ kpId: 'M5.2', count: 3 }], total: 3 }
 */
export async function loadPendingRetry(
  profileId: Uuid,
  days: number = WRONG_BOOK_DAYS,
): Promise<PendingRetryGroup[]> {
  const sections = await loadWrongBook(profileId, days)

  return sections
    .map((section) => {
      const byKp = new Map<string, number>()
      for (const item of section.items) {
        byKp.set(item.kpId, (byKp.get(item.kpId) ?? 0) + 1)
      }
      return {
        subject: section.subject,
        kps: [...byKp.entries()].map(([kpId, count]) => ({ kpId, count })),
        total: section.items.length,
      }
    })
    .filter((group) => group.total > 0)
    .sort((a, b) => b.total - a.total)
}
