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
import {
  GRADE_LEVELS,
  type GradeLevel,
  type IsoDateTime,
  type PetState,
  type Subject,
  type Uuid,
} from '@/domain/types'

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

/**
 * 她**养过**哪些年级的伙伴，按学段顺序。
 *
 * ⚠️ 只列真的有宠物记录的年级，不列未来年级——
 * 那里空无一物，点进去只有失望。这和「未开放科目的宠物在睡觉」是同一条原则：
 * 给出的预期必须是诚实的。
 *
 * @example
 * await loadOwnedGrades(profileId)   // ['G1'] —— 刚开始用；升到二年级后是 ['G1','G2']
 */
export async function loadOwnedGrades(profileId: Uuid): Promise<GradeLevel[]> {
  const pets = await db.petState.where('profileId').equals(profileId).toArray()
  const owned = new Set(pets.map((p) => p.gradeLevel))
  return GRADE_LEVELS.filter((g) => owned.has(g))
}

/**
 * 上一批伙伴 —— 升年级过场里露脸的那三只。
 *
 * ⭐ **过场展示的是旧伙伴，不是新的**。新的那批此刻 `exp` 全是 0，
 * 画出来是三个几乎一样的蛋，孩子看不出是猫是狗还是羊——
 * 展示一个蛋等于什么都没展示。而过场那句话的主语本来就是它们：
 * 「以前的伙伴没有走，去我的伙伴那里就能看到它们」。
 * 新伙伴的登场留给首页，她点完「知道啦」立刻就会遇到。
 *
 * 取「她**养过**的、排在当前年级之前的最后一个年级」，
 * 而不是简单地减一：家长可能从一年级直接跳到四年级，中间那两年没有伙伴。
 *
 * @returns 上一批伙伴；她还没养过更早的年级时为空数组
 *
 * @example
 * await loadPreviousGradePets(profileId, 'G2')   // → 团团、墨墨、波波
 */
export async function loadPreviousGradePets(
  profileId: Uuid,
  gradeLevel: GradeLevel,
): Promise<PetState[]> {
  const owned = await loadOwnedGrades(profileId)
  const current = GRADE_LEVELS.indexOf(gradeLevel)
  const previous = owned.filter((g) => GRADE_LEVELS.indexOf(g) < current).pop()

  return previous === undefined ? [] : loadPets(profileId, previous)
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

  // 曲线一个年级一条：用 pet 自己的年级，不是调用方传进来的那个
  // （往届宠物不再成长，但读它的进度时也必须用它当年那条曲线）
  const result = applyExpGain(pet.exp, gained, pet.gradeLevel)
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
 * 记下伙伴在小屋里被摆到了哪儿。
 *
 * ⚠️ 传进来的站位必须**已经 `clampRoomSpot()` 过**——这里只负责落库，
 * 不做范围判定。范围是业务规则，归 `domain/pet/roomSpot.ts`。
 *
 * 不写 `lastSeenAt`：挪个位置不算「见了一面」，
 * 否则拖一下就会把「好几天没见，我有点想你」那句话洗掉。
 *
 * @param petId - 宠物记录 ID
 * @param spot - 已夹到可及范围内的站位（舞台归一化坐标）
 *
 * @example
 * await movePetInRoom(pet.id, clampRoomSpot({ x: 0.62, y: 0.66 }))
 */
export async function movePetInRoom(
  petId: Uuid,
  spot: { x: number; y: number },
): Promise<void> {
  const pet = await db.petState.get(petId)
  if (pet === undefined) return
  await db.petState.put({ ...pet, roomX: spot.x, roomY: spot.y, updatedAt: nowIso() })
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
