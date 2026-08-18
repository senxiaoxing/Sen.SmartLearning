/**
 * @file 商店状态 —— 有什么可买、买不买得起、刚买到了什么
 * @layer stores  编排，业务判定一律调 domain
 * @see src/domain/economy/canPurchase.ts     能不能买（纯函数）
 * @see src/data/repositories/purchaseRepo.ts 落库
 *
 * ⭐ **可买性在这里一次性算好**，不留给卡片各自去查。
 * 渲染路径里做 IndexedDB 查询是 CLAUDE.md 明令禁止的，
 * 而商店一屏就有二十来张卡片，每张各查一次必然掉帧。
 */

import { create } from 'zustand'
import { buyShopItem, type BuyRequest } from '@/data/repositories/purchaseRepo'
import { getBalance } from '@/data/repositories/ledgerRepo'
import { recentPurchases } from '@/data/repositories/purchaseQueries'
import { loadRealRewardConfigs } from '@/data/repositories/shopConfigRepo'
import { REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { ROOM_ITEMS, TREAT_ITEMS } from '@/data/seed/shopItems'
import { canPurchase, type PurchaseVerdict } from '@/domain/economy/canPurchase'
import { todayLocal } from '@/domain/time'
import type { Purchase, RealRewardConfig, Uuid } from '@/domain/types'

/** 刚买到的东西，驱动「星星变成了它」那段动画 */
export interface Celebration {
  label: string
  /** 虚拟商品的图形名；现实券没有 */
  art?: string
  /** 现实券的 emoji；虚拟商品没有 */
  emoji?: string
  /** 现实券要等家长兑现，庆祝语得跟着换一句 */
  pending: boolean
}

interface ShopState {
  loading: boolean
  /** 每件商品的可买判定，key 是 shopItemId */
  verdicts: Record<string, PurchaseVerdict>
  /** 现实券的家长配置，按 presetId 索引 */
  configs: Record<string, RealRewardConfig>
  celebration: Celebration | null
  load: (profileId: Uuid) => Promise<void>
  /** 买一件。成功时返回新余额，供调用方同步 sessionStore */
  buy: (profileId: Uuid, request: BuyRequest) => Promise<number | null>
  dismissCelebration: () => void
}

export const useShopStore = create<ShopState>((set, get) => ({
  loading: true,
  verdicts: {},
  configs: {},
  celebration: null,

  load: async (profileId) => {
    set({ loading: true })
    const [balance, purchases, configList] = await Promise.all([
      getBalance(profileId),
      recentPurchases(profileId),
      loadRealRewardConfigs(profileId),
    ])

    const configs = Object.fromEntries(configList.map((c) => [c.presetId, c]))
    set({
      loading: false,
      configs,
      verdicts: computeVerdicts(balance, purchases, configs),
    })
  },

  buy: async (profileId, request) => {
    const outcome = await buyShopItem(request)

    // 被拦下时只刷新判定：拒绝理由可能已经变了（比如刚好攒够了又被别处花掉），
    // 让界面显示最新的「还差多少」，而不是把旧提示留在屏幕上
    if (!outcome.ok) {
      await get().load(profileId)
      return null
    }

    await get().load(profileId)
    set({ celebration: celebrationOf(outcome.purchase) })
    return outcome.balanceAfter
  },

  dismissCelebration: () => set({ celebration: null }),
}))

/**
 * 给每件在售商品算一次可买性。
 *
 * 现实券未上架时**照样算进来**（判定会是 `not_listed`），由界面决定不显示它——
 * 判定表齐全，界面才能只做一件事：照着判定渲染。
 */
function computeVerdicts(
  balance: number,
  purchases: readonly Purchase[],
  configs: Record<string, RealRewardConfig>,
): Record<string, PurchaseVerdict> {
  const today = todayLocal()
  const historyOf = groupByItem(purchases)
  const verdicts: Record<string, PurchaseVerdict> = {}

  for (const item of ROOM_ITEMS) {
    verdicts[item.id] = canPurchase({
      kind: 'room',
      price: item.price,
      balance,
      history: historyOf[item.id] ?? [],
      today,
    })
  }

  for (const item of TREAT_ITEMS) {
    verdicts[item.id] = canPurchase({
      kind: 'treat',
      price: item.price,
      balance,
      history: historyOf[item.id] ?? [],
      today,
    })
  }

  for (const preset of REAL_REWARD_PRESETS) {
    const config = configs[preset.id]
    verdicts[preset.id] = canPurchase({
      kind: 'real',
      price: config?.price ?? preset.suggestedPrice,
      balance,
      history: historyOf[preset.id] ?? [],
      cooldownDays: config?.cooldownDays ?? preset.suggestedCooldownDays,
      listed: config?.listed ?? false,
      today,
    })
  }

  return verdicts
}

/** 按 shopItemId 分组。`canPurchase` 要求只传同一件商品的历史 */
function groupByItem(purchases: readonly Purchase[]): Record<string, Purchase[]> {
  const grouped: Record<string, Purchase[]> = {}
  for (const p of purchases) {
    ;(grouped[p.shopItemId] ??= []).push(p)
  }
  return grouped
}

function celebrationOf(purchase: Purchase): Celebration {
  const preset = REAL_REWARD_PRESETS.find((p) => p.id === purchase.shopItemId)
  const virtual = [...ROOM_ITEMS, ...TREAT_ITEMS].find((i) => i.id === purchase.shopItemId)

  return {
    label: purchase.label,
    ...(virtual !== undefined && { art: virtual.art }),
    ...(preset !== undefined && { emoji: preset.emoji }),
    pending: purchase.status === 'pending',
  }
}
