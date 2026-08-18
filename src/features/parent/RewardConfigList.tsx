/**
 * @file 家长区 · 现实券配置 —— 这周能给什么，就上架什么
 * @layer features
 * @see src/data/repositories/shopConfigRepo.ts
 *
 * ⭐ **没有「保存」按钮**：每一处改动即时落库。
 * 家长设完就走是常态，一个保存按钮只会制造「以为设好了其实没存上」——
 * 而那个错误要等到孩子兑不出东西才会被发现。
 *
 * ⚠️ 券只能从预设清单里挑，家长不能自由输入名字。
 * 商品名要朗读给不识字的孩子听，而自由输入的名字没有预生成音频，
 * 只能整句降级 TTS，和同页其余的少女音混在一起——
 * 与昵称、宠物名同一条铁律（design/07 §2.5b）。
 */

import { REAL_REWARD_CATEGORIES, REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { RewardConfigRow } from '@/features/parent/RewardConfigRow'
import type { RealRewardConfig } from '@/domain/types'

interface RewardConfigListProps {
  configs: readonly RealRewardConfig[]
  /** 任何一行改动都立即回传整份配置，由调用方落库 */
  onChange: (next: RealRewardConfig[]) => void
}

export function RewardConfigList({ configs, onChange }: RewardConfigListProps) {
  const byId = new Map(configs.map((c) => [c.presetId, c]))

  const replace = (next: RealRewardConfig) => {
    onChange(configs.map((c) => (c.presetId === next.presetId ? next : c)))
  }

  const listedCount = configs.filter((c) => c.listed).length

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-blob bg-surface/60 p-4 text-sm leading-relaxed text-ink/50">
        勾上的券会出现在孩子的商店里。
        <strong className="font-bold text-ink/70">上架就等于你已经答应了</strong>
        ——她随时可能换，而换了却给不了，比看不见更伤。
        {listedCount === 0 && '（现在一张都没上架，孩子的商店里只有小屋的东西。）'}
      </p>

      {REAL_REWARD_CATEGORIES.map(({ id, label }) => (
        <section key={id} className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-ink/70">{label}</h3>
          {REAL_REWARD_PRESETS.filter((p) => p.category === id).map((preset) => {
            const config = byId.get(preset.id)
            if (config === undefined) return null
            return (
              <RewardConfigRow
                key={preset.id}
                preset={preset}
                config={config}
                onChange={replace}
              />
            )
          })}
        </section>
      ))}
    </div>
  )
}
