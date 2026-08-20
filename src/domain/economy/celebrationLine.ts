/**
 * @file 买到了说哪句话 —— 庆祝语的文本与语音片段
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/features/shop/BuyCelebration.tsx  唯一消费方
 * @see design/07-音频方案.md §2.5b           为什么不做「片段 + TTS 混播」
 *
 * ## ⭐ 这句话必须是少女音，不能是 TTS
 *
 * 原先这里走的是 `plain(text)`，也就是整句实时 TTS。孩子实测反馈
 * 「谢谢你」的人声和别处不一样——她听得出来。买到东西那一下是整个商店的高光，
 * 偏偏用了全 App 最差的音色。
 *
 * 修法是把它拆成**商品名片段 + 固定后半句片段**：商品名本来就有预生成音频
 * （`shop.*`，也正是现实券只能从预设里挑的原因），后半句只有三种，
 * 加三条 `phrase.*` 就够。
 *
 * ⚠️ 商品名没有片段时**整句降级为 TTS**，绝不「前半句片段 + 后半句 TTS」——
 * 一句话里两个音色比全程机器音更出戏。与昵称、宠物名同一条铁律。
 */

import { plain, utter, type ClipKey, type Utterance } from '@/domain/speech'
import type { ShopItemKind } from '@/domain/types'

/** 庆祝语：屏幕上写什么、耳朵里听什么 */
export interface CelebrationSpeech {
  /** 屏幕文本，与朗读内容逐字一致 */
  text: string
  /** 待播语句。片段齐全时是少女音拼句，否则整句 TTS */
  utterance: Utterance
}

export interface CelebrationInput {
  /** 商品名，如「小饼干」 */
  label: string
  /** 商品名的语音片段。旧档案或异常数据可能缺，缺了就整句 TTS */
  clipKey?: ClipKey
  kind: ShopItemKind
  /** 现实券要等家长兑现，后半句得换一种说法 */
  pending: boolean
}

/**
 * 后半句的三种情况。
 *
 * ⚠️ 文本必须与 `voiceManifest.ts` 里对应 key 的内容逐字一致——
 * 对不上的后果是「屏幕写着 A、耳朵听到 B」，而这类漂移谁也不会主动去核对。
 * 由 `celebrationLine.test.ts` 强制校验。
 */
const TAIL = {
  /** 现实券：东西还在爸爸妈妈那儿，不能说「是你的啦」 */
  pending: { clipKey: 'phrase.toldParents', text: '已经告诉爸爸妈妈啦' },
  /** 零食：三只一起吃，谢的是她 */
  treat: { clipKey: 'phrase.feastThanks', text: '大家一起吃，谢谢你' },
  /** 家具：留在小屋里，是她的 */
  owned: { clipKey: 'phrase.itsYours', text: '是你的啦' },
} as const

/** 三条后半句片段。供商店页预取用——等按下去才加载那一下就是「按了没反应」 */
export const CELEBRATION_TAIL_CLIPS: readonly ClipKey[] = Object.values(TAIL).map(
  (tail) => tail.clipKey,
)

/**
 * 买到一件东西之后说的那句话。
 *
 * ⚠️ **永远只有一句**。同一屏里两个组件各自 `say()` 会互相打断
 * （CLAUDE.md 产品红线，升级横幅踩过这个坑），所以要加话就往这句里拼，
 * 不要在别处新开一次朗读。
 *
 * @param input - 商品名、片段 key、大类，以及是否待家长兑现
 * @returns 屏幕文本与待播语句
 *
 * @example
 * celebrationLine({ label: '小饼干', clipKey: 'shop.cookie', kind: 'treat', pending: false })
 * // text: '小饼干，大家一起吃，谢谢你'
 * // utterance.parts: ['shop.cookie', 'phrase.feastThanks']   ← 少女音拼句
 *
 * @example
 * celebrationLine({ label: '一个冰淇淋', kind: 'real', pending: true })
 * // 没有 clipKey → parts 为空，整句走 TTS，绝不半片段半 TTS
 */
export function celebrationLine(input: CelebrationInput): CelebrationSpeech {
  const tail = input.pending ? TAIL.pending : input.kind === 'treat' ? TAIL.treat : TAIL.owned
  const text = `${input.label}，${tail.text}`

  if (input.clipKey === undefined) return { text, utterance: plain(text) }
  return { text, utterance: utter([input.clipKey, tail.clipKey], text) }
}
