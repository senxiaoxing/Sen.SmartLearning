/**
 * @file 家长区 · 待兑现 —— 孩子换了、还没给到手的现实券
 * @layer features
 * @see src/data/repositories/purchaseQueries.ts  pendingRedemptions
 *
 * ⭐ 这份清单是整个现实兑换功能的**兑现保证**。
 * 孩子换了冰淇淋而家长忘了，App 承诺了、家长兑不了——
 * 那这个功能教的就是「攒星星没用」，比不做更糟。
 *
 * 因此这里显示「等了几天」而不只是兑换日期：一个数字比一个日期更能催人。
 */

import { useState } from 'react'
import { markFulfilled } from '@/data/repositories/purchaseRepo'
import { localDaysBetween, todayLocal } from '@/domain/time'
import type { Purchase, Uuid } from '@/domain/types'

interface PendingListProps {
  items: readonly Purchase[]
  /** 兑现之后重新拉一遍数据 */
  onChanged: () => void
}

export function PendingList({ items, onChanged }: PendingListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-blob bg-surface p-5 text-base leading-relaxed text-ink/50 shadow-card">
        没有待兑现的奖励。孩子换了现实里的东西，这里会列出来提醒你。
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <PendingRow key={item.id} item={item} onChanged={onChanged} />
      ))}
    </div>
  )
}

function PendingRow({ item, onChanged }: { item: Purchase; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const waited = localDaysBetween(item.localDate, todayLocal())

  const fulfil = async (id: Uuid) => {
    setBusy(true)
    await markFulfilled(id)
    onChanged()
  }

  return (
    <div className="flex items-center gap-4 rounded-blob bg-surface p-4 shadow-card">
      <span className="flex flex-col gap-1">
        <span className="text-lg font-bold">{item.label}</span>
        <span className="text-sm text-ink/45">
          {item.localDate} 换的
          {/*
            「等了 N 天」只在真的等了才显示。当天换的写「今天」，
            而不是「等了 0 天」——那个 0 读起来像出了错。
          */}
          {waited > 0 ? ` · 已经等了 ${waited} 天` : ' · 就在今天'}
        </span>
      </span>

      <button
        type="button"
        disabled={busy}
        onClick={() => void fulfil(item.id)}
        className="ml-auto shrink-0 rounded-full bg-correct px-5 py-3 text-base font-bold text-on-correct disabled:opacity-40"
      >
        已兑现
      </button>
    </div>
  )
}
