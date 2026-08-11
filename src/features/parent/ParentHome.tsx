/**
 * @file 家长区首页 —— 报告 · 错题本 · 备份的入口
 * @layer features
 * @see design/03-技术方案.md §4.6 家长门禁
 *
 * 家长区在门禁之后，受众是成年人，因此这里**不受**孩子端那套约束限制：
 * 可以用文字、可以有多层、不需要朗读。
 */

import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { useParentGateStore } from '@/stores/parentGateStore'

interface Entry {
  to: string
  icon: string
  title: string
  desc: string
}

const ENTRIES: Entry[] = [
  {
    to: '/parent/report',
    icon: '📊',
    title: '学习报告',
    desc: '三科分别的进度、专注时长，以及她具体卡在哪里',
  },
  {
    to: '/parent/wrong',
    icon: '📕',
    title: '错题本',
    desc: '最近错过、而且还没改对的题',
  },
  {
    to: '/parent/backup',
    icon: '💾',
    title: '数据备份',
    desc: '导出与恢复进度。换设备、清数据前务必先存一份',
  },
]

export function ParentHome() {
  const navigate = useNavigate()
  const lock = useParentGateStore((s) => s.lock)

  /** 离开家长区就收回通行证，避免孩子随后点进来直接进入 */
  const leave = () => {
    lock()
    navigate('/')
  }

  return (
    <div className="safe-area h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">家长区</h1>
          <BigButton tone="neutral" className="px-5 py-3 text-base" onClick={leave}>
            回主页
          </BigButton>
        </header>

        <div className="flex flex-col gap-4">
          {ENTRIES.map((entry) => (
            <button
              key={entry.to}
              type="button"
              onClick={() => navigate(entry.to)}
              className="flex items-center gap-4 rounded-blob bg-white p-5 text-left shadow-[0_4px_0_#E8DFCC] active:translate-y-1 active:shadow-none"
            >
              <span className="text-4xl" aria-hidden>
                {entry.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold">{entry.title}</span>
                <span className="text-sm leading-relaxed text-ink/50">{entry.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
