/**
 * @file 小结页的积分展示 —— 本轮赚到多少星星、一共攒了多少
 * @layer features
 * @see design/02-数据库Schema.md §3.12  ledger 表与积分经济平衡
 *
 * 对孩子只说「星星」，不说「积分」——
 * 一年级孩子不识字，⭐ 是她在任何游戏里都见过的通用符号，
 * 而「积分」两个字既读不出也没有画面。
 *
 * ⚠️ 本轮 0 分时整块不渲染（见 {@link PointsEarned}）。
 */

import { motion } from 'framer-motion'

interface PointsEarnedProps {
  /** 本轮赚到的星星 */
  earned: number
  /** 累计余额 */
  balance: number
}

/**
 * 本轮积分横幅。
 *
 * **一分没得时整块不显示**，而不是显示一个「+0」。
 * 全错的那一轮孩子本来就不好受，再给她看一个明晃晃的零，
 * 就是在她最需要台阶的时候补一刀。什么都不说反而更体面。
 *
 * 累计数只在本轮**确实有进账**时一起出现，这样它永远是个好消息。
 *
 * 动画只用 scale / opacity（GPU 合成），符合 CLAUDE.md 性能规范。
 *
 * @param earned - 本轮赚到的星星，`<= 0` 时不渲染任何内容
 * @param balance - 累计余额，展示为「一共 N 颗」
 *
 * @example
 * <PointsEarned earned={22} balance={138} />
 * // ⭐ +22    一共 138 颗
 */
export function PointsEarned({ earned, balance }: PointsEarnedProps) {
  if (earned <= 0) return null

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }}
      className="mt-3 flex items-center gap-3 rounded-blob bg-primary/15 px-6 py-3"
    >
      <span className="text-3xl" aria-hidden>
        ⭐
      </span>
      <span className="text-4xl font-bold tabular-nums text-primary">+{earned}</span>
      <span className="text-base text-ink/50">一共 {balance} 颗</span>
    </motion.div>
  )
}
