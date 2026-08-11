/**
 * @file 拖拽落点命中判定的单测
 * @layer items
 * @see src/items/usePlacement.ts
 *
 * 只测纯几何部分。放置状态机本身靠真机点选验证，
 * 而命中判定是唯一「在开发机大屏上永远正确、到 iPhone 上就出错」的部分——
 * 页面一滚动，坐标系不一致就会让孩子拖到槽上却放不进去。
 */

import { describe, expect, it } from 'vitest'
import { findSlotAt, type PageRect } from '@/items/usePlacement'

const rect = (left: number, top: number): PageRect => ({
  left,
  top,
  right: left + 100,
  bottom: top + 100,
})

describe('findSlotAt', () => {
  const slots = [rect(0, 0), rect(200, 0)]

  it('落在槽内返回该槽下标', () => {
    expect(findSlotAt(slots, { x: 50, y: 50 })).toBe(0)
    expect(findSlotAt(slots, { x: 250, y: 50 })).toBe(1)
  })

  it('落在槽外返回 -1，调用方据此让卡片回弹', () => {
    expect(findSlotAt(slots, { x: 150, y: 50 })).toBe(-1)
    expect(findSlotAt(slots, { x: 50, y: 300 })).toBe(-1)
  })

  it('边界算命中 —— 孩子拖到边上应该也能放进去', () => {
    expect(findSlotAt(slots, { x: 0, y: 0 })).toBe(0)
    expect(findSlotAt(slots, { x: 100, y: 100 })).toBe(0)
  })

  it('还没挂载的槽（null）不会被误命中', () => {
    expect(findSlotAt([null, rect(0, 0)], { x: 50, y: 50 })).toBe(1)
    expect(findSlotAt([null, null], { x: 50, y: 50 })).toBe(-1)
  })

  it('多个槽重叠时取第一个，判定结果稳定', () => {
    expect(findSlotAt([rect(0, 0), rect(50, 50)], { x: 75, y: 75 })).toBe(0)
  })

  it('⭐ 页面滚动后仍然命中 —— 矩形与落点必须在同一套坐标系里', () => {
    // 模拟页面向下滚了 400：槽的页面坐标不变，落点的 pageY 也含滚动量，
    // 两者一致所以照常命中。若命中判定拿的是视口坐标（不含滚动），
    // 这里就会算成没命中，表现为「明明拖到槽上了却放不进去」
    const scrolled = [rect(0, 500)]
    expect(findSlotAt(scrolled, { x: 50, y: 550 })).toBe(0)
  })
})
