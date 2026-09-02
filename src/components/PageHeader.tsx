/**
 * @file 页头 —— 返回键 + 标题 + 右侧插槽
 * @layer components  无业务逻辑
 * @see design/03-技术方案.md §5.1 「层级极浅，任何页面一键回主页」
 *
 * 之前答题页、宠物页、字母乐园各写了一遍返回键，几处的尺寸和配色都不一样。
 * 返回是孩子最常用的动作，长相必须完全一致——
 * 她认的是「左上角那个圆圈」这个位置记忆，不是箭头的形状。
 *
 * ⭐ 乐园那一层（首页 → 乐园 → 拼音）之后，返回要按两次才回得到首页，
 * 这条一致性因此更要紧：两次点的必须是同一个东西。
 */

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { playSfx } from '@/platform/audio'

interface PageHeaderProps {
  onBack: () => void
  /** 无障碍标签。答题页是「退出」，其余页面是「返回」 */
  backLabel?: string
  /** 退出用 ×，逐级返回用 ← */
  backIcon?: 'back' | 'close'
  title?: string
  /** 右侧插槽，撑满剩余空间。用于答题页的进度条 */
  children?: ReactNode
}

/**
 * 页面顶部栏。
 *
 * @param onBack - 返回回调。⚠️ 需要停止朗读的页面要自己在回调里调 `stopSpeech()`
 * @param children - 右侧内容，会占据标题之后的全部空间
 *
 * @example
 * <PageHeader onBack={() => navigate('/')} title="我的伙伴" />
 */
export function PageHeader({
  onBack,
  backLabel = '返回',
  backIcon = 'back',
  title,
  children,
}: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 sm:gap-4">
      <motion.button
        type="button"
        aria-label={backLabel}
        onClick={() => {
          playSfx('tap')
          onBack()
        }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-ink/55 shadow-card"
      >
        <Icon name={backIcon} className="h-6 w-6" />
      </motion.button>

      {title !== undefined && (
        <h1 className="shrink-0 text-2xl font-bold tracking-tight">{title}</h1>
      )}

      {children}
    </header>
  )
}
