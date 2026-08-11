/**
 * @file 家长留言 —— 首页上那封「有人给你留了话」
 * @layer features
 * @see src/features/parent/MessageSetting.tsx  家长在哪里写
 * @see src/domain/types.ts  `ParentMessage`
 *
 * ⭐ 全 App 唯一由**另一个人**产生的内容。
 * 它把 App 从「一个人练」变成「有人在看着我」——
 * 而这件事不需要联网，爸妈用的本来就是同一台 iPad。
 *
 * ## 为什么必须点一下才念
 *
 * iOS 不允许没有用户手势的自动播放，首页在按下任何按钮之前音频通道是锁着的。
 * 与其做一个「看起来会自己念、实际上静音」的卡片，
 * 不如把它做成一个明确要点的信封——顺带那一下点击就把音频解锁了。
 *
 * 孩子不识字，所以卡片上真正起作用的是**信封图标和它在动**，不是那行字。
 */

import { motion } from 'framer-motion'
import { Icon } from '@/components/Icon'
import type { ParentMessage } from '@/domain/types'

interface ParentMessageCardProps {
  message: ParentMessage
  /** 点击时朗读。⚠️ 实现方必须先在这个同步栈里解锁 iOS 音频 */
  onPlay: () => void
}

/**
 * 首页的留言卡片。
 *
 * @param message - 家长留言。`readAt` 为空时是「新留言」，卡片会一直轻轻晃
 *
 * @example
 * <ParentMessageCard message={message} onPlay={play} />
 */
export function ParentMessageCard({ message, onPlay }: ParentMessageCardProps) {
  const unread = message.readAt === undefined

  return (
    <motion.button
      type="button"
      onClick={onPlay}
      aria-label={`听爸爸妈妈的留言：${message.text}`}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={[
        'flex min-h-touch max-w-md items-center gap-3 rounded-blob px-6 py-4 text-left',
        'active:translate-y-1',
        unread ? 'bg-accent/20 shadow-card' : 'bg-surface/60',
      ].join(' ')}
    >
      {/* 新留言时信封一直轻轻晃 —— 她不识字，动起来的东西才会被点开。
          ⚠️ 只动 rotate/scale（GPU 合成属性），不碰布局属性 */}
      <motion.span
        animate={unread ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
        transition={unread ? { repeat: Infinity, repeatDelay: 1.6, duration: 0.6 } : undefined}
        className="shrink-0"
      >
        <Icon name="mail" className={`h-8 w-8 ${unread ? 'text-accent' : 'text-ink/35'}`} />
      </motion.span>

      <span className="flex min-w-0 flex-col">
        <span className={`text-base font-bold ${unread ? 'text-ink' : 'text-ink/50'}`}>
          {unread ? '爸爸妈妈给你留了话' : '再听一遍留言'}
        </span>
        {/* 这行字是给家长看的（确认写进去了），孩子只认上面那个信封 */}
        <span className="truncate text-sm text-ink/45">{message.text}</span>
      </span>
    </motion.button>
  )
}
