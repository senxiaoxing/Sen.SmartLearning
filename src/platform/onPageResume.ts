/**
 * @file 页面重新回到前台的订阅 —— 从后台/锁屏/别的 App 切回来时通知一次
 * @layer platform  浏览器 API 封装，不含任何业务逻辑
 * @see src/data/db.ts  `ensureOpen()`，本模块最主要的消费者
 *
 * 存在的理由：iOS 会在页面进入后台时回收资源（IndexedDB 连接首当其冲），
 * 而这些东西**不会**在切回来时自动恢复。需要一个统一的「回来了」信号
 * 让各层自己做体检，而不是每个页面各写一遍 visibilitychange。
 */

/**
 * 订阅「页面回到前台」。
 *
 * 同时听两个事件，因为它们覆盖的是不同的离开方式：
 * - `visibilitychange`：切到别的 App、锁屏、切标签页
 * - `pageshow` 且 `persisted`：从 back/forward cache 整个恢复回来，
 *   这一路**不会**触发 visibilitychange，漏掉它就等于漏掉 iOS 上最常见的那种
 *
 * 两者可能就同一次「回来」各响一次，因此 `handler` 必须是幂等的。
 *
 * @param handler - 回到前台时调用。⚠️ 必须幂等，且不要在里面抛异常
 * @returns 取消订阅的函数，交给 `useEffect` 的清理回调
 *
 * @example
 * useEffect(() => onPageResume(() => void ensureOpen()), [])
 */
export function onPageResume(handler: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'visible') handler()
  }
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) handler()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageShow)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
  }
}
