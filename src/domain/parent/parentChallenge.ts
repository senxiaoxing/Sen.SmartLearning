/**
 * @file 家长门禁的算术题 —— 造一道必然进位的两位数加法
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/features/parent/ParentGate.tsx  使用处
 * @see design/03-技术方案.md §4.6  家长门禁
 *
 * 门槛刻意选**两位数进位加法**：正好在一年级上学期的能力之外
 * （她学的是 20 以内），家长却能心算。
 *
 * ## ⭐ 为什么抽出来单独放一个文件
 *
 * 这段逻辑原先内联在 `ParentGate.tsx` 里，写成了拒绝采样：
 *
 * ```ts
 * let a = pick()                                  // 23..79
 * let b = pick()
 * while ((a % 10) + (b % 10) < 10) b = pick()     // ⚠️ 只重抽 b
 * ```
 *
 * 当 `a` 的个位恰好是 0（30/40/50/60/70，约 9% 的概率），
 * 就需要 `b % 10 >= 10` —— **这不可能成立**，于是 while 永远退不出，
 * 主线程被占死，浏览器弹「页面无响应」，家长区再也进不去。
 *
 * 它藏了很久才被发现，正是因为**九次里有八次是好的**：
 * 重开一次页面就「好了」，看起来像偶发的浏览器毛病。
 *
 * 修法是**消灭这个循环**而不是把条件改对：改成同时重抽 a 和 b 虽然能终止，
 * 但仍然是「靠运气收敛」，而且照样测不出「一定会终止」。
 * 直接构造则是结构上就不可能失败，且能 100% 可测——
 * 所以它必须住在 `domain/` 里，接受注入的随机源。
 */

/** 随机源。注入而非直接调 `Math.random`，否则无法固定种子做测试 */
export type Rng = () => number

/** 两个加数的十位取值。2~7 保证是两位数加法，又不至于让家长算得费劲 */
const TENS_MIN = 2
const TENS_MAX = 7

export interface ParentChallenge {
  a: number
  b: number
}

/**
 * 造一道必然进位的两位数加法。
 *
 * **进位由构造保证，不靠重抽**：先给 `a` 的个位取 1~9，
 * 再让 `b` 的个位从「刚好凑满 10」起跳。两个个位之和必然 ≥ 10。
 *
 * @param rng - 随机源，返回 `[0, 1)`。测试传固定序列，运行时传 `Math.random`
 * @returns 两个加数，各自在 21~79 之间，个位之和必然 ≥ 10
 *
 * @example
 * newParentChallenge(Math.random)   // { a: 47, b: 65 }  → 7 + 5 = 12，进位 ✓
 *
 * @example
 * // 固定随机源时输出稳定，可用于测试
 * newParentChallenge(() => 0)       // { a: 21, b: 29 }  → 1 + 9 = 10，进位 ✓
 */
export function newParentChallenge(rng: Rng): ParentChallenge {
  /** 取 `[min, max]` 内的整数（含两端） */
  const roll = (min: number, max: number): number =>
    min + Math.floor(rng() * (max - min + 1))

  const aOnes = roll(1, 9)
  // 起点是 `10 - aOnes`，因此 aOnes + bOnes 恒 ≥ 10 —— 这就是「必然进位」
  const bOnes = roll(10 - aOnes, 9)

  return {
    a: roll(TENS_MIN, TENS_MAX) * 10 + aOnes,
    b: roll(TENS_MIN, TENS_MAX) * 10 + bOnes,
  }
}
