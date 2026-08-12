/**
 * @file 摸底测评仓储 —— 保存测评结果并据此重设学习起点
 * @layer data
 * @see src/domain/assessment/placement.ts 定位逻辑
 */

import { db } from '@/data/db'
import { refreshUnlocks } from '@/data/bootstrap'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import {
  PLACEMENT_MASTERY_SCORE,
  type PlacementOutcome,
  type ProbeResult,
} from '@/domain/assessment/placement'
import { addDays, nowIso } from '@/domain/time'
import { newId } from '@/platform/newId'
import type { Assessment, Mastery, Uuid } from '@/domain/types'

/**
 * 摸底判定掌握后，首次复习安排在 3~14 天之后。
 *
 * 比日常复习间隔更长：摸底刚验证过她会，短期内再考一遍既没信息量，
 * 又会让「数一数」这类简单内容频繁回来打扰。
 */
const REVIEW_DELAY_MIN_DAYS = 3
const REVIEW_SPREAD_DAYS = 12

/** 该档案是否已完成过摸底测评 */
export async function hasCompletedAssessment(profileId: Uuid): Promise<boolean> {
  const records = await db.assessments.where('profileId').equals(profileId).toArray()
  return records.some((a) => a.completedAt !== undefined)
}

/**
 * 保存测评结果并应用到掌握度。
 *
 * ⚠️ **只覆盖没有真实作答记录的知识点**（`totalAttempts === 0`）。
 * 已经练过的知识点带着真实数据，测评这几道题的信息量远不如它们，
 * 用测评结果去覆盖等于抹掉真实学习历史。
 *
 * @param profileId - 档案 ID
 * @param probes - 探测作答记录
 * @param outcome - 定位结果
 *
 * @example
 * await saveAndApplyPlacement(profileId, probes, computePlacement(probes, kpById))
 */
export async function saveAndApplyPlacement(
  profileId: Uuid,
  probes: readonly ProbeResult[],
  outcome: PlacementOutcome,
): Promise<void> {
  const now = nowIso()

  const assessment: Assessment = {
    id: newId(),
    profileId,
    type: 'initial',
    startedAt: now,
    completedAt: now,
    probes: probes.map((p) => ({
      kpId: p.kpId,
      itemId: `placement:${p.kpId}`,
      isCorrect: p.isCorrect,
      responseTimeMs: 0,
    })),
    results: probes.map((p) => ({
      unit: p.kpId.split('.')[0] ?? p.kpId,
      estimatedLevel: p.isCorrect ? ('proficient' as const) : ('not_started' as const),
      placedKpId: p.kpId,
    })),
    appliedAt: now,
  }
  await db.assessments.add(assessment)

  const mastered = new Set(outcome.masteredKpIds)
  const all = await db.mastery.where('profileId').equals(profileId).toArray()

  const updates: Mastery[] = []
  all.forEach((m, index) => {
    // 有真实作答记录的知识点，其数据比测评更可信，一律不动
    if (m.totalAttempts > 0) return

    const kp = KNOWLEDGE_POINTS.find((k) => k.id === m.kpId)
    if (kp === undefined) return

    if (mastered.has(m.kpId)) {
      updates.push({
        ...m,
        state: 'mastered',
        masteryScore: PLACEMENT_MASTERY_SCORE,
        dueAt: addDays(now, REVIEW_DELAY_MIN_DAYS + (index % REVIEW_SPREAD_DAYS)),
        updatedAt: now,
      })
    } else if (m.state === 'mastered') {
      // 测评显示她其实不会 —— 撤销起点预设的假定，退回未学状态
      updates.push({
        ...m,
        state: kp.prerequisites.length === 0 ? 'available' : 'locked',
        masteryScore: 0,
        updatedAt: now,
      })
    }
  })

  if (updates.length > 0) await db.mastery.bulkPut(updates)
  await refreshUnlocks(profileId)
}
