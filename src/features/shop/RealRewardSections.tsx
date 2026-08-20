/**
 * @file 现实兑换券的三个分区 —— 小体验 / 零食 / 大奖
 * @layer features
 * @see src/data/seed/realRewards.ts            预设清单与建议定价
 * @see src/features/parent/RewardConfigList.tsx 家长在哪儿上架
 *
 * ## ⭐ 没上架就不显示
 *
 * 上架等于家长**已经答应了这件事**。显示一张他没准备好的券，
 * 孩子点下去只会撞在「不能兑」上——那比看不见更伤。
 * 因此整个分区在一张都没上架时连标题都不渲染。
 *
 * ## 为什么现实券用 emoji 而不是手绘 SVG
 *
 * 它代表真实世界里的东西（冰淇淋、一本书），本就不该出现在宠物的画风里。
 * 小屋那半边用手绘 SVG 与宠物同源，这半边用 emoji，两种画风各自成立——
 * 混在一列里才会显得杂乱。
 */

import { REAL_REWARD_CATEGORIES, REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { utter } from '@/domain/speech'
import { ShopItemCard } from '@/features/shop/ShopItemCard'
import { ShopSection } from '@/features/shop/ShopSection'
import { say } from '@/platform/speech'
import type { BuyRequest } from '@/data/repositories/purchaseRepo'
import type { PurchaseVerdict } from '@/domain/economy/canPurchase'
import type { RealRewardConfig } from '@/domain/types'

interface RealRewardSectionsProps {
  /** 家长配置，按 presetId 索引。缺配置的券按预设建议值显示 */
  configs: Record<string, RealRewardConfig>
  /** 每件商品的可买判定，key 是 shopItemId */
  verdicts: Record<string, PurchaseVerdict>
  /** 点了某张券，交给上层弹二次确认 */
  onPick: (request: Omit<BuyRequest, 'profileId'>) => void
}

/**
 * 上架了的现实券，按大类分区渲染。
 *
 * @param onPick - ⚠️ 只是「想兑这张」，**不是**兑换本身。
 *                 现实券会占用家长真实的承诺，必须过二次确认（`BuyConfirm`）
 *
 * @example
 * <RealRewardSections configs={configs} verdicts={verdicts} onPick={setPending} />
 */
export function RealRewardSections({ configs, verdicts, onPick }: RealRewardSectionsProps) {
  const listed = REAL_REWARD_PRESETS.filter((p) => configs[p.id]?.listed === true)

  return (
    <>
      {REAL_REWARD_CATEGORIES.map(({ id, label }) => {
        const items = listed.filter((p) => p.category === id)
        if (items.length === 0) return null

        return (
          <ShopSection key={id} title={label}>
            {items.map((preset) => {
              const config = configs[preset.id]
              const price = config?.price ?? preset.suggestedPrice

              return (
                <ShopItemCard
                  key={preset.id}
                  label={preset.label}
                  price={price}
                  verdict={verdicts[preset.id] ?? { ok: true }}
                  emoji={preset.emoji}
                  onSpeak={() => say(utter([preset.clipKey], preset.label))}
                  onPick={() =>
                    onPick({
                      shopItemId: preset.id,
                      kind: 'real',
                      label: preset.label,
                      price,
                      // 冷却天数与上架状态跟着家长配置走，没配就用预设建议值
                      cooldownDays: config?.cooldownDays ?? preset.suggestedCooldownDays,
                      listed: true,
                    })
                  }
                />
              )
            })}
          </ShopSection>
        )
      })}
    </>
  )
}
