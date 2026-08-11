/**
 * @file 宠物台词选择 —— 让宠物像个有性格的伙伴而不是进度条
 * @layer domain  纯函数
 * @see src/data/seed/pets.ts 三只宠物的台词池
 *
 * 台词是宠物系统里最便宜也最有效的部分：
 * 一个会说「让我数数看～」的企鹅，和一个只显示等级数字的图标，
 * 对孩子完全是两种东西。
 */

import { daysBetween } from '@/domain/time'
import type { PetPersonality } from '@/data/seed/pets'
import type { IsoDateTime } from '@/domain/types'

export type PetMoment = 'greet' | 'correct' | 'wrong' | 'levelUp' | 'comeback'

/**
 * 多久没见就触发「想你了」的问候。
 *
 * ⚠️ 台词只能是想念，绝不能是责备（「你都不理我」「我快饿死了」）。
 * 孩子几天没玩回来看到宠物抱怨，产生的是负罪感和回避，不是动力。
 * 见 CLAUDE.md 产品红线。
 */
const COMEBACK_AFTER_DAYS = 3

/**
 * 挑一句台词。
 *
 * @param personality - 宠物性格
 * @param moment - 什么场合
 * @param seed - 随机源。传入调用方的随机数，保持 domain 纯净
 * @returns 台词；台词池为空时返回口头禅兜底
 *
 * @example
 * pickLine(penguin.personality, 'correct', Math.random())
 * // '哇，算对了！'
 */
export function pickLine(
  personality: PetPersonality,
  moment: PetMoment,
  seed: number,
): string {
  const pool = personality[moment]
  if (pool.length === 0) return personality.catchphrase
  const index = Math.floor(Math.abs(seed) * pool.length) % pool.length
  return pool[index] ?? personality.catchphrase
}

/**
 * 判断打招呼时该用普通问候还是「想你了」。
 *
 * @param lastSeenAt - 上次见面时间
 * @param now - 当前时间
 *
 * @example
 * greetingMoment(fourDaysAgo, now)   // 'comeback'
 * greetingMoment(yesterday, now)     // 'greet'
 */
export function greetingMoment(
  lastSeenAt: IsoDateTime | undefined,
  now: IsoDateTime,
): 'greet' | 'comeback' {
  if (lastSeenAt === undefined) return 'greet'
  return daysBetween(lastSeenAt, now) >= COMEBACK_AFTER_DAYS ? 'comeback' : 'greet'
}
