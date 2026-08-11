/**
 * @file 儿童尺寸按钮 —— 全项目所有可点击元素的基础
 * @layer components  无业务逻辑
 * @see design/03-技术方案.md §5.1 一年级孩子不识字
 *
 * 触控目标最小 88×88pt，远大于成人界面的 44pt。
 * 一年级孩子手指control精度差，小按钮会导致大量误触，
 * 而误触在答题场景里会被记成「答错」，直接污染掌握度数据。
 */

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { playSfx } from '@/platform/audio'

export type BigButtonTone = 'primary' | 'neutral' | 'correct' | 'wrong'

const TONE_CLASS: Record<BigButtonTone, string> = {
  primary: 'bg-honey text-white shadow-[0_6px_0_#E09A2E]',
  neutral: 'bg-white text-ink shadow-[0_6px_0_#E8DFCC]',
  correct: 'bg-mint text-white shadow-[0_6px_0_#3FB185]',
  wrong: 'bg-coral text-white shadow-[0_6px_0_#E05F50]',
}

interface BigButtonProps {
  children: ReactNode
  onClick?: () => void
  tone?: BigButtonTone
  disabled?: boolean
  /** 撑满容器宽度，用于主操作按钮 */
  fullWidth?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * 大号圆角按钮，带按压下沉动效。
 *
 * 动效只用 `scale` 与 `y`（GPU 合成属性），不碰 width/height，保证 iPad 上 60fps。
 *
 * @param tone - 配色语义。`correct`/`wrong` 用于答题反馈
 * @param ariaLabel - 无障碍标签。按钮内容为纯图形时必填
 *
 * @example
 * <BigButton tone="primary" onClick={start}>开始学习</BigButton>
 */
export function BigButton({
  children,
  onClick,
  tone = 'neutral',
  disabled = false,
  fullWidth = false,
  className = '',
  ariaLabel,
}: BigButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        // 每次交互必有「视觉 + 音效」双反馈（design/03 §5.2）。
        // 放在这里而不是各个调用点：全 App 的按钮都走 BigButton，
        // 一处接线就覆盖全部，也不会有人漏掉。
        playSfx('tap')
        onClick?.()
      }}
      whileTap={disabled ? undefined : { scale: 0.96, y: 4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        'min-h-touch min-w-touch rounded-blob px-6 py-4',
        'text-2xl font-bold tracking-wide',
        'flex items-center justify-center gap-2',
        'transition-opacity disabled:opacity-40',
        TONE_CLASS[tone],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.button>
  )
}
