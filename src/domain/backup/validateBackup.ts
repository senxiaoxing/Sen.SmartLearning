/**
 * @file 备份文件校验 —— 导入前判断这份文件能不能用
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §4.3 导入策略
 *
 * 判定顺序（任一步失败即拒绝，不继续往下走）：
 * ```
 * 是 JSON 对象吗 → format 对吗 → 版本能处理吗 → 结构完整吗 → 校验和对吗
 * ```
 * 只有最后一步失败是**警告**而非拒绝：校验和不匹配意味着「可能损坏」，
 * 但孩子的备份可能只有这一份，必须留一条强制导入的路。
 */

import { applyBackupMigrations } from '@/domain/backup/migrateBackup'
import { checksumMatches } from '@/domain/backup/checksum'
import type { BackupFile } from '@/domain/types'

/** 备份文件里必须存在的数据表，缺一即视为结构损坏 */
const REQUIRED_DATA_TABLES = [
  'attempts',
  'mastery',
  'sessions',
  'dailyTasks',
  'petState',
  'ledger',
  'collections',
  'achievements',
  'assessments',
] as const

export type BackupRejectReason =
  /** 根本不是 JSON 对象 */
  | 'not_an_object'
  /** 是 JSON，但不是本 App 的备份（选错文件了） */
  | 'wrong_format'
  /** 备份版本高于当前 App，降级导入会丢字段 */
  | 'schema_too_new'
  /** 缺字段、类型不对，或缺少迁移链 */
  | 'malformed'

export interface BackupAccepted {
  ok: true
  /** 已迁移到当前版本的备份 */
  backup: BackupFile
  /** ⚠️ `false` 表示文件可能损坏。UI 须警告，但仍允许家长选择强制导入 */
  checksumMatched: boolean
  /** 原始版本低于当前版本时给出，UI 可提示「已从旧版本升级」 */
  migratedFrom?: number
}

export interface BackupRejected {
  ok: false
  reason: BackupRejectReason
  /** 直接展示给家长的中文说明 */
  message: string
}

export type BackupVerdict = BackupAccepted | BackupRejected

function reject(reason: BackupRejectReason, message: string): BackupRejected {
  return { ok: false, reason, message }
}

/**
 * 校验并归一化一份备份文件。
 *
 * @param raw - `JSON.parse` 的结果，来源不可信，因此按 `unknown` 处理
 * @param currentSchemaVersion - 当前 App 的 `SCHEMA_VERSION`
 *
 * @example
 * const verdict = validateBackup(JSON.parse(text), SCHEMA_VERSION)
 * if (!verdict.ok) return showError(verdict.message)
 * if (!verdict.checksumMatched) await confirmDamagedFile()
 * await importBackup(verdict.backup)
 */
export function validateBackup(raw: unknown, currentSchemaVersion: number): BackupVerdict {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return reject('not_an_object', '这个文件不是备份文件，请选择以 .json 结尾的备份。')
  }

  const candidate = raw as Partial<BackupFile>

  // ⚠️ `'smartlearning-backup'` 是数据格式标识，与 App 显示名无关，
  //    App 改名时**不能**跟着改——改了会让改名前导出的备份全部无法恢复。
  if (candidate.format !== 'smartlearning-backup') {
    return reject('wrong_format', '这不是「希恩爱学习」的备份文件，换一个文件试试。')
  }

  if (typeof candidate.schemaVersion !== 'number' || !Number.isInteger(candidate.schemaVersion)) {
    return reject('malformed', '备份文件缺少版本号，可能已损坏。')
  }

  // ⛔ 绝不降级导入：新版本可能加了字段，用老代码读会把这些字段丢掉，
  //    而丢掉之后再导出，数据就永久少了一块。
  if (candidate.schemaVersion > currentSchemaVersion) {
    return reject(
      'schema_too_new',
      `这份备份来自更新版本的 App（v${candidate.schemaVersion}），请先把 App 更新到最新版再导入。`,
    )
  }

  const structural = checkStructure(candidate)
  if (structural !== null) return reject('malformed', structural)

  const originalVersion = candidate.schemaVersion
  let backup: BackupFile
  try {
    backup = applyBackupMigrations(candidate as BackupFile, currentSchemaVersion)
  } catch (error) {
    return reject('malformed', error instanceof Error ? error.message : '备份升级失败。')
  }

  return {
    ok: true,
    backup,
    checksumMatched:
      typeof candidate.checksum === 'string' && checksumMatches(backup.data, candidate.checksum),
    ...(originalVersion < currentSchemaVersion && { migratedFrom: originalVersion }),
  }
}

/**
 * 结构完整性检查。返回 `null` 表示通过，否则返回给家长看的错误说明。
 *
 * 只查「形状」不查每条记录的字段：40000 条 attempts 逐条校验既慢又没有额外收益——
 * 备份文件来自本 App 自己的导出，现实中的损坏是截断和编码错乱，
 * 这两种都会被 checksum 抓到，而「选错了别的 JSON 文件」会被这里的形状检查抓到。
 */
function checkStructure(candidate: Partial<BackupFile>): string | null {
  if (typeof candidate.profile !== 'object' || candidate.profile === null) {
    return '备份文件缺少档案信息，可能已损坏。'
  }
  if (typeof candidate.profile.id !== 'string' || candidate.profile.id.length === 0) {
    return '备份文件的档案 ID 无效，可能已损坏。'
  }
  if (typeof candidate.settings !== 'object' || candidate.settings === null) {
    return '备份文件缺少设置信息，可能已损坏。'
  }
  if (typeof candidate.data !== 'object' || candidate.data === null) {
    return '备份文件缺少学习数据，可能已损坏。'
  }

  const data = candidate.data as Record<string, unknown>
  const missing = REQUIRED_DATA_TABLES.filter((name) => !Array.isArray(data[name]))
  if (missing.length > 0) {
    return `备份文件缺少数据：${missing.join('、')}，可能已损坏。`
  }

  return null
}
