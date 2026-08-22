/**
 * @file 年级设置 —— 家长区里选孩子在读几年级
 * @layer features
 * @see design/08-年级分区与内容扩展.md §6.2  为什么不做自动升级
 *
 * 这是全 App 牵连最广的一个设置：它同时决定答题区默认出哪个年级的内容、
 * 首页养的是哪一批伙伴、以及学习成果结算给谁。
 *
 * ⛔ **绝不按日期自动升级**。9 月 1 日自动跳意味着某天她打开 App
 * 发现伙伴换了一批、题目全变了，而没有任何人跟她说过。
 * 升年级是件大事，该由家长挑一个时机、当面告诉她。
 *
 * ⚠️ **只列已经做好内容的年级**（`openedGradeLevels()`）。
 * 让家长选一个空的年级，孩子进去会发现答题区一道题都没有——
 * 这和「未开放科目的宠物在睡觉」是同一条原则：给出的预期必须是诚实的。
 */

import { BigButton } from '@/components/BigButton'
import { GRADE_BADGE, GRADE_NAME } from '@/data/seed/gradeLabels'
import { openedGradeLevels } from '@/data/seed/pets'
import { gradeLevelOf, type Grade, type GradeLevel } from '@/domain/types'
import { useProfileStore } from '@/stores/profileStore'

/** 年级 → 该年级上学期。家长只选年级，学期由内容自己标（M2 位置就在一下） */
const firstTermOf = (gradeLevel: GradeLevel): Grade =>
  `${gradeLevel.charAt(1)}A` as Grade

export function GradeSetting() {
  const grade = useProfileStore((s) => s.grade)
  const setGrade = useProfileStore((s) => s.setGrade)
  const current = gradeLevelOf(grade)
  const opened = openedGradeLevels()

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">孩子在读几年级</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          决定答题区出哪个年级的题、养哪一批伙伴。上一批伙伴不会消失，
          会留在「我的伙伴」里。
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-blob bg-surface p-5 shadow-card">
        <div className="flex flex-wrap gap-3">
          {opened.map((g) => (
            <BigButton
              key={g}
              tone={g === current ? 'primary' : 'neutral'}
              ariaLabel={GRADE_NAME[g]}
              className={['flex-col gap-0 px-6 py-3', g === current ? '' : 'opacity-70'].join(' ')}
              onClick={() => void setGrade(firstTermOf(g))}
            >
              <span className="text-3xl leading-tight" aria-hidden="true">
                {GRADE_BADGE[g]}
              </span>
              <span className="text-sm font-normal opacity-80" aria-hidden="true">
                {GRADE_NAME[g]}
              </span>
            </BigButton>
          ))}
        </div>

        {opened.length === 1 && (
          <p className="text-sm text-ink/50">
            目前只做好了{GRADE_NAME[opened[0]!]}的内容。往后的年级做好一个就会出现一个。
          </p>
        )}
      </div>
    </section>
  )
}
