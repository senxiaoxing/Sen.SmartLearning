/**
 * @file 钟表时刻的计算 —— 读法、指针交换、干扰候选
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/clock.ts  出题逻辑
 *
 * 从生成器里拆出来单独成文件：这些是**纯粹的时刻算术**，
 * 与「怎么组装成一道题」是两件事，而且 `swapHands` 的正确性
 * 直接决定 `hand_swap` 这个诊断标签有没有意义，值得单独测。
 */

export interface ClockTime {
  hour: number
  minute: number
}

/** 把 `(时, 分)` 读成中文。半点单独说「半」，一年级就是这么教的 */
export function readTime(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour
  if (minute === 0) return `${h} 点整`
  if (minute === 30) return `${h} 点半`
  return `${h} 点 ${minute} 分`
}

/**
 * 指针交换后会被读成什么时刻。
 *
 * 时针指向 H、分针指向 M 时，若把两根针看反：
 * - 原来的分针位置被当成时针 → 新的小时 = 分针所指的刻度
 * - 原来的时针位置被当成分针 → 新的分钟 = 时针所指刻度 × 5
 *
 * @example
 * swapHands(3, 0)    // { hour: 12, minute: 15 }  3 点整看成 12 点一刻
 * swapHands(12, 0)   // { hour: 12, minute: 0 }   ⚠️ 与原时刻相同
 */
export function swapHands(hour: number, minute: number): ClockTime {
  const minuteMark = Math.round(minute / 5) % 12
  return {
    hour: minuteMark === 0 ? 12 : minuteMark,
    minute: (hour % 12) * 5,
  }
}

/**
 * 候选干扰时刻，按诊断价值排序。
 *
 * ⚠️ **全部标 `hand_swap`**，包括「邻近整点」这类其实是数错刻度的错误——
 * design/01-知识点图谱.md 目前只为 M8 定义了这一个误区。
 * 若将来要把「看反指针」与「数错刻度」分开诊断，
 * 需要新增标签并同步更新图谱、`misconceptionLabels.ts` 与 `REMEDIAL_TARGETS`。
 */
export function candidateTimes(hour: number, minute: number): ClockTime[] {
  return [
    swapHands(hour, minute),
    { hour: (hour % 12) + 1, minute },
    { hour, minute: minute === 0 ? 30 : 0 },
    { hour: hour === 1 ? 12 : hour - 1, minute },
    { hour: (hour % 12) + 1, minute: minute === 0 ? 30 : 0 },
  ]
}

/**
 * 挑出与正确答案**不重合**的干扰项。
 *
 * ⭐ 必须以正确项为基准去重，不能反过来：
 * 12 点整的「指针交换」读数仍是 12 点整，若让它和正确项一起进去重表，
 * 排在前面的那个（可能是干扰项）会把正确项挤掉，
 * 结果整道题**一个正确选项都没有**——孩子怎么点都是错的。
 * 这个 bug 由 `index.test.ts` 的「正确选项不唯一」契约抓出来过。
 *
 * @param keyOf - 把时刻转成去重用的键（文字读法或图形 key）
 * @param correctKey - 正确项的键
 * @param limit - 最多取几个
 */
export function pickDistinctTimes(
  hour: number,
  minute: number,
  keyOf: (t: ClockTime) => string,
  correctKey: string,
  limit = 3,
): ClockTime[] {
  const seen = new Set<string>([correctKey])
  const result: ClockTime[] = []

  for (const t of candidateTimes(hour, minute)) {
    const key = keyOf(t)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(t)
    if (result.length === limit) break
  }

  return result
}
