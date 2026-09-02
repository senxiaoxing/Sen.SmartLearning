/**
 * @file 首页提醒行 —— 家长留言 · 再练一练
 * @layer features
 * @see src/features/home/ParentMessageCard.tsx  留言卡片本身
 * @see src/features/home/RetryEntry.tsx  错题订正入口本身
 *
 * ## 为什么把这两个并成一行
 *
 * 它们性质相同：**偶发、可选、带一个「有东西等着你」的提示**。
 * 各占一整行时，两个都在的场合会把下面的门推出第一屏，
 * 而它们本身并不是主线——她想先做题就该先做题，信一直在那儿。
 *
 * 并排之后，这一块的高度是 0 或者一行，不会是两行。
 *
 * ## ⚠️ 留言为什么没有挪到右上角
 *
 * 右上角是 {@link ParentEntry} 的**不可见**长按热区。在它下面放一个一直在晃的
 * 信封，等于给隐藏入口画了个箭头——孩子会往那一片戳，长按满三秒是迟早的事。
 * 而那个入口的整个设计前提就是「那里看起来什么都没有」。
 */

import { ParentMessageCard } from '@/features/home/ParentMessageCard'
import { RetryEntry } from '@/features/home/RetryEntry'
import type { ParentMessage } from '@/domain/types'

interface HomeNoticesProps {
  /** 家长留言。没有留言时为 `undefined` */
  message: ParentMessage | undefined
  /** 朗读留言。⚠️ 实现方必须先在这个同步栈里解锁 iOS 音频 */
  onPlayMessage: () => void
  /** 还没解决的错题数。0 时不显示「再练一练」 */
  pendingRetry: number
  onRetry: () => void
}

/**
 * 首页那一行提醒。两个都没有时整个不渲染（不留空位）。
 *
 * @example
 * <HomeNotices
 *   message={parentMessage}
 *   onPlayMessage={playMessage}
 *   pendingRetry={3}
 *   onRetry={beginRetry}
 * />
 */
export function HomeNotices({
  message,
  onPlayMessage,
  pendingRetry,
  onRetry,
}: HomeNoticesProps) {
  const showRetry = pendingRetry > 0

  // 空行比没有行更让人觉得「今天还欠着」——同 HomeCompanion 的判断
  if (message === undefined && !showRetry) return null

  return (
    // 换行居中：两个都在时手机上排不下一行，让它自然折成两行，
    // 而不是把卡片压窄 —— 触控区不能低于 88pt
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {message !== undefined && (
        <ParentMessageCard message={message} onPlay={onPlayMessage} />
      )}
      {showRetry && <RetryEntry count={pendingRetry} onClick={onRetry} />}
    </div>
  )
}
