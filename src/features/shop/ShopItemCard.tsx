/**
 * @file 商店里的一张商品卡
 * @layer features
 * @see src/domain/economy/canPurchase.ts  `verdict` 的来源
 *
 * 无障碍约束（一年级孩子不识字）：
 * - 点一下先**朗读商品名**，不直接下单——那一下是「这是什么」，不是「我要买」
 * - 整卡可点，触控区远超 88×88 pt
 * - 买不起时**不灰掉藏起来**，改说「再攒 N 颗」。
 *   看得见的差距驱动行为，消失的选项只制造困惑（design/02 §3.13 图鉴同理）
 */

import { motion } from 'framer-motion'
import { ShopItemArt } from '@/components/room/ShopItemArt'
import type { PurchaseVerdict } from '@/domain/economy/canPurchase'

interface ShopItemCardProps {
  label: string
  price: number
  verdict: PurchaseVerdict
  /** 虚拟商品的图形名 */
  art?: string
  /** 现实券的图标 */
  emoji?: string
  /** 点一下：先朗读名字 */
  onSpeak: () => void
  /** 再点一下：进入购买确认 */
  onPick: () => void
}

export function ShopItemCard({
  label,
  price,
  verdict,
  art,
  emoji,
  onSpeak,
  onPick,
}: ShopItemCardProps) {
  const owned = !verdict.ok && verdict.reason === 'already_owned'

  return (
    <motion.button
      type="button"
      aria-label={`${label}，${price} 颗星星`}
      whileTap={{ scale: owned ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onClick={() => {
        onSpeak()
        if (!owned) onPick()
      }}
      className={[
        'flex min-h-[11rem] w-40 flex-col items-center gap-2 rounded-blob bg-surface p-4 shadow-card',
        owned ? 'opacity-70' : '',
      ].join(' ')}
    >
      <span className="flex h-16 w-full items-center justify-center" aria-hidden>
        {art !== undefined ? <ShopItemArt art={art} /> : <span className="text-5xl">{emoji}</span>}
      </span>

      <span className="text-lg font-bold leading-tight">{label}</span>
      <PriceTag price={price} verdict={verdict} />
    </motion.button>
  )
}

/**
 * 价签。
 *
 * ⚠️ 买不起时显示的是「再攒 30 颗」而不是划掉价格或标「不可用」：
 * 前者是一个能达成的目标，后者是一次拒绝。
 */
function PriceTag({ price, verdict }: { price: number; verdict: PurchaseVerdict }) {
  if (!verdict.ok) {
    if (verdict.reason === 'already_owned') {
      return <span className="mt-auto text-base font-bold text-correct">已经有啦</span>
    }
    if (verdict.reason === 'cooling_down') {
      return (
        <span className="mt-auto text-base font-bold text-ink/45">
          再等 {verdict.daysLeft} 天
        </span>
      )
    }
    if (verdict.reason === 'insufficient_balance') {
      return (
        <span className="mt-auto text-base font-bold text-ink/45">
          再攒 {verdict.shortBy} 颗
        </span>
      )
    }
  }

  return (
    <span className="mt-auto flex items-center gap-1 text-lg font-bold text-alert">
      <span aria-hidden>⭐</span>
      <span className="tabular-nums">{price}</span>
    </span>
  )
}
