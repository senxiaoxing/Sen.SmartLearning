/**
 * @file 时段划分 —— 决定首页说「早上好呀」还是「晚上好呀」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/greetingLine.ts  使用者
 *
 * 固定一句「今天想学点什么」谁都能写，但它不像有人在跟你说话。
 * 加上时段之后，早上打开和睡前打开听到的不是同一句——
 * App 因此有了「此刻」的概念，而不是一个永远停在同一帧的界面。
 */

/** 一天里的四个时段 */
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening'

/**
 * 时段边界（本地时间的小时数，左闭右开）。
 *
 * 起点定在 5 点而不是 0 点：凌晨 1 点打开的话，「早上好」比「晚上好」更不对劲。
 * 把 0~4 点归到 evening，等于把它当作「昨晚还没结束」——
 * 对一个一年级孩子来说，这个时间本来就不该在做题，说什么都无所谓，
 * 但至少别说错。
 */
const MORNING_FROM = 5
const NOON_FROM = 11
const AFTERNOON_FROM = 14
const EVENING_FROM = 18

/** 各时段的问候片段。`undefined` 表示不加时段词，直接问「今天想学点什么」 */
const GREETING_CLIPS: Record<TimeOfDay, { clipKey: string; text: string }> = {
  morning: { clipKey: 'phrase.goodMorning', text: '早上好呀' },
  noon: { clipKey: 'phrase.goodNoon', text: '中午好呀' },
  afternoon: { clipKey: 'phrase.goodAfternoon', text: '下午好呀' },
  evening: { clipKey: 'phrase.goodEvening', text: '晚上好呀' },
}

/**
 * 判断当前是哪个时段。
 *
 * @param localHour - 本地时间的小时数 0~23。⚠️ 必须由调用方传入
 *                    （`new Date().getHours()`），在这里读系统时间会让本函数无法测试
 * @returns 时段
 *
 * @example
 * timeOfDay(7)    // 'morning'
 * timeOfDay(12)   // 'noon'
 * timeOfDay(15)   // 'afternoon'
 * timeOfDay(20)   // 'evening'
 * timeOfDay(2)    // 'evening' —— 凌晨算作「昨晚还没结束」
 */
export function timeOfDay(localHour: number): TimeOfDay {
  if (localHour >= EVENING_FROM || localHour < MORNING_FROM) return 'evening'
  if (localHour >= AFTERNOON_FROM) return 'afternoon'
  if (localHour >= NOON_FROM) return 'noon'
  return 'morning'
}

/**
 * 取某个时段的问候语与它的语音片段。
 *
 * @param when - 时段
 * @returns 片段 key 与文本
 *
 * @example
 * greetingOf('morning')   // { clipKey: 'phrase.goodMorning', text: '早上好呀' }
 */
export function greetingOf(when: TimeOfDay): { clipKey: string; text: string } {
  return GREETING_CLIPS[when]
}
