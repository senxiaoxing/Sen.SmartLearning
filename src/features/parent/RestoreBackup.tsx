/**
 * @file 家长区 · 从备份文件恢复
 * @layer features
 * @see design/02-数据库Schema.md §4.3 导入策略
 * @see src/features/parent/RestoreConfirmCard.tsx  中间那步确认卡
 *
 * 恢复是**整个 App 里唯一会销毁数据的操作**，因此流程刻意做成三步：
 * ```
 * 选文件 → 展示这份文件里是什么（题数/日期/伙伴）→ 家长确认 → 覆盖
 * ```
 *
 * ## ⭐ 为什么 `<input>` 常驻在 JSX 里，而不是点击时动态创建
 *
 * 旧实现把 input 临时插进 DOM，并额外监听 `window.focus` 来判断
 * 「家长是不是取消了选择」。那是一次**灾难性的误判**：
 * iPad 的文件选择器是浮动面板，宿主页面并不真正失去焦点，
 * 面板弹出的那一刻 window 就可能收到 focus，于是 500ms 后
 * 代码认定「取消了」，把界面退回初始态并注销掉 change 监听——
 * 家长随后真的选中了文件，那个事件却已经没人接了。
 *
 * 表现就是**点了选择备份、选完文件、回来什么都没发生**，而且重试多少次都一样：
 * 孩子几百道题的唯一一条找回路径，静默失败且不留任何痕迹。
 *
 * 现在只认 `change` 这一个可靠信号。**取消不需要被检测**——
 * 没选文件就什么都不发生，按钮一直可用，这是天然正确的行为。
 */

import { useRef, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { importBackup } from '@/data/backup/importBackup'
import { bootstrap } from '@/data/bootstrap'
import { SCHEMA_VERSION } from '@/data/db'
import { validateBackup, type BackupVerdict } from '@/domain/backup/validateBackup'
import { RestoreConfirmCard } from '@/features/parent/RestoreConfirmCard'
import type { BackupFile } from '@/domain/types'

type Phase =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'confirm'; backup: BackupFile; checksumMatched: boolean; migratedFrom?: number }
  | { step: 'error'; message: string }
  | { step: 'importing' }
  | { step: 'done'; attempts: number }

export function RestoreBackup() {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setPhase({ step: 'reading' })

    let text: string
    try {
      text = await file.text()
    } catch {
      // iCloud Drive 里的文件在本机可能只是个占位符。这在「换了设备、
      // 刚把备份从 iCloud 找回来」的场景里极其常见，必须说清楚怎么办
      setPhase({
        step: 'error',
        message:
          '这个文件读不出来。如果它存在 iCloud 里，请先到「文件」App 里点开它、等下载完成，再回来选一次。',
      })
      return
    }

    try {
      setPhase(toPhase(validateBackup(JSON.parse(text), SCHEMA_VERSION)))
    } catch {
      setPhase({ step: 'error', message: '这个文件不是有效的备份，请确认选的是备份的 .json 文件。' })
    }
  }

  const handleConfirm = async (backup: BackupFile) => {
    setPhase({ step: 'importing' })
    try {
      const result = await importBackup(backup)
      // 备份里没有的新知识点在这里补齐 —— 老备份导进新版本的关键一步
      await bootstrap()
      // ⭐ 先把结果给家长看，由他点一下再刷新。恢复是他最紧张的一步操作，
      //    直接 reload 会让「到底成没成」只能靠自己翻页面去猜
      setPhase({ step: 'done', attempts: result.restored.attempts })
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
      <RestoreConfirmCard
        backup={phase.backup}
        checksumMatched={phase.checksumMatched}
        migratedFrom={phase.migratedFrom}
        onCancel={() => setPhase({ step: 'idle' })}
        onConfirm={() => void handleConfirm(phase.backup)}
      />
    )
  }

  if (phase.step === 'done') {
    return <RestoreDone attempts={phase.attempts} />
  }

  const busy = phase.step === 'reading' || phase.step === 'importing'

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink/70">从备份恢复</h2>

      {phase.step === 'error' && (
        <p className="rounded-blob bg-alert/15 px-5 py-3 text-base leading-relaxed text-ink/70">
          {phase.message}
        </p>
      )}

      {/*
        ⚠️ 用 `sr-only` 而不是 `hidden` / `display:none`：
        iOS Safari 对完全不参与布局的 input 调 `.click()` 有过不弹出选择器的历史，
        而 sr-only 仍然占位（1×1 裁切），程序化点击一直可靠。
        ⚠️ `onChange` 里必须清空 value，否则**再选同一个文件不会触发 change**——
        家长第一次没成功、原样重选一遍时会以为按钮又坏了。
      */}
      <input
        ref={inputRef}
        type="file"
        // 同时给 MIME 和扩展名：iOS 的「文件」App 对 JSON 的 MIME 识别并不稳定，
        // 只写 application/json 会让备份文件显示为灰色不可选
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file !== undefined) void handleFile(file)
        }}
      />

      <BigButton
        tone="neutral"
        fullWidth
        className="py-5 text-xl"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {phase.step === 'reading' ? (
          '读取中…'
        ) : phase.step === 'importing' ? (
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

/**
 * 恢复成功后的回执。
 *
 * 报出**题数**而不是只说一句「成功」：家长要的确认是「孩子那几百道题回来了」，
 * 一个具体的数字才回答得了这个问题。
 */
function RestoreDone({ attempts }: { attempts: number }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-ink/70">恢复完成</h2>
      <div className="rounded-blob bg-surface p-5 text-base leading-relaxed text-ink/70 shadow-card">
        已经找回 <strong className="text-xl tabular-nums">{attempts}</strong> 道题的记录，
        以及对应的掌握度、积分和伙伴。
      </div>
      <BigButton
        tone="primary"
        fullWidth
        className="py-5 text-xl"
        // 内存里的 store 全是被覆盖前的数据，逐个刷新既繁琐又容易漏，整页重来最干净
        onClick={() => window.location.reload()}
      >
        知道了
      </BigButton>
    </div>
  )
}

function toPhase(verdict: BackupVerdict): Phase {
  if (!verdict.ok) return { step: 'error', message: verdict.message }
  return {
    step: 'confirm',
    backup: verdict.backup,
    checksumMatched: verdict.checksumMatched,
    ...(verdict.migratedFrom !== undefined && { migratedFrom: verdict.migratedFrom }),
  }
}
