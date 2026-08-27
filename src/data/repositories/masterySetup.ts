/**
 * @file 掌握度铺设 —— 建记录、按年级补建、起点假定、解锁
 * @layer data  唯一允许接触 Dexie 的层
 * @see src/data/repositories/masteryRepo.ts  日常读写与作答结算（另一组职责）
 * @see src/data/seed/placementPresets.ts     起点假定的取值与理由
 * @see design/08-年级分区与内容扩展.md §10 阶段 6  为什么按年级铺
 *
 * 从 `bootstrap.ts` 拆出来的：那个文件管的是「启动时要做哪些事」，
 * 而这四个函数管的是「mastery 表该处于什么状态」——后者在升年级、
 * 切答题区、做完摸底时都要用，早就不只在启动时跑了。
 */

import { db } from '@/data/db'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import {
  ASSUMED_MASTERY_SCORE,
  ASSUMED_REVIEW_SPREAD_DAYS,
  assumedMasteredFor,
} from '@/data/seed/placementPresets'
import { createMastery } from '@/domain/mastery/updateMastery'
import { findNewlyUnlocked } from '@/domain/scheduler/unlockGraph'
import { addDays, nowIso } from '@/domain/time'
import { newId } from '@/platform/newId'
import { GRADE_LEVELS, gradeLevelOf, type GradeLevel, type Mastery, type Uuid } from '@/domain/types'

/**
 * 为尚无掌握度记录的知识点补建记录，**只建到 `gradeLevel` 这一级为止**。
 *
 * App 更新引入新知识点时会自动补上，已有记录一律不动——
 * 覆盖已有掌握度等于抹掉孩子的学习进度。
 *
 * 首次创建时会应用 {@link assumedMasteredFor} 起点预设，
 * 让上过幼小衔接的孩子不必从「数一数」开始。
 *
 * ## ⭐ 为什么要按年级截断
 *
 * 六个年级的图谱全做完会有上千个知识点。给一个一年级的孩子建齐
 * 三年级到六年级的记录，除了拖慢每次启动的 {@link refreshUnlocks}（它扫全表），
 * 没有任何用处——那些内容她一年之内都碰不到。
 *
 * ⚠️ **只截高于她的，绝不截低于她的**：复习、巩固、前置回退、
 * `behind` 池一律跨年级往下通行（design/08 §1.1「年级是天花板不是围墙」）。
 * 六年级的孩子仍然需要一年级的全部记录。
 *
 * ## ⚠️ 截断之后必须有人补建
 *
 * `selectNextItems` 完全由 `masteryMap` 驱动——没有记录的知识点
 * **进不了任何池子**，表现是「切到那个年级一道题都排不出来」。
 * 因此凡是可能碰到更高年级内容的入口，都必须先调一次这个函数：
 *
 * | 入口 | 落点 |
 * |---|---|
 * | 启动 | `runBootstrap()`，按档案年级 |
 * | 家长升年级 | `profileStore.setGrade()` |
 * | 首页切到别的年级答题区 | `sessionStore.start()`，按内容年级 |
 *
 * @param profileId - 档案 ID
 * @param gradeLevel - 建到哪一级为止（含）
 * @returns 这次新建了几条。0 表示已经齐了
 *
 * @example
 * await ensureMastery(profileId, 'G1')   // 一年级新档案：113 条
 */
export async function ensureMastery(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<number> {
  const ceiling = GRADE_LEVELS.indexOf(gradeLevel)
  const withinReach = KNOWLEDGE_POINTS.filter(
    (kp) => GRADE_LEVELS.indexOf(gradeLevelOf(kp.grade)) <= ceiling,
  )

  const existing = await db.mastery.where('profileId').equals(profileId).toArray()
  const known = new Set(existing.map((m) => m.kpId))
  const missing = withinReach.filter((kp) => !known.has(kp.id))
  if (missing.length === 0) return 0

  const now = nowIso()
  const assumed = assumedMasteredFor(gradeLevel)
  const records: Mastery[] = missing.map((kp, index) => {
    const base = createMastery(newId(), profileId, kp, now)
    if (!assumed.has(kp.id)) return base

    return {
      ...base,
      state: 'mastered' as const,
      masteryScore: ASSUMED_MASTERY_SCORE,
      // 复习时间分散开，避免某天一打开全是复习题
      dueAt: addDays(now, 1 + (index % ASSUMED_REVIEW_SPREAD_DAYS)),
    }
  })
  await db.mastery.bulkPut(records)
  return records.length
}

/**
 * 补建到某个年级，并把新解锁的知识点转为 `available`。
 *
 * 给「运行时才知道要哪个年级」的入口用（升年级、切答题区）。幂等，
 * 已经齐了就直接返回、不碰数据库。
 *
 * ⚠️ 补建之后**必须** {@link refreshUnlocks}：新建的记录里，前置已满足的那些
 * 还停在 `locked`，不刷一次就永远排不进学习池。
 *
 * @example
 * await ensureMasteryUpTo(profileId, 'G2')   // 她要做二年级的题了
 */
export async function ensureMasteryUpTo(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<void> {
  const created = await ensureMastery(profileId, gradeLevel)
  if (created > 0) await refreshUnlocks(profileId)
}

/**
 * 把「低于她这个年级、而且她**从没做过**」的知识点提升为假定掌握。
 *
 * ## 为什么补建不够，还要单独这一步
 *
 * {@link ensureMastery} 的起点假定只在**新建**记录时应用。而真实路径是：
 * 装好 App 先按默认的一年级建满 113 条，家长**之后**才进家长区把年级
 * 改成三年级——那时 G1 的记录早就建好了，`assumedMasteredFor('G3')`
 * 再宽也落不到它们头上。结果是三年级的孩子跳过摸底后，
 * 第一道题仍然是「数一数」。
 *
 * ## ⛔ 只能由「档案年级」触发，绝不能由「内容年级」触发
 *
 * 一年级的孩子从首页切到二年级答题区，只是想做做看，
 * 不代表她一年级已经学完了——那时把 G1 全标成掌握会直接抹掉她的真实进度。
 * 所以这个函数只挂在 `profileStore.setGrade()` 上，
 * `sessionStore.start()` 只调 {@link ensureMasteryUpTo}。
 *
 * @param gradeLevel - 她**在读**几年级
 *
 * @example
 * // 家长把年级设成三年级：一二年级的内容按「学校已经教过」处理
 * await applyGradeAssumptions(profileId, 'G3')
 */
export async function applyGradeAssumptions(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<void> {
  const assumed = assumedMasteredFor(gradeLevel)
  const all = await db.mastery.where('profileId').equals(profileId).toArray()

  const now = nowIso()
  const updates = all
    .filter(
      (m) =>
        assumed.has(m.kpId) &&
        // ⚠️ 有真实作答记录的一律不动：她自己做出来的数据比任何假定都可信
        m.totalAttempts === 0 &&
        m.state !== 'mastered',
    )
    .map((m, index) => ({
      ...m,
      state: 'mastered' as const,
      masteryScore: ASSUMED_MASTERY_SCORE,
      // 复习时间分散开，避免某天一打开全是复习题
      dueAt: addDays(now, 1 + (index % ASSUMED_REVIEW_SPREAD_DAYS)),
      updatedAt: now,
    }))

  if (updates.length > 0) await db.mastery.bulkPut(updates)
}

/**
 * 把前置已满足的 `locked` 知识点转为 `available`。
 *
 * 每次启动都跑一次：孩子上次会话掌握了某个前置，本次启动就该看到新内容开放。
 *
 * @returns 这次新解锁的知识点 ID
 */
export async function refreshUnlocks(profileId: Uuid): Promise<string[]> {
  const all = await db.mastery.where('profileId').equals(profileId).toArray()
  const map = new Map(all.map((m) => [m.kpId, m]))
  const unlocked = findNewlyUnlocked(map, KNOWLEDGE_POINTS)
  if (unlocked.length === 0) return []

  const now = nowIso()
  await db.mastery.bulkPut(
    unlocked.map((kpId) => ({ ...map.get(kpId)!, state: 'available' as const, updatedAt: now })),
  )
  return unlocked
}
