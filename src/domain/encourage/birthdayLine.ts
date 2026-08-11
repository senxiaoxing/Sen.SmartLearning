/**
 * @file 生日 —— 一年只出现一天的那句话
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/addressed.ts  昵称怎么拼进去
 * @see src/features/home/HomePage.tsx     生日当天首页换成这一句
 *
 * `Profile.birthDate` 在 schema 里躺了很久没人用。启用它的理由很简单：
 * 一年只有一天，但一个会记得你生日的东西，和一个不会的，是两种东西。
 *
 * ⚠️ 生日**不给任何奖励**（不加积分、不送经验、不解锁内容）。
 * 一旦挂上奖励，它就从「今天是你的日子」变成又一个每日任务，
 * 而且第二年孩子会记得去领——那不是庆祝，是发工资。
 */

import { addressed, type Nickname, type SpokenLine } from '@/domain/encourage/addressed'

/** 从 `'YYYY-MM-DD'` 里取出 `'MM-DD'`。非法输入返回 `null` */
function monthDay(date: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5) : null
}

/** 今年有没有 2 月 29 日 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 今天是不是生日。
 *
 * ⭐ 2 月 29 日出生的，平年在 **2 月 28 日**庆祝，而不是四年才过一次。
 * 这不是钻牛角尖：真出现了，孩子感受到的是「App 把我忘了」，
 * 而她并不理解闰年。
 *
 * @param birthDate - 生日 `'YYYY-MM-DD'`。未设置传 `undefined`
 * @param today - 今天的本地日期 `'YYYY-MM-DD'`。⚠️ 由调用方传入，
 *                在这里读系统时间会让本函数无法测试
 * @returns 今天是否该庆祝
 *
 * @example
 * isBirthday('2019-08-11', '2026-08-11')   // true
 * isBirthday('2020-02-29', '2026-02-28')   // true  —— 平年提前一天
 * isBirthday('2020-02-29', '2024-02-28')   // false —— 闰年就在当天过
 * isBirthday(undefined, '2026-08-11')      // false
 */
export function isBirthday(birthDate: string | undefined, today: string): boolean {
  if (birthDate === undefined) return false

  const born = monthDay(birthDate)
  const now = monthDay(today)
  if (born === null || now === null) return false
  if (born === now) return true

  // 闰日生日落在平年：改到 2 月 28 日
  const thisYear = Number(today.slice(0, 4))
  return born === '02-29' && now === '02-28' && !isLeapYear(thisYear)
}

/**
 * 生日问候，替换当天的首页标题。
 *
 * @param nickname - 当前昵称。没设置时退回「生日快乐」
 * @returns 显示文字与待播语句
 *
 * @example
 * birthdayLine({ text: '小恩宝', clipKey: 'name.xiaoenbao' })
 * // → { text: '小恩宝，生日快乐',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.happyBirthday'], … } }
 */
export function birthdayLine(nickname: Nickname): SpokenLine {
  return addressed(nickname, ['phrase.happyBirthday'], '生日快乐')
}
