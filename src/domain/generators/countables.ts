/**
 * @file 生成器共用的 emoji 素材
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/englishWords.ts  英语侧挑 emoji 的同一套规矩
 *
 * 本项目**没有位图资源**（宠物与几何图形都是手绘 SVG，英语用 emoji）。
 * 数学题里「一堆可数的东西」「一只鸟和一棵树」同样用 emoji 解决：
 * 零资源成本、iPad 上是彩色矢量、离线自带。
 *
 * 挑选原则：**轮廓清晰、颜色鲜明、一年级孩子都认识**。
 * 认不出的 emoji 会把数学题变成猜谜题，诊断数据也跟着失真。
 */

/** 可数对象。计数、序数、应用题共用 */
export const COUNTABLES = [
  { emoji: '🍎', name: '苹果' },
  { emoji: '🐱', name: '小猫' },
  { emoji: '⭐', name: '星星' },
  { emoji: '🌸', name: '花' },
  { emoji: '🚗', name: '小汽车' },
  { emoji: '🐟', name: '小鱼' },
  { emoji: '🍓', name: '草莓' },
  { emoji: '🎈', name: '气球' },
  { emoji: '🦆', name: '小鸭子' },
  { emoji: '🐰', name: '小兔子' },
  { emoji: '🍪', name: '饼干' },
  { emoji: '🌻', name: '向日葵' },
] as const

export interface Countable {
  emoji: string
  name: string
}

/**
 * 序数题用的一排**各不相同**的物体。
 *
 * ⚠️ 必须互不相同：一排一样的东西里问「第 3 个是谁」没有意义，
 * 而问「它排第几」时也得让孩子能认出被指的是哪一个。
 */
export const ORDINAL_LINEUP: readonly Countable[] = [
  { emoji: '🐱', name: '小猫' },
  { emoji: '🐶', name: '小狗' },
  { emoji: '🐰', name: '小兔子' },
  { emoji: '🐻', name: '小熊' },
  { emoji: '🐼', name: '熊猫' },
  { emoji: '🦊', name: '小狐狸' },
  { emoji: '🐸', name: '小青蛙' },
  { emoji: '🐷', name: '小猪' },
]

/**
 * 位置题的物体对。
 *
 * `anchor` 是参照物（大、不动），`target` 是被问的东西（小、可以在各个方位）。
 * 一年级的「上下前后左右」永远是**相对某个参照物**说的，
 * 光有一个物体无法构成位置关系。
 */
export const SPATIAL_PAIRS = [
  { anchor: '🌳', anchorName: '大树', target: '🐦', targetName: '小鸟' },
  { anchor: '🏠', anchorName: '房子', target: '🐱', targetName: '小猫' },
  { anchor: '🪑', anchorName: '椅子', target: '🧸', targetName: '玩具熊' },
  { anchor: '🚗', anchorName: '小汽车', target: '🐕', targetName: '小狗' },
  { anchor: '📦', anchorName: '箱子', target: '⚽', targetName: '皮球' },
  { anchor: '🌸', anchorName: '花', target: '🦋', targetName: '蝴蝶' },
] as const

export interface SpatialPairSpec {
  anchor: string
  anchorName: string
  target: string
  targetName: string
}
