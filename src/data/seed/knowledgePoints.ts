/**
 * @file 知识点图谱聚合与完整性校验 —— 全项目读取知识点的唯一入口
 * @layer data  纯函数 + 静态数据
 * @see design/01-知识点图谱.md
 *
 * 本文件不是 barrel file：除了聚合三个科目，它还提供索引结构和图完整性校验。
 * 校验由 `knowledgePoints.test.ts` 在每次测试时执行——手写 113 条依赖关系必然出错，
 * 悬空引用和环形依赖会让调度器死循环或永久锁死知识点，必须在编译期之外强制拦截。
 */

import { englishKnowledgePoints } from '@/data/seed/englishKnowledgePoints'
import { mathKnowledgePoints } from '@/data/seed/mathKnowledgePoints'
import { pinyinKnowledgePoints } from '@/data/seed/pinyinKnowledgePoints'
import type { KnowledgePoint, Subject } from '@/domain/types'

/** 全部知识点，共 113 个（数学 48 / 拼音 35 / 英语 30）。 */
export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  ...mathKnowledgePoints,
  ...pinyinKnowledgePoints,
  ...englishKnowledgePoints,
]

/** 按 ID 查知识点。调度器高频使用，避免每次线性查找。 */
export const KNOWLEDGE_POINT_BY_ID: ReadonlyMap<string, KnowledgePoint> = new Map(
  KNOWLEDGE_POINTS.map((kp) => [kp.id, kp]),
)

/** 按科目分组，用于科目维度的进度统计与自由练习模式。 */
export const KNOWLEDGE_POINTS_BY_SUBJECT: Record<Subject, KnowledgePoint[]> = {
  math: mathKnowledgePoints,
  pinyin: pinyinKnowledgePoints,
  english: englishKnowledgePoints,
}

/**
 * 关键节点 —— 卡住会阻塞大量后续内容。
 * 调度器对它们有特殊保护：后继知识点大面积出错时无条件回退到此。
 */
export const KEY_NODE_IDS: readonly string[] = KNOWLEDGE_POINTS.filter(
  (kp) => kp.isKeyNode,
).map((kp) => kp.id)

// ============================================================================
// 完整性校验
// ============================================================================

export type GraphErrorKind =
  | 'duplicate_id'
  | 'missing_prerequisite'
  | 'cross_subject_prerequisite'
  | 'self_prerequisite'
  | 'cycle'
  | 'duplicate_order'

export interface GraphValidationError {
  kind: GraphErrorKind
  kpId: string
  detail: string
}

/**
 * 校验知识点图谱的完整性。
 *
 * 检查项及其后果：
 * - `duplicate_id` —— ID 重复会让 Map 索引静默丢失一条知识点
 * - `missing_prerequisite` —— 前置指向不存在的 ID，该知识点将**永远无法解锁**
 * - `cross_subject_prerequisite` —— 跨科目依赖会导致「学数学要先学拼音」这类荒谬解锁链
 * - `self_prerequisite` —— 自依赖，永久锁死
 * - `cycle` —— 环形依赖会让解锁判定**无限递归**
 * - `duplicate_order` —— order 冲突导致教学顺序不确定
 *
 * @param points - 待校验的知识点数组，默认校验全量图谱
 * @returns 错误列表，空数组表示图谱健康
 *
 * @example
 * const errors = validateKnowledgeGraph()
 * if (errors.length > 0) throw new Error(errors.map(e => e.detail).join('\n'))
 */
export function validateKnowledgeGraph(
  points: KnowledgePoint[] = KNOWLEDGE_POINTS,
): GraphValidationError[] {
  const errors: GraphValidationError[] = []
  const byId = new Map<string, KnowledgePoint>()

  for (const kp of points) {
    if (byId.has(kp.id)) {
      errors.push({ kind: 'duplicate_id', kpId: kp.id, detail: `知识点 ID 重复: ${kp.id}` })
      continue
    }
    byId.set(kp.id, kp)
  }

  const seenOrder = new Map<number, string>()
  for (const kp of points) {
    const owner = seenOrder.get(kp.order)
    if (owner !== undefined) {
      errors.push({
        kind: 'duplicate_order',
        kpId: kp.id,
        detail: `order ${kp.order} 与 ${owner} 冲突`,
      })
    } else {
      seenOrder.set(kp.order, kp.id)
    }

    for (const preId of kp.prerequisites) {
      if (preId === kp.id) {
        errors.push({
          kind: 'self_prerequisite',
          kpId: kp.id,
          detail: `${kp.id} 把自己作为前置`,
        })
        continue
      }
      const pre = byId.get(preId)
      if (pre === undefined) {
        errors.push({
          kind: 'missing_prerequisite',
          kpId: kp.id,
          detail: `${kp.id} 的前置 ${preId} 不存在`,
        })
        continue
      }
      if (pre.subject !== kp.subject) {
        errors.push({
          kind: 'cross_subject_prerequisite',
          kpId: kp.id,
          detail: `${kp.id}(${kp.subject}) 依赖了 ${preId}(${pre.subject})`,
        })
      }
    }
  }

  errors.push(...findCycles(byId))
  return errors
}

/** 用三色标记 DFS 找出环形依赖。灰色节点被再次访问即成环。 */
function findCycles(byId: Map<string, KnowledgePoint>): GraphValidationError[] {
  const errors: GraphValidationError[] = []
  /** 0 未访问 / 1 访问中（灰） / 2 已完成（黑） */
  const color = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []

  function visit(id: string): void {
    const state = color.get(id) ?? 0
    if (state === 2) return
    if (state === 1) {
      const cycleStart = stack.indexOf(id)
      const path = [...stack.slice(cycleStart), id].join(' → ')
      errors.push({ kind: 'cycle', kpId: id, detail: `环形依赖: ${path}` })
      return
    }

    color.set(id, 1)
    stack.push(id)
    for (const preId of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(preId)) visit(preId)
    }
    stack.pop()
    color.set(id, 2)
  }

  for (const id of byId.keys()) visit(id)
  return errors
}
