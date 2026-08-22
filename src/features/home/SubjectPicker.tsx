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
import { petDefinitionOf } from '@/data/seed/pets'
import { SUBJECT_LABEL } from '@/data/seed/subjects'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState, Subject } from '@/domain/types'

interface SubjectPickerProps {
  /** 她正在养的那批伙伴（档案年级的），只作形象 */
  pets: readonly PetState[]
  /**
   * 这次要学的年级开放了哪些科目。
   *
   * ⚠️ 与 `pets` 的年级**可以不同**：三年级的孩子切回一年级答题区时，
   * 陪她的仍然是三年级那三只伙伴（她正在养的），
   * 但能做的科目由一年级的内容决定。宠物代表「我在养谁」，不是「我在做哪年级的题」。
   */
  openSubjects: readonly Subject[]
  onPick: (subject: Subject) => void
}

export function SubjectPicker({ pets, openSubjects, onPick }: SubjectPickerProps) {
  const openPets = pets.filter((p) => openSubjects.includes(p.subject))

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
              className="flex min-h-touch min-w-touch flex-col items-center gap-2 rounded-blob bg-surface px-8 py-5 shadow-drop-surface"
            >
              <PetAvatar
                def={def}
                stageIndex={levelProgress(pet.exp, pet.gradeLevel).stage}
                size="md"
                animated
              />
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
