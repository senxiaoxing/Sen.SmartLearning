/**
 * @file 安装状态检测 —— 判断是否已「添加到主屏幕」
 * @layer platform  浏览器 API 封装
 * @see design/03-技术方案.md §6 PWA 配置
 *
 * ⚠️ 这不是锦上添花的功能，而是**数据安全的前提**：
 * Safari 的 ITP 策略会清理 7 天未访问站点的 IndexedDB，
 * 但「已添加到主屏幕」的 PWA 不受此限制。
 * 只在 Safari 标签页里用，孩子一年的学习进度可能一夜清零。
 */

/** iOS Safari 独有的 standalone 标记，标准 Navigator 类型里没有 */
interface IosNavigator extends Navigator {
  standalone?: boolean
}

/** 是否运行在 iOS / iPadOS 上 */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true
  // iPadOS 13+ 默认以桌面模式呈现，UA 里没有 iPad，需要靠触摸点数判断
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * 是否已作为独立应用运行（即已添加到主屏幕）。
 *
 * 两种检测方式缺一不可：`display-mode` 是标准写法，
 * `navigator.standalone` 是 iOS 的私有实现，部分 iOS 版本只认后者。
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return (window.navigator as IosNavigator).standalone === true
}

/**
 * 是否应当提示「添加到主屏幕」。
 *
 * 只在 iOS Safari 的普通标签页里提示——其他环境要么已经装好了，
 * 要么没有这个安装方式。
 *
 * @example
 * if (shouldPromptInstall()) showInstallGuide()
 */
export function shouldPromptInstall(): boolean {
  return isIos() && !isStandalone()
}
