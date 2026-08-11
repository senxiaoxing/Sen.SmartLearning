/**
 * @file 升级横幅 —— 小结页顶部的伙伴成长提示
 * @layer features
 * @see design/06-宠物系统.md  6 个形态、每 2 级一变
 * @see src/domain/encourage/levelUpLine.ts  升级那句话由小结语统一说
 *
 * ⚠️ 只在**小结页**出现，绝不在答题中途弹窗（CLAUDE.md 宠物红线 7）。
 * 形态变化（破壳、进化）给更隆重的展示——那是孩子最期待的时刻，
 * 而普通升级保持轻量，避免每轮都大张旗鼓反而失去分量。
 *
 * ⭐ **这个组件不朗读任何东西**，纯展示。
 * 它曾经在自己的 effect 里念「团团变身啦」，而 `SessionSummary` 同时也在念小结语，
 * `say()` 又是打断式的——React 先跑子组件 effect、后跑父组件，
 * 结果升级播报每次刚开口就被掐掉，实际上从来没被听全过。
 * 现在升级那半句拼进小结语，一口气说完。
 */

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { PetAvatar } from '@/components/PetAvatar'
import { petDefinitionOf } from '@/data/seed/pets'
import { stageFromLevel } from '@/domain/pet/growth'
import { pickLine } from '@/domain/pet/personality'
import type { LevelUpNotice } from '@/stores/petStore'

/**
 * 一条升级/变身提示。
 *
 * @param notice - 升级信息。`stageChanged` 为 true 时是变身，展示更隆重
 *
 * @example
 * <LevelUpBanner notice={{ petName: '团团', toLevel: 6, stageChanged: true, … }} />
 */
export function LevelUpBanner({ notice }: { notice: LevelUpNotice }) {
  const def = petDefinitionOf(notice.subject, notice.gradeLevel)
  const currentStage = def?.stages[stageFromLevel(notice.toLevel)]

  /**
   * 宠物自己的升级台词（「我长大啦！」）。
   *
   * 只**显示**不朗读：语音那半句已经由小结语说了「团团变身啦」，
   * 再念一句第一人称的会让视角在同一口气里跳来跳去。
   * `useMemo` 是为了不让每次重渲染都换一句。
   */
  const line = useMemo(
    () => (def === undefined ? null : pickLine(def.personality, 'levelUp', Math.random())),
    [def],
  )

  if (def === undefined || currentStage === undefined) return null

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className="mb-2 flex items-center gap-3 rounded-blob px-6 py-3"
      // 用宠物自己的主题色而不是皮肤主色：三只各有各的颜色，
      // 这是她认伙伴的依据，不该被皮肤盖掉
      style={{ backgroundColor: `${def.themeColor}22` }}
    >
      {/* 变身是这一轮最值得看的一刻，横幅里的这只要动起来 */}
      <PetAvatar def={def} stageIndex={stageFromLevel(notice.toLevel)} size="md" animated />
      <div className="text-left">
        <p className="text-lg font-bold" style={{ color: def.themeColor }}>
          {notice.stageChanged ? `${notice.petName} 变身啦！` : `${notice.petName} 升级了！`}
        </p>
        <p className="text-sm text-ink/60">
          {notice.stageChanged ? `现在是${currentStage.label}` : `Lv${notice.toLevel}`}
          {/* 伙伴自己的一句话，让升级像它在跟你说话，而不是一条系统通知 */}
          {line !== null && <span className="text-ink/45"> · {line.text}</span>}
        </p>
      </div>
    </motion.div>
  )
}
