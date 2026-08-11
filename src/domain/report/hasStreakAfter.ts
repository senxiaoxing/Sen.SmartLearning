/**
 * @file 连对判定 —— 某时刻之后，这个知识点有没有练熟
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/report/wrongBook.ts  错题「已解决」的第二条通路
 *
 * 单独成文件而不是塞进 wrongBook：它回答的是「这个知识点过关了吗」，
 * 与「整理错题清单」是两件事，且订正排期（selectRetryItems）也要参照同一个阈值。
 */

import type { Attempt } from '@/domain/types'

/**
 * 同一知识点连续答对多少次，就认为那道错题不必再挂着。
 *
 * ⚠️ 数学题是随机生成的，`9+5` 这个具体算式可能几个月都不会再抽到。
 * 若只认「同一道题做对」，孩子早就把进位加法练熟了，
 * 错题本里还挂着那道 9+5——清单会慢慢积满**其实已经不成立的**条目。
 *
 * 取 3 而不是掌握判定用的 5（stateMachine 的 `MASTERED_MIN_CONSECUTIVE_CORRECT`）：
 * 这里要回答的是「这道错题还需要管吗」，比「整个知识点掌握了吗」宽松一档。
 * 而且一轮订正 10 题分给 2~3 个知识点，每个正好 3~5 题，
 * 取 5 会导致一轮订正下来一道错题都清不掉，孩子看不到努力的结果。
 */
export const DEFAULT_RESOLVE_STREAK = 3

/**
 * 某时刻之后，这个知识点是否出现过连续 `streak` 次答对。
 *
 * 取「曾经达到过」而非「当前仍保持」：她在错完之后连对了 3 次，
 * 就说明那次错误已经翻篇了；再往后又错，那是一条**新的**错误记录，
 * 会以自己的身份进入错题本。
 *
 * @param kpAttempts - 该知识点的作答，**必须按时间升序**
 * @param afterMs - 起算时刻（那次答错的时间戳，毫秒）
 * @param streak - 需要的连对次数；`<= 0` 视为关闭本判定
 * @returns 达成过连对则为 `true`
 *
 * @example
 * // 错完之后连对 3 次 → 视为过关
 * hasStreakAfter(attempts, wrongAt, 3)   // true
 *
 * @example
 * // 对、对、错、对 —— 最长连对只有 2，不算
 * hasStreakAfter(attempts, wrongAt, 3)   // false
 */
export function hasStreakAfter(
  kpAttempts: readonly Attempt[],
  afterMs: number,
  streak: number,
): boolean {
  if (streak <= 0) return false

  let run = 0
  for (const a of kpAttempts) {
    if (new Date(a.createdAt).getTime() <= afterMs) continue
    if (!a.isCorrect) {
      run = 0
      continue
    }
    run++
    if (run >= streak) return true
  }
  return false
}
