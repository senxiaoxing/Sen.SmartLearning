/**
 * @file 现实券的冷却剩余天数 —— 「再等 2 天就能换啦」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.12b  purchases 表与状态流转
 * @see CLAUDE.md 产品红线「每日任务」  冷却不是限购，是家长承诺的一部分
 *
 * 冷却**只作用于现实券**（`kind === 'real'`）。虚拟商品不设冷却：
 * 家具买过就永久拥有、零食只是个动画，都不需要拦。
 * 冷却存在的唯一理由是现实里的约束——一天连换三个冰淇淋，家长兑不起。
 */

import { localDaysBetween } from '@/domain/time'
import type { LocalDate } from '@/domain/types'

/**
 * 这张券还要等几天才能再兑。
 *
 * ⭐ **按「日历天」算，不按 24 小时**，因此比较的是 `localDate` 而非 `createdAt`。
 *
 * 24 小时制会产生「昨天下午 5 点兑的，今天下午 5 点前不行」——
 * 孩子上午想兑，被告知「还要等 6 小时」。她不理解小时，而且同一个「今天」里
 * 一会儿不行一会儿又行，看起来就是坏了。日历天则能说出口：「明天就可以啦」。
 * 这也是 `localDate` 字段存在的理由（见 CLAUDE.md 时间约定）。
 *
 * @param lastRedeemedOn - 这张券上次兑换的本地日期；从没兑过传 `undefined`
 * @param cooldownDays - 家长设定的冷却天数，`<= 0` 表示不限
 * @param today - 今天的本地日期
 * @returns 还需等待的天数，`0` 表示现在就能兑
 *
 * @example
 * // 冷却 3 天，8/18 兑过一次
 * cooldownDaysLeft('2026-08-18', 3, '2026-08-19')   // 2
 * cooldownDaysLeft('2026-08-18', 3, '2026-08-21')   // 0  隔满 3 天，可以了
 *
 * @example
 * // 从没兑过，或家长没设冷却
 * cooldownDaysLeft(undefined, 30, '2026-08-19')     // 0
 * cooldownDaysLeft('2026-08-18', 0, '2026-08-18')   // 0
 */
export function cooldownDaysLeft(
  lastRedeemedOn: LocalDate | undefined,
  cooldownDays: number,
  today: LocalDate,
): number {
  if (lastRedeemedOn === undefined || cooldownDays <= 0) return 0

  const elapsed = localDaysBetween(lastRedeemedOn, today)

  /**
   * 上限夹到 `cooldownDays`：设备日期被往回调过时 `elapsed` 会是负数，
   * 不夹的话会算出「还要等 400 天」这种没法向孩子解释的数字。
   * 夹住之后最坏情况只是从头再等一个完整冷却期，是可理解的行为。
   */
  return Math.min(cooldownDays, Math.max(0, cooldownDays - elapsed))
}
