/**
 * @file 按 `art` 名画出一件商品 —— 商店卡片、购买庆祝共用
 * @layer components  纯渲染，无业务逻辑
 * @see src/data/seed/shopItems.ts  `art` 字段的定义处
 *
 * ⭐ **取景框只此一份**。家具画在房间的 400×300 坐标里，单独展示时要把
 * 它那一小块裁出来放大；这份裁切表原先在商店卡片和庆祝弹层里各抄了一遍，
 * 而两处一旦不同步，同一件家具在商店里和买到时就会长得不一样——
 * 那正好毁掉「星星变成了它」要建立的那层对应关系。
 */

import { RoomFloorArt, type FloorArtName } from '@/components/room/RoomFloorArt'
import { RoomWallArt, type WallArtName } from '@/components/room/RoomWallArt'
import { TreatArt, type TreatArtName } from '@/components/room/TreatArt'

/** 墙上的家具，画在房间坐标系里 */
const WALL_BOX: Readonly<Record<string, string>> = {
  picture: '30 28 82 78',
  curtain: '142 12 136 108',
  shelf: '292 62 98 98',
}

/** 地上的家具，同样在房间坐标系里 */
const FLOOR_BOX: Readonly<Record<string, string>> = {
  rug: '100 224 200 68',
  lamp: '318 192 66 86',
  toybox: '16 198 92 82',
}

/** 零食有自己的 100×100 小画布，不属于房间坐标系 */
const TREAT_BOX = '0 0 100 100'

interface ShopItemArtProps {
  art: string
}

/**
 * 画出一件商品。
 *
 * ⚠️ 认不出的 `art` 返回 `null` 而不是随便画一个兜底图形。
 * 这里原先靠 `RoomFloorArt` 的兜底分支收尾，结果三样零食
 * （`cookie` / `fruit` / `cake`）全被画成了玩具箱——静默、且在商店里
 * 一眼看不出是「画错了」还是「本来就长这样」。宁可空着。
 *
 * @param art - 商品的图形名，来自 `ROOM_ITEMS[].art` / `TREAT_ITEMS[].art`
 *
 * @example
 * <ShopItemArt art="rug" />     // 地毯，从房间坐标里裁出来
 * <ShopItemArt art="cake" />    // 大蛋糕，自己的小画布
 */
export function ShopItemArt({ art }: ShopItemArtProps) {
  const wallBox = WALL_BOX[art]
  if (wallBox !== undefined) {
    return (
      <svg viewBox={wallBox} className="h-full w-full" aria-hidden focusable="false">
        <RoomWallArt art={art as WallArtName} />
      </svg>
    )
  }

  const floorBox = FLOOR_BOX[art]
  if (floorBox !== undefined) {
    return (
      <svg viewBox={floorBox} className="h-full w-full" aria-hidden focusable="false">
        <RoomFloorArt art={art as FloorArtName} />
      </svg>
    )
  }

  if (art === 'cookie' || art === 'fruit' || art === 'cake') {
    return (
      <svg viewBox={TREAT_BOX} className="h-full w-full" aria-hidden focusable="false">
        <TreatArt art={art as TreatArtName} />
      </svg>
    )
  }

  return null
}
