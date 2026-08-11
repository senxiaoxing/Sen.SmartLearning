/**
 * @file 数值计算工具 —— 掌握度与积分计算共用的基础函数
 * @layer domain  纯函数
 */

/**
 * 把数值夹到 `[min, max]` 闭区间内。
 *
 * @example
 * clamp(1.2, 0, 1)   // 1
 * clamp(-0.3, 0, 1)  // 0
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 保留指定位数的小数。
 *
 * 掌握度分数存进 IndexedDB 前必须取整，否则会累积成
 * `0.8500000000000001` 这类浮点噪声，导致「达到 0.85 阈值」的判定时灵时不灵。
 *
 * @param value - 原始值
 * @param digits - 保留小数位数，默认 4
 *
 * @example
 * roundTo(0.8500000000000001)   // 0.85
 * roundTo(1 / 3, 2)             // 0.33
 */
export function roundTo(value: number, digits = 4): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * 指数移动平均（EMA）—— 新值权重为 `alpha`，历史权重为 `1 - alpha`。
 *
 * 相比累积平均，EMA 让近期表现主导结果：孩子上周不会、这周会了，
 * 掌握度应该及时反映出来，而不是被前面几十次的失败拖住。
 *
 * @param current - 当前值
 * @param sample - 新观测值
 * @param alpha - 新值权重 0~1，越大反应越快、越不稳定
 *
 * @example
 * ema(0.5, 1, 0.3)   // 0.65 —— 答对一次，掌握度从 0.5 升到 0.65
 */
export function ema(current: number, sample: number, alpha: number): number {
  return current + alpha * (sample - current)
}
