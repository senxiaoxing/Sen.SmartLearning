/**
 * @file 备份导出 —— 把用户数据打包成一个可保存的 JSON 文件
 * @layer data  唯一接触 Dexie 的层
 * @see design/02-数据库Schema.md §4.1 导出结构、§4.2 导出实现
 * @see src/data/db.ts  `USER_DATA_TABLES` 定义了「什么算用户数据」
 *
 * ⚠️ **不导出静态表**（knowledgePoints / items / itemTemplates / assetCache）。
 * 它们由目标设备的 App 版本重建，这样三个月前的备份能导入到内容更多的新版本，
 * 而不是用旧内容把新知识点覆盖掉。
 */

import type { Table } from 'dexie'
import { APP_VERSION, CONTENT_VERSION, SCHEMA_VERSION, db } from '@/data/db'
import { checksumOf } from '@/domain/backup/checksum'
import { isoToLocalDate, nowIso } from '@/domain/time'
import type { BackupFile, IsoDateTime, Uuid } from '@/domain/types'

/** 文件名里最多保留多少个字符的档案名，避免超长名字撑爆文件系统限制 */
const NAME_MAX_LENGTH = 12

/**
 * 备份文件名前缀 —— App 的显示名。
 *
 * ⚠️ 这只是**文件名**，与备份文件内部的 `format: 'smartlearning-backup'` 无关。
 * 那个字段是数据格式标识，改名时**绝不能跟着改**：`validateBackup` 用它判断
 * 「这是不是本 App 的备份」，改了会让改名前导出的所有备份一律无法恢复。
 * 同理，早先叫「智慧学习_…json」的老备份换个名字照样能导入——
 * 校验看的是文件内容，不是文件名。
 */
const FILE_NAME_PREFIX = '希恩爱学习'

/**
 * 读出某档案的全部用户数据，打包成备份对象。
 *
 * @param profileId - 要备份的档案 ID
 * @returns 完整的备份对象，`checksum` 已算好
 *
 * @throws 档案或设置不存在时抛错——导出一份没有档案的备份毫无意义，
 *         而且导入时会在事务中途失败，不如在这里就停下
 *
 * @example
 * const backup = await buildBackup(profileId)
 * const json = JSON.stringify(backup)
 * // → 交给 platform/share.ts 保存或分享
 */
export async function buildBackup(profileId: Uuid): Promise<BackupFile> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) throw new Error(`档案不存在，无法导出备份：${profileId}`)

  const settings = await db.settings.get(profileId)
  if (settings === undefined) throw new Error(`档案设置不存在，无法导出备份：${profileId}`)

  // 每张用户表都有 profileId 索引（`dailyTasks` 靠 Dexie 的复合索引前缀虚拟索引），
  // 因此可以统一走索引查询而不必全表扫描
  const byProfile = <T>(table: Table<T, string>): Promise<T[]> =>
    table.where('profileId').equals(profileId).toArray()

  const [
    attempts,
    mastery,
    sessions,
    dailyTasks,
    petState,
    ledger,
    purchases,
    collections,
    achievements,
    assessments,
  ] = await Promise.all([
    byProfile(db.attempts),
    byProfile(db.mastery),
    byProfile(db.sessions),
    byProfile(db.dailyTasks),
    byProfile(db.petState),
    byProfile(db.ledger),
    byProfile(db.purchases),
    byProfile(db.collections),
    byProfile(db.achievements),
    byProfile(db.assessments),
  ])

  const data: BackupFile['data'] = {
    attempts,
    mastery,
    sessions,
    dailyTasks,
    petState,
    ledger,
    purchases,
    collections,
    achievements,
    assessments,
  }

  const installId = await db.meta.get('installId')

  return {
    format: 'smartlearning-backup',
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    contentVersion: CONTENT_VERSION,
    exportedAt: nowIso(),
    installId: typeof installId?.value === 'string' ? installId.value : 'unknown',
    profile,
    settings,
    data,
    stats: {
      totalAttempts: attempts.length,
      masteredCount: mastery.filter((m) => m.state === 'mastered').length,
      ...extremes(attempts.map((a) => a.createdAt)),
      profileName: profile.name,
      // ⚠️ 只取名字。附上等级就等于把三只宠物的进度并排列出来，
      //    违反 CLAUDE.md 宠物红线第 3 条「三只宠物之间绝不比较」。
      petNames: petState.map((p) => p.name),
    },
    checksum: checksumOf(data),
  }
}

/**
 * 取时间戳数组的首尾，供 stats 展示「从哪天学到哪天」。
 *
 * 不预先排序 attempts：一年四万条排序纯属浪费，一次线性扫描就够。
 */
function extremes(times: IsoDateTime[]): { firstAttemptAt?: IsoDateTime; lastAttemptAt?: IsoDateTime } {
  if (times.length === 0) return {}

  let min = times[0] as IsoDateTime
  let max = times[0] as IsoDateTime
  for (const t of times) {
    if (t < min) min = t
    if (t > max) max = t
  }
  return { firstAttemptAt: min, lastAttemptAt: max }
}

/**
 * 生成备份文件名。
 *
 * 带上档案名和导出日期，是为了让家长在「文件」App 里一眼认出哪份是哪份——
 * 十个 `backup.json` 堆在一起，恢复时只能靠猜。
 *
 * @example
 * backupFileName(backup)   // '希恩爱学习_小恩宝_2026-08-06.json'
 */
export function backupFileName(backup: BackupFile): string {
  // 去掉路径分隔符等文件系统保留字符，避免 iOS「文件」App 拒绝保存
  const safeName = backup.stats.profileName
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, NAME_MAX_LENGTH)

  const label = safeName.length > 0 ? safeName : '进度'
  return `${FILE_NAME_PREFIX}_${label}_${isoToLocalDate(backup.exportedAt)}.json`
}

/**
 * 记录「刚刚导出过」，用于 §4.4 的备份提醒机制。
 *
 * 单独一个函数而不是塞进 {@link buildBackup}：构建备份对象不等于备份成功，
 * 家长可能在 iOS 分享面板上点了取消。只有真正保存下去了才该更新这个时间。
 */
export async function markExported(now: IsoDateTime = nowIso()): Promise<void> {
  await db.meta.put({ key: 'lastExportAt', value: now, updatedAt: now })
}

/** 上次成功导出的时间，从未导出过则为 `undefined`。用于提醒家长备份。 */
export async function lastExportAt(): Promise<IsoDateTime | undefined> {
  const record = await db.meta.get('lastExportAt')
  return typeof record?.value === 'string' ? (record.value as IsoDateTime) : undefined
}
