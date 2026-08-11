/**
 * @file 升级横幅 —— 小结页顶部的伙伴成长提示
 * @layer features
 * @see design/06-宠物系统.md  6 个形态、每 2 级一变
 *
 * ⚠️ 只在**小结页**出现，绝不在答题中途弹窗（CLAUDE.md 宠物红线 7）。
 * 形态变化（破壳、进化）给更隆重的展示——那是孩子最期待的时刻，
 * 而普通升级保持轻量，避免每轮都大张旗鼓反而失去分量。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { PetAvatar } from '@/components/PetAvatar'
import { petDefinitionOf } from '@/data/seed/pets'
import { stageFromLevel } from '@/domain/pet/growth'
import { speak } from '@/platform/tts'
import type { LevelUpNotice } from '@/stores/petStore'

/**
 * 一条升级/变身提示。
 *
 * @param notice - 升级信息。`stageChanged` 为 true 时是变身，文案与语音都更隆重
 *
 * @example
 * <LevelUpBanner notice={{ petName: '团团', toLevel: 6, stageChanged: true, … }} />
 */
export function LevelUpBanner({ notice }: { notice: LevelUpNotice }) {
  const def = petDefinitionOf(notice.subject, notice.gradeLevel)
  const currentStage = def?.stages[stageFromLevel(notice.toLevel)]

  useEffect(() => {
    if (def === undefined || currentStage === undefined) return
    speak(
      notice.stageChanged
        ? `${notice.petName}变身啦！现在是${currentStage.label}`
        : `${notice.petName}升到 ${notice.toLevel} 级啦`,
    )
  }, [notice, def, currentStage])

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
        </p>
      </div>
    </motion.div>
  )
}
