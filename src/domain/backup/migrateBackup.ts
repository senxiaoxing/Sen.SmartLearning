/**
 * @file 备份文件版本迁移 —— 让老备份能导入到新版本 App
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §5 迁移机制
 * @see src/data/db.ts  数据库侧的 `version(n)` 迁移，两者必须成对出现
 *
 * ⚠️ 每次改 `SCHEMA_VERSION`（即每次改表结构）都必须同时在这里补一条迁移，
 * 否则孩子上个月导出的备份在新版本 App 上会被直接拒绝，
 * 而备份的全部意义就是「换设备/清了数据还能回来」。
 */

import type { BackupFile } from '@/domain/types'

/**
 * 一步迁移：把 schemaVersion 为 `n` 的备份升级为 `n+1`。
 *
 * 必须是纯函数，不修改入参——迁移失败时调用方要能拿回原始对象重试或报错。
 */
export type BackupMigration = (backup: BackupFile) => BackupFile

/**
 * 迁移表。键是**源版本**，值把它升一级。
 *
 * ⭐ 现在是空表，这是正确的，不是漏写：
 * 备份功能本身是在 `SCHEMA_VERSION === 3` 时才上线的，
 * 世界上不存在 schemaVersion 为 1 或 2 的备份文件。第一条会是 `3: migrate3to4`。
 *
 * @example
 * // 将来加 v4（比如宠物表加字段）时这样写：
 * // export const BACKUP_MIGRATIONS = {
 * //   3: (b) => ({
 * //     ...b,
 * //     schemaVersion: 4,
 * //     data: { ...b.data, petState: b.data.petState.map((p) => ({ ...p, mood: 'happy' })) },
 * //   }),
 * // }
 */
export const BACKUP_MIGRATIONS: Readonly<Record<number, BackupMigration>> = {}

/**
 * 把备份逐级升到目标版本。
 *
 * 逐级而非一步到位：`1 → 2 → 3` 三次小迁移各自可读可测，
 * 写成一个 `1 → 3` 的大函数会在第四版出现时变成组合爆炸。
 *
 * @param backup - 待升级的备份，必须已通过结构校验
 * @param targetVersion - 目标版本，通常是当前的 `SCHEMA_VERSION`
 * @returns 升级后的新对象；本就是目标版本时原样返回
 *
 * @throws 迁移链中缺少某一级时抛错。**绝不静默跳过**——
 *         跳过意味着把缺字段的记录写进数据库，之后表现为「宠物等级莫名归零」
 *         这类难以定位的故障，而报错至少能让家长知道该更新 App。
 *
 * @example
 * applyBackupMigrations(oldBackup, 3)   // v1 备份 → 依次跑 1→2、2→3
 */
export function applyBackupMigrations(backup: BackupFile, targetVersion: number): BackupFile {
  let current = backup

  while (current.schemaVersion < targetVersion) {
    const migrate = BACKUP_MIGRATIONS[current.schemaVersion]
    if (migrate === undefined) {
      throw new Error(
        `缺少备份迁移 v${current.schemaVersion} → v${current.schemaVersion + 1}，无法导入`,
      )
    }

    const next = migrate(current)
    // 迁移函数忘记递增版本号会导致死循环，这里直接兜住
    if (next.schemaVersion <= current.schemaVersion) {
      throw new Error(`备份迁移 v${current.schemaVersion} 未递增 schemaVersion`)
    }
    current = next
  }

  return current
}
