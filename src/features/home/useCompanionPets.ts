/**
 * @file 这次陪她的是哪三只 —— 首页伙伴形象的来源
 * @layer features
 * @see src/stores/sessionStore.ts  `contentGradeLevel` 与档案年级为什么必须分开
 * @see design/08-年级分区与内容扩展.md §10 阶段 4  经验永远结算给档案年级
 *
 * ## ⭐ 形象跟着「做哪个年级的题」走，结算不跟
 *
 * 二年级只开了数学，小白和咩咩还睡着。而她切回一年级答题区时，
 * 首页科目选择器里却写着「和小白一起学拼音」——同一只伙伴，
 * 伙伴页说它还没醒，首页让她点进去一起学。二年级开放后第一次露出来的矛盾。
 *
 * 解法是让**形象**跟内容年级走：做一年级的题，陪她的就是当年那三只。
 *
 * ⛔ **经验结算绝不能跟着改**。它永远算给档案年级的伙伴
 * （`sessionStore` 里已经是这样，别去动它）——否则她切回一年级做几道题，
 * 往届的团团就又开始长了，而「往届不再成长」是 §5.2 的红线，
 * 破了它「回忆」这个概念就不成立。
 *
 * 这里只决定「屏幕上画谁」，一行都不碰经验。
 */

import { useEffect, useState } from 'react'
import { loadPets } from '@/data/repositories/petRepo'
import { usePetStore } from '@/stores/petStore'
import type { GradeLevel, PetState, Uuid } from '@/domain/types'

/**
 * 取这次该显示的三只伙伴，并顺带把档案年级那批读进 `petStore`。
 *
 * @param profileId - 档案 ID。`null` 表示还没初始化完，此时不读库
 * @param gradeLevel - 她**在读**几年级（档案事实）。小屋、商店、答题反馈用的都是这一批
 * @param activeGrade - 这次要做**哪个年级**的题。等于 `gradeLevel` 时就是同一批
 * @returns 该画在屏幕上的伙伴。⚠️ 只作形象，不作结算依据
 *
 * @example
 * // 二年级的孩子切回一年级答题区：陪她的是团团、墨墨、波波
 * useCompanionPets(id, 'G2', 'G1')   // → G1 的三只
 *
 * @example
 * // 一年级的孩子超前做二年级的题：G2 那批还没创建，回落到她正在养的三只
 * useCompanionPets(id, 'G1', 'G2')   // → G1 的三只
 */
export function useCompanionPets(
  profileId: Uuid | null,
  gradeLevel: GradeLevel,
  activeGrade: GradeLevel,
): PetState[] {
  const pets = usePetStore((s) => s.pets)
  const loadOwn = usePetStore((s) => s.load)
  /**
   * 别的年级那批，**单独读、不写进 `petStore`**。
   *
   * store 里的 `pets` 是「当前年级」的，小屋、商店、答题反馈都在用它。
   * 首页切一下年级就把全局改掉，那三处会跟着一起变——
   * 同 `PetHome` 里 `archivePets` 不进 store 的理由。
   */
  const [guests, setGuests] = useState<PetState[]>([])

  useEffect(() => {
    if (profileId === null) return
    void loadOwn(profileId, gradeLevel)
  }, [profileId, gradeLevel, loadOwn])

  useEffect(() => {
    if (profileId === null || activeGrade === gradeLevel) {
      setGuests([])
      return
    }
    void loadPets(profileId, activeGrade).then(setGuests)
  }, [profileId, activeGrade, gradeLevel])

  /**
   * 读不到就回落到她正在养的那批。
   *
   * ⚠️ 这不是防御性代码，是一条真会走到的路：`ensurePets()` 只为**档案年级**建记录，
   * 所以一年级的孩子切到二年级答题区时，G2 那三只根本还不存在。
   * 返回空数组的话首页会一只伙伴都不剩——顶部空一块、科目选择器整个消失。
   */
  return guests.length > 0 ? guests : pets
}
