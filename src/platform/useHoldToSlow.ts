/**
 * @file 长按放慢 —— 把慢速重听接到任何一个可点朗读的地方
 * @layer platform  浏览器 API 封装（与 useElementSize.ts 同类：给组件用的薄封装）
 * @see src/platform/slowSpeech.ts   慢速怎么播（变速不变调）
 * @see design/09-竞品借鉴.md §3.1
 *
 * ## ⭐ 为什么触发方式是长按，而不是「再点一次」
 *
 * 「8 秒内再点一次就放慢」看起来更好发现——她不用学新手势。
 * 但它把**同一个动作**绑了两种结果：她想再听一遍正常速度的时候，
 * 得到的却是慢速。而「再听一遍」恰恰是这个按钮最常见的用法。
 *
 * 长按是明确的、要专门做出来的动作，**不会被普通重听误触发**。
 * 代价是需要有人告诉她一次，但那只需要一次。
 *
 * ## ⚠️ 三条都别漏
 *
 * 1. `onBeforeSpeak` 必须在 `pointerdown` 的**同步栈**里跑完 ——
 *    长按回调在 `setTimeout` 里，那时已经离开用户手势，iOS 会拒绝播放
 * 2. 长按之后浏览器仍会派发一次 `click`，调用方必须用 {@link HoldToSlow.consumeHold}
 *    把它吃掉，否则慢速刚响就被正常速度打断
 * 3. 按钮要带 `select-none touch-manipulation [-webkit-touch-callout:none]`，
 *    否则 iOS 长按会弹出系统菜单，把这一下抢走
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { say } from '@/platform/speech'
import type { MouseEvent } from 'react'
import type { Utterance } from '@/domain/speech'

/**
 * 按住多久算长按（毫秒）。
 *
 * 600 比通用的 500 长一点：六岁孩子按按钮本来就重、停留也久，
 * 500 会把她普通的一次点击误判成长按。
 */
const HOLD_MS = 600

/** 慢速触发后视觉提示保持的时长（毫秒） */
const HINT_MS = 1800

/** {@link useHoldToSlow} 的回调 */
interface HoldToSlowOptions {
  /**
   * 朗读**之前**同步跑一下，留给「这一屏还没解锁过 iOS 音频」的场合。
   * ⚠️ 必须是同步函数，见文件头第 1 条。
   */
  onBeforeSpeak?: () => void
  /** 慢速真的播出去之后跑一下，用于统计重听次数 */
  onSpoke?: () => void
}

export interface HoldToSlow {
  /** 摊到按钮上：`<button {...holdProps} onClick={…}>` */
  holdProps: {
    onPointerDown: () => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
    onContextMenu: (e: MouseEvent) => void
  }
  /**
   * 在自己的 `onClick` **开头**调用。
   *
   * @returns `true` 表示这一下 click 是长按带来的——慢速已经播过了，
   *          调用方应当立刻 `return`，别再做正常速度朗读或翻面之类的事
   */
  consumeHold: () => boolean
  /** 刚刚触发过慢速，用于给一点视觉反馈。不需要就忽略 */
  slowed: boolean
}

/**
 * 按住就放慢一档地朗读。
 *
 * @param utteranceOf - 取当前要念的话。做成函数是因为长按触发时才求值，
 *                      那时拿到的才是这一刻的内容
 * @param options - 见 {@link HoldToSlowOptions}
 *
 * @example
 * const { holdProps, consumeHold } = useHoldToSlow(() => ({
 *   parts: [card.clipKey],
 *   fallbackText: card.spoken,
 * }))
 *
 * <button
 *   {...holdProps}
 *   onClick={() => {
 *     if (consumeHold()) return
 *     say({ parts: [card.clipKey], fallbackText: card.spoken })
 *   }}
 *   className="select-none touch-manipulation [-webkit-touch-callout:none]"
 * />
 */
export function useHoldToSlow(
  utteranceOf: () => Utterance,
  options: HoldToSlowOptions = {},
): HoldToSlow {
  const [slowed, setSlowed] = useState(false)
  const holdTimer = useRef(0)
  const hintTimer = useRef(0)
  /** 这一次的 click 是不是长按带来的 */
  const held = useRef(false)

  // 每次渲染后更新，长按回调里取到的永远是最新的一份
  const latest = useRef({ utteranceOf, options })
  useEffect(() => {
    latest.current = { utteranceOf, options }
  })

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current)
      window.clearTimeout(hintTimer.current)
    },
    [],
  )

  const cancel = useCallback(() => {
    window.clearTimeout(holdTimer.current)
  }, [])

  const start = useCallback(() => {
    // ⚠️ 必须在这个同步栈里解锁，见文件头第 1 条
    latest.current.options.onBeforeSpeak?.()
    held.current = false
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      held.current = true
      say(latest.current.utteranceOf(), { slow: true })
      latest.current.options.onSpoke?.()
      setSlowed(true)
      window.clearTimeout(hintTimer.current)
      hintTimer.current = window.setTimeout(() => setSlowed(false), HINT_MS)
    }, HOLD_MS)
  }, [])

  const consumeHold = useCallback(() => {
    window.clearTimeout(holdTimer.current)
    if (!held.current) return false
    held.current = false
    return true
  }, [])

  return {
    holdProps: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    },
    consumeHold,
    slowed,
  }
}
