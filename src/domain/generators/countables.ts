/**
 * @file 生成器共用的 emoji 素材
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/englishWords.ts  英语侧挑 emoji 的同一套规矩
 * @see src/data/seed/voiceManifest.ts  每个 clipKey 对应的语音片段（WORDS 段）
 *
 * 本项目**没有位图资源**（宠物与几何图形都是手绘 SVG，英语用 emoji）。
 * 数学题里「一堆可数的东西」「一只鸟和一棵树」同样用 emoji 解决：
 * 零资源成本、iPad 上是彩色矢量、离线自带。
 *
 * 挑选原则：**轮廓清晰、颜色鲜明、一年级孩子都认识**。
 * 认不出的 emoji 会把数学题变成猜谜题，诊断数据也跟着失真。
 *
 * ⚠️ 每个条目都带 `clipKey`：题干朗读走预生成片段，名词是拼接的一环。
 * 新增条目必须同步在 voiceManifest 的 WORDS 段登记同名片段，
 * 漏登记的表现是那道题整句降级成机器音（由 voiceManifest.test.ts 采样抓出）。
 */

/** 可数对象。计数、序数、应用题共用 */
export const COUNTABLES = [
  { emoji: '🍎', name: '苹果', clipKey: 'word.apple' },
  { emoji: '🐱', name: '小猫', clipKey: 'word.cat' },
  { emoji: '⭐', name: '星星', clipKey: 'word.star' },
  { emoji: '🌸', name: '花', clipKey: 'word.flower' },
  { emoji: '🚗', name: '小汽车', clipKey: 'word.car' },
  { emoji: '🐟', name: '小鱼', clipKey: 'word.fish' },
  { emoji: '🍓', name: '草莓', clipKey: 'word.strawberry' },
  { emoji: '🎈', name: '气球', clipKey: 'word.balloon' },
  { emoji: '🦆', name: '小鸭子', clipKey: 'word.duck' },
  { emoji: '🐰', name: '小兔子', clipKey: 'word.rabbit' },
  { emoji: '🍪', name: '饼干', clipKey: 'word.cookie' },
  { emoji: '🌻', name: '向日葵', clipKey: 'word.sunflower' },
] as const

export interface Countable {
  emoji: string
  name: string
  /** 名词的语音片段 key，见 voiceManifest 的 WORDS 段 */
  clipKey: string
}

/**
 * 序数题用的一排**各不相同**的物体。
 *
 * ⚠️ 必须互不相同：一排一样的东西里问「第 3 个是谁」没有意义，
 * 而问「它排第几」时也得让孩子能认出被指的是哪一个。
 */
export const ORDINAL_LINEUP: readonly Countable[] = [
  { emoji: '🐱', name: '小猫', clipKey: 'word.cat' },
  { emoji: '🐶', name: '小狗', clipKey: 'word.dog' },
  { emoji: '🐰', name: '小兔子', clipKey: 'word.rabbit' },
  { emoji: '🐻', name: '小熊', clipKey: 'word.bear' },
  { emoji: '🐼', name: '熊猫', clipKey: 'word.panda' },
  { emoji: '🦊', name: '小狐狸', clipKey: 'word.fox' },
  { emoji: '🐸', name: '小青蛙', clipKey: 'word.frog' },
  { emoji: '🐷', name: '小猪', clipKey: 'word.pig' },
]

/**
 * 位置题的物体对。
 *
 * `anchor` 是参照物（大、不动），`target` 是被问的东西（小、可以在各个方位）。
 * 一年级的「上下前后左右」永远是**相对某个参照物**说的，
 * 光有一个物体无法构成位置关系。
 */
export const SPATIAL_PAIRS = [
  { anchor: '🌳', anchorName: '大树', anchorClip: 'word.tree', target: '🐦', targetName: '小鸟', targetClip: 'word.bird' },
  { anchor: '🏠', anchorName: '房子', anchorClip: 'word.house', target: '🐱', targetName: '小猫', targetClip: 'word.cat' },
  { anchor: '🪑', anchorName: '椅子', anchorClip: 'word.chair', target: '🧸', targetName: '玩具熊', targetClip: 'word.teddy' },
  { anchor: '🚗', anchorName: '小汽车', anchorClip: 'word.car', target: '🐕', targetName: '小狗', targetClip: 'word.dog' },
  { anchor: '📦', anchorName: '箱子', anchorClip: 'word.box', target: '⚽', targetName: '皮球', targetClip: 'word.ball' },
  { anchor: '🌸', anchorName: '花', anchorClip: 'word.flower', target: '🦋', targetName: '蝴蝶', targetClip: 'word.butterfly' },
] as const

export interface SpatialPairSpec {
  anchor: string
  anchorName: string
  /** 参照物名词的语音片段 key */
  anchorClip: string
  target: string
  targetName: string
  /** 目标名词的语音片段 key */
  targetClip: string
}
