import { describe, expect, it } from 'vitest'
import {
  ROOM_SPOT_BOUNDS,
  clampRoomSpot,
  defaultRoomSpot,
  roomSpotOf,
} from '@/domain/pet/roomSpot'
import { toIso } from '@/domain/time'
import type { PetState } from '@/domain/types'

/** 地面线在舞台高度里的比例，与 `RoomBackdrop.ROOM_FLOOR_TOP` 同源 */
const FLOOR_TOP = 196 / 300

/**
 * 宠物盒子占舞台的比例，用来验算「脚是不是踩在地板上、整只在不在舞台内」。
 *
 * 由 `RoomPet` 的 `PET_REFERENCE_WIDTH`(720) 与 `PetAvatar` 的 md 盒子(123.2px)
 * 推出：宽 = 123.2 × 形态 scale ÷ 720，高 = 宽 × 4/3（舞台恒为 4:3）。
 * 形态 scale 从蛋的 0.85 到最终形态的 1.2。
 */
const PET_WIDTH_MAX = (123.2 * 1.2) / 720
const PET_HEIGHT_MIN = ((123.2 * 0.85) / 720) * (4 / 3)
const PET_HEIGHT_MAX = ((123.2 * 1.2) / 720) * (4 / 3)

function petWith(spot?: { x: number; y: number }): PetState {
  const now = toIso(new Date('2026-08-20T00:00:00.000Z'))
  return {
    id: 'p1',
    profileId: 'u1',
    subject: 'math',
    gradeLevel: 'G1',
    petTypeId: 'penguin-g1',
    name: '团团',
    exp: 0,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    ...(spot !== undefined && { roomX: spot.x, roomY: spot.y }),
  }
}

describe('clampRoomSpot', () => {
  it('范围内的原样返回', () => {
    expect(clampRoomSpot({ x: 0.3, y: 0.6 })).toEqual({ x: 0.3, y: 0.6 })
  })

  it('拖出屏幕的夹回边界 —— 拖丢一只伙伴是找不回来的', () => {
    expect(clampRoomSpot({ x: 3, y: 9 })).toEqual({
      x: ROOM_SPOT_BOUNDS.maxX,
      y: ROOM_SPOT_BOUNDS.maxY,
    })
    expect(clampRoomSpot({ x: -2, y: -2 })).toEqual({
      x: ROOM_SPOT_BOUNDS.minX,
      y: ROOM_SPOT_BOUNDS.minY,
    })
  })

  it('NaN / Infinity 落到下界而不是渗进数据库', () => {
    expect(clampRoomSpot({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({
      x: ROOM_SPOT_BOUNDS.minX,
      y: ROOM_SPOT_BOUNDS.minY,
    })
  })
})

describe('ROOM_SPOT_BOUNDS', () => {
  /**
   * ⭐ 这条是整个范围设定的理由：伙伴永远站在地板上。
   * 越过地面线就成了「贴在墙上」，一眼就是坏了。
   */
  it('最高的站位脚底也在地面线以下 —— 连最小的蛋形态也是', () => {
    expect(ROOM_SPOT_BOUNDS.minY + PET_HEIGHT_MIN).toBeGreaterThan(FLOOR_TOP)
  })

  it('最低的站位整只都还在舞台内 —— 连最大的最终形态也是', () => {
    expect(ROOM_SPOT_BOUNDS.maxY + PET_HEIGHT_MAX).toBeLessThan(1)
  })

  it('左右两端都留得下一整只', () => {
    expect(ROOM_SPOT_BOUNDS.minX).toBeGreaterThanOrEqual(0)
    expect(ROOM_SPOT_BOUNDS.maxX + PET_WIDTH_MAX).toBeLessThanOrEqual(1)
  })
})

describe('defaultRoomSpot', () => {
  it('三只各占一处，不重叠', () => {
    const xs = [0, 1, 2].map((i) => defaultRoomSpot(i).x)
    expect(new Set(xs).size).toBe(3)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })

  it('全部落在可及范围内 —— 默认位置自己越界就没救了', () => {
    for (const index of [0, 1, 2]) {
      expect(defaultRoomSpot(index)).toEqual(clampRoomSpot(defaultRoomSpot(index)))
    }
  })

  it('下标越界时循环取用，绝不返回 undefined', () => {
    expect(defaultRoomSpot(3)).toEqual(defaultRoomSpot(0))
    expect(defaultRoomSpot(-1)).toEqual(defaultRoomSpot(2))
  })
})

describe('roomSpotOf', () => {
  it('摆过就用摆过的位置', () => {
    expect(roomSpotOf(petWith({ x: 0.6, y: 0.62 }), 0)).toEqual({ x: 0.6, y: 0.62 })
  })

  /**
   * ⭐ 旧档案（含从旧备份导入的）根本没有这两个字段。
   * 回落成 (0, 0) 的话三只会全叠在屋子左上角的墙里。
   */
  it('没摆过（含旧备份）用默认站位，不是 (0, 0)', () => {
    expect(roomSpotOf(petWith(), 1)).toEqual(defaultRoomSpot(1))
  })

  it('只存了一半坐标也算没摆过', () => {
    const half = { ...petWith(), roomX: 0.5 }
    expect(roomSpotOf(half, 2)).toEqual(defaultRoomSpot(2))
  })

  it('库里存着越界的老数据也夹回来', () => {
    expect(roomSpotOf(petWith({ x: 5, y: 5 }), 0)).toEqual({
      x: ROOM_SPOT_BOUNDS.maxX,
      y: ROOM_SPOT_BOUNDS.maxY,
    })
  })
})
