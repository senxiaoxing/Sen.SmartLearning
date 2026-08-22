/**
 * @file 家长区首页 —— 报告 · 错题本 · 备份的入口
 * @layer features
 * @see design/03-技术方案.md §4.6 家长门禁
 *
 * 家长区在门禁之后，受众是成年人，因此这里**不受**孩子端那套约束限制：
 * 可以用文字、可以有多层、不需要朗读。
 */

import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { BirthdaySetting } from '@/features/parent/BirthdaySetting'
import { GradeSetting } from '@/features/parent/GradeSetting'
import { MessageSetting } from '@/features/parent/MessageSetting'
import { NicknameSetting } from '@/features/parent/NicknameSetting'
import { SkinPicker } from '@/features/parent/SkinPicker'
import { VersionCheck } from '@/features/parent/VersionCheck'
import { VoiceCacheCheck } from '@/features/parent/VoiceCacheCheck'
import { useParentGateStore } from '@/stores/parentGateStore'
import type { IconName } from '@/components/iconPaths'

interface Entry {
  to: string
  icon: IconName
  title: string
  desc: string
}

const ENTRIES: Entry[] = [
  {
    to: '/parent/report',
    icon: 'chart',
    title: '学习报告',
    desc: '三科分别的进度、专注时长，以及她具体卡在哪里',
  },
  {
    to: '/parent/wrong',
    icon: 'book',
    title: '错题本',
    desc: '最近错过、而且还没改对的题',
  },
  {
    to: '/parent/shop',
    icon: 'star',
    title: '奖励',
    desc: '待兑现的现实奖励、兑换记录，以及商店里上架什么',
  },
  {
    to: '/parent/backup',
    icon: 'save',
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
    <AppShell width="wide" layout="stack">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-4">
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
              className="flex items-center gap-4 rounded-blob bg-surface p-5 text-left shadow-card active:translate-y-1 active:shadow-none"
            >
              <Icon name={entry.icon} className="h-9 w-9 shrink-0 text-primary" />
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold">{entry.title}</span>
                <span className="text-sm leading-relaxed text-ink/50">{entry.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* 顺序按「多久用一次」排：留言可能天天写，昵称设一次管很久，
            生日一年一次，皮肤基本不动，两项自检只在装完/更新后跑一次。
            版本检查排在语音自检前面：先确认「版本对不对」，再谈「语音全不全」——
            版本都是旧的，查语音查的也是旧那版的语音 */}
        <MessageSetting />
        <NicknameSetting />
        <GradeSetting />
        <BirthdaySetting />
        <SkinPicker />
        <VersionCheck />
        <VoiceCacheCheck />
      </div>
    </AppShell>
  )
}
