/**
 * @file 元素尺寸订阅 —— ResizeObserver 的一层薄封装
 * @layer platform  只封装浏览器 API，不含任何业务判断
 * @see src/features/room/RoomPets.tsx  唯一消费方：小屋舞台的像素尺寸
 *
 * ## 为什么小屋非要知道像素尺寸
 *
 * 伙伴的站位存的是 0~1 的比例（`domain/pet/roomSpot.ts`），
 * 而 framer-motion 的拖动位移是像素。两者之间必须有一次换算，
 * 换算就需要舞台当前有多宽多高。
 *
 * 不用 `getBoundingClientRect()` 一次性读死：iPad 转屏、Safari 地址栏收起
 * 都会改变尺寸，读死之后三只会停在旧比例算出的旧像素上——看起来就是「跑位了」。
 */

import { useEffect, useState, type RefObject } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/** 还没测到时的尺寸。⚠️ 调用方要据此判断「先别画」，否则会有一帧画在左上角 */
const UNMEASURED: ElementSize = { width: 0, height: 0 }

/**
 * 持续订阅某个元素的内容尺寸。
 *
 * @param ref - 要观察的元素。为 `null` 时返回 `{ width: 0, height: 0 }`
 * @returns 当前内容盒尺寸；首帧与不支持 ResizeObserver 的环境下是 0
 *
 * @example
 * const stageRef = useRef<HTMLDivElement>(null)
 * const stage = useElementSize(stageRef)
 * // stage.width === 0 时先别渲染依赖尺寸的东西
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>(UNMEASURED)

  useEffect(() => {
    const el = ref.current
    // jsdom 没有 ResizeObserver。不兜这一下，任何渲染到它的组件测试都会直接抛
    if (el === null || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box === undefined) return
      // 同值直接返回原对象：ResizeObserver 在滚动、字体加载时会重复触发，
      // 每次都 set 新对象会让整层伙伴反复重渲染
      setSize((prev) =>
        prev.width === box.width && prev.height === box.height
          ? prev
          : { width: box.width, height: box.height },
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
