/**
 * @file 「添加到主屏幕」引导 —— 面向家长的一次性提示
 * @layer features
 * @see src/platform/install.ts 为什么这一步关系到数据安全
 *
 * 文案刻意写给**家长**看而不是孩子：这一步孩子做不了，
 * 而且必须让家长明白不做的后果——Safari 会在 7 天不访问后清掉学习数据，
 * 而已添加到主屏幕的 PWA 不受此限制。
 */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { shouldPromptInstall } from '@/platform/install'

/** 本次会话内已关闭的标记。刻意不写入 localStorage —— */
/** 这个提示重要到应该每次冷启动都再提醒一次，直到真的装好为止 */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !shouldPromptInstall()) return null

  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.6 }}
      className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-blob bg-surface/95 p-5 shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <Icon name="share" className="h-7 w-7 shrink-0 text-primary" />
        <div className="flex-1 text-left">
          <p className="text-base font-bold text-ink">建议添加到主屏幕</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            点击底部 <ShareGlyph /> 分享按钮 → 选择「添加到主屏幕」。
            <br />
            <span className="text-alert">
              不添加的话，Safari 可能在 7 天后清除学习进度。
            </span>
          </p>
        </div>
        <button
          type="button"
          aria-label="知道了"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full px-3 py-1 text-sm text-ink/40"
        >
          稍后
        </button>
      </div>
    </motion.aside>
  )
}

/** iOS 分享按钮的图形，帮家长在工具栏里认出它 */
function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block h-4 w-4 -translate-y-px text-info"
      aria-label="分享"
    >
      <path
        d="M12 3v12M12 3 8 7M12 3l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12H5v8h14v-8h-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
