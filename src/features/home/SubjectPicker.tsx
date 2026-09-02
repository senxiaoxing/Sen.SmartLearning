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
              /*
                ⭐ 卡片顶部一层该科目主题色的光晕，让三张卡各有身份。
                三张纯白卡片摆在一起时，唯一的区别是科目名那两个字的颜色——
                而她不识字，等于三张一模一样的卡。光晕把「宠物即标签」那套
                颜色识别从头像扩到整张卡：淡蓝是数学、淡紫是语文、淡绿是英语。

                ⚠️ 拼在 `var(--sf-raised)` **前面**：光晕在上、卡片面的微渐变在下，
                两者叠加。写在 style 里而不是 className，是因为主题色是宠物**内容数据**
                （`pets.ts` 的 hex），不是皮肤语义色——它不该随皮肤变，
                否则墨墨在星际皮肤下就不是紫的了。
                `26` / `00` 是 8 位 hex 的 alpha（15% → 0%）。
              */
              style={{
                backgroundImage: `radial-gradient(125% 80% at 50% 0%, ${def.themeColor}26, ${def.themeColor}00 66%), var(--sf-raised)`,
              }}
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
              {/* 宠物名字是孩子自己起的，比科目名更有召唤力。
                  ⚠️ 别再压到 40% 以下 —— 那是「装饰性文字」的透明度，
                  而这行是她给伙伴起的名字，不该淡到看不见 */}
              <span className="text-sm text-ink/55">{pet.name}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
