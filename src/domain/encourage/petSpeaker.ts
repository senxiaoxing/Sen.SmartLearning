/**
 * @file 说话者判定 —— 这句话是哪只伙伴在说，就用它的音色叫名字
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/07-音频方案.md §2.5b  跨音色文本为什么要按音色各生成一份
 * @see src/domain/encourage/addressed.ts  唯一的消费方
 *
 * ## 背景：每只伙伴有自己的神经音色
 *
 * 宠物台词（petline.*）按宠物分音色生成（企鹅=男童、飞龙=青年、熊猫=温柔女声），
 * 而昵称片段（name.*）默认是旁白的少女声。若把少女声的「小恩宝」
 * 拼在男童声的「我有点想你」前面，一句话里就是两个人在说——
 * 这违反「一句话一个音色」（design/07 §2.5b），比全程机器声更出戏。
 *
 * 解法：**昵称片段按音色各生成一份**（`name.penguinXiaoenbao` 等，
 * 生成脚本按前缀路由音色），拼句子时根据「后半句是谁的台词」挑对应变体。
 * 说话者不需要调用方显式传——**它是台词片段 key 自带的信息**。
 */

import type { ClipKey } from '@/domain/speech'

/** 三只伙伴的语音身份，与 petline.* 片段 key 里的物种段一致 */
export type PetSpeaker = 'penguin' | 'dragon' | 'panda'

/** 全部说话者。生成昵称音色变体时遍历用（voiceManifest 与生成脚本共用此序） */
export const PET_SPEAKERS: readonly PetSpeaker[] = ['penguin', 'dragon', 'panda']

/** 台词片段 key 的物种段。⚠️ 与 pets.ts 的 clipKey 命名（petline.penguinG1…）耦合 */
const PETLINE_SPEAKER = /^petline\.(penguin|dragon|panda)/

/**
 * 从一句话的片段序列里认出说话者。
 *
 * 只认宠物台词（petline.*）：旁白的短语、数字、名词都不改变说话者，
 * 找不到台词片段就是旁白在说（返回 `undefined`）。
 *
 * @param parts - 整句的片段 key（已展平）
 * @returns 伙伴身份；旁白说的句子返回 `undefined`
 *
 * @example
 * speakerOfParts(['petline.penguinG1Correct0'])   // 'penguin'
 * speakerOfParts(['phrase.praise1'])              // undefined —— 旁白
 */
export function speakerOfParts(parts: readonly ClipKey[]): PetSpeaker | undefined {
  for (const key of parts) {
    const match = PETLINE_SPEAKER.exec(key)
    if (match !== null) return match[1] as PetSpeaker
  }
  return undefined
}

/**
 * 挑昵称片段的音色变体。
 *
 * 变体 key 的构造规则与生成脚本（`loadNicknames()`）逐字一致：
 * `name.xiaoenbao` + `penguin` → `name.penguinXiaoenbao`。
 * 两边不一致的后果是变体文件生成了、运行时却引用不到，
 * 整句默默降级成 TTS——由 `voiceManifest.test.ts` 的变体用例兜底。
 *
 * @param clipKey - 旁白音色的昵称片段 key（`name.<无声调拼音>`）
 * @param speaker - 说话者；旁白（`undefined`）原样返回
 * @returns 对应音色的昵称片段 key
 *
 * @example
 * nicknameClipFor('name.xiaoenbao', 'penguin')   // 'name.penguinXiaoenbao'
 * nicknameClipFor('name.xiaoenbao', undefined)   // 'name.xiaoenbao'
 */
export function nicknameClipFor(clipKey: ClipKey, speaker: PetSpeaker | undefined): ClipKey {
  if (speaker === undefined) return clipKey
  const slug = clipKey.slice('name.'.length)
  return `name.${speaker}${slug.charAt(0).toUpperCase()}${slug.slice(1)}`
}
