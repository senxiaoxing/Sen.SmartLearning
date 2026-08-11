/**
 * @file 数据库初始化 —— 首次启动建档案、导入静态内容、铺开掌握度记录
 * @layer data
 * @see design/02-数据库Schema.md §1 表总览
 *
 * 每次启动都会调用（幂等）：
 * - 静态内容按 `contentVersion` 决定是否重新导入，支持 App 更新后补充新知识点
 * - 用户数据只在缺失时创建，绝不覆盖已有进度
 */

import { CONTENT_VERSION, SCHEMA_VERSION, db } from '@/data/db'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import {
  ASSUMED_MASTERED_KP_IDS,
  ASSUMED_MASTERY_SCORE,
  ASSUMED_REVIEW_SPREAD_DAYS,
} from '@/data/seed/placementPresets'
import { ensurePets } from '@/data/repositories/petRepo'
import { createMastery } from '@/domain/mastery/updateMastery'
import { findNewlyUnlocked } from '@/domain/scheduler/unlockGraph'
import { addDays, nowIso } from '@/domain/time'
import { gradeLevelOf, type Mastery, type Profile, type Settings, type Uuid } from '@/domain/types'

/** 默认档案名。孩子第一次打开时用，之后可在家长区改 */
const DEFAULT_PROFILE_NAME = '小朋友'

/**
 * 进行中的初始化。
 *
 * ⚠️ 防并发竞态：页面挂载时的 `init()` 与孩子点击「开始学习」触发的兜底初始化
 * 可能同时发生。两次调用都会读到空表，各自创建一整套档案与掌握度记录——
 * 结果是每个知识点两条记录，掌握度更新只作用于其中一条，学习进度随机丢失。
 *
 * 集成测试用串行 `await` 测不出这个问题，只有真机上手快点才会触发。
 */
let pending: Promise<Uuid> | null = null

/**
 * 初始化数据库并返回当前档案 ID。
 *
 * 并发调用共享同一次初始化，重复调用幂等。
 *
 * @returns 活跃档案的 ID
 *
 * @example
 * const profileId = await bootstrap()
 */
export function bootstrap(): Promise<Uuid> {
  pending ??= runBootstrap().finally(() => {
    pending = null
  })
  return pending
}

async function runBootstrap(): Promise<Uuid> {
  await syncStaticContent()
  const profileId = await ensureProfile()
  await ensureMastery(profileId)

  // 宠物按年级划分，升年级时会自动创建新一批
  const profile = await db.profiles.get(profileId)
  await ensurePets(profileId, gradeLevelOf(profile?.grade ?? '1A'))

  await refreshUnlocks(profileId)
  return profileId
}

/**
 * 同步静态内容（知识点、题目模板）。
 *
 * 用 `bulkPut` 而非先清空再写：清空会让并发读取到空表，
 * 而 `bulkPut` 是覆盖式写入，任何时刻表里都是完整数据。
 */
async function syncStaticContent(): Promise<void> {
  const stored = await db.meta.get('contentVersion')
  if (stored?.value === CONTENT_VERSION) return

  await db.knowledgePoints.bulkPut(KNOWLEDGE_POINTS)
  await db.itemTemplates.bulkPut(ITEM_TEMPLATES)

  const now = nowIso()
  await db.meta.bulkPut([
    { key: 'contentVersion', value: CONTENT_VERSION, updatedAt: now },
    { key: 'schemaVersion', value: SCHEMA_VERSION, updatedAt: now },
  ])
}

/** 取当前档案，不存在则创建 */
async function ensureProfile(): Promise<Uuid> {
  const active = await db.meta.get('activeProfileId')
  if (typeof active?.value === 'string') {
    const existing = await db.profiles.get(active.value)
    if (existing !== undefined) return existing.id
  }

  const now = nowIso()
  const profile: Profile = {
    id: crypto.randomUUID(),
    name: DEFAULT_PROFILE_NAME,
    avatarId: 'default',
    grade: '1A',
    createdAt: now,
    updatedAt: now,
  }
  const settings: Settings = {
    profileId: profile.id,
    dailySessionLimit: 3,
    sessionDurationMin: 15,
    breakDurationMin: 5,
    bgmEnabled: false,
    bgmVolume: 0.4,
    sfxEnabled: true,
    sfxVolume: 0.8,
    ttsRate: 0.85,
    subjectsEnabled: ['math', 'pinyin'],
    dailyTargetItems: 20,
    // ⚠️ 一年级不识字，自动朗读必须默认开启
    autoReadStem: true,
    reducedMotion: false,
    updatedAt: now,
  }

  await db.profiles.put(profile)
  await db.settings.put(settings)
  await db.meta.bulkPut([
    { key: 'activeProfileId', value: profile.id, updatedAt: now },
    { key: 'installId', value: crypto.randomUUID(), updatedAt: now },
    { key: 'firstLaunchAt', value: now, updatedAt: now },
  ])

  return profile.id
}

/**
 * 为尚无掌握度记录的知识点补建记录。
 *
 * App 更新引入新知识点时会自动补上，已有记录一律不动——
 * 覆盖已有掌握度等于抹掉孩子的学习进度。
 *
 * 首次创建时会应用 {@link ASSUMED_MASTERED_KP_IDS} 起点预设，
 * 让上过幼小衔接的孩子不必从「数一数」开始。
 */
async function ensureMastery(profileId: Uuid): Promise<void> {
  const existing = await db.mastery.where('profileId').equals(profileId).toArray()
  const known = new Set(existing.map((m) => m.kpId))
  const missing = KNOWLEDGE_POINTS.filter((kp) => !known.has(kp.id))
  if (missing.length === 0) return

  const now = nowIso()
  const assumed = new Set(ASSUMED_MASTERED_KP_IDS)
  const records: Mastery[] = missing.map((kp, index) => {
    const base = createMastery(crypto.randomUUID(), profileId, kp, now)
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
}

/**
 * 把前置已满足的 `locked` 知识点转为 `available`。
 *
 * 每次启动都跑一次：孩子上次会话掌握了某个前置，本次启动就该看到新内容开放。
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
