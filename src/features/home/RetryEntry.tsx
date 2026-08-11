/**
 * @file 主页的「再练一练」入口 —— 错题订正的长期通道
 * @layer features
 * @see src/domain/report/wrongBook.ts  什么样的错题算「还没解决」
 *
 * ⭐ 为什么必须有这个按钮：
 * 小结页的「订正这 N 题」只在**那一轮的小结页**有效，孩子一旦点了「回到首页」，
 * 那些没订正的题就再也没有入口，只能等调度器碰巧又抽到同一道题。
 * 而 CLAUDE.md 的产品红线是「奖励过程：订正错题 +1 分」——
 * 没有第二次机会的话，这条承诺是空的。
 */

import { motion } from 'framer-motion'
import { Icon } from '@/components/Icon'

/**
 * 徽标上显示的数字上限。
 *
 * 超过就显示 `9+`。⚠️ 这不是排版洁癖：一个孩子看到「47」会觉得自己欠了一屁股债，
 * 而这个按钮的用意是邀请她再来一次，不是清算。
 * 温和原则同样适用于数字（CLAUDE.md「答错反馈要温和」）。
 */
const BADGE_MAX = 9

interface RetryEntryProps {
  /** 还没解决的错题数 */
  count: number
  onClick: () => void
}

export function RetryEntry({ count, onClick }: RetryEntryProps) {
  return (
    <motion.button
      type="button"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onClick}
      aria-label={`再练一练，还有 ${count} 道题`}
      className="relative flex min-h-touch items-center gap-3 rounded-blob bg-correct/20 px-8 py-4 active:translate-y-1"
    >
      <Icon name="retry" className="h-7 w-7 text-correct" />
      <span className="text-xl font-bold">再练一练</span>

      {/* 数量做成徽标而不是写进文案：「还有 5 道题要订正」读起来像催促，
          一个小圆点则更像游戏里的提示，做完会消失 */}
      <span
        aria-hidden
        className="flex h-7 min-w-7 items-center justify-center rounded-full bg-correct px-2 text-sm font-bold tabular-nums text-on-correct"
      >
        {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
      </span>
    </motion.button>
  )
}
