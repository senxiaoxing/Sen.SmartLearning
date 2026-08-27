/**
 * @file 宠物仓储的集成测试 —— 重点是小屋站位的落库
 * @layer data
 *
 * 站位是孩子亲手摆出来的，**掉了就等于她的布置被撤销了**。
 * 而它又是 `PetState` 上两个可缺失字段，最容易在别的写入路径里被顺手抹掉——
 * 加经验、改名都会整条 `put()` 回去，漏带一次就没了。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import {
  addExp,
  ensurePets,
  loadOwnedGrades,
  loadPets,
  loadPreviousGradePets,
  movePetInRoom,
  renamePet,
} from '@/data/repositories/petRepo'
import { clampRoomSpot, roomSpotOf } from '@/domain/pet/roomSpot'
import type { PetState, Uuid } from '@/domain/types'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

async function mathPetOf(profileId: Uuid): Promise<PetState> {
  const pets = await loadPets(profileId, 'G1')
  const pet = pets.find((p) => p.subject === 'math')
  if (pet === undefined) throw new Error('测试前置条件不成立：没有数学伙伴')
  return pet
}

describe('movePetInRoom', () => {
  it('摆过的位置会存下来', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)

    await movePetInRoom(pet.id, { x: 0.62, y: 0.66 })

    const stored = await db.petState.get(pet.id)
    expect(stored?.roomX).toBe(0.62)
    expect(stored?.roomY).toBe(0.66)
  })

  it('重新加载后 roomSpotOf 读到的就是摆过的那个位置', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)

    await movePetInRoom(pet.id, clampRoomSpot({ x: 0.2, y: 0.55 }))
    const reloaded = await mathPetOf(profileId)

    expect(roomSpotOf(reloaded, 0)).toEqual({ x: 0.2, y: 0.55 })
  })

  /**
   * ⚠️ 挪个位置不算「见了一面」。写了 `lastSeenAt` 的话，
   * 她拖一下就会把「好几天没见，我有点想你」那句话洗掉——
   * 而那句话恰恰是宠物系统最值钱的一句。
   */
  it('不动 lastSeenAt', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)

    await movePetInRoom(pet.id, { x: 0.5, y: 0.6 })

    const stored = await db.petState.get(pet.id)
    expect(stored?.lastSeenAt).toBe(pet.lastSeenAt)
  })

  it('不动经验与名字', async () => {
    const profileId = await bootstrap()
    await addExp(profileId, 'math', 'G1', 40)
    const pet = await mathPetOf(profileId)

    await movePetInRoom(pet.id, { x: 0.5, y: 0.6 })

    const stored = await db.petState.get(pet.id)
    expect(stored?.exp).toBe(pet.exp)
    expect(stored?.name).toBe(pet.name)
  })

  it('宠物不存在时静默返回，不新建一条孤儿记录', async () => {
    await bootstrap()
    const before = await db.petState.count()

    await movePetInRoom('不存在的-id', { x: 0.5, y: 0.6 })

    expect(await db.petState.count()).toBe(before)
  })
})

describe('站位不会被别的写入抹掉', () => {
  it('加经验之后站位还在', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)
    await movePetInRoom(pet.id, { x: 0.3, y: 0.62 })

    await addExp(profileId, 'math', 'G1', 30)

    const stored = await db.petState.get(pet.id)
    expect(stored?.roomX).toBe(0.3)
    expect(stored?.roomY).toBe(0.62)
  })

  it('改名之后站位还在', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)
    await movePetInRoom(pet.id, { x: 0.3, y: 0.62 })

    await renamePet(profileId, 'math', 'G1', '毛毛')

    const stored = await db.petState.get(pet.id)
    expect(stored?.name).toBe('毛毛')
    expect(stored?.roomX).toBe(0.3)
  })
})

describe('从没摆过的伙伴', () => {
  it('新建出来不带站位字段 —— 分得清「摆到了默认位置」和「从没摆过」', async () => {
    const profileId = await bootstrap()
    const pet = await mathPetOf(profileId)

    expect(pet.roomX).toBeUndefined()
    expect(pet.roomY).toBeUndefined()
  })
})

describe('⭐ 升年级', () => {
  /**
   * 养到满级的团团在升年级那天凭空消失，比任何别的改动都伤人。
   * 这条锁住的正是「上一批伙伴留在回忆里」这件事的数据前提。
   *
   * @see design/08-年级分区与内容扩展.md §5.2
   */
  it('上一批伙伴原封不动地留着 —— 名字、经验、站位都在', async () => {
    const profileId = await bootstrap()
    await addExp(profileId, 'math', 'G1', 250)
    await renamePet(profileId, 'math', 'G1', '毛毛')
    const before = await mathPetOf(profileId)
    await movePetInRoom(before.id, { x: 0.42, y: 0.58 })

    // 升到二年级（宠物定义尚未做，因此这一步不会新建任何一只）
    await ensurePets(profileId, 'G2')

    const after = await mathPetOf(profileId)
    expect(after.id, '还是原来那一只，不是被重建的').toBe(before.id)
    expect(after.name).toBe('毛毛')
    expect(after.exp).toBe(before.exp)
    expect(after.roomX).toBe(0.42)
  })

  it('loadOwnedGrades 只列真的养过的年级，不列未来年级', async () => {
    const profileId = await bootstrap()

    // 六个年级里目前只有一年级有宠物定义，因此也只养过这一个
    expect(await loadOwnedGrades(profileId)).toEqual(['G1'])
  })
})

/**
 * 升年级过场里露脸的那三只。
 *
 * ⭐ 展示的是**旧伙伴**而不是新的：新那批此刻 `exp` 全是 0，
 * 画出来是三个几乎一样的蛋，孩子看不出是猫是狗还是羊。
 * 而过场那句话的主语本来就是它们——「以前的伙伴没有走」。
 */
describe('⭐ 上一批伙伴', () => {
  it('升到二年级时，露脸的是一年级那三只', async () => {
    const profileId = await bootstrap()
    await ensurePets(profileId, 'G2')

    const previous = await loadPreviousGradePets(profileId, 'G2')

    expect(previous).toHaveLength(3)
    expect(previous.every((p) => p.gradeLevel === 'G1')).toBe(true)
  })

  it('带着她起的名字和攒下的经验 —— 那才是「她的」团团', async () => {
    const profileId = await bootstrap()
    await addExp(profileId, 'math', 'G1', 250)
    await renamePet(profileId, 'math', 'G1', '毛毛')
    await ensurePets(profileId, 'G2')

    const math = (await loadPreviousGradePets(profileId, 'G2')).find((p) => p.subject === 'math')

    expect(math?.name).toBe('毛毛')
    expect(math?.exp).toBeGreaterThan(0)
  })

  it('一年级的孩子没有上一批 —— 返回空数组而不是报错', async () => {
    const profileId = await bootstrap()

    expect(await loadPreviousGradePets(profileId, 'G1')).toEqual([])
  })

  /**
   * ⚠️ 不能简单地「年级减一」：家长可能从一年级直接跳到四年级，
   * 中间那两年一只伙伴都没有。取的必须是她**养过的**、
   * 排在当前年级之前的最后一个年级。
   */
  it('⭐ 跨级跳时取她真正养过的那一批，不是紧邻的上一个年级', async () => {
    const profileId = await bootstrap()

    // 只养过 G1，直接跳到 G4
    const previous = await loadPreviousGradePets(profileId, 'G4')

    expect(previous).toHaveLength(3)
    expect(previous.every((p) => p.gradeLevel === 'G1')).toBe(true)
  })
})
