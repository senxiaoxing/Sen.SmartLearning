/**
 * @file 图形题的共享定义 —— 图形清单、中文名、选项构造
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/shapes.ts        认图形（M7.1 / M7.3）
 * @see src/domain/generators/classifyShape.ts 分类（M7.2）
 *
 * 两个生成器共用同一套图形清单与选项构造，抽出来避免各写一份走偏。
 */

import type { ItemOption, PlaneShapeKind, SolidShapeKind } from '@/domain/types'

export const SOLIDS: readonly SolidShapeKind[] = ['cube', 'cuboid', 'cylinder', 'sphere']
export const PLANES: readonly PlaneShapeKind[] = ['square', 'rect', 'triangle', 'circle']

export const SOLID_NAMES: Record<string, string> = {
  cube: '正方体',
  cuboid: '长方体',
  cylinder: '圆柱',
  sphere: '球',
  cone: '圆锥',
}

export const PLANE_NAMES: Record<string, string> = {
  square: '正方形',
  rect: '长方形',
  triangle: '三角形',
  circle: '圆',
}

/** 两族合并的名字表。分开写会让 TS 在联合类型上无法索引 */
export const SHAPE_NAMES: Record<string, string> = { ...SOLID_NAMES, ...PLANE_NAMES }

/**
 * 立体 → 最容易被混淆的平面图形。
 *
 * 正方体配正方形、圆柱配圆——**名字只差一个字**，
 * 这正是 `solid_plane_confusion` 的真实成因，随机挑个平面图形达不到这个效果。
 */
export const SOLID_TO_PLANE: Record<SolidShapeKind, PlaneShapeKind> = {
  cube: 'square',
  cuboid: 'rect',
  cylinder: 'circle',
  sphere: 'circle',
  cone: 'triangle',
}

/** 选项个数。一年级注意力容纳不了更多 */
export const OPTION_COUNT = 4

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

export interface RawShapeOption {
  key: string
  /** 图形的中文名 */
  label: string
  isCorrect: boolean
  tag?: 'solid_plane_confusion'
}

/**
 * 把图形 key 编号成正式选项。
 *
 * ⚠️ `text` 存的是图形中文名，但**界面上不显示也不朗读**——
 * 显示出来这道题就从「认图形」变成了「认字」，朗读则直接报答案
 * （`OptionButton` 见 `imageKey` 即优先渲染图，`ChoiceImage` 关掉了点读）。
 *
 * 它存在只为两件事：满足「answer 等于正确选项 text」的生成器契约，
 * 以及让**家长错题本**能显示「正确答案：正方体」而不是一片空白。
 *
 * @example
 * toShapeOptions([{ key: 'solid:cube', label: '正方体', isCorrect: true }])
 * // → [{ id: 'a', text: '正方体', imageKey: 'solid:cube', isCorrect: true }]
 */
export function toShapeOptions(raw: readonly RawShapeOption[]): ItemOption[] {
  return raw.slice(0, OPTION_COUNT).map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.label,
    imageKey: o.key,
    isCorrect: o.isCorrect,
    ...(o.tag !== undefined && { misconceptionTag: o.tag }),
  }))
}
