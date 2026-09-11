/**
 * @file 输入焦点跟踪 —— 有文本框正在用时，给根元素挂上 `typing`
 * @layer platform  只封装浏览器 API，不含任何业务判断
 * @see src/styles/index.css  `.typing` 把页面内容挪到上半屏
 * @see design/05-孩子反馈与响应.md 第 16 条
 *
 * ## ⛔ 不要再改回「量键盘有多高」
 *
 * 第一版干的正是那件事：用 `visualViewport` 与布局视口的差额算出被挡住的高度，
 * 写进 CSS 变量让页面让位。这是 iPhone 上的通行做法，
 * **在 iPad 上完全没有效果**——2026-09-11 真机：家长区门禁点开输入框，
 * 页面纹丝不动（同一版构建里围巾与答题区的改动都生效了，
 * 生产 CSS 里那条规则也在，所以差额本身就是 0）。
 *
 * iPadOS 的键盘可以浮动、可以分离、可以外接，它压根不改可视视口，量不到。
 *
 * 所以这一版**不量了**：只要有文本框在用，就把内容挪到上半屏。
 * 键盘一定从屏幕底部升起、且从不超过半屏，内容待在上半屏就一定在它上方。
 * 不需要知道键盘多高，也就没有任何一个数字需要按机型去调。
 */

const TYPING_CLASS = 'typing'

/**
 * 这些 `type` 不会唤起键盘或选择器，拿到焦点也不该让页面动。
 *
 * `file` 尤其要排除：恢复备份那个 input 是 `sr-only` 的、由按钮程序化点击，
 * 它一取得焦点整页就跳，家长看到的是「点了一下页面自己抖了」。
 */
const SILENT_INPUT_TYPES = new Set([
  'file',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'image',
  'range',
  'color',
])

/** 是不是一个「点下去会从屏幕底部升起点什么」的输入框 */
function opensKeyboard(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false
  if (node.tagName === 'TEXTAREA') return true
  // ⚠️ 按钮不算：iOS 点按钮不移焦点，但桌面会——
  //    把按钮算进来的话，家长区里点任何一个按钮整页都会跳一下
  if (node.tagName !== 'INPUT') return false
  return !SILENT_INPUT_TYPES.has((node as HTMLInputElement).type)
}

/**
 * 订阅「有没有文本框正在用」，同步到根元素的 `typing` 类。
 *
 * @returns 取消订阅并摘掉类名的函数，交给 `useEffect` 的清理回调
 *
 * @example
 * useEffect(() => trackTypingFocus(), [])
 * // 家长点开门禁的输入框 → <html class="typing">，门禁整体挪到上半屏
 */
export function trackTypingFocus(): () => void {
  const onFocusIn = (event: FocusEvent) => {
    if (opensKeyboard(event.target)) document.documentElement.classList.add(TYPING_CLASS)
  }
  // 在两个输入框之间跳时 focusout 先于 focusin，同一轮里摘掉又挂回去，不会闪
  const onFocusOut = (event: FocusEvent) => {
    if (opensKeyboard(event.target)) document.documentElement.classList.remove(TYPING_CLASS)
  }

  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)

  return () => {
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    document.documentElement.classList.remove(TYPING_CLASS)
  }
}
