/**
 * @file 家长区 · 数据备份页 —— 导出当前进度
 * @layer features
 * @see design/02-数据库Schema.md §4 导出/导入格式
 * @see design/04-部署与上机.md §6「备份功能缺失是当前最大的风险」
 *
 * 数据全部在 iPad 本地，清一次 Safari 数据、换一台设备，孩子几个月的进度就没了。
 * 这一页就是那道保险。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { backupFileName, buildBackup, lastExportAt, markExported } from '@/data/backup/buildBackup'
import { daysBetween, isoToLocalDate, nowIso } from '@/domain/time'
import { RestoreBackup } from '@/features/parent/RestoreBackup'
import { saveJsonFile } from '@/platform/share'
import { useSessionStore } from '@/stores/sessionStore'
import type { BackupFile, IsoDateTime } from '@/domain/types'

/** 超过这个天数没备份就提醒。见 design/02-数据库Schema.md §4.4 */
const REMIND_AFTER_DAYS = 7

export function Backup() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const [backup, setBackup] = useState<BackupFile | null>(null)
  const [lastExport, setLastExport] = useState<IsoDateTime | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // ⚠️ 进页面就把备份内容准备好，不等到点击时再读数据库。
  // iOS 只在用户手势的短暂窗口内允许调起分享面板，
  // 点击后再 await 一次全表读取，窗口会过期，表现为「点了没反应」。
  useEffect(() => {
    if (profileId === null) return
    void buildBackup(profileId).then(setBackup)
    void lastExportAt().then(setLastExport)
  }, [profileId])

  const handleSave = async () => {
    if (backup === null) return
    setSaving(true)
    setMessage(null)
    try {
      const outcome = await saveJsonFile(backupFileName(backup), JSON.stringify(backup))
      if (outcome === 'cancelled') {
        setMessage('已取消，没有保存。')
        return
      }
      // 只有真正保存成功才更新时间，否则家长会以为存好了，而实际什么都没有
      await markExported()
      setLastExport(await lastExportAt())
      setMessage(outcome === 'shared' ? '已保存 ✅' : '已下载到「文件」App ✅')
    } catch (error) {
      setMessage(error instanceof Error ? `保存失败：${error.message}` : '保存失败。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="safe-area h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">数据备份</h1>
          <BigButton tone="neutral" className="px-5 py-3 text-base" onClick={() => navigate('/')}>
            回主页
          </BigButton>
        </header>

        <ProgressSummary backup={backup} />
        <ExportReminder lastExport={lastExport} />

        <BigButton
          tone="primary"
          fullWidth
          className="py-5 text-xl"
          disabled={backup === null || saving}
          onClick={() => void handleSave()}
        >
          {saving ? '保存中…' : '💾 保存进度到文件'}
        </BigButton>

        {message !== null && <p className="text-center text-base text-ink/60">{message}</p>}

        <p className="text-sm leading-relaxed text-ink/40">
          文件里只有孩子的学习记录，不含题库。把它 AirDrop 到新 iPad 或存进 iCloud
          Drive，换设备时就能完整恢复。
        </p>

        <hr className="border-ink/10" />

        <RestoreBackup />
      </div>
    </div>
  )
}

/** 当前进度摘要，让家长确认「要保存的确实是这份数据」 */
function ProgressSummary({ backup }: { backup: BackupFile | null }) {
  if (backup === null) {
    return <div className="rounded-blob bg-white/60 p-5 text-base text-ink/40">读取中…</div>
  }

  const { stats } = backup
  return (
    <div className="flex flex-col gap-2 rounded-blob bg-white p-5 shadow-[0_4px_0_#E8DFCC]">
      <Row label="已做题目" value={`${stats.totalAttempts} 题`} />
      <Row label="已掌握知识点" value={`${stats.masteredCount} 个`} />
      <Row
        label="最后学习"
        value={
          stats.lastAttemptAt === undefined ? '还没开始' : isoToLocalDate(stats.lastAttemptAt)
        }
      />
      {/* ⚠️ 只列名字，不列等级 —— 三只宠物之间绝不比较（CLAUDE.md 宠物红线 3） */}
      {stats.petNames.length > 0 && <Row label="伙伴" value={stats.petNames.join(' · ')} />}
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

/**
 * 备份提醒。
 *
 * 措辞刻意保持中性（「建议保存一下」），不用「危险」「警告」这类词——
 * 家长区虽然孩子进不来，但屏幕是同一块，吓人的红字没有必要。
 */
function ExportReminder({ lastExport }: { lastExport: IsoDateTime | undefined }) {
  if (lastExport === undefined) {
    return (
      <p className="rounded-blob bg-honey/15 px-5 py-3 text-base text-ink/70">
        还没有备份过。建议现在保存一份，以后每周一次。
      </p>
    )
  }

  const days = daysBetween(lastExport, nowIso())
  if (days < REMIND_AFTER_DAYS) {
    return (
      <p className="px-1 text-base text-ink/50">
        上次备份：{isoToLocalDate(lastExport)}
        {days === 0 ? '（今天）' : `（${days} 天前）`}
      </p>
    )
  }

  return (
    <p className="rounded-blob bg-honey/15 px-5 py-3 text-base text-ink/70">
      距离上次备份已经 {days} 天了，建议保存一下。
    </p>
  )
}
