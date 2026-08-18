/**
 * @file 现实券的家长配置 —— 哪些上架、卖多少分、隔多久能再兑
 * @layer data  唯一允许接触 Dexie 的层
 * @see src/data/seed/realRewards.ts  预设清单与建议值
 * @see design/02-数据库Schema.md §3.12b
 *
 * 配置存在 `settings.realRewardConfigs`，不单开一张表：它就是一份家长设置，
 * 和时长限制、音量放在一起最自然，而且 `settings` 本就在备份范围内，
 * 不需要再动 schema 与备份迁移。
 */

import { db } from '@/data/db'
import { REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { nowIso } from '@/domain/time'
import type { RealRewardConfig, Uuid } from '@/domain/types'

/**
 * 读出全部现实券的当前配置，**缺失的预设补成「未上架」**。
 *
 * ⭐ 默认未上架，绝不能反过来。上架等于家长已经答应了这件事——
 * 孩子点了「冰淇淋」而家长当时给不了，一次都不能发生：
 * App 承诺了、家长兑不了，这个功能教的就是「攒星星没用」，比不做更糟。
 *
 * 补齐而不是只返回存过的那几条：调用方（商店、家长配置页）都要遍历
 * 全部预设，缺一条就得在两处各写一遍兜底。
 *
 * @param profileId - 档案 ID
 * @returns 与 `REAL_REWARD_PRESETS` 等长、同序的配置列表
 *
 * @example
 * const configs = await loadRealRewardConfigs(profileId)
 * // 从未配置过 → 每条都是 { listed: false, price: 建议价, cooldownDays: 建议冷却 }
 */
export async function loadRealRewardConfigs(profileId: Uuid): Promise<RealRewardConfig[]> {
  const stored = (await db.settings.get(profileId))?.realRewardConfigs ?? []
  const byId = new Map(stored.map((c) => [c.presetId, c]))

  return REAL_REWARD_PRESETS.map(
    (preset) =>
      byId.get(preset.id) ?? {
        presetId: preset.id,
        listed: false,
        price: preset.suggestedPrice,
        cooldownDays: preset.suggestedCooldownDays,
      },
  )
}

/**
 * 覆盖式保存全部配置。
 *
 * 整体替换而非逐条更新：家长配置页一次编辑一整张表，
 * 逐条写会在「改了 A 又改 B」时留下半新半旧的中间态。
 *
 * ⚠️ 只保留 `REAL_REWARD_PRESETS` 里还存在的 ID。某张券从预设里删掉之后，
 * 它的配置继续留在库里没有任何用处，只会让下次读取多出一条查不到预设的孤儿。
 * 已经兑换过的历史记录不受影响——那边冻结了 `label` 和 `pricePaid`。
 *
 * @param profileId - 档案 ID
 * @param configs - 完整的配置列表
 * @returns 实际存下的配置
 *
 * @example
 * await saveRealRewardConfigs(profileId, [
 *   { presetId: 'real-icecream', listed: true, price: 300, cooldownDays: 7 },
 * ])
 */
export async function saveRealRewardConfigs(
  profileId: Uuid,
  configs: readonly RealRewardConfig[],
): Promise<RealRewardConfig[]> {
  const settings = await db.settings.get(profileId)
  if (settings === undefined) return []

  const known = new Set(REAL_REWARD_PRESETS.map((p) => p.id))
  const kept = configs.filter((c) => known.has(c.presetId))

  await db.settings.put({ ...settings, realRewardConfigs: kept, updatedAt: nowIso() })
  return kept
}
