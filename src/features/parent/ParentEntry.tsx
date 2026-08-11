/**
 * @file 家长区入口 —— 主页右上角的长按热区
 * @layer features
 * @see design/03-技术方案.md §4.6 家长门禁
 *
 * 入口本身也是门禁的一部分：**没有可见按钮**。
 * 孩子不会去长按一块看不出是按钮的地方，而家长知道就在这里。
 * 长按之后还有一道算术题（{@link ParentGate}），两层加起来足够挡住一年级。
 */

import { useRef } from 'react'

/** 长按多久算触发。3 秒足够避免误触，又不至于让家长以为坏了 */
const HOLD_MS = 3000

interface ParentEntryProps {
  onEnter: () => void
}

/**
 * 右上角不可见的长按热区。
 *
 * 触控目标做成 88×88pt —— 虽然不希望孩子点到，但家长也是用手指，
 * 太小会按不准反复失败。
 *
 * @param onEnter - 长按满 3 秒后调用
 *
 * @example
 * <ParentEntry onEnter={() => navigate('/parent')} />
 */
export function ParentEntry({ onEnter }: ParentEntryProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const start = () => {
    cancel()
    timer.current = setTimeout(() => {
      timer.current = null
      onEnter()
    }, HOLD_MS)
  }

  return (
    <button
      type="button"
      // 孩子不识字，读屏文本对她没有意义；家长用得上
      aria-label="家长区，长按三秒"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      // 阻止 iOS 长按弹出「拷贝/查询」菜单打断计时
      onContextMenu={(e) => e.preventDefault()}
      className="fixed right-0 top-0 min-h-touch min-w-touch opacity-0"
    />
  )
}
