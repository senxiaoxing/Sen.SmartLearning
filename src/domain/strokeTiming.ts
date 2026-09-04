/**
 * @file 笔顺演示的节奏 —— 每一笔什么时候写、写多久
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/components/TianGrid.tsx  按这份节奏播动画
 * @see design/09-竞品借鉴.md §2.3
 *
 * ⭐ **每笔时长按中线长度成比例，不是每笔等时。**
 *
 * 等时会让「点」和「长横」花一样久——点那一下拖得像在画线，
 * 长横又一闪而过。孩子是照着这个动画学运笔的，节奏不对就等于教错了轻重。
 *
 * 单独成一个 domain 模块而不是写在组件里，是因为它是纯计算、能固定输入验输出，
 * 而「速度看着不对」在 iPad 上是很难说清的一类问题——有测试守着，
 * 至少能保证「短笔画一定比长笔画快」这条永远成立。
 */

/** 一笔的中线：一串 `[x, y]` 采样点。坐标系 1024×1024，y 轴向上 */
export type StrokeMedian = readonly (readonly number[])[]

/**
 * 一笔的基准时长（毫秒）。实际时长按这一笔相对平均长度的比例缩放。
 *
 * ⚠️ 这个值来回调过一次，别再改：420 → 680（第一次上机嫌快）→ **420**
 * （2026-09-05 再次上机后调回）。慢下来之后一个字要写十秒，
 * 而她是**反复看**这个循环的，不是只看一遍——耐心耗在等笔画上，
 * 比「看不清那一笔」更劝退。
 *
 * ⚠️ 改这个值要同步改 `scripts/generate-stroke-check.mjs` 里的同名节奏，
 * 那一页是拿来判断笔顺对不对的，快慢不同就不是在看孩子将来会看到的东西。
 */
const STROKE_MS = 420

/** 笔与笔之间的停顿（毫秒）。看得出「这一笔写完了」，又不至于断成一格一格 */
const STROKE_GAP_MS = 90

/**
 * 单笔时长下限（毫秒）。
 *
 * 「点」的中线极短，纯按比例算会短到 60ms 上下——那一下看不见，
 * 孩子会以为这一笔被跳过了。
 */
const MIN_STROKE_MS = 180

/** 一笔在动画里的排期 */
export interface StrokeTiming {
  /** 从整体开始算，这一笔什么时候起笔（毫秒） */
  delay: number
  /** 这一笔画多久（毫秒） */
  duration: number
  /**
   * 中线的实际长度，用户坐标单位。
   *
   * 画动画要拿它当 `stroke-dasharray` 的初值——描画就是让一条和中线等长的
   * 虚线偏移量从满走到 0。放在这里一并返回，是为了让组件不必再算一遍，
   * 也不必去问浏览器要 `getTotalLength()`。
   */
  length: number
}

/** 折线的实际长度 */
function medianLength(median: StrokeMedian): number {
  let total = 0
  for (let i = 1; i < median.length; i += 1) {
    const [x0 = 0, y0 = 0] = median[i - 1] ?? []
    const [x1 = 0, y1 = 0] = median[i] ?? []
    total += Math.hypot(x1 - x0, y1 - y0)
  }
  return total
}

/**
 * 算出每一笔的起笔时刻与时长。
 *
 * @param medians - 每一笔的中线，顺序即笔顺
 * @returns 与 `medians` 等长的排期数组；传空数组时返回空数组
 *
 * @example
 * const t = strokeTimings([shortDot, longStroke])
 * // t[0].duration < t[1].duration          点比长横快
 * // t[1].delay === t[0].duration + 150     第二笔等第一笔写完再起笔
 *
 * @example
 * strokeTimings([])   // []
 */
export function strokeTimings(medians: readonly StrokeMedian[]): StrokeTiming[] {
  if (medians.length === 0) return []

  const lengths = medians.map(medianLength)
  const total = lengths.reduce((sum, n) => sum + n, 0)
  // 全是零长度中线（数据坏了）时退回等时，别产出 NaN
  const average = total > 0 ? total / lengths.length : 1

  const timings: StrokeTiming[] = []
  let at = 0
  for (const length of lengths) {
    const duration = Math.max(MIN_STROKE_MS, STROKE_MS * (length / average))
    timings.push({ delay: at, duration, length })
    at += duration + STROKE_GAP_MS
  }
  return timings
}

/**
 * 整套动画从头到尾要多久（毫秒），末尾那次停顿不计。
 *
 * 给「播完自动收尾」这类调用方用，免得各自再累加一遍。
 *
 * @param timings - {@link strokeTimings} 的结果
 * @returns 总时长；空数组返回 0
 *
 * @example
 * totalDuration(strokeTimings(medians))   // 例如 4230
 */
export function totalDuration(timings: readonly StrokeTiming[]): number {
  const last = timings[timings.length - 1]
  return last === undefined ? 0 : last.delay + last.duration
}
