/**
 * @file 知识点解锁判定 —— 依据前置完成情况把 locked 转为 available
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §1.4 掌握度状态机
 *
 * 解锁是**整张图谱层面**的判定（要查前置的掌握情况），
 * 因此不放在 `mastery/stateMachine.ts`（那里只管单个知识点自身的跃迁）。
 */

import type { KnowledgePoint, Mastery } from '@/domain/types'

/** 视为「前置已完成」的状态。复习中的知识点仍算已掌握，不该反向锁住后继内容 */
const SATISFIED_STATES = new Set(['mastered', 'review'])

/**
 * 前置是否全部满足。
 *
 * @param kp - 待判定的知识点
 * @param masteryMap - 掌握度索引，键为 kpId
 * @returns 无前置或前置全部 mastered/review 时为 true
 *
 * @example
 * arePrerequisitesMet(kpM5_1, map)   // M3.3 与 M1.9 都已掌握时为 true
 */
export function arePrerequisitesMet(
  kp: KnowledgePoint,
  masteryMap: ReadonlyMap<string, Mastery>,
): boolean {
  return kp.prerequisites.every((id) => {
    const pre = masteryMap.get(id)
    return pre !== undefined && SATISFIED_STATES.has(pre.state)
  })
}

/**
 * 找出所有当前应当解锁的知识点 ID。
 *
 * 只做一轮判定，不做级联解锁——解锁 A 后 B 的前置才满足的情况，
 * 会在下次调用时自然处理。会话开始时调用一次即可，无需递归。
 *
 * @param masteryMap - 掌握度索引
 * @param knowledgePoints - 全量知识点
 * @returns 应从 `locked` 转为 `available` 的知识点 ID
 *
 * @example
 * const ids = findNewlyUnlocked(map, KNOWLEDGE_POINTS)
 * // 掌握 M3.3 后返回 ['M5.1', 'M6.1'] —— 凑十法与破十法同时开放
 */
export function findNewlyUnlocked(
  masteryMap: ReadonlyMap<string, Mastery>,
  knowledgePoints: readonly KnowledgePoint[],
): string[] {
  return knowledgePoints
    .filter((kp) => {
      const m = masteryMap.get(kp.id)
      return m !== undefined && m.state === 'locked' && arePrerequisitesMet(kp, masteryMap)
    })
    .map((kp) => kp.id)
}

/**
 * 找出某个知识点最薄弱的前置。
 *
 * 用于难度回退：孩子在 M5.2「9 加几」上正确率跌破 60% 时，
 * 继续刷 M5.2 只会让她更挫败——真正的问题往往在 M3.3「10 的分与合」。
 * 这个函数负责定位「往回退到哪里」。
 *
 * 递归向上查找：直接前置若本身也不牢固，继续往它的前置找，
 * 直到找到真正的薄弱源头。
 *
 * @param kpId - 起点知识点 ID
 * @param masteryMap - 掌握度索引
 * @param kpById - 知识点索引
 * @param threshold - 判定「不牢固」的分数阈值，默认 0.7
 * @returns 最薄弱前置的 ID；前置都很牢固时返回 undefined
 *
 * @example
 * findWeakestPrerequisite('M5.2', map, byId)
 * // → 'M3.3'（M5.1 尚可，但它依赖的 M3.3 分数只有 0.5）
 */
export function findWeakestPrerequisite(
  kpId: string,
  masteryMap: ReadonlyMap<string, Mastery>,
  kpById: ReadonlyMap<string, KnowledgePoint>,
  threshold = 0.7,
): string | undefined {
  const visited = new Set<string>()

  function search(id: string): string | undefined {
    if (visited.has(id)) return undefined
    visited.add(id)

    const kp = kpById.get(id)
    if (kp === undefined) return undefined

    let weakest: { id: string; score: number } | undefined

    for (const preId of kp.prerequisites) {
      const pre = masteryMap.get(preId)
      if (pre === undefined || pre.state === 'locked') continue
      if (pre.masteryScore >= threshold) continue

      // 先往更深处找源头，找不到才用这一层
      const deeper = search(preId)
      const candidateId = deeper ?? preId
      const candidateScore = masteryMap.get(candidateId)?.masteryScore ?? pre.masteryScore

      if (weakest === undefined || candidateScore < weakest.score) {
        weakest = { id: candidateId, score: candidateScore }
      }
    }

    return weakest?.id
  }

  return search(kpId)
}
