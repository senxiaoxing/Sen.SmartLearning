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
import { addExp, loadPets, movePetInRoom, renamePet } from '@/data/repositories/petRepo'
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
