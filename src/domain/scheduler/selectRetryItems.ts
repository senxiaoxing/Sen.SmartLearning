/**
 * @file 订正轮排期 —— 针对还没解决的错题，重练它们所属的知识点
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/report/wrongBook.ts  错题与「已解决」的判定
 *
 * ⭐ **重练知识点，而不是重做那一道原题。**
 *
 * 重做原题在技术上要从 `itemSnapshot` 还原题目，而快照里没有存 `ttsText` 与题型——
 * 孩子不识字，一道念不出来的题等于做不了。更要紧的是教学上：
 * 同一道 `9+5` 做第二遍，她可能只是记住了「上次那个数」，
 * 而换成 `9+7`、`8+6` 才真正验证她掌握了凑十。
 *
 * 配套机制：`collectWrongItems` 的 `kp_streak` 通路——
 * 同知识点连对若干次，那道原题就自动从错题本消失。两者必须一起改。
 */

import type { Difficulty, Mastery, ScheduledItem } from '@/domain/types'

/**
 * 一轮订正最多聚焦几个知识点。
 *
 * ⚠️ 刻意**不**雨露均沾。一轮 10 题若摊给 5 个知识点，每个只有 2 题，
 * 而错题解决需要连对 3 次（`DEFAULT_RESOLVE_STREAK`）——
 * 结果是练了一轮，一道错题都没清掉，孩子看不到任何成果。
 *
 * 取 3：10 题分给 3 个知识点，每个 3~4 题，正好够达成连对 3 次。
 */
export const MAX_RETRY_KNOWLEDGE_POINTS = 3

/** 一个知识点上还有多少道没解决的错题 */
export interface WrongKpCount {
  kpId: string
  count: number
}

export interface RetryScheduleInput {
  /** 待订正的知识点及其错题数，顺序不限——本函数会自己按 `count` 降序 */
  wrongKps: readonly WrongKpCount[]
  count: number
  masteryMap: ReadonlyMap<string, Mastery>
  /** 当前确实出得了题的知识点。理由同 `ScheduleInput.answerableKpIds` */
  answerableKpIds?: ReadonlySet<string>
}

/**
 * 排一轮订正题。
 *
 * 取错题最多的前 {@link MAX_RETRY_KNOWLEDGE_POINTS} 个知识点，**轮流**出题——
 * 轮流而非分块（AAABBBCCC）是为了让每个知识点的连对判定都有机会在本轮内达成，
 * 同时避免连续同类题让孩子觉得单调。
 *
 * 难度取该知识点**当前档位**，且绝不升档：订正是把没弄懂的地方补上，
 * 不是趁机加码。她正卡在这里，再拔高只会让这一轮也失败。
 *
 * @param input - 待订正知识点、题量与掌握度索引
 * @returns 排期计划，`source` 一律为 `'remedial'`
 *
 * @example
 * selectRetryItems({
 *   wrongKps: [{ kpId: 'M5.2', count: 3 }, { kpId: 'M6.1', count: 1 }],
 *   count: 4, masteryMap,
 * })
 * // → M5.2, M6.1, M5.2, M6.1   轮流，错题多的先出
 */
export function selectRetryItems(input: RetryScheduleInput): ScheduledItem[] {
  const focus = [...input.wrongKps]
    .filter(
      (w) =>
        input.masteryMap.has(w.kpId) &&
        (input.answerableKpIds === undefined || input.answerableKpIds.has(w.kpId)),
    )
    .sort((a, b) => b.count - a.count || a.kpId.localeCompare(b.kpId))
    .slice(0, MAX_RETRY_KNOWLEDGE_POINTS)

  if (focus.length === 0 || input.count <= 0) return []

  const plan: ScheduledItem[] = []
  for (let i = 0; i < input.count; i++) {
    const target = focus[i % focus.length]
    if (target === undefined) break
    plan.push({
      kpId: target.kpId,
      difficulty: difficultyFor(input.masteryMap.get(target.kpId)),
      source: 'remedial',
    })
  }

  return plan
}

/**
 * 订正题的难度：沿用当前档位，缺记录时退到最低档。
 *
 * 不做任何上调。见 {@link selectRetryItems} 的说明。
 */
function difficultyFor(mastery: Mastery | undefined): Difficulty {
  return mastery?.currentDifficulty ?? 1
}
