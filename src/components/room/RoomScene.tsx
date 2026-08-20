/**
 * @file 宠物小屋的场景 —— 铺满整屏的房间，家具摆在中间那块 4:3 的舞台上
 * @layer components  纯渲染，数据由调用方备好
 * @see src/components/room/RoomBackdrop.tsx  墙与地板（铺满整屏的那一层）
 * @see src/features/room/RoomPets.tsx        三只伙伴（可拖动，走 children 传进来）
 * @see src/data/seed/shopItems.ts            家具与槽位定义
 * @see design/02-数据库Schema.md §3.12b
 *
 * ## ⭐ 一间共享小屋，不是三个房间
 *
 * 分房的话孩子必然先装扮最喜欢的那只，另外两只的房间一直空着——
 * 那是宠物红线第 3 条「三只之间绝不比较」的另一种形式，而且更具体：
 * 等级差距是学习自然产生的，房间空着却是她自己选的。
 * 所以这里是「**你们的家**」，家具只买一次，三只一起住。
 *
 * ## ⭐ 整屏占满 = 背景铺满 + 舞台等比
 *
 * 孩子实测反馈「小屋要大一点，最好能整屏占满」。做法见 `RoomBackdrop`：
 * 墙地板用 CSS 横带溢出到屏幕外，家具留在严格 4:3 的舞台里等比缩放。
 * 舞台宽度取 `min(100%, 100dvh × 4/3)`——横屏时高度先到顶，竖屏时宽度先到顶，
 * 两种情况都恰好塞满而不裁切任何一件家具。
 *
 * ## 为什么房间是 SVG、宠物是叠在上面的 HTML
 *
 * 三个 `*Art.tsx` 各自渲染完整的 `<svg viewBox>`，嵌不进外层 SVG。
 * 与其为了套进来去改三个已经稳定的组件，不如让房间只当背景，
 * 宠物用绝对定位盖在上层——`PetAvatar` 原样复用，一行不改。
 *
 * ## 空位要看得见
 *
 * 没买的家具画成柔和的剪影而不是留白。空位比已获得更能驱动行为，
 * 这与图鉴必须显示未解锁卡位是同一条原理（design/02 §3.13）。
 */

import type { ReactNode } from 'react'
import { RoomBackdrop } from '@/components/room/RoomBackdrop'
import { RoomFloorArt, type FloorArtName } from '@/components/room/RoomFloorArt'
import { RoomTableArt } from '@/components/room/RoomTableArt'
import { RoomWallArt, type WallArtName } from '@/components/room/RoomWallArt'
import { ROOM_ITEMS } from '@/data/seed/shopItems'

/** 墙上的家具先画，地上的后画 —— 顺序错了地毯会盖住玩具箱 */
const WALL_ARTS = new Set<string>(['picture', 'curtain', 'shelf'])

/**
 * 舞台宽度。
 *
 * `100dvh` 而不是 `100vh`：iOS Safari 的 vh 不含被地址栏遮住的那段，
 * 用它算出来的舞台会比屏幕高，底部的地板连同「去商店逛逛」一起被顶出去。
 * 与 `styles/index.css` 里 `#root` 的处理同一个理由。
 */
const STAGE_WIDTH = 'min(100%, calc(100dvh * 4 / 3))'

/**
 * 每个槽位的空位轮廓框。
 *
 * 与各家具在 `RoomWallArt` / `RoomFloorArt` 里的实际坐标对应，
 * 改了家具位置这里也要跟着改。
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
  /**
   * 叠在家具之上的一层，用来放三只伙伴。
   *
   * ⚠️ 不在这里直接渲染宠物：它们要能拖、点了要说话，那是有状态的交互，
   * 属于 `features/`。这一层只负责把它们放进舞台的坐标系里
   * （children 的根节点用 `absolute inset-0` 就正好铺满舞台）。
   */
  children?: ReactNode
}

/**
 * 小屋场景，撑满父容器。
 *
 * @param owned - 已拥有的家具 ID 集合，决定哪些位置画实物、哪些画空位
 * @param children - 伙伴层，见 {@link RoomSceneProps.children}
 *
 * @example
 * <RoomScene owned={owned}>
 *   <RoomPets pets={pets} onMove={move} />
 * </RoomScene>
 */
export function RoomScene({ owned, children }: RoomSceneProps) {
  const wallItems = ROOM_ITEMS.filter((i) => owned.has(i.id) && WALL_ARTS.has(i.art))
  const floorItems = ROOM_ITEMS.filter((i) => owned.has(i.id) && !WALL_ARTS.has(i.art))
  const emptySlots = ROOM_ITEMS.filter((i) => !owned.has(i.id))

  // ⚠️ 舞台用 `items-end` 而不是 `items-center`：竖屏时舞台比屏幕矮，
  //    多出来的空间要给**墙**（舞台之上）而不是**地板**（舞台之下）。
  //    居中的话屋子下半屏是一大片空地板，看着像三只站在旷野里；
  //    靠底对齐则是「地平线偏低的房间」。横屏时两种写法结果相同。
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
      <div className="relative aspect-[4/3]" style={{ width: STAGE_WIDTH }}>
        <RoomBackdrop />

        <svg
          viewBox="0 0 400 300"
          className="absolute inset-0 block h-full w-full"
          aria-hidden
          focusable="false"
        >
          {emptySlots.map((item) => (
            <EmptySlot key={item.id} slot={item.slot} />
          ))}

          {wallItems.map((item) => (
            <RoomWallArt key={item.id} art={item.art as WallArtName} />
          ))}
          {floorItems.map((item) => (
            <RoomFloorArt key={item.id} art={item.art as FloorArtName} />
          ))}

          {/* ⚠️ 桌子放在地毯之后：地毯的椭圆会盖住桌腿下缘，
              先画桌子的话它看起来就埋进地毯里了 */}
          <RoomTableArt />
        </svg>

        {children}
      </div>

      {/* 屋顶方向的一点压暗，贴着屏幕上沿而不是舞台上沿——
          墙已经溢出到屏幕外了，压暗只有落在能看见的地方才有纵深 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/[.07] to-transparent"
      />
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
    <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" fill="#8B7355" opacity=".09" />
  )
}
