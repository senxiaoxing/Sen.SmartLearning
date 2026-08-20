/**
 * @file 家长区 · 恢复前的确认卡 —— 把文件里的内容摊开给家长看，再问一次
 * @layer features
 * @see src/features/parent/RestoreBackup.tsx  使用者
 * @see design/02-数据库Schema.md §4.3 导入策略
 *
 * 这一步不能省。设计文档 §4.3 把它列为防「导错文件」的主要手段——
 * 校验和只能告诉你文件完好，不能告诉你这是不是你要的那一份。
 */

import { BigButton } from '@/components/BigButton'
import { isoToLocalDate } from '@/domain/time'
import type { BackupFile } from '@/domain/types'

interface RestoreConfirmCardProps {
  backup: BackupFile
  /** ⚠️ `false` 表示文件可能损坏，需要警告但仍允许继续 */
  checksumMatched: boolean
  /** 备份来自更低的 schema 版本时给出，用于告诉家长「老备份已自动升级」 */
  migratedFrom?: number
  onCancel: () => void
  onConfirm: () => void
}

/**
 * 恢复确认卡。
 *
 * 展示的字段全部来自 `backup.stats`，⚠️ 其中刻意不含宠物等级——
 * 见 CLAUDE.md 宠物红线第 3 条「三只宠物之间绝不比较」。
 *
 * @param backup - 已通过校验并迁移到当前版本的备份
 * @param migratedFrom - 原始 schema 版本。展示它是为了让家长在
 *                       「更新后进度没了」这种最慌的时刻，看到一句
 *                       「老版本的备份，已自动升级」——而不是自己猜文件还能不能用
 */
export function RestoreConfirmCard({
  backup,
  checksumMatched,
  migratedFrom,
  onCancel,
  onConfirm,
}: RestoreConfirmCardProps) {
  const { stats } = backup

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-ink/70">确认恢复这份备份？</h2>

      <div className="flex flex-col gap-2 rounded-blob bg-surface p-5 shadow-card">
        <Row label="档案" value={stats.profileName} />
        <Row label="已做题目" value={`${stats.totalAttempts} 题`} />
        <Row label="已掌握知识点" value={`${stats.masteredCount} 个`} />
        <Row
          label="最后学习"
          value={stats.lastAttemptAt === undefined ? '无记录' : isoToLocalDate(stats.lastAttemptAt)}
        />
        <Row label="备份时间" value={isoToLocalDate(backup.exportedAt)} />
        {stats.petNames.length > 0 && <Row label="伙伴" value={stats.petNames.join(' · ')} />}
      </div>

      {migratedFrom !== undefined && (
        <p className="rounded-blob bg-surface/60 px-5 py-3 text-base text-ink/60">
          这是旧版本（v{migratedFrom}）导出的备份，已自动升级到当前版本，可以正常恢复。
        </p>
      )}

      {!checksumMatched && (
        // 校验和不匹配只警告不拦——孩子可能只剩这一份备份，
        // 把它挡在门外比让家长承担一点风险更糟
        <p className="rounded-blob bg-primary/15 px-5 py-3 text-base text-ink/70">
          ⚠️ 这个文件的校验和对不上，可能在传输中损坏了。上面的信息看着对的话可以继续，
          恢复后请检查一下进度是否完整。
        </p>
      )}

      <p className="text-base text-ink/60">
        继续将用这份数据覆盖当前设备上的全部学习进度，无法撤销。
      </p>

      <div className="flex gap-3">
        <BigButton tone="neutral" fullWidth className="py-4 text-lg" onClick={onCancel}>
          取消
        </BigButton>
        <BigButton tone="primary" fullWidth className="py-4 text-lg" onClick={onConfirm}>
          确认恢复
        </BigButton>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-base text-ink/50">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  )
}
