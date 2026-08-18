/**
 * @file 家长区 · 兑换记录 —— 买过什么，以及撤销手滑的那一笔
 * @layer features
 * @see src/data/repositories/purchaseRepo.ts  refundPurchase
 *
 * ⭐ **为什么必须能撤销**：一年级孩子会手滑，88pt 触控加二次确认也拦不住全部。
 * 花掉的是她攒了几天的星星，手滑的代价不该由她承担。
 *
 * 撤销是**删记录 + 按成交价原额退分**，不留一条划掉的记录——
 * 孩子的「我买过什么」里出现一条被划掉的东西，传达的是「你买错了」。
 */

import { useState } from 'react'
import { refundPurchase } from '@/data/repositories/purchaseRepo'
import type { Purchase, Uuid } from '@/domain/types'

const STATUS_LABEL: Readonly<Record<Purchase['status'], string>> = {
  owned: '在小屋里',
  pending: '待兑现',
  fulfilled: '已完成',
}

interface PurchaseLogProps {
  items: readonly Purchase[]
  /** 退款成功后回传新余额，调用方据此同步孩子端显示的星星数 */
  onRefunded: (balanceAfter: number) => void
}

export function PurchaseLog({ items, onRefunded }: PurchaseLogProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-blob bg-surface p-5 text-base leading-relaxed text-ink/50 shadow-card">
        还没有兑换记录。
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <LogRow key={item.id} item={item} onRefunded={onRefunded} />
      ))}
    </div>
  )
}

function LogRow({
  item,
  onRefunded,
}: {
  item: Purchase
  onRefunded: (balanceAfter: number) => void
}) {
  /**
   * 两段式确认：第一下把按钮变成「确定撤销」，第二下才真的退。
   *
   * 不用弹窗——撤销要退回星星、还要让那件东西从小屋里消失，
   * 值得拦一道；但家长区是成年人在用，一个弹窗打断得太重。
   */
  const [arming, setArming] = useState(false)
  const [busy, setBusy] = useState(false)

  const refund = async (id: Uuid) => {
    setBusy(true)
    const result = await refundPurchase(id)
    if (result !== undefined) onRefunded(result.balanceAfter)
  }

  return (
    <div className="flex items-center gap-4 rounded-blob bg-surface p-4 shadow-card">
      <span className="flex flex-col gap-1">
        <span className="text-lg font-bold">{item.label}</span>
        <span className="text-sm text-ink/45">
          {item.localDate} · {item.pricePaid} 颗 · {STATUS_LABEL[item.status]}
        </span>
      </span>

      <button
        type="button"
        disabled={busy}
        onClick={() => (arming ? void refund(item.id) : setArming(true))}
        onBlur={() => setArming(false)}
        className={[
          'ml-auto shrink-0 rounded-full px-5 py-3 text-base font-bold disabled:opacity-40',
          arming ? 'bg-alert text-on-alert' : 'bg-surface-2 text-ink/60',
        ].join(' ')}
      >
        {arming ? '确定撤销' : '撤销'}
      </button>
    </div>
  )
}
