/**
 * @file 家长区 · 从备份文件恢复
 * @layer features
 * @see design/02-数据库Schema.md §4.3 导入策略
 *
 * 恢复是**整个 App 里唯一会销毁数据的操作**，因此流程刻意做成三步：
 * ```
 * 选文件 → 展示这份文件里是什么（题数/日期/伙伴）→ 家长确认 → 覆盖
 * ```
 * 中间那步不能省。设计文档 §4.3 把它列为防「导错文件」的主要手段——
 * 校验和只能告诉你文件完好，不能告诉你这是不是你要的那一份。
 */

import { useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { importBackup } from '@/data/backup/importBackup'
import { bootstrap } from '@/data/bootstrap'
import { SCHEMA_VERSION } from '@/data/db'
import { validateBackup, type BackupVerdict } from '@/domain/backup/validateBackup'
import { isoToLocalDate } from '@/domain/time'
import { pickJsonFile } from '@/platform/share'
import type { BackupFile } from '@/domain/types'

type Phase =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'confirm'; backup: BackupFile; checksumMatched: boolean }
  | { step: 'error'; message: string }
  | { step: 'importing' }

export function RestoreBackup() {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })

  const handlePick = async () => {
    setPhase({ step: 'reading' })
    try {
      const text = await pickJsonFile()
      if (text === null) {
        setPhase({ step: 'idle' })
        return
      }
      setPhase(toPhase(validateBackup(JSON.parse(text), SCHEMA_VERSION)))
    } catch {
      // JSON.parse 失败走这里：选了个不是 JSON 的文件
      setPhase({ step: 'error', message: '这个文件读不出来，请确认选的是备份的 .json 文件。' })
    }
  }

  const handleConfirm = async (backup: BackupFile) => {
    setPhase({ step: 'importing' })
    try {
      await importBackup(backup)
      // 备份里没有的新知识点在这里补齐 —— 老备份导进新版本的关键一步
      await bootstrap()
      // 内存里的 store 全是被覆盖前的数据，逐个刷新既繁琐又容易漏，整页重来最干净
      window.location.reload()
    } catch (error) {
      // 导入在单个 Dexie 事务里跑，失败时数据库已自动回滚到导入前
      setPhase({
        step: 'error',
        message: `恢复失败，原来的进度没有被改动。${error instanceof Error ? error.message : ''}`,
      })
    }
  }

  if (phase.step === 'confirm') {
    return (
      <ConfirmCard
        backup={phase.backup}
        checksumMatched={phase.checksumMatched}
        onCancel={() => setPhase({ step: 'idle' })}
        onConfirm={() => void handleConfirm(phase.backup)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink/70">从备份恢复</h2>

      {phase.step === 'error' && (
        <p className="rounded-blob bg-alert/15 px-5 py-3 text-base text-ink/70">{phase.message}</p>
      )}

      <BigButton
        tone="neutral"
        fullWidth
        className="py-5 text-xl"
        disabled={phase.step === 'reading' || phase.step === 'importing'}
        onClick={() => void handlePick()}
      >
        {phase.step === 'importing' ? (
          '恢复中…'
        ) : (
          <>
            <Icon name="folder" className="h-6 w-6" />
            选择备份文件
          </>
        )}
      </BigButton>

      <p className="text-sm leading-relaxed text-ink/40">
        恢复会用文件里的进度<strong className="text-ink/60">覆盖</strong>
        这台设备上现有的进度。建议先点上面的「保存进度到文件」留一份。
      </p>
    </div>
  )
}

function toPhase(verdict: BackupVerdict): Phase {
  if (!verdict.ok) return { step: 'error', message: verdict.message }
  return { step: 'confirm', backup: verdict.backup, checksumMatched: verdict.checksumMatched }
}

interface ConfirmCardProps {
  backup: BackupFile
  checksumMatched: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * 确认卡：把文件里的内容摊开给家长看，再问一次要不要覆盖。
 *
 * 展示的字段全部来自 `backup.stats`，⚠️ 其中刻意不含宠物等级——
 * 见 CLAUDE.md 宠物红线第 3 条。
 */
function ConfirmCard({ backup, checksumMatched, onCancel, onConfirm }: ConfirmCardProps) {
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
