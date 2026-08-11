/**
 * @file 错题本 —— 从作答历史里挑出「错了、而且还没改对」的题
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/02-数据库Schema.md §3.7  itemSnapshot 存在的理由
 * @see design/05-孩子反馈与响应.md 第 2 条  小结页的错题回顾
 *
 * ⚠️ **和小结页刚好相反：这里要显示她当时选了什么。**
 *
 * 小结页（给孩子看）刻意隐藏错误答案——重复呈现错误会强化错误记忆，
 * 而且「你当时选了 13」对一年级孩子只是又一次提醒她做错了。
 *
 * 错题本（给家长看）必须显示。家长要判断该怎么帮，
 * 而「她选了 13」和「她选了 10」指向完全不同的补救路径：
 * 前者是凑十丢了 1，后者是凑十后忘了加。看不到选项，诊断就无从谈起。
 *
 * 同一份数据，受众不同，结论相反。改这里前请先确认改的是哪一边。
 */

import { DEFAULT_RESOLVE_STREAK, hasStreakAfter } from '@/domain/report/hasStreakAfter'
import type { Attempt, Difficulty, IsoDateTime, LocalDate, MisconceptionTag, Uuid } from '@/domain/types'

/**
 * 一道错题被判定为「已解决」的方式。
 *
 * - `same_item` —— 这道题本身后来做对了（小结页订正，或又抽到同一题）
 * - `kp_streak` —— ⭐ 这道题没再出现过，但**同知识点已连续答对若干次**
 */
export type ResolutionKind = 'same_item' | 'kp_streak'

export interface WrongItem {
  attemptId: Uuid
  kpId: string
  /** 题目签名，同一道题的多次作答共用它 */
  itemId: string
  /** 题干文本。生成题靠 `itemSnapshot` 还原，没有快照时为空 */
  stem: string
  correctAnswer: string
  /** ⚠️ 她当时选的选项文本，只给家长看。理由见文件头 */
  selectedText?: string
  misconceptionTag?: MisconceptionTag
  difficulty: Difficulty
  createdAt: IsoDateTime
  localDate: LocalDate
  /** 已解决的话是怎么解决的；仍待订正时为 `undefined` */
  resolvedBy?: ResolutionKind
}

export interface CollectWrongItemsOptions {
  /** 是否保留已解决的题。默认 `false`——错题本只留还没解决的 */
  includeResolved?: boolean
  /** 同知识点连续答对几次视为解决，默认 {@link DEFAULT_RESOLVE_STREAK} */
  resolveStreak?: number
}

/**
 * 从作答记录里整理出错题清单。
 *
 * **同一道题只保留最近一次错误**：同一个算式错了五遍不该在错题本里占五行，
 * 那会把清单撑爆，也让家长看不出到底有几个不同的问题。
 *
 * 「已解决」有两条通路，命中任一即可（见 {@link ResolutionKind}）：
 * 1. 同一 `itemId` 在这次错误**之后**答对过——不区分是订正轮还是后来又遇到
 * 2. ⭐ 同一 `kpId` 在这次错误之后**连续答对** `resolveStreak` 次
 *
 * 第 2 条是必要的：数学题随机生成，同一个算式可能再也不会出现，
 * 只认第 1 条会让错题本积满已经不成立的条目。见 {@link DEFAULT_RESOLVE_STREAK}。
 *
 * @param attempts - 作答记录，通常已按科目和时间范围过滤
 * @param options - 是否保留已解决的题、连对阈值
 * @returns 按时间倒序（最近的在前）
 *
 * @example
 * collectWrongItems(attempts)
 * // [ { kpId: 'M5.2', stem: '9 + 5 = ?', correctAnswer: '14',
 * //     selectedText: '13', misconceptionTag: 'no_carry', resolvedBy: undefined } ]
 *
 * @example
 * // 想看「这周错过但已经解决的」，用于确认补救是否见效
 * collectWrongItems(attempts, { includeResolved: true }).filter((w) => w.resolvedBy !== undefined)
 */
export function collectWrongItems(
  attempts: readonly Attempt[],
  options: CollectWrongItemsOptions = {},
): WrongItem[] {
  const resolveStreak = options.resolveStreak ?? DEFAULT_RESOLVE_STREAK

  /** 每道题最后一次答对的时刻，用于判断这道题本身有没有改对 */
  const lastCorrectAt = new Map<string, number>()
  /** 每个知识点的作答，按时间升序，用于连对判定 */
  const byKp = new Map<string, Attempt[]>()

  const chronological = [...attempts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  for (const a of chronological) {
    if (a.isCorrect) {
      const at = new Date(a.createdAt).getTime()
      const prev = lastCorrectAt.get(a.itemId)
      if (prev === undefined || at > prev) lastCorrectAt.set(a.itemId, at)
    }
    const list = byKp.get(a.kpId)
    if (list === undefined) byKp.set(a.kpId, [a])
    else list.push(a)
  }

  /** 每道题最近一次答错 */
  const latestWrong = new Map<string, Attempt>()
  for (const a of chronological) {
    if (!a.isCorrect) latestWrong.set(a.itemId, a)
  }

  const items: WrongItem[] = []
  for (const attempt of latestWrong.values()) {
    const wrongAt = new Date(attempt.createdAt).getTime()

    let resolvedBy: ResolutionKind | undefined
    if ((lastCorrectAt.get(attempt.itemId) ?? -Infinity) > wrongAt) {
      resolvedBy = 'same_item'
    } else if (hasStreakAfter(byKp.get(attempt.kpId) ?? [], wrongAt, resolveStreak)) {
      resolvedBy = 'kp_streak'
    }

    if (resolvedBy !== undefined && options.includeResolved !== true) continue

    const snapshot = attempt.itemSnapshot
    const selected = snapshot?.options.find((o) => o.id === attempt.selectedOptionId)

    items.push({
      attemptId: attempt.id,
      kpId: attempt.kpId,
      itemId: attempt.itemId,
      stem: snapshot?.stem ?? '',
      correctAnswer: snapshot?.answer ?? '',
      ...(selected?.text !== undefined && { selectedText: selected.text }),
      ...(attempt.misconceptionTag !== undefined && {
        misconceptionTag: attempt.misconceptionTag,
      }),
      difficulty: attempt.difficulty,
      createdAt: attempt.createdAt,
      localDate: attempt.localDate,
      ...(resolvedBy !== undefined && { resolvedBy }),
    })
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
