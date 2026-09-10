/**
 * @file 软键盘占位 —— 把键盘挡住的那段高度写成 CSS 变量 `--keyboard-inset`
 * @layer platform  只封装浏览器 API，不含任何业务判断
 * @see src/styles/index.css  `.keyboard-inset`，把这个变量变成舞台底部的 padding
 * @see src/components/AppShell.tsx  唯一消费方
 *
 * ## 为什么非得自己算
 *
 * iOS 弹出键盘时**不改布局视口**：`window.innerHeight` 一动不动，
 * CSS 里也没有任何选择器知道键盘来了。于是页面纹丝不动，键盘直接压在下半屏上——
 * 家长区门禁点开输入框，上面那道算术题就被盖住了，
 * 家长得先把键盘收起来看一眼题、再弹出来输入。
 *
 * 唯一看得见键盘的是 `visualViewport`：它量的是「此刻真正还看得见的那一块」。
 * 键盘弹起时它变矮，与布局视口的差额就是被挡住的高度。
 *
 * ⚠️ 只写变量、不碰任何元素。谁需要让位由 CSS 决定——这一层不知道页面长什么样。
 */

/**
 * 小于这个高度一律不当成键盘。
 *
 * Safari 地址栏收放、转屏过程中的中间态都会让两个视口差出几十像素，
 * 而任何一台 iOS 设备上的真键盘都远高于此。不设这道门槛的话，
 * 滑一下页面整个舞台就会跟着抖一下。
 */
const KEYBOARD_MIN_HEIGHT = 120

const CSS_VAR = '--keyboard-inset'

/**
 * 持续把「键盘遮住的高度」写进根元素的 `--keyboard-inset`。
 *
 * 没有键盘（以及不支持 `visualViewport` 的环境）时变量恒为 `0px`，
 * 页面与不接这个模块时完全一致。
 *
 * @returns 取消订阅并清掉变量的函数，交给 `useEffect` 的清理回调
 *
 * @example
 * useEffect(() => trackKeyboardInset(), [])
 * // 家长在 iPad 上点开门禁的输入框 → :root 上出现 --keyboard-inset: 336px
 */
export function trackKeyboardInset(): () => void {
  // 桌面 Chrome 早已支持，但 jsdom 与老 Safari 没有。没有就等于永远没键盘
  const viewport = window.visualViewport ?? null
  if (viewport === null) return () => {}

  const apply = () => {
    const covered = window.innerHeight - viewport.height - viewport.offsetTop
    const inset = covered > KEYBOARD_MIN_HEIGHT ? Math.round(covered) : 0
    document.documentElement.style.setProperty(CSS_VAR, `${inset}px`)
  }

  viewport.addEventListener('resize', apply)
  // ⚠️ 只听 resize 会漏：iOS 弹键盘时会把可视视口整体往上推（offsetTop 变大），
  //    那一段同样是被挡住的高度，而它只在 scroll 事件里体现
  viewport.addEventListener('scroll', apply)
  apply()

  return () => {
    viewport.removeEventListener('resize', apply)
    viewport.removeEventListener('scroll', apply)
    document.documentElement.style.removeProperty(CSS_VAR)
  }
}
