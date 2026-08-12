/**
 * @file 宠物仓储 —— 按「科目 × 年级」读写与经验结算
 * @layer data
 * @see src/domain/pet/growth.ts 成长曲线
 * @see src/data/seed/pets.ts 宠物定义
 */

import { db } from '@/data/db'
import { petDefinitionOf, petsOfGrade } from '@/data/seed/pets'
import { applyExpGain } from '@/domain/pet/growth'
import { nowIso } from '@/domain/time'
import { newId } from '@/platform/newId'
import type { GradeLevel, IsoDateTime, PetState, Subject, Uuid } from '@/domain/types'

/**
 * 确保某年级的三只宠物都已创建。
 *
 * 每次启动调用，幂等：已存在的一律不动，只补缺失的。
 * 覆盖已有宠物等于抹掉孩子养了很久的成果。
 *
 * 升年级时会自动创建新一批宠物，旧的保留不动——
 * 它们不再成长，但记录着上一学年的成果。
 */
export async function ensurePets(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<PetState[]> {
  const existing = await db.petState.where('profileId').equals(profileId).toArray()
  const owned = new Set(existing.map((p) => `${p.subject}|${p.gradeLevel}`))

  const now = nowIso()
  const created: PetState[] = []

  for (const def of petsOfGrade(gradeLevel)) {
    if (owned.has(`${def.subject}|${def.gradeLevel}`)) continue
    created.push({
      id: newId(),
      profileId,
      subject: def.subject,
      gradeLevel: def.gradeLevel,
      petTypeId: def.id,
      name: def.defaultName,
      exp: 0,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (created.length > 0) await db.petState.bulkPut(created)
  return [...existing, ...created]
}

/** 取某年级的全部宠物，按科目固定顺序排列 */
export async function loadPets(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<PetState[]> {
  const pets = await db.petState
    .where('[profileId+gradeLevel]')
    .equals([profileId, gradeLevel])
    .toArray()

  const order = new Map(petsOfGrade(gradeLevel).map((d, i) => [d.subject, i]))
  return pets.sort((a, b) => (order.get(a.subject) ?? 9) - (order.get(b.subject) ?? 9))
}

export async function loadPet(
  profileId: Uuid,
  subject: Subject,
  gradeLevel: GradeLevel,
): Promise<PetState | undefined> {
  return db.petState
    .where('[profileId+subject+gradeLevel]')
    .equals([profileId, subject, gradeLevel])
    .first()
}

export interface ExpGainResult {
  pet: PetState
  leveledUp: boolean
  stageChanged: boolean
  fromLevel: number
  toLevel: number
}

/**
 * 给某科目当前年级的宠物加经验。
 *
 * @example
 * const r = await addExp(profileId, 'math', 'G1', 25)
 * if (r?.stageChanged) showTransformation()   // 变身了！
 */
export async function addExp(
  profileId: Uuid,
  subject: Subject,
  gradeLevel: GradeLevel,
  gained: number,
  now: IsoDateTime = nowIso(),
): Promise<ExpGainResult | undefined> {
  const pet = await loadPet(profileId, subject, gradeLevel)
  if (pet === undefined) return undefined

  const result = applyExpGain(pet.exp, gained)
  const updated: PetState = { ...pet, exp: result.exp, lastSeenAt: now, updatedAt: now }
  await db.petState.put(updated)

  return {
    pet: updated,
    leveledUp: result.leveledUp,
    stageChanged: result.stageChanged,
    fromLevel: result.fromLevel,
    toLevel: result.toLevel,
  }
}

/**
 * 给宠物改名。
 *
 * ⭐ 让孩子自己起名是最强的情感绑定手段，成本几乎为零。
 *
 * @param name - 新名字。空白则回退为默认名，避免出现无名宠物
 */
export async function renamePet(
  profileId: Uuid,
  subject: Subject,
  gradeLevel: GradeLevel,
  name: string,
): Promise<void> {
  const pet = await loadPet(profileId, subject, gradeLevel)
  if (pet === undefined) return

  const trimmed = name.trim().slice(0, 8)
  const fallback = petDefinitionOf(subject, gradeLevel)?.defaultName ?? pet.name
  await db.petState.put({
    ...pet,
    name: trimmed.length > 0 ? trimmed : fallback,
    updatedAt: nowIso(),
  })
}
