/**
 * @file 虚拟商品 —— 小屋家具与宠物零食
 * @layer data  静态内容，随 App 版本内置
 * @see design/02-数据库Schema.md §3.12b  purchases 表与积分经济平衡
 * @see src/data/seed/realRewards.ts        另一半：现实兑换券
 * @see src/data/seed/voiceManifest.ts      这里的 clipKey 会并入总清单（shop.*）
 *
 * ## ⭐ 为什么是「一间共享小屋」而不是每只宠物一间房
 *
 * 分房的话，孩子必然先装扮她最喜欢的那只，另外两只的房间一直空着——
 * 她每次打开都看到「波波家里什么都没有」。那是 CLAUDE.md 宠物红线第 3 条
 * 「三只之间绝不比较」的另一种形式，而且更糟：等级差距是学习自然产生的，
 * 房间空着却是她自己选的，那份愧疚更具体。
 *
 * 同一件家具要买三次还会让她开始算账「我要不要也给波波买一个」——
 * 一旦她做这个取舍，她就是在给三只排序，正是红线要消灭的那个动作。
 *
 * 所以：**三只住一起，家具只买一次，这是「你们的家」。**
 *
 * ## 家具位置写死，一位一件
 *
 * 买了自动摆好，孩子不用布置——一年级不该做「摆放」这种事。
 * 也刻意**不做「红地毯 / 蓝地毯」二选一**：二选一会制造「我买错了」的懊悔，
 * 而她不识字、颜色偏好又不稳定。一位一件，每次购买都是干净的一次进步。
 *
 * ## 加内容 = 加新位置
 *
 * 窗台的花、天花板星星灯、门口地垫……每个新位置就是一个新空位。
 * 空位比已获得更能驱动行为（同 design/02 §3.13 图鉴那条原理）。
 */

import type { ClipKey } from '@/domain/speech'

/**
 * 小屋里的固定位置。**一个位置只对应一件商品**，因此不会重叠，
 * 每件家具也能照着自己那块地方画到刚好合适。
 */
export type RoomSlot =
  | 'floor'
  | 'wallLeft'
  | 'wallBack'
  | 'deskSide'
  | 'wallRight'
  | 'corner'

/** 一件小屋家具 */
export interface RoomItem {
  /** 语义 ID。⚠️ 与 `Purchase.shopItemId` 对应，改名会让已买的家具失踪 */
  id: string
  slot: RoomSlot
  label: string
  price: number
  clipKey: ClipKey
  /**
   * 渲染层据此查该画什么。是**语义名而非具体图形**——
   * 换美术时只改渲染层的映射表，这份数据一行不动（同 `pets.ts` 的 `StageAccessory.kind`）。
   */
  art: string
}

/**
 * 一样宠物零食。
 *
 * ⚠️ **买入即消耗，不产生任何状态**：三只一起吃，播个动画，各说一句谢谢。
 * 不加经验、不涨好感、没有饱食度。喂养系统在 design/02 §3.11、
 * design/03 §4.5、design/06 §9 三处都被明确移除过，理由是它必然带来
 * 「没喂 = 宠物变惨」的惩罚感。零食是一次性的开心，仅此而已。
 *
 * 也**不做「喂哪一只」的选择**——那和买三次是同一个陷阱，又在让她排序。
 */
export interface TreatItem {
  id: string
  label: string
  price: number
  clipKey: ClipKey
  art: string
}

/**
 * 六件家具，合计 2120 分。
 *
 * 按每天 70~100 分算约 3~4 周集齐——足够长到有盼头，
 * 又不至于长到看不见终点。定价依据见 design/02 §3.12 的平衡表。
 */
export const ROOM_ITEMS: readonly RoomItem[] = [
  { id: 'room-rug', slot: 'floor', label: '地毯', price: 300, clipKey: 'shop.rug', art: 'rug' },
  {
    id: 'room-picture',
    slot: 'wallLeft',
    label: '挂画',
    price: 300,
    clipKey: 'shop.picture',
    art: 'picture',
  },
  {
    id: 'room-curtain',
    slot: 'wallBack',
    label: '窗帘',
    price: 360,
    clipKey: 'shop.curtain',
    art: 'curtain',
  },
  {
    id: 'room-lamp',
    slot: 'deskSide',
    label: '小台灯',
    price: 360,
    clipKey: 'shop.lamp',
    art: 'lamp',
  },
  {
    id: 'room-shelf',
    slot: 'wallRight',
    label: '小书架',
    price: 400,
    clipKey: 'shop.shelf',
    art: 'shelf',
  },
  {
    id: 'room-toybox',
    slot: 'corner',
    label: '玩具箱',
    price: 400,
    clipKey: 'shop.toybox',
    art: 'toybox',
  },
]

/**
 * 三样零食，10~25 分 —— **当天就买得起**。
 *
 * 便宜是刻意的：它只是一个动画，贵了就不划算，而「今天也有点收获」
 * 这件事本身值得每天都能发生。三样足够，再多只是重复同一个动画。
 *
 * ⚠️ 都是三只通吃的东西（不是小鱼干/竹叶这类专属食物）——
 * 专属食物会诱导「今天喂谁」，那又是在排序。
 */
export const TREAT_ITEMS: readonly TreatItem[] = [
  { id: 'treat-cookie', label: '小饼干', price: 10, clipKey: 'shop.cookie', art: 'cookie' },
  { id: 'treat-fruit', label: '水果篮', price: 15, clipKey: 'shop.fruit', art: 'fruit' },
  { id: 'treat-cake', label: '大蛋糕', price: 25, clipKey: 'shop.cake', art: 'cake' },
]

/** 按 ID 查家具。渲染小屋、还原购买记录都要用 */
export const ROOM_ITEM_BY_ID: ReadonlyMap<string, RoomItem> = new Map(
  ROOM_ITEMS.map((item) => [item.id, item]),
)

/** 按 ID 查零食 */
export const TREAT_ITEM_BY_ID: ReadonlyMap<string, TreatItem> = new Map(
  TREAT_ITEMS.map((item) => [item.id, item]),
)
