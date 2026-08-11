/**
 * @file 可种子化伪随机数源 —— 生成器的唯一随机来源
 * @layer domain  纯函数
 * @see design/03-技术方案.md §4.2 生成器契约
 *
 * 为什么不用 `Math.random()`：干扰项策略是本项目的核心机制，
 * 必须能用固定种子复现同一道题来验证「9+5 的错误选项是不是 13/10/4」。
 * 不可复现的随机源等于放弃了对这套机制的一切验证能力。
 */

/**
 * 创建一个种子化随机数生成器（mulberry32 算法）。
 *
 * 返回值分布均匀、周期足够长，出题场景完全够用；
 * 实现只有几行，无外部依赖，便于在测试中固定种子。
 *
 * @param seed - 32 位整数种子。相同种子必然产生相同序列
 * @returns 返回 `[0, 1)` 区间浮点数的函数
 *
 * @example
 * const rng = createRng(42)
 * const a = rng()          // 0.6011037519201636
 * const same = createRng(42)
 * same() === a             // true —— 可复现
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 取 `[min, max]` 闭区间内的随机整数。
 *
 * @throws `min > max` 时抛错。这种情况一定是生成器的区间推导写错了，
 *         静默返回一个「看起来还行」的值会让错误一路传到孩子面前
 *         （典型后果：出现负数答案或超纲的算式），必须在开发期就炸出来。
 *
 * @example
 * randomInt(rng, 2, 9)   // 2~9 之间，含两端
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`randomInt: 区间非法 min(${min}) > max(${max})`)
  }
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * 从数组中随机取一个元素。
 *
 * @throws 数组为空时抛错——生成器拿不到候选值属于配置错误，必须显式失败
 */
export function randomPick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('randomPick: 候选数组为空')
  }
  const picked = items[Math.floor(rng() * items.length)]
  // 浮点边界保护：rng() 极小概率返回接近 1 的值导致索引越界
  return picked ?? (items[items.length - 1] as T)
}

/**
 * Fisher-Yates 洗牌，返回新数组，不修改入参。
 *
 * 用于打乱选项顺序——正确答案若总在固定位置，孩子会学会「选第二个」而不是算答案。
 */
export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = result[i] as T
    const b = result[j] as T
    result[i] = b
    result[j] = a
  }
  return result
}
