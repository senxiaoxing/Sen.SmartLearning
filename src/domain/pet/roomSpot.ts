/**
 * @file 小屋站位 —— 三只伙伴在房间里站在哪儿，以及能站到哪儿
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/features/room/RoomPet.tsx      拖动交互与像素换算
 * @see src/components/room/RoomScene.tsx  舞台坐标系（400×300，地面线 y=196）
 * @see design/06-宠物系统.md §10          小屋与自由站位
 *
 * ## ⭐ 坐标是「舞台归一化」的，不是像素
 *
 * 小屋舞台恒为 4:3，但像素尺寸随屏幕变（iPad 横屏能到 1400px 宽）。
 * 存像素会让「换个设备打开，三只全跑到屏幕外」——存 0~1 的比例则永远成立。
 *
 * ## ⭐ 记的是宠物盒子的**左上角**，不是中心
 *
 * 中心定位要在 framer-motion 的 `x`/`y` 变换之外再叠一层 `-50%` 位移，
 * 而两者会争同一个 `transform`，结果是一拖就跳。
 * 左上角虽然不直观，但它和 `x`/`y` 是同一个量，全程不需要第二次换算。
 */

import type { PetState } from '@/domain/types'

/** 一个站位：舞台宽/高的比例，指向宠物盒子的左上角 */
export interface RoomSpot {
  x: number
  y: number
}

/**
 * 站位可及范围。
 *
 * ⭐ 下界不是 0 而是 0.50：再往上就站到墙上去了。
 * 宠物盒子约占舞台高度的 19%（蛋）到 27%（最终形态），
 * 所以左上角 0.50 时**脚底**至少落在 0.69，在地面线
 * （`RoomBackdrop` 的 `ROOM_FLOOR_TOP` ≈ 0.653）之下——
 * 头在地平线以上、脚在地板上，这才是「站着」。
 *
 * 上界 0.66 留出屏幕底部那条「去商店逛逛」的浮层，
 * 否则她把伙伴拖到最下面，等于把它藏到按钮后面去了——
 * 而她刚摆好就看不见了，只会以为自己弄丢了一只。
 *
 * ⚠️ 这几个数与 `features/room/RoomPet.tsx` 的 `PET_REFERENCE_WIDTH` 绑在一起：
 * 伙伴放大了就得收窄边界，否则最终形态会有一截露到舞台外。
 */
export const ROOM_SPOT_BOUNDS = {
  minX: 0.04,
  maxX: 0.76,
  minY: 0.5,
  maxY: 0.66,
} as const

/**
 * 三只的初始站位。
 *
 * 中间那只**刻意靠前一点**（y 更大）：三只横平竖直排成一行像列队，
 * 而一前两后自然得多，也正好让中间那只站在桌子前面。
 *
 * ⚠️ 顺序与 `loadPets()` 返回的科目顺序对应，不要随手调换——
 * 她记的是「团团在左边」这种位置记忆，和识字墙分辑同一条道理。
 */
const DEFAULT_SPOTS: readonly RoomSpot[] = [
  { x: 0.14, y: 0.55 },
  { x: 0.41, y: 0.62 },
  { x: 0.67, y: 0.55 },
]

/**
 * 把站位夹回可及范围。
 *
 * @param spot - 任意站位，通常是拖动结束时算出来的
 * @returns 落在 {@link ROOM_SPOT_BOUNDS} 内的站位
 *
 * @example
 * clampRoomSpot({ x: 1.4, y: -0.2 })   // { x: 0.78, y: 0.5 }
 * clampRoomSpot({ x: 0.3, y: 0.6 })    // { x: 0.3, y: 0.6 }  原样
 */
export function clampRoomSpot(spot: RoomSpot): RoomSpot {
  return {
    x: clamp(spot.x, ROOM_SPOT_BOUNDS.minX, ROOM_SPOT_BOUNDS.maxX),
    y: clamp(spot.y, ROOM_SPOT_BOUNDS.minY, ROOM_SPOT_BOUNDS.maxY),
  }
}

/**
 * 第几只伙伴的默认站位。
 *
 * @param index - 在 `loadPets()` 返回数组里的下标
 * @returns 默认站位；下标超出三只时循环取用（不返回 undefined，
 *          否则以后加第四只伙伴会让它渲染在左上角）
 *
 * @example
 * defaultRoomSpot(0)   // { x: 0.14, y: 0.58 }
 * defaultRoomSpot(1)   // { x: 0.41, y: 0.65 }  中间那只靠前
 */
export function defaultRoomSpot(index: number): RoomSpot {
  const spots = DEFAULT_SPOTS
  const safe = ((index % spots.length) + spots.length) % spots.length
  return spots[safe] ?? spots[0] ?? { x: 0.5, y: 0.6 }
}

/**
 * 这只伙伴现在该站在哪儿。
 *
 * 她拖过就用拖过的位置，没拖过（含旧档案里根本没有这两个字段的记录）
 * 就用默认站位——**绝不是 (0, 0)**，那会把伙伴堆在屋子左上角的墙里。
 *
 * @param pet - 宠物状态，`roomX`/`roomY` 可能不存在
 * @param index - 在三只里的下标，用于取默认站位
 * @returns 已夹到可及范围内的站位
 *
 * @example
 * roomSpotOf({ ...pet, roomX: 0.6, roomY: 0.62 }, 0)   // { x: 0.6, y: 0.62 }
 * roomSpotOf(petFromOldBackup, 2)                      // { x: 0.67, y: 0.58 }
 */
export function roomSpotOf(pet: PetState, index: number): RoomSpot {
  if (typeof pet.roomX !== 'number' || typeof pet.roomY !== 'number') {
    return defaultRoomSpot(index)
  }
  return clampRoomSpot({ x: pet.roomX, y: pet.roomY })
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
