/**
 * @file 「卡片 → 槽位」的放置状态机 —— 拖拽与点选两条通道共用
 * @layer items
 * @see src/items/DragOrder.tsx · src/items/DragCombine.tsx
 *
 * ⭐ **为什么必须有点选通道**
 *
 * 六岁孩子的手指精度远不如成人，纯拖拽会有相当比例的「拖到一半松手」
 * 「差几个像素没落进槽」。在答题场景里，拖不准会被记成**答错**，
 * 直接污染掌握度数据——App 学到的是「她不会凑十」，实际是「她拖不准」。
 *
 * 所以两条通道走同一套状态：
 * - **拖**：按住卡片拖到槽上松手（`dropAt` 按坐标命中）
 * - **点**：点一下卡片选中，再点一下槽放进去（完全不依赖精度）
 *
 * 拖失败时卡片自动回弹，不作任何惩罚性反馈——失败必须是零成本的。
 */

import { useCallback, useRef, useState } from 'react'
import { playSfx } from '@/platform/audio'

/** 一个矩形区域，坐标系与拖拽落点一致（页面坐标） */
export interface PageRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * 把元素的视口矩形换算成**页面**坐标。
 *
 * ⚠️ 这个换算不是可有可无的。Framer Motion 的 `onDragEnd` 给出的
 * `info.point` 用的是 `pageX/pageY`（含滚动偏移），
 * 而 `getBoundingClientRect()` 返回的是视口坐标（不含滚动）。
 * 两者在页面没滚动时恰好相等——于是这个 bug 在开发机的大屏上永远看不出来，
 * 一到 iPhone 竖屏（答题页会滚动）就变成「拖到槽上却放不进去」或者放错槽。
 */
function toPageRect(el: HTMLElement): PageRect {
  const r = el.getBoundingClientRect()
  return {
    left: r.left + window.scrollX,
    top: r.top + window.scrollY,
    right: r.right + window.scrollX,
    bottom: r.bottom + window.scrollY,
  }
}

/**
 * 找出落点命中了哪个槽。纯几何计算，与 DOM 无关，便于单测。
 *
 * @param rects - 各槽的页面坐标矩形，`null` 表示该槽还没挂载
 * @param point - 拖拽落点（页面坐标）
 * @returns 命中的槽下标；没命中返回 `-1`
 *
 * @example
 * findSlotAt([{ left: 0, top: 0, right: 100, bottom: 100 }], { x: 50, y: 50 })  // 0
 * findSlotAt([{ left: 0, top: 0, right: 100, bottom: 100 }], { x: 150, y: 50 }) // -1
 */
export function findSlotAt(
  rects: readonly (PageRect | null)[],
  point: { x: number; y: number },
): number {
  return rects.findIndex(
    (r) =>
      r !== null &&
      point.x >= r.left &&
      point.x <= r.right &&
      point.y >= r.top &&
      point.y <= r.bottom,
  )
}

export interface PlacementApi {
  /** 每个槽里放着哪张卡（值为卡片下标）；`null` 表示空槽 */
  slots: (number | null)[]
  /** 点选通道里当前选中的卡片下标 */
  selectedCard: number | null
  /** 所有槽都填满了吗——决定「好了」按钮能不能点 */
  isComplete: boolean

  /** 记录槽的 DOM 节点，供拖拽命中判定使用 */
  registerSlot: (index: number) => (el: HTMLElement | null) => void
  /** 这张卡是否已经在某个槽里 */
  isPlaced: (cardIndex: number) => boolean

  /** 点卡片：选中 / 取消选中 */
  tapCard: (cardIndex: number) => void
  /** 点槽位：把选中的卡放进去；槽里已有卡且没有选中卡时则取出 */
  tapSlot: (slotIndex: number) => void
  /** 拖拽结束：按屏幕坐标找槽，找到就放进去，返回是否放成功 */
  dropAt: (cardIndex: number, point: { x: number; y: number }) => boolean
  /** 清空重来 */
  reset: () => void
}

/**
 * 创建放置状态机。
 *
 * @param slotCount - 槽的数量
 * @param options - `unique` 为 true 时一张卡只能占一个槽（排序题），
 *                  false 时同一张卡可重复放入多个槽（拆分题里两份可能相同，如 5 拆成 0 和 5）
 *
 * @example
 * const placement = usePlacement(4, { unique: true })
 * placement.tapCard(2)      // 选中第 3 张卡
 * placement.tapSlot(0)      // 放进第 1 个槽
 */
export function usePlacement(
  slotCount: number,
  options: { unique: boolean } = { unique: true },
): PlacementApi {
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(slotCount).fill(null))
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const slotRefs = useRef<(HTMLElement | null)[]>([])

  const registerSlot = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      slotRefs.current[index] = el
    },
    [],
  )

  const place = useCallback(
    (cardIndex: number, slotIndex: number) => {
      // 「吸住了」的确认音。拖和点两条通道都会走到这里，各自接线容易漏
      playSfx('place')
      setSlots((prev) => {
        const next = [...prev]
        // 唯一模式下，同一张卡不能同时占两个槽——先把它从原来的位置拿走。
        // 少了这一步，孩子把已放好的卡再拖到别处会出现「一张卡变两张」
        if (options.unique) {
          for (let i = 0; i < next.length; i += 1) {
            if (next[i] === cardIndex) next[i] = null
          }
        }
        next[slotIndex] = cardIndex
        return next
      })
      setSelectedCard(null)
    },
    [options.unique],
  )

  const tapCard = useCallback((cardIndex: number) => {
    setSelectedCard((prev) => (prev === cardIndex ? null : cardIndex))
  }, [])

  const tapSlot = useCallback(
    (slotIndex: number) => {
      if (selectedCard !== null) {
        place(selectedCard, slotIndex)
        return
      }
      // 没有选中卡时点已占用的槽 = 把卡取回来。
      // 孩子放错了要能改，且改的操作必须和放一样简单
      setSlots((prev) => {
        if (prev[slotIndex] === null) return prev
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
    },
    [selectedCard, place],
  )

  const dropAt = useCallback(
    (cardIndex: number, point: { x: number; y: number }) => {
      const rects = slotRefs.current.map((el) => (el === null ? null : toPageRect(el)))
      const hit = findSlotAt(rects, point)
      if (hit < 0) return false
      place(cardIndex, hit)
      return true
    },
    [place],
  )

  const reset = useCallback(() => {
    setSlots(Array(slotCount).fill(null))
    setSelectedCard(null)
  }, [slotCount])

  return {
    slots,
    selectedCard,
    isComplete: slots.every((s) => s !== null),
    registerSlot,
    isPlaced: (cardIndex) => options.unique && slots.includes(cardIndex),
    tapCard,
    tapSlot,
    dropAt,
    reset,
  }
}
