/**
 * @file 时间构造与计算 —— 品牌类型 `IsoDateTime` / `LocalDate` 的唯一合法入口
 * @layer domain  除 `nowIso()` / `todayLocal()` 外全部为纯函数
 * @see design/02-数据库Schema.md §0 约束 3「时间同时存 UTC 和本地日期」
 *
 * 项目中所有时间字段都必须经由本文件构造，禁止手写 `as IsoDateTime`。
 * 品牌类型的意义就是让「把 UTC 时间戳塞进 localDate 字段」这类错误在编译期被拦下。
 */

import type { IsoDateTime, LocalDate } from '@/domain/types'

/** 一天的毫秒数 */
const MS_PER_DAY = 24 * 60 * 60 * 1000
/** 一小时的毫秒数 */
const MS_PER_HOUR = 60 * 60 * 1000

// ============================================================================
// 边界函数 —— 读取系统时间，非纯函数
// ============================================================================

/**
 * 当前时刻的 UTC 时间戳。
 *
 * ⚠️ 非纯函数。`domain/` 下的业务函数**不要直接调用它**，
 * 应通过参数接收 `now`，否则无法用固定时间写测试。
 * 只有 store / repository 等边界层才调用。
 *
 * @example
 * // ❌ 错误：无法测试
 * function updateMastery(m: Mastery) { m.dueAt = nowIso() }
 * // ✅ 正确：时间从外部注入
 * function updateMastery(m: Mastery, now: IsoDateTime) { m.dueAt = now }
 */
export function nowIso(): IsoDateTime {
  return new Date().toISOString() as IsoDateTime
}

/**
 * 今天的本地日期。⚠️ 非纯函数，理由同 {@link nowIso}。
 */
export function todayLocal(): LocalDate {
  return toLocalDate(new Date())
}

// ============================================================================
// 构造与转换
// ============================================================================

/** 把 `Date` 转为 UTC 时间戳。 */
export function toIso(date: Date): IsoDateTime {
  return date.toISOString() as IsoDateTime
}

/**
 * 把 `Date` 转为**设备本地时区**的 `'YYYY-MM-DD'`。
 *
 * ⚠️ 绝不能用 `date.toISOString().slice(0, 10)` —— 那返回的是 UTC 日期。
 * 东八区晚上 8 点做的题，UTC 日期已是当天 12:00，看似没问题；
 * 但**凌晨 0~8 点**做的题，UTC 仍是前一天，会被算到昨天，
 * 导致日统计和连续打卡天数错乱。必须按本地时区取年月日。
 *
 * @example
 * // 北京时间 2026-08-06 01:30（UTC 为 2026-08-05T17:30Z）
 * toLocalDate(d)                    // '2026-08-06'  ✅ 正确
 * d.toISOString().slice(0, 10)      // '2026-08-05'  ❌ 算到了昨天
 */
export function toLocalDate(date: Date): LocalDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}` as LocalDate
}

/** 取某个 UTC 时间戳对应的本地日期。 */
export function isoToLocalDate(iso: IsoDateTime): LocalDate {
  return toLocalDate(new Date(iso))
}

export function parseIso(iso: IsoDateTime): Date {
  return new Date(iso)
}

/**
 * 从外部字符串还原时间戳，用于备份导入等场景。
 *
 * @throws 字符串不是合法时间时抛错——备份文件损坏必须显式失败，不能静默产生 Invalid Date
 */
export function isoFromString(value: string): IsoDateTime {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`非法的 ISO 时间字符串: ${value}`)
  }
  return d.toISOString() as IsoDateTime
}

/**
 * 从外部字符串还原本地日期，用于备份导入等场景。
 *
 * @throws 格式不是 `'YYYY-MM-DD'` 时抛错
 */
export function localDateFromString(value: string): LocalDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`非法的本地日期字符串: ${value}`)
  }
  return value as LocalDate
}

// ============================================================================
// 纯计算
// ============================================================================

/** 在时间戳上加减天数，返回新的时间戳。`days` 可为负。 */
export function addDays(iso: IsoDateTime, days: number): IsoDateTime {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY).toISOString() as IsoDateTime
}

/** `to - from` 的小时差，可为小数。用于宠物状态衰减计算。 */
export function hoursBetween(from: IsoDateTime, to: IsoDateTime): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_HOUR
}

/** `to - from` 的天数差，向下取整。 */
export function daysBetween(from: IsoDateTime, to: IsoDateTime): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY)
}

/** `target` 是否已到期（早于或等于 `now`）。用于间隔重复的复习判定。 */
export function isDue(target: IsoDateTime, now: IsoDateTime): boolean {
  return new Date(target).getTime() <= new Date(now).getTime()
}

/**
 * 在本地日期上加减天数。`days` 可为负。
 *
 * ⚠️ 走本地时间构造而非 UTC 加减：`'2026-03-08' + 1` 必须永远得到 `'2026-03-09'`，
 * 哪怕这天恰好有夏令时切换、当天只有 23 小时。按毫秒加 86400000 在那一天会算错。
 *
 * @example
 * addLocalDays('2026-08-07', -2)   // '2026-08-05'
 */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toLocalDate(d)
}

/**
 * 两个本地日期相差的天数。用于连续打卡判定。
 *
 * @example
 * localDaysBetween('2026-08-05', '2026-08-07')  // 2
 */
export function localDaysBetween(from: LocalDate, to: LocalDate): number {
  const a = new Date(`${from}T00:00:00`)
  const b = new Date(`${to}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}
