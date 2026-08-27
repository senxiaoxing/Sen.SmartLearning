/**
 * @file 首页的主行动按钮 —— 决定这一屏「从哪里开始」
 * @layer features
 * @see src/features/home/SubjectPicker.tsx  挑科目的那一档
 *
 * 三种形态互斥，永远只出现一个：
 *
 * | 情形 | 长什么样 | 为什么 |
 * |---|---|---|
 * | 还没做过摸底 | 「一起去探险」＋一行小字「跳过」 | 避免上过幼小衔接的孩子从「数一数」开始 |
 * | 开放科目 > 1 | 三只伙伴的头像 | 宠物即标签，她认形象不认字 |
 * | 只开了一科 | 「开始学习」 | 多一层选择是纯粹的干扰 |
 *
 * ⚠️ 「跳过」刻意做得小而灰：摸底只有几道题，跳过它的代价是起点定位不准，
 * 而那会一路影响到后面每一次出题。做成同等分量的按钮等于鼓励她跳过。
 */

import { BigButton } from '@/components/BigButton'
import { SubjectPicker } from '@/features/home/SubjectPicker'
import type { PetState, Subject } from '@/domain/types'

interface HomeStartActionProps {
  /** 还没做过摸底测评 */
  needsAssessment: boolean
  /** 这次要学的年级开放了哪些科目 */
  openSubjects: readonly Subject[]
  /** 陪她的三只，只作形象。⚠️ 与 `openSubjects` 的年级可以不同，见 useCompanionPets */
  pets: readonly PetState[]
  onAssess: () => void
  /** 开一轮。⚠️ 实现方必须在这个同步栈里解锁 iOS 音频 */
  onStart: (subject: Subject) => void
}

/**
 * 首页主按钮。
 *
 * @example
 * <HomeStartAction
 *   needsAssessment={false}
 *   openSubjects={['math', 'pinyin', 'english']}
 *   pets={companions}
 *   onAssess={() => navigate('/assessment')}
 *   onStart={beginSession}
 * />
 */
export function HomeStartAction({
  needsAssessment,
  openSubjects,
  pets,
  onAssess,
  onStart,
}: HomeStartActionProps) {
  if (needsAssessment) {
    return (
      <div className="flex flex-col items-center gap-3">
        <BigButton tone="primary" className="px-12 py-6 text-3xl" onClick={onAssess}>
          一起去探险
        </BigButton>
        <button
          type="button"
          onClick={() => onStart('math')}
          className="px-4 py-2 text-base text-ink/40"
        >
          跳过，直接开始
        </button>
      </div>
    )
  }

  if (openSubjects.length > 1) {
    return <SubjectPicker pets={pets} openSubjects={openSubjects} onPick={onStart} />
  }

  return (
    <BigButton
      tone="primary"
      className="px-12 py-6 text-3xl"
      onClick={() => onStart(openSubjects[0] ?? 'math')}
    >
      开始学习
    </BigButton>
  )
}
