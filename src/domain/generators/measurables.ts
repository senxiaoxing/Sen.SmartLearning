/**
 * @file 量感题的物品表 —— 「哪个大约长 1 米」里可供挑选的东西
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/countables.ts  同一套 emoji 挑选原则
 * @see src/domain/generators/unitConvert.ts  唯一使用者
 *
 * ⭐ **这张表刻意不带 `clipKey`**，与 `COUNTABLES` 不同。
 *
 * 量感题的选项主体是 emoji、物品名只作 `caption`，而选项本来就不朗读
 * （见 items/OptionButton.tsx：点选项是提交答案不是试听）。
 * 于是十几个物品一条语音片段都不用加——二年级是语音的最后一站，
 * 能不加的就不加。
 *
 * 数值取的是**生活中的典型值**，不是精确值：孩子要建立的是
 * 「一支铅笔用厘米量、一棵树用米量」这个量级感觉。
 */

/** 可估量的物品。`value` + `unit` 就是它「大约多少」 */
export interface Measurable {
  emoji: string
  name: string
  /** 长度还是质量。时间没有实物可估，因此不出现在这张表里 */
  quantity: 'length' | 'mass'
  value: number
  unit: string
}

/**
 * 量感物品表。
 *
 * ⚠️ 同一个 `(quantity, value, unit)` 只能有一个物品——干扰项是按
 * 「量级不同」挑的，两个物品都是「2 米」的话这道题会有两个正确答案。
 * 由 `unitConvert.test.ts` 强制。
 */
export const MEASURABLES: readonly Measurable[] = [
  // —— 长度：厘米量的
  { emoji: '✏️', name: '铅笔', quantity: 'length', value: 18, unit: '厘米' },
  { emoji: '📖', name: '一本书', quantity: 'length', value: 25, unit: '厘米' },
  { emoji: '🥢', name: '筷子', quantity: 'length', value: 24, unit: '厘米' },
  { emoji: '📎', name: '回形针', quantity: 'length', value: 3, unit: '厘米' },
  { emoji: '🪥', name: '牙刷', quantity: 'length', value: 16, unit: '厘米' },
  // —— 长度：米量的
  { emoji: '🚪', name: '房门', quantity: 'length', value: 2, unit: '米' },
  { emoji: '🌳', name: '大树', quantity: 'length', value: 8, unit: '米' },
  { emoji: '🚌', name: '公共汽车', quantity: 'length', value: 10, unit: '米' },
  { emoji: '🏊', name: '游泳池', quantity: 'length', value: 25, unit: '米' },
  // —— 质量：克量的
  { emoji: '🥚', name: '一个鸡蛋', quantity: 'mass', value: 50, unit: '克' },
  { emoji: '🍎', name: '一个苹果', quantity: 'mass', value: 200, unit: '克' },
  { emoji: '📕', name: '数学书', quantity: 'mass', value: 300, unit: '克' },
  { emoji: '🪶', name: '一根羽毛', quantity: 'mass', value: 1, unit: '克' },
  // —— 质量：千克量的
  { emoji: '🍉', name: '一个西瓜', quantity: 'mass', value: 4, unit: '千克' },
  { emoji: '🍚', name: '一袋大米', quantity: 'mass', value: 10, unit: '千克' },
  { emoji: '🐱', name: '一只猫', quantity: 'mass', value: 3, unit: '千克' },
  { emoji: '🚲', name: '一辆自行车', quantity: 'mass', value: 15, unit: '千克' },
]
