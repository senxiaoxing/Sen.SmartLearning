/**
 * @file 宠物小屋的场景 —— 墙、地板、已买的家具，三只站在里面
 * @layer components  纯渲染，数据由调用方备好
 * @see src/data/seed/shopItems.ts  家具与槽位定义
 * @see design/02-数据库Schema.md §3.12b
 *
 * ## ⭐ 一间共享小屋，不是三个房间
 *
 * 分房的话孩子必然先装扮最喜欢的那只，另外两只的房间一直空着——
 * 那是宠物红线第 3 条「三只之间绝不比较」的另一种形式，而且更具体：
 * 等级差距是学习自然产生的，房间空着却是她自己选的。
 * 所以这里是「**你们的家**」，家具只买一次，三只一起住。
 *
 * ## 为什么房间是 SVG、宠物是叠在上面的 HTML
 *
 * 三个 `*Art.tsx` 各自渲染完整的 `<svg viewBox>`，嵌不进外层 SVG。
 * 与其为了套进来去改三个已经稳定的组件，不如让房间只当背景，
 * 宠物用绝对定位盖在上层——`PetAvatar` 原样复用，一行不改。
 *
 * ## 空位要看得见
 *
 * 没买的家具画成虚线轮廓而不是留白。空位比已获得更能驱动行为，
 * 这与图鉴必须显示未解锁卡位是同一条原理（design/02 §3.13）。
 */

import { PetAvatar } from '@/components/PetAvatar'
import { RoomFloorArt, type FloorArtName } from '@/components/room/RoomFloorArt'
import { RoomWallArt, type WallArtName } from '@/components/room/RoomWallArt'
import { ROOM_ITEMS } from '@/data/seed/shopItems'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState } from '@/domain/types'

/** 墙面到此为止，往下是地板 */
const WALL_BOTTOM = 196

/** 墙上的家具先画，地上的后画 —— 顺序错了地毯会盖住玩具箱 */
const WALL_ARTS = new Set<string>(['picture', 'curtain', 'shelf'])

/**
 * 每个槽位的空位轮廓框。
 *
 * 与各家具在 `RoomWallArt` / `RoomFloorArt` 里的实际坐标对应，
 * 改了家具位置这里也要跟着改——由 `RoomScene.test.tsx` 校验槽位齐全。
 */
const SLOT_BOX: Readonly<Record<string, { x: number; y: number; w: number; h: number }>> = {
  floor: { x: 104, y: 228, w: 192, h: 60 },
  wallLeft: { x: 36, y: 42, w: 70, h: 56 },
  wallBack: { x: 148, y: 18, w: 124, h: 96 },
  wallRight: { x: 298, y: 70, w: 86, h: 82 },
  deskSide: { x: 322, y: 198, w: 58, h: 74 },
  corner: { x: 22, y: 206, w: 80, h: 66 },
}

interface RoomSceneProps {
  /** 已买下的家具 ID，来自 `ownedRoomItemIds()` */
  owned: ReadonlySet<string>
  /** 三只伙伴 */
  pets: readonly PetState[]
  /** 生日当天给每只挂个蛋糕 */
  festive?: boolean
}

/**
 * 小屋场景。
 *
 * @param owned - 已拥有的家具 ID 集合，决定哪些位置画实物、哪些画空位
 * @param pets - 三只伙伴，按 `pets` 数组顺序从左到右站好
 *
 * @example
 * <RoomScene owned={await ownedRoomItemIds(profileId)} pets={pets} />
 */
export function RoomScene({ owned, pets, festive = false }: RoomSceneProps) {
  const wallItems = ROOM_ITEMS.filter((i) => owned.has(i.id) && WALL_ARTS.has(i.art))
  const floorItems = ROOM_ITEMS.filter((i) => owned.has(i.id) && !WALL_ARTS.has(i.art))
  const emptySlots = ROOM_ITEMS.filter((i) => !owned.has(i.id))

  return (
    <div className="relative w-full overflow-hidden rounded-blob shadow-card">
      <svg viewBox="0 0 400 300" className="block h-full w-full" aria-hidden focusable="false">
        {/*
          ⚠️ 墙色必须明显深于页面底色（canvas 是 #FFF3E2 的暖奶油）。
          最初取了 #FBF3E4，两者几乎同色，结果整个小屋读不出「是个房间」——
          只剩圆角能看出边界在哪。房间要先站得住，家具才有地方可放。
        */}
        <rect x="0" y="0" width="400" height={WALL_BOTTOM} fill="#EFE1C8" />
        <rect x="0" y={WALL_BOTTOM} width="400" height={300 - WALL_BOTTOM} fill="#D9B98E" />
        {/* 墙面上缘压一层更深的色，屋子才有「上面还有天花板」的纵深 */}
        <rect x="0" y="0" width="400" height="14" fill="#000000" opacity=".05" />
        {/* 踢脚线：墙与地板之间没有这一道，两块色会像两张拼在一起的纸 */}
        <rect x="0" y={WALL_BOTTOM - 7} width="400" height="9" fill="#C2A170" />
        {/* 地板纹理 */}
        <path
          d="M0,222 H400 M0,250 H400 M0,278 H400"
          stroke="#CDA97A"
          strokeWidth="2"
          opacity=".6"
        />

        {emptySlots.map((item) => (
          <EmptySlot key={item.id} slot={item.slot} />
        ))}

        {wallItems.map((item) => (
          <RoomWallArt key={item.id} art={item.art as WallArtName} />
        ))}
        {floorItems.map((item) => (
          <RoomFloorArt key={item.id} art={item.art as FloorArtName} />
        ))}
      </svg>

      {/*
        宠物层。`pointer-events-none` 让它不吃点击——小屋本身不是可交互对象，
        要买东西是页面上那个明确的按钮，而不是「点宠物试试看」。
      */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-1 pb-[9%] sm:gap-3">
        {pets.map((pet) => {
          const def = petDefinitionOf(pet.subject, pet.gradeLevel)
          if (def === undefined) return null
          return (
            <PetAvatar
              key={pet.id}
              def={def}
              stageIndex={levelProgress(pet.exp).stage}
              size="md"
              // 未开放科目的伙伴在睡觉，不是没养好 —— 宠物红线第 4 条
              asleep={!isSubjectOpened(pet.subject)}
              animated
              festive={festive}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * 空位。
 *
 * ⭐ 画成**柔和的剪影**而不是虚线框：六个虚线矩形摆在一起，整屋子会像张施工图，
 * 那是「还没做好」的观感，而这里要传达的是「这儿可以放点什么」。
 * 图鉴那条原理说的也是「灰色剪影」（design/02 §3.13），不是线框。
 *
 * 淡到几乎只是一块阴影 —— 它要能被看见（那是驱动力），
 * 但绝不能让空着的屋子显得寒酸。
 */
function EmptySlot({ slot }: { slot: string }) {
  const box = SLOT_BOX[slot]
  if (box === undefined) return null

  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      rx="8"
      fill="#8B7355"
      opacity=".09"
    />
  )
}
