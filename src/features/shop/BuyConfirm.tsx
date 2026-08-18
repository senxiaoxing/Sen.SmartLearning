/**
 * @file 购买确认 —— 「要用星星换它吗」
 * @layer features
 * @see src/features/shop/BuyCelebration.tsx  确认之后那段转化动画
 *
 * ⭐ **为什么一定要有这一步**：一年级孩子会手滑，88pt 触控区拦不住全部。
 * 花掉的星星是她攒了几天的东西，误触的代价太高。
 *
 * 但确认框不是惩罚：两个按钮一样大、一样好按，「再想想」不做成灰色小字——
 * 反悔应该和确认一样容易。
 */

import { motion } from 'framer-motion'
import { BigButton } from '@/components/BigButton'

interface BuyConfirmProps {
  label: string
  price: number
  /** 现实券要等家长兑现，这里就得先说清楚 */
  isReal: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function BuyConfirm({ label, price, isReal, onConfirm, onCancel }: BuyConfirmProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6"
      onClick={onCancel}
    >
      <motion.div
        role="dialog"
        aria-label={`要用 ${price} 颗星星换 ${label} 吗`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-blob bg-surface p-7 shadow-card"
      >
        <p className="text-center text-2xl font-bold leading-snug">
          要用 <PriceChip price={price} /> 换<span className="text-primary">{label}</span> 吗？
        </p>

        {isReal && (
          // 先说清楚它不会立刻出现在手里，孩子才不会以为 App 坏了
          <p className="text-center text-base leading-relaxed text-ink/55">
            换好以后会告诉爸爸妈妈，他们准备好就给你哦
          </p>
        )}

        {/*
          两个按钮等宽等高：反悔要和确认一样容易。

          ⚠️ 「再想想」额外加了一圈描边。`tone="neutral"` 的底色就是 `surface`，
          而弹层本身也是 `surface`——不描边的话它整个融进背景，
          看起来根本不像个按钮。实际跑起来才发现的：确认键很显眼、
          取消键几乎隐形，那就等于把孩子往「买」的方向推。
        */}
        <div className="flex w-full gap-3">
          <BigButton
            tone="neutral"
            fullWidth
            className="py-4 text-xl ring-2 ring-ink/15"
            onClick={onCancel}
          >
            再想想
          </BigButton>
          <BigButton tone="primary" fullWidth className="py-4 text-xl" onClick={onConfirm}>
            好呀
          </BigButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * 价格标签。
 *
 * ⚠️ 写的是「⭐300」，**绝不写「-300」**。
 * 花星星在孩子眼里是「我的东西被拿走了」——整个购买流程都要把它演成
 * 「星星变成了台灯」这个转化，而不是一次扣减。见 BuyCelebration。
 */
function PriceChip({ price }: { price: number }) {
  return (
    <span className="mx-1 inline-flex items-center gap-1 align-middle text-alert">
      <span aria-hidden>⭐</span>
      <span className="tabular-nums">{price}</span>
    </span>
  )
}
