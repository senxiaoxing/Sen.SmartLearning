/**
 * @file 首页顶部的三只伙伴 —— 也是进宠物页的入口
 * @layer features
 * @see design/06-宠物系统.md
 *
 * ⚠️ **平铺展示，绝不排名**（CLAUDE.md 宠物红线第 3 条）：
 * 不按等级排序、不并列进度、不标「最厉害的是…」。
 * 孩子必然会偏向喜欢的科目，把差距摆到台面上等于惩罚她的兴趣。
 *
 * 数学那只画大一点，纯粹是因为它排在中间、内容也最多，
 * 不是因为它「更重要」——三只的顺序与尺寸都是固定的，不随进度变化。
 */

import { PetAvatar } from '@/components/PetAvatar'
import { isOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState } from '@/domain/types'

interface HomePetsProps {
  pets: PetState[]
  /** 生日当天给每只挂个蛋糕 */
  festive?: boolean
  onOpen: () => void
}

/**
 * 三只伙伴的一排头像。
 *
 * @example
 * <HomePets pets={pets} festive={birthday} onOpen={() => navigate('/pets')} />
 */
export function HomePets({ pets, festive = false, onOpen }: HomePetsProps) {
  return (
    <button
      type="button"
      aria-label="我的伙伴"
      onClick={onOpen}
      className="flex items-end gap-2 rounded-blob px-4 py-2"
    >
      {pets.map((pet) => {
        const def = petDefinitionOf(pet.subject, pet.gradeLevel)
        if (def === undefined) return null
        return (
          <PetAvatar
            key={pet.id}
            def={def}
            stageIndex={levelProgress(pet.exp, pet.gradeLevel).stage}
            size={pet.subject === 'math' ? 'md' : 'sm'}
            // 未开放科目的伙伴在睡觉，不是没养好 —— 宠物红线第 4 条
            asleep={!isOpened(pet.subject, pet.gradeLevel)}
            animated={false}
            festive={festive}
          />
        )
      })}
    </button>
  )
}
