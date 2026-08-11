/**
 * @file 宠物卡片 —— 主页与宠物页共用的单只展示
 * @layer features
 *
 * ⚠️ 卡片上**不显示任何跨宠物的比较信息**（排名、"最高级的是…"）。
 * 孩子必然偏向喜欢的科目，把差距摆上台面只会让她对落后的那只愧疚——
 * 那是在惩罚她的兴趣。见 CLAUDE.md 产品红线。
 */

import { motion } from 'framer-motion'
import { PetAvatar, PetLevelBar } from '@/components/PetAvatar'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState } from '@/domain/types'

interface PetCardProps {
  pet: PetState
  onTap?: () => void
  compact?: boolean
}

export function PetCard({ pet, onTap, compact = false }: PetCardProps) {
  const def = petDefinitionOf(pet.subject, pet.gradeLevel)
  if (def === undefined) return null

  const progress = levelProgress(pet.exp)
  const opened = isSubjectOpened(pet.subject)

  return (
    <motion.button
      type="button"
      onClick={onTap}
      whileTap={onTap === undefined ? undefined : { scale: 0.97 }}
      className={[
        'flex items-center gap-4 rounded-blob bg-white px-5 py-4 text-left shadow-[0_5px_0_#E8DFCC]',
        compact ? 'w-full' : 'w-full',
      ].join(' ')}
    >
      <PetAvatar
        def={def}
        stageIndex={progress.stage}
        size={compact ? 'sm' : 'md'}
        asleep={!opened}
        animated={false}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-xl font-bold">{pet.name}</span>
          <span className="shrink-0 text-sm text-ink/40">{def.species}</span>
        </div>

        {opened ? (
          <>
            <p className="mt-0.5 truncate text-sm text-ink/50">{def.personality.catchphrase}</p>
            <div className="mt-2">
              <PetLevelBar
                level={progress.level}
                ratio={progress.ratio}
                isMax={progress.isMax}
                color={def.themeColor}
              />
            </div>
          </>
        ) : (
          // ⚠️ 内容还没做好是 App 的问题，不能让孩子觉得是自己没养好
          <p className="mt-1 text-sm text-ink/40">还在睡觉，等课程准备好就醒来～</p>
        )}
      </div>
    </motion.button>
  )
}
