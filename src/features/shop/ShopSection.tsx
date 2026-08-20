/**
 * @file 商店里的一个分区 —— 标题 + 一排商品卡
 * @layer features
 * @see src/features/shop/ShopPage.tsx  分区怎么划、为什么这么划
 *
 * 单独成文件是因为它有三个调用方（小屋 / 零食 / 现实券三类分区），
 * 而现实券那部分已经拆到 `RealRewardSections.tsx` 去了——
 * 留在 ShopPage 里的话，两个文件得各写一遍同样的排版。
 */

import type { ReactNode } from 'react'

interface ShopSectionProps {
  title: string
  children: ReactNode
}

/**
 * 一个商品分区。
 *
 * ⚠️ 标题是给家长看的，孩子不识字——她认的是这一排里每张卡的图，
 * 所以卡片本身必须能点读商品名（见 `ShopItemCard` 的 `onSpeak`）。
 *
 * @example
 * <ShopSection title="给小屋">{cards}</ShopSection>
 */
export function ShopSection({ title, children }: ShopSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-ink/70">{title}</h2>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">
        {children}
      </div>
    </section>
  )
}
