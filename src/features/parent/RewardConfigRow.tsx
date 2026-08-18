/**
 * @file 家长区 · 一张现实券的配置行
 * @layer features
 * @see src/data/seed/realRewards.ts  预设与建议值
 *
 * ⭐ **上架 = 承诺**。勾上之后孩子随时可能换，所以这一栏放在最左边、
 * 也是唯一一眼能看出状态的东西——家长每次进来先确认的就是「我这周能给什么」。
 *
 * 价格与冷却做成可改：「小礼物 / 大礼物」具体是什么由家长定，
 * **而价格就是它的定义**，预设给的只是建议值。
 */

import type { RealRewardPreset } from '@/data/seed/realRewards'
import type { RealRewardConfig } from '@/domain/types'

interface RewardConfigRowProps {
  preset: RealRewardPreset
  config: RealRewardConfig
  onChange: (next: RealRewardConfig) => void
}

export function RewardConfigRow({ preset, config, onChange }: RewardConfigRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-blob bg-surface p-4 shadow-card">
      <label className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={config.listed}
          onChange={(e) => onChange({ ...config, listed: e.target.checked })}
          className="h-6 w-6 shrink-0 accent-correct"
        />
        <span aria-hidden className="text-2xl">
          {preset.emoji}
        </span>
        {/*
          ⚠️ 不能 `truncate`。「今晚睡前故事你来选」这类名字在这个宽度下会被
          截成「今晚睡前故事…」，而家长要靠名字确认自己到底答应了什么——
          省略号恰好吃掉最关键的那半句。宁可换行，也不能截断。
        */}
        <span
          className={[
            'text-base font-bold leading-snug',
            config.listed ? '' : 'text-ink/40',
          ].join(' ')}
        >
          {preset.label}
        </span>
      </label>

      <NumberField
        label="星星"
        value={config.price}
        min={1}
        onCommit={(price) => onChange({ ...config, price })}
      />
      <NumberField
        label="冷却天"
        value={config.cooldownDays}
        min={0}
        onCommit={(cooldownDays) => onChange({ ...config, cooldownDays })}
      />
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  onCommit: (value: number) => void
}

/**
 * 数字输入。
 *
 * ⚠️ 非法输入**回退到原值**而不是存成 0 或 NaN：价格为 0 会变成 0 元购，
 * 而 `planPurchase` 对非正价格直接抛错——那会表现成「点了没反应」，
 * 排查起来要绕一大圈。在入口挡住最省事。
 */
function NumberField({ label, value, min, onCommit }: NumberFieldProps) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-ink/50">
      {label}
      <input
        type="number"
        defaultValue={value}
        min={min}
        // 逐字符写库没必要，离开输入框时提交一次就够
        onBlur={(e) => {
          const next = Number.parseInt(e.target.value, 10)
          if (Number.isInteger(next) && next >= min) onCommit(next)
          else e.target.value = String(value)
        }}
        className="w-20 rounded-xl bg-surface-2 px-3 py-2 text-right text-base font-bold text-ink"
      />
    </label>
  )
}
