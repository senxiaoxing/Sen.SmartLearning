/**
 * @file 备份往返一致性测试 —— 数据丢失是本项目最不可接受的故障
 * @layer data
 * @see design/03-技术方案.md §8.3 「导出→导入往返一致性，这个必须测」
 * @see CLAUDE.md 必须写单测的模块
 *
 * 核心用例走完整链路：**导出 → 序列化 → 清空 → 反序列化 → 校验 → 导入 → 逐表比对**。
 * 中间刻意经过 `JSON.stringify` / `JSON.parse`，因为真实备份是落到文件再读回来的，
 * 只在内存里传对象会测不出「品牌类型序列化后变普通字符串」「undefined 字段被丢掉」
 * 这类只在过一遍 JSON 之后才暴露的问题。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backupFileName, buildBackup, lastExportAt, markExported } from '@/data/backup/buildBackup'
import { importBackup } from '@/data/backup/importBackup'
import { bootstrap } from '@/data/bootstrap'
import { buildSessionItems } from '@/data/buildSessionItems'
import { SCHEMA_VERSION, USER_DATA_TABLES, db } from '@/data/db'
import { addExp } from '@/data/repositories/petRepo'
import { loadMasteryMap, recordAttempt } from '@/data/repositories/masteryRepo'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { validateBackup } from '@/domain/backup/validateBackup'
import { createRng } from '@/domain/generators/rng'
import { selectNextItems } from '@/domain/scheduler/selectNextItems'
import { nowIso, todayLocal } from '@/domain/time'
import type { Attempt, BackupFile, LedgerEntry, Uuid } from '@/domain/types'

const ANSWERABLE = new Set(ITEM_TEMPLATE_BY_KP.keys())

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

/**
 * 造一份「用过一阵子」的数据：答过题、宠物涨过经验、有积分流水。
 *
 * 空数据库的往返测试没有意义——它连一条记录都没有，什么都不还原也会通过。
 */
async function seedUsedProfile(): Promise<Uuid> {
  const profileId = await bootstrap()

  const map = await loadMasteryMap(profileId)
  await db.mastery.put({ ...map.get('M3.1')!, state: 'learning' })

  const plan = selectNextItems({
    profileId,
    mode: 'daily',
    subject: 'math',
    count: 6,
    masteryMap: await loadMasteryMap(profileId),
    knowledgePoints: KNOWLEDGE_POINTS,
    now: nowIso(),
    answerableKpIds: ANSWERABLE,
  })

  const items = buildSessionItems(plan, createRng(2026))
  const sessionId = crypto.randomUUID()

  for (const [index, { item }] of items.entries()) {
    // 故意混入答错的：错题带 misconceptionTag，是最容易在序列化中被丢掉的可选字段
    const isCorrect = index % 3 !== 0
    const option = item.options.find((o) => o.isCorrect === isCorrect)!
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      profileId,
      sessionId,
      kpId: item.kpId,
      itemId: item.signature,
      itemSnapshot: {
        stem: item.stem.text,
        options: item.options.map((o) => ({
          id: o.id,
          text: o.text ?? '',
          ...(o.misconceptionTag !== undefined && { misconceptionTag: o.misconceptionTag }),
        })),
        answer: item.answer,
      },
      difficulty: item.difficulty,
      isCorrect,
      selectedOptionId: option.id,
      ...(option.misconceptionTag !== undefined && { misconceptionTag: option.misconceptionTag }),
      responseTimeMs: 3200 + index * 100,
      hintUsed: false,
      ttsReplayCount: index % 2,
      isRetry: false,
      createdAt: nowIso(),
      localDate: todayLocal(),
    }
    await recordAttempt(attempt)
  }

  await db.sessions.add({
    id: sessionId,
    profileId,
    mode: 'daily',
    subject: 'math',
    startedAt: nowIso(),
    endedAt: nowIso(),
    durationMs: 240_000,
    activeDurationMs: 220_000,
    itemCount: items.length,
    correctCount: items.length - 2,
    pointsEarned: 12,
    kpIdsTouched: [...new Set(items.map((i) => i.item.kpId))],
    completedNormally: true,
    localDate: todayLocal(),
  })

  const entry: LedgerEntry = {
    id: crypto.randomUUID(),
    profileId,
    delta: 12,
    balanceAfter: 12,
    reason: 'correct_answer',
    createdAt: nowIso(),
    localDate: todayLocal(),
  }
  await db.ledger.add(entry)

  // 宠物有经验才测得出「导入后宠物没有被降级」
  await addExp(profileId, 'math', 'G1', 48)

  return profileId
}

/** 把全部用户表读成一个可直接比对的快照，各表按 id 排序消除顺序差异 */
async function snapshotUserTables(): Promise<Record<string, unknown[]>> {
  const snapshot: Record<string, unknown[]> = {}
  for (const name of USER_DATA_TABLES) {
    const rows = await db.table(name).toArray()
    snapshot[name] = rows.sort((a, b) =>
      String(a.id ?? a.profileId).localeCompare(String(b.id ?? b.profileId)),
    )
  }
  return snapshot
}

/** 模拟一次真实的「存成文件再读回来」 */
function roundTripThroughFile(backup: BackupFile): unknown {
  return JSON.parse(JSON.stringify(backup))
}

describe('备份往返', () => {
  it('⭐ 导出 → 清空 → 导入应完全还原', async () => {
    const profileId = await seedUsedProfile()
    const before = await snapshotUserTables()
    expect(before.attempts!.length, '前置条件：必须有数据可还原').toBeGreaterThan(0)

    const backup = await buildBackup(profileId)
    const text = JSON.stringify(backup)

    for (const name of USER_DATA_TABLES) {
      await db.table(name).clear()
    }
    expect(await db.attempts.count(), '前置条件：确实清空了').toBe(0)

    const verdict = validateBackup(JSON.parse(text), SCHEMA_VERSION)
    expect(verdict.ok).toBe(true)
    if (!verdict.ok) return

    await importBackup(verdict.backup)

    expect(await snapshotUserTables()).toEqual(before)
  })

  it('宠物经验原样还原，不会因为导入而倒退', async () => {
    // 宠物红线：exp 只增不减。导入若把 exp 归零，孩子看到的是「白养了」
    const profileId = await seedUsedProfile()
    const petsBefore = await db.petState.where('profileId').equals(profileId).toArray()
    const expBefore = petsBefore.find((p) => p.subject === 'math')?.exp
    expect(expBefore).toBeGreaterThan(0)

    const backup = await buildBackup(profileId)
    await db.petState.clear()
    await importBackup(backup)

    const after = await db.petState.where('profileId').equals(profileId).toArray()
    expect(after.find((p) => p.subject === 'math')?.exp).toBe(expBefore)
    expect(after, '三只宠物都要回来').toHaveLength(petsBefore.length)
  })

  it('答错记录的 misconceptionTag 不丢 —— 丢了等于废掉自适应', async () => {
    const profileId = await seedUsedProfile()
    const taggedBefore = (await db.attempts.toArray()).filter(
      (a) => a.misconceptionTag !== undefined,
    )
    expect(taggedBefore.length).toBeGreaterThan(0)

    const backup = await buildBackup(profileId)
    const restored = roundTripThroughFile(backup)
    const verdict = validateBackup(restored, SCHEMA_VERSION)
    expect(verdict.ok).toBe(true)
    if (!verdict.ok) return

    await db.attempts.clear()
    await importBackup(verdict.backup)

    const taggedAfter = (await db.attempts.toArray()).filter((a) => a.misconceptionTag !== undefined)
    expect(taggedAfter).toHaveLength(taggedBefore.length)
  })

  it('掌握度里的认知误区计数原样还原', async () => {
    const profileId = await seedUsedProfile()
    const before = await db.mastery.where('profileId').equals(profileId).toArray()
    const withCounts = before.filter((m) => Object.keys(m.misconceptionCounts).length > 0)
    expect(withCounts.length).toBeGreaterThan(0)

    const backup = await buildBackup(profileId)
    await db.mastery.clear()
    const verdict = validateBackup(roundTripThroughFile(backup), SCHEMA_VERSION)
    if (!verdict.ok) throw new Error(verdict.message)
    await importBackup(verdict.backup)

    for (const m of withCounts) {
      const after = await db.mastery.where('[profileId+kpId]').equals([profileId, m.kpId]).first()
      expect(after?.misconceptionCounts).toEqual(m.misconceptionCounts)
    }
  })
})

describe('导出内容边界', () => {
  it('⭐ 不导出静态表 —— 否则老备份会用旧内容覆盖新知识点', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    const keys = Object.keys(backup.data)
    expect(keys).not.toContain('knowledgePoints')
    expect(keys).not.toContain('items')
    expect(keys).not.toContain('itemTemplates')
    expect(keys).not.toContain('assetCache')
  })

  it('导入不动静态表，知识点仍然是本机 App 版本的那一份', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    await importBackup(backup)

    expect(await db.knowledgePoints.count()).toBe(KNOWLEDGE_POINTS.length)
  })

  it('⭐ 老备份缺少的新知识点，由 bootstrap 补齐掌握度记录', async () => {
    // 这是「不导出静态表」的真正收益：三个月前的备份导进内容更多的新版本，
    // 新增知识点该自动开出来，而不是让孩子少学一块
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    // 模拟老备份：抹掉两个知识点的掌握度记录
    const trimmed: BackupFile = {
      ...backup,
      data: { ...backup.data, mastery: backup.data.mastery.slice(0, -2) },
    }
    await importBackup(trimmed)
    expect(await db.mastery.count()).toBe(KNOWLEDGE_POINTS.length - 2)

    await bootstrap()

    expect(await db.mastery.count()).toBe(KNOWLEDGE_POINTS.length)
  })

  it('备份含 schemaVersion 与校验和', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    expect(backup.schemaVersion).toBe(SCHEMA_VERSION)
    expect(backup.format).toBe('smartlearning-backup')
    expect(backup.checksum).toMatch(/^fnv1a32:[0-9a-f]{8}$/)
  })

  it('stats 摘要不含宠物等级 —— 宠物红线：三只之间绝不比较', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    expect(backup.stats.petNames.length).toBeGreaterThan(0)
    expect(Object.keys(backup.stats)).not.toContain('petStage')
    expect(JSON.stringify(backup.stats)).not.toContain('exp')
  })
})

describe('导入的系统表处理', () => {
  it('⭐ 保留本机 installId，不被来源设备覆盖', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    // 模拟「从旧 iPad 导出的文件，导进新 iPad」
    const fromOtherDevice: BackupFile = { ...backup, installId: 'old-ipad-install-id' }
    const localInstallId = (await db.meta.get('installId'))?.value

    await importBackup(fromOtherDevice)

    expect((await db.meta.get('installId'))?.value).toBe(localInstallId)
  })

  it('导入后活跃档案指向备份里的档案', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)
    await db.meta.put({ key: 'activeProfileId', value: 'stale-id', updatedAt: nowIso() })

    const result = await importBackup(backup)

    expect(result.profileId).toBe(profileId)
    expect((await db.meta.get('activeProfileId'))?.value).toBe(profileId)
  })

  it('导入后不立刻催促备份', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    await importBackup(backup)

    expect(await lastExportAt()).toBe(backup.exportedAt)
  })

  it('markExported 只在真正保存成功后才更新时间', async () => {
    await seedUsedProfile()
    expect(await lastExportAt(), '从未导出过').toBeUndefined()

    await markExported()

    expect(await lastExportAt()).toBeDefined()
  })
})

describe('文件名', () => {
  it('带上档案名与日期，便于在文件 App 里分辨', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)

    expect(backupFileName(backup)).toMatch(/^智慧学习_.+_\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('剔除文件系统保留字符，避免 iOS 拒绝保存', async () => {
    const profileId = await seedUsedProfile()
    const backup = await buildBackup(profileId)
    const evil: BackupFile = { ...backup, stats: { ...backup.stats, profileName: 'a/b:c*?' } }

    expect(backupFileName(evil)).toContain('abc')
    expect(backupFileName(evil)).not.toMatch(/[\\/:*?"<>|]/)
  })
})
