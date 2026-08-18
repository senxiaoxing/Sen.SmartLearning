/**
 * @file 现实兑换券预设 —— 家长从这份清单里挑，上架什么就是承诺了什么
 * @layer data  静态内容，随 App 版本内置
 * @see design/02-数据库Schema.md §3.12b  purchases 表与状态流转
 * @see src/data/seed/shopItems.ts          另一半：虚拟商品
 * @see src/data/seed/voiceManifest.ts      这里的 clipKey 会并入总清单（shop.*）
 *
 * ## ⭐ 为什么只能从预设里挑，家长不能自由输入
 *
 * 孩子不识字，商品名必须能朗读，而预录语音要求文本是固定的。
 * 自由输入的名字只能整句降级成实时 TTS，和其余全部少女音混在同一页里——
 * 这与昵称那条铁律同源：**绝不做「片段 + TTS 混播」**（design/07 §2.5b）。
 * 起名从键盘改成点选也是同一个决定（见 petNamePresets.ts）。
 *
 * 加一张新券：往下面加一条，跑 `npm run voices`（只会补这一条）。
 *
 * ## ⭐ 上架 = 承诺
 *
 * 孩子点了「冰淇淋」而家长当时给不了，一次都不能发生——
 * App 承诺了、家长兑不了，那这个功能教的是「攒星星没用」，比不做更糟。
 * 所以清单由**家长维护**：这周能给什么就上架什么，上架的每一样
 * 都是他已经答应了的。默认全部**不上架**，见 `listed` 的默认值。
 *
 * ## 为什么体验型排在零食前面
 *
 * 体验型给出去不心疼、也不会腻；零食给多了既伤身体又迅速贬值。
 * 把学习直接换零食还有 overjustification 风险（外部奖励侵蚀内在动机），
 * 缓解办法就是让零食只占其中一格，而不是全部。
 */

import type { ClipKey } from '@/domain/speech'

/**
 * 券的分类。顺序即商店里的展示顺序：小体验 → 零食 → 大奖。
 *
 * - `experience` 陪伴与选择权，最便宜也最该常给
 * - `snack`      吃的，家长按需设长冷却
 * - `prize`      要花钱买的东西，攒两周以上
 */
export type RealRewardCategory = 'experience' | 'snack' | 'prize'

/** 一张现实兑换券的预设 */
export interface RealRewardPreset {
  /** 语义 ID。⚠️ 与 `Purchase.shopItemId` 对应，改名会让历史记录对不上 */
  id: string
  category: RealRewardCategory
  label: string
  /** 建议价，**家长可改**。见下方关于「用积分区分大小」的说明 */
  suggestedPrice: number
  /** 建议冷却天数，家长可改。`0` 表示不限 */
  suggestedCooldownDays: number
  clipKey: ClipKey
  /**
   * 卡片图标。
   *
   * 现实券用 emoji 而非手绘 SVG：它代表的是真实世界里的东西，
   * 本就不该出现在宠物的画面里，卡片式呈现即可。
   * 手绘 SVG 只用在小屋那半边（见 shopItems.ts）。
   */
  emoji: string
}

/**
 * 全部预设券。
 *
 * ⚠️ `suggestedPrice` 只是**建议值**。「小礼物 / 大礼物」具体是什么由家长定，
 * 而价格就是它的定义——所以必须可改，见 `Settings.realRewardConfigs`。
 */
export const REAL_REWARD_PRESETS: readonly RealRewardPreset[] = [
  // —— 小体验：陪伴与选择权，最该常给
  {
    id: 'real-bedtime-story',
    category: 'experience',
    label: '今晚睡前故事你来选',
    suggestedPrice: 100,
    suggestedCooldownDays: 1,
    clipKey: 'shop.bedtimeStory',
    emoji: '📖',
  },
  {
    id: 'real-tv-20min',
    category: 'experience',
    label: '看二十分钟电视',
    suggestedPrice: 150,
    suggestedCooldownDays: 2,
    clipKey: 'shop.tv20',
    emoji: '📺',
  },
  {
    id: 'real-play-20min',
    category: 'experience',
    label: '再多玩二十分钟',
    suggestedPrice: 150,
    suggestedCooldownDays: 2,
    clipKey: 'shop.play20',
    emoji: '⏰',
  },
  {
    id: 'real-pick-dinner',
    category: 'experience',
    label: '今天吃什么你决定',
    suggestedPrice: 200,
    suggestedCooldownDays: 3,
    clipKey: 'shop.pickDinner',
    emoji: '🍚',
  },
  {
    id: 'real-play-together',
    category: 'experience',
    label: '陪你玩一次你选的游戏',
    suggestedPrice: 250,
    suggestedCooldownDays: 3,
    clipKey: 'shop.playTogether',
    emoji: '🎲',
  },

  // —— 零食：糖果单独列出来，家长会给它设很长的冷却
  {
    id: 'real-candy',
    category: 'snack',
    label: '一颗糖果',
    suggestedPrice: 100,
    suggestedCooldownDays: 14,
    clipKey: 'shop.candy',
    emoji: '🍬',
  },
  {
    id: 'real-snack-small',
    category: 'snack',
    label: '一包小零食',
    suggestedPrice: 250,
    suggestedCooldownDays: 7,
    clipKey: 'shop.snackSmall',
    emoji: '🍪',
  },
  {
    id: 'real-icecream',
    category: 'snack',
    label: '一个冰淇淋',
    suggestedPrice: 300,
    suggestedCooldownDays: 7,
    clipKey: 'shop.icecream',
    emoji: '🍦',
  },
  {
    id: 'real-snack-big',
    category: 'snack',
    label: '一包大零食',
    suggestedPrice: 500,
    suggestedCooldownDays: 14,
    clipKey: 'shop.snackBig',
    emoji: '🍿',
  },

  // —— 大奖：攒两周以上。冷却设得长，天然限制频率
  {
    id: 'real-book',
    category: 'prize',
    label: '一本自己想要的书',
    suggestedPrice: 800,
    suggestedCooldownDays: 30,
    clipKey: 'shop.book',
    emoji: '📚',
  },
  {
    id: 'real-gift-small',
    category: 'prize',
    label: '一个自己想要的小礼物',
    suggestedPrice: 1500,
    suggestedCooldownDays: 30,
    clipKey: 'shop.giftSmall',
    emoji: '🎁',
  },
  {
    id: 'real-gift-big',
    category: 'prize',
    label: '一个自己想要的大礼物',
    suggestedPrice: 3000,
    suggestedCooldownDays: 60,
    clipKey: 'shop.giftBig',
    emoji: '🎀',
  },
]

/** 按 ID 查预设。还原购买记录、家长配置界面都要用 */
export const REAL_REWARD_BY_ID: ReadonlyMap<string, RealRewardPreset> = new Map(
  REAL_REWARD_PRESETS.map((preset) => [preset.id, preset]),
)

/** 分类的展示顺序与中文名。家长区与商店共用，避免两处各写一份 */
export const REAL_REWARD_CATEGORIES: readonly {
  id: RealRewardCategory
  label: string
}[] = [
  { id: 'experience', label: '小体验' },
  { id: 'snack', label: '零食' },
  { id: 'prize', label: '大奖' },
]
