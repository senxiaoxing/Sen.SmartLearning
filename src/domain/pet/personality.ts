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
import type { PetLine, PetPersonality } from '@/data/seed/pets'
import type { IsoDateTime } from '@/domain/types'

export type PetMoment = 'greet' | 'correct' | 'wrong' | 'levelUp' | 'comeback' | 'archived'

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
 * 返回的是 {@link PetLine}（文本 + 语音片段 key）而不是裸字符串：
 * 台词全部预生成了 mp3，调用方拿到 key 才能用少女音播，
 * 否则又掉回机器音——而答对反馈每题都要播这一句。
 *
 * @param personality - 宠物性格
 * @param moment - 什么场合
 * @param seed - 随机源。传入调用方的随机数，保持 domain 纯净
 * @returns 台词；台词池为空时返回口头禅兜底
 *
 * @example
 * pickLine(penguin.personality, 'correct', Math.random())
 * // { clipKey: 'petline.penguinG1Correct0', text: '哇，算对了！' }
 */
export function pickLine(
  personality: PetPersonality,
  moment: PetMoment,
  seed: number,
): PetLine {
  const pool = personality[moment]
  if (pool.length === 0) return personality.catchphrase
  const index = Math.floor(Math.abs(seed) * pool.length) % pool.length
  return pool[index] ?? personality.catchphrase
}

/**
 * 判断打招呼时该用普通问候、「想你了」，还是往届伙伴的回忆语。
 *
 * ⭐ **`archived` 必须排在最前面，不能落到 `lastSeenAt` 的判断上**。
 * 往届伙伴不再结算经验，`lastSeenAt` 就此冻住，天数只会越拖越大——
 * 于是它必然、且永久命中 `comeback`。「好几天没见到你了，我有点想你」
 * 在回忆页里的意思是「你抛弃我之后我一直在等」，
 * 而 §5.2 造出「回忆」这个地方就是为了避免这种负罪感。
 *
 * @param lastSeenAt - 上次见面时间
 * @param now - 当前时间
 * @param archived - 是不是往届伙伴（已经陪她读完那一年，不再成长）
 *
 * @example
 * greetingMoment(fourDaysAgo, now)          // 'comeback'
 * greetingMoment(yesterday, now)            // 'greet'
 * greetingMoment(longAgo, now, true)        // 'archived' —— 冻住的时间不再有意义
 */
export function greetingMoment(
  lastSeenAt: IsoDateTime | undefined,
  now: IsoDateTime,
  archived = false,
): 'greet' | 'comeback' | 'archived' {
  if (archived) return 'archived'
  if (lastSeenAt === undefined) return 'greet'
  return daysBetween(lastSeenAt, now) >= COMEBACK_AFTER_DAYS ? 'comeback' : 'greet'
}
