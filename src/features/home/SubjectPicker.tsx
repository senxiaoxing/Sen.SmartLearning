/**
 * @file 科目选择 —— 「今天跟谁一起学？」
 * @layer features
 * @see design/06-宠物系统.md  三只科目伙伴
 *
 * ⚠️ 孩子不识字，所以**宠物就是标签**：她认不出「拼音」两个字，
 * 但一眼就认得那只小飞龙。科目名只作辅助，真正起作用的是形象。
 *
 * ⭐ 只在开放科目**多于一个**时才出现。只有数学时多一层选择是纯粹的干扰——
 * 主要功能不超过 2 层（CLAUDE.md UI 约束）。
 */

import { motion } from 'framer-motion'
import { PetAvatar } from '@/components/PetAvatar'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { SUBJECT_LABEL } from '@/data/seed/subjects'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState, Subject } from '@/domain/types'

interface SubjectPickerProps {
  pets: readonly PetState[]
  onPick: (subject: Subject) => void
}

export function SubjectPicker({ pets, onPick }: SubjectPickerProps) {
  const openPets = pets.filter((p) => isSubjectOpened(p.subject))

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xl text-ink/60">今天跟谁一起学？</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {openPets.map((pet) => {
          const def = petDefinitionOf(pet.subject, pet.gradeLevel)
          if (def === undefined) return null

          return (
            <motion.button
              key={pet.id}
              type="button"
              aria-label={`和${pet.name}一起学${SUBJECT_LABEL[pet.subject]}`}
              onClick={() => onPick(pet.subject)}
              whileTap={{ scale: 0.95, y: 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              // 只动 scale / y（GPU 合成属性），不碰尺寸属性
              className="flex min-h-touch min-w-touch flex-col items-center gap-2 rounded-blob bg-white px-8 py-5 shadow-[0_6px_0_#E8DFCC]"
            >
              <PetAvatar def={def} stageIndex={levelProgress(pet.exp).stage} size="md" animated />
              <span className="text-2xl font-bold" style={{ color: def.themeColor }}>
                {SUBJECT_LABEL[pet.subject]}
              </span>
              {/* 宠物名字是孩子自己起的，比科目名更有召唤力 */}
              <span className="text-sm text-ink/40">{pet.name}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
