/**
 * @file 语音朗读（Web Speech API）—— 一年级孩子不识字，这是所有题目的前提
 * @layer platform  浏览器 API 封装
 * @see design/03-技术方案.md §4.4 音频系统
 *
 * ⚠️ iOS 限制：首次调用必须发生在用户手势（点击）的同步调用栈里，
 * 否则后续所有朗读会静默失败。因此首屏必须有「开始学习」按钮触发 {@link unlockSpeech}。
 */

export type SpeechLang = 'zh-CN' | 'en-US'

/** 儿童朗读语速。1.0 对一年级偏快，0.85 是听清每个字的舒适值 */
const DEFAULT_RATE = 0.85

let unlocked = false
let cachedVoices: SpeechSynthesisVoice[] = []

/** 浏览器是否支持语音合成。不支持时全部朗读调用静默降级，不报错 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * 解锁 iOS 语音合成。
 *
 * **必须在用户手势的同步调用栈里调用**（如按钮的 onClick 内），
 * 异步之后再调用无效——这是 iOS 的硬限制，绕不过去。
 *
 * @example
 * <button onClick={() => { unlockSpeech(); startSession() }}>开始学习</button>
 */
export function unlockSpeech(): void {
  if (unlocked || !isSpeechSupported()) return

  // 播一段空白内容完成解锁，孩子听不到任何声音
  const warmup = new SpeechSynthesisUtterance('')
  warmup.volume = 0
  window.speechSynthesis.speak(warmup)
  unlocked = true

  loadVoices()
}

/** 语音列表在 Safari 上是异步就绪的，需要监听 voiceschanged */
function loadVoices(): void {
  if (!isSpeechSupported()) return
  cachedVoices = window.speechSynthesis.getVoices()
  if (cachedVoices.length === 0) {
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        cachedVoices = window.speechSynthesis.getVoices()
      },
      { once: true },
    )
  }
}

/** 挑选该语言下质量最好的音色，优先本地合成（无需联网、延迟低） */
function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | undefined {
  const matches = cachedVoices.filter((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)))
  if (matches.length === 0) return undefined
  return matches.find((v) => v.localService) ?? matches[0]
}

/**
 * 朗读一段文本。会打断当前正在朗读的内容。
 *
 * 打断而非排队：孩子连点两次喇叭按钮时，应该重新读一遍，
 * 而不是听完第一遍再听第二遍。
 *
 * @param text - 朗读内容。应使用 `ttsText` 而非显示文本
 *               （算式 `9 + 5` 要读作「9 加 5 等于几」）
 * @param lang - 语言，默认中文
 * @param rate - 语速，默认 {@link DEFAULT_RATE}
 *
 * @example
 * speak('9 加 5 等于几')
 * speak('How many dogs?', 'en-US')
 */
export function speak(text: string, lang: SpeechLang = 'zh-CN', rate = DEFAULT_RATE): void {
  if (!isSpeechSupported() || text.length === 0) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = 1.1 // 略高的音调对儿童更亲切

  const voice = pickVoice(lang)
  if (voice !== undefined) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}

/** 立即停止朗读。切换页面或进入下一题时调用，避免上一题的语音串到下一题 */
export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}
