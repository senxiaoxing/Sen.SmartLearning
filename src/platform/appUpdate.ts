/**
 * @file App 版本更新 —— 注册 Service Worker，并在安全时机让新版本接管
 * @layer platform  浏览器 API 封装，不含任何业务逻辑
 * @see vite.config.ts  `registerType: 'prompt'`，为什么不是 autoUpdate
 * @see design/04-部署与上机.md §2 部署
 *
 * ## 要解决的问题：更新推不下去
 *
 * 部署了新版本，iPad 上点开主屏幕图标却还是旧的——新功能看不到，
 * 新语音听不到。原因是新 Service Worker 下载完只是排进 **waiting**，
 * 而它上任的条件是「所有受控页面全部关闭」；iOS 上 PWA 转入后台时
 * 页面并没有销毁，这个条件常年不成立，于是永远停在旧版本。
 *
 * 这不只是「看不到新功能」那么轻。孩子的进度全在本机 IndexedDB 里，
 * 一旦有人为了拿到更新去删图标重装，那份进度就只剩备份文件这一条退路了。
 * **让更新能正常落地，本身就是数据安全的一部分。**
 *
 * ## 时机：只在会话空闲时接管
 *
 * 接管必然伴随一次整页刷新。答题途中刷新会把内存里的整段题目冲掉，
 * 所以调用方必须等到 `status === 'idle'`（不在答题、也不在小结页）再调
 * {@link applyPendingUpdate}。见 App.tsx 里的那个 effect。
 */

import { registerSW } from 'virtual:pwa-register'

/**
 * 让等待中的新版本立刻接管并刷新页面。
 *
 * 由 {@link watchForUpdate} 在检测到新版本时填入；没有待装更新时为 `null`。
 */
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

/**
 * 注册 Service Worker，并在发现新版本时回调。
 *
 * @param onUpdateReady - 新版本已下载完、正在 waiting 时调用。
 *                        收到它**不代表**可以立刻接管——由调用方判断时机
 * @returns 无
 *
 * @example
 * watchForUpdate(() => setUpdateReady(true))
 * // 稍后，确认孩子不在答题中：
 * if (updateReady && status === 'idle') void applyPendingUpdate()
 */
export function watchForUpdate(onUpdateReady: () => void): void {
  applyUpdate = registerSW({
    // 每次冷启动都主动查一次。iOS 对 PWA 的自动更新检查很保守，
    // 不问的话可能好几天都发现不了新版本
    immediate: true,
    onNeedRefresh: onUpdateReady,
  })
}

/**
 * 应用等待中的更新：通知新 Service Worker 跳过等待，然后整页重载。
 *
 * ⚠️ **必然刷新页面**，只能在 `status === 'idle'` 时调用，
 * 否则孩子当前这一轮题目会连同内存状态一起消失。
 *
 * 没有待装更新时是空操作，可以安全地重复调用。
 *
 * @returns 刷新前 resolve；实际上页面会在此之后立即重载
 *
 * @example
 * useEffect(() => {
 *   if (updateReady && status === 'idle') void applyPendingUpdate()
 * }, [updateReady, status])
 */
export async function applyPendingUpdate(): Promise<void> {
  await applyUpdate?.(true)
}
