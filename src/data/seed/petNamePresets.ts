/**
 * @file 宠物名字预设 —— 有专属预生成语音的备选名清单
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/voiceManifest.ts      这里的片段会并入总清单（petname.*）
 * @see src/features/pet/PetNamePicker.tsx  起名选择器
 * @see design/06-宠物系统.md               起名交互
 *
 * ## 为什么起名从「键盘输入」改成「预录名单里挑」
 *
 * 自由输入的名字没有预生成音频，升级那句「毛毛升到 3 级啦」只能整句降级成
 * 实时 TTS——恰好毁掉全 App 情感浓度最高的一句话。而且起名本该是孩子自己的事，
 * 键盘对一年级孩子是道坎（这里曾是全 App 唯一需要键盘的地方）。
 * 换成点选之后：每个候选名点一下就念出来，她不识字也能自己听着挑。
 *
 * ## 挑名字的两条硬规矩
 *
 * 1. **绝不用多音字** —— 名字要送去 TTS 生成音频，「乐乐」有 lè/yuè 两读，
 *    读哪个全凭运气（与拼音载体字同一条铁律，见 design/07 §3.3）。
 *    因此这里没有「乐乐」「长长」这类常见叠名。
 * 2. **两三个字、叠词优先** —— 一年级孩子叫得顺口，也更像「小伙伴」。
 *
 * ## 加一个新名字
 *
 * 1. 往 {@link PET_NAME_PRESETS} 里加一条，`clipKey` 用 `petname.` + 无声调拼音
 * 2. 跑 `npm run voices`（只会补这一条）
 */

import type { ClipKey } from '@/domain/speech'

/** 一个有专属语音的备选名 */
export interface PetNamePreset {
  /** 语音片段 key。`petname.` + 无声调拼音，如 `petname.tangtang` */
  clipKey: ClipKey
  /** 显示与朗读的文字 */
  text: string
}

/**
 * 共享候选池，三只伙伴通用。
 *
 * 默认名（团团/墨墨/波波）不在这里——它们的片段在 `pet.*` 组，
 * 选择器会把当前伙伴的默认名排在候选第一位。
 */
export const PET_NAME_PRESETS: readonly PetNamePreset[] = [
  { clipKey: 'petname.tangtang', text: '糖糖' },
  { clipKey: 'petname.doudou', text: '豆豆' },
  { clipKey: 'petname.qiuqiu', text: '球球' },
  { clipKey: 'petname.maomao', text: '毛毛' },
  { clipKey: 'petname.tiaotiao', text: '跳跳' },
  { clipKey: 'petname.guoguo', text: '果果' },
  { clipKey: 'petname.xueqiu', text: '雪球' },
  { clipKey: 'petname.xingxing', text: '星星' },
  { clipKey: 'petname.pipi', text: '皮皮' },
  { clipKey: 'petname.naonao', text: '闹闹' },
]
