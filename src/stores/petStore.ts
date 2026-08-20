/**
 * @file 宠物状态编排
 * @layer stores
 */

import { create } from 'zustand'
import { addExp, loadPets, movePetInRoom, renamePet } from '@/data/repositories/petRepo'
import { EXP_REWARDS } from '@/domain/pet/growth'
import { clampRoomSpot, type RoomSpot } from '@/domain/pet/roomSpot'
import type { GradeLevel, PetState, Subject, Uuid } from '@/domain/types'

/** 一轮结束后待展示的升级消息 */
export interface LevelUpNotice {
  subject: Subject
  gradeLevel: GradeLevel
  petName: string
  toLevel: number
  /** 形态是否发生变化（破壳、进化），这种要给更隆重的展示 */
  stageChanged: boolean
}

interface PetStoreState {
  pets: PetState[]
  /** 上一轮的升级结果，供小结页展示后清空 */
  levelUpNotice: LevelUpNotice | null

  load: (profileId: Uuid, gradeLevel: GradeLevel) => Promise<void>
  /** 结算一轮学习的经验 */
  settleSession: (
    profileId: Uuid,
    subject: Subject,
    gradeLevel: GradeLevel,
    stats: { correct: number; retryCorrect: number; masteredCount: number },
  ) => Promise<void>
  rename: (
    profileId: Uuid,
    subject: Subject,
    gradeLevel: GradeLevel,
    name: string,
  ) => Promise<void>
  /** 把伙伴摆到小屋的某个位置 */
  moveInRoom: (petId: Uuid, spot: RoomSpot) => Promise<void>
  clearNotice: () => void
}

export const usePetStore = create<PetStoreState>((set, get) => ({
  pets: [],
  levelUpNotice: null,

  load: async (profileId, gradeLevel) => {
    set({ pets: await loadPets(profileId, gradeLevel) })
  },

  /**
   * 把一轮的学习成果换算成经验，加给对应科目的宠物。
   *
   * 经验来源刻意包含**订正答对**——它和首次答对一样值得奖励，
   * 否则孩子会回避错题（见 CLAUDE.md 产品红线）。
   */
  settleSession: async (profileId, subject, gradeLevel, stats) => {
    const gained =
      stats.correct * EXP_REWARDS.correct +
      stats.retryCorrect * EXP_REWARDS.retryCorrect +
      stats.masteredCount * EXP_REWARDS.masterKnowledgePoint +
      EXP_REWARDS.sessionComplete

    const result = await addExp(profileId, subject, gradeLevel, gained)
    await get().load(profileId, gradeLevel)

    set({
      levelUpNotice:
        result?.leveledUp === true
          ? {
              subject,
              gradeLevel,
              petName: result.pet.name,
              toLevel: result.toLevel,
              stageChanged: result.stageChanged,
            }
          : null,
    })
  },

  rename: async (profileId, subject, gradeLevel, name) => {
    await renamePet(profileId, subject, gradeLevel, name)
    await get().load(profileId, gradeLevel)
  },

  /**
   * 摆放伙伴。
   *
   * ⭐ **先改内存再落库，落库后不重新 load**。拖动松手那一刻画面已经在新位置上了，
   * 再等一次 IndexedDB 往返然后整表刷新，只会让三只闪一下——
   * 而且 `load()` 会重排数组，正在拖的那只可能被换掉 key。
   */
  moveInRoom: async (petId, spot) => {
    const clamped = clampRoomSpot(spot)
    set({
      pets: get().pets.map((p) =>
        p.id === petId ? { ...p, roomX: clamped.x, roomY: clamped.y } : p,
      ),
    })
    await movePetInRoom(petId, clamped)
  },

  clearNotice: () => set({ levelUpNotice: null }),
}))
