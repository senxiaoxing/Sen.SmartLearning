/**
 * @file 备份导入 —— 用备份文件整体替换当前用户数据
 * @layer data  唯一接触 Dexie 的层
 * @see design/02-数据库Schema.md §4.3 导入策略
 * @see src/domain/backup/validateBackup.ts  导入前必须先过校验
 *
 * ⚠️ 调用本模块前**必须**先跑 `validateBackup()`。这里假定备份已校验通过，
 * 不再重复检查格式与版本——重复检查会让「到底哪一层负责拒绝」变得含糊。
 */

import { USER_DATA_TABLES, db, type UserDataTableName } from '@/data/db'
import { nowIso } from '@/domain/time'
import type { BackupFile, IsoDateTime, Uuid } from '@/domain/types'

export interface ImportResult {
  /** 导入后的活跃档案 ID。⚠️ 与导入前不同，调用方须据此重新加载全部状态 */
  profileId: Uuid
  /** 各表还原了多少条，用于导入后向家长确认「东西都回来了」 */
  restored: Record<UserDataTableName, number>
}

/**
 * 整体替换式导入：先清空全部用户表，再写入备份内容。
 *
 * **为什么是替换而不是合并**（见设计文档 §4.3）：合并要处理「两台设备各做了一部分」
 * 的冲突，需要按 UUID + updatedAt 逐条比对，逻辑复杂且**容易静默出错**——
 * 而备份场景里静默出错等于数据丢失，比直接报错糟糕得多。
 *
 * **回滚保障**：整个过程在**单个 Dexie 事务**里完成。任何一步抛错，
 * IndexedDB 会自动回滚，数据库停在导入前的状态，不会出现「清空了但没写进去」
 * 这种最坏情况。这比设计文档提的「导入前生成本地快照」更可靠，
 * 也避免了把一份 ~18MB 的快照存进正要被清空的那个数据库里
 * （快照和被保护的数据在同一个爆炸半径内，起不到保护作用）。
 *
 * ⚠️ 导入**不覆盖静态表**：知识点、题目模板由本机 App 版本提供。
 * 导入后请调用 `bootstrap()`，它会给备份里没有的新知识点补建掌握度记录，
 * 这正是「老备份能导入到内容更多的新版本」得以成立的原因。
 *
 * @param backup - 已通过 `validateBackup()` 且迁移到当前版本的备份
 * @returns 还原后的档案 ID 与各表条数
 *
 * @example
 * const verdict = validateBackup(JSON.parse(text), SCHEMA_VERSION)
 * if (!verdict.ok) return showError(verdict.message)
 * const result = await importBackup(verdict.backup)
 * await bootstrap()            // 补齐新版本新增的知识点
 * window.location.reload()     // 内存里的 store 全是旧数据，整页重来最干净
 */
export async function importBackup(backup: BackupFile): Promise<ImportResult> {
  const now = nowIso()
  const tables = [...USER_DATA_TABLES.map((name) => db.table(name)), db.meta]

  await db.transaction('rw', tables, async () => {
    // 顺序要紧：先全清再全写。若边清边写，某张表的旧记录会残留成孤儿数据
    // （比如上一个档案的 attempts 指向已不存在的 sessionId）。
    for (const name of USER_DATA_TABLES) {
      await db.table(name).clear()
    }

    await db.profiles.put(backup.profile)
    await db.settings.put(backup.settings)
    await db.attempts.bulkPut(backup.data.attempts)
    await db.mastery.bulkPut(backup.data.mastery)
    await db.sessions.bulkPut(backup.data.sessions)
    await db.dailyTasks.bulkPut(backup.data.dailyTasks)
    await db.petState.bulkPut(backup.data.petState)
    await db.ledger.bulkPut(backup.data.ledger)
    await db.collections.bulkPut(backup.data.collections)
    await db.achievements.bulkPut(backup.data.achievements)
    await db.assessments.bulkPut(backup.data.assessments)

    await writeMetaAfterImport(backup, now)
  })

  return { profileId: backup.profile.id, restored: countRestored(backup) }
}

/**
 * 导入后的系统表处理。
 *
 * ⭐ 关键取舍：**`installId` 保持本机原值，绝不用备份里的覆盖**。
 * 它标识「数据现在在哪台设备上」，用来源设备的 ID 覆盖之后，
 * 从新 iPad 导出的备份会声称自己来自旧 iPad，排查问题时会指向错误的方向。
 * 备份里的 `installId` 只是记录「这份数据从哪来」，读它就够了。
 */
async function writeMetaAfterImport(backup: BackupFile, now: IsoDateTime): Promise<void> {
  await db.meta.put({ key: 'activeProfileId', value: backup.profile.id, updatedAt: now })

  // 这批数据确实在 exportedAt 那一刻被备份过，沿用它可以避免刚导入完
  // 就跳出「你已经 7 天没备份了」的提醒——那只会让家长觉得功能坏了。
  await db.meta.put({ key: 'lastExportAt', value: backup.exportedAt, updatedAt: now })
}

function countRestored(backup: BackupFile): Record<UserDataTableName, number> {
  return {
    profiles: 1,
    settings: 1,
    attempts: backup.data.attempts.length,
    mastery: backup.data.mastery.length,
    sessions: backup.data.sessions.length,
    dailyTasks: backup.data.dailyTasks.length,
    petState: backup.data.petState.length,
    ledger: backup.data.ledger.length,
    collections: backup.data.collections.length,
    achievements: backup.data.achievements.length,
    assessments: backup.data.assessments.length,
  }
}
