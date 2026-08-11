/**
 * @file 会话题目组装 —— 把调度器的排期计划变成可作答的具体题目
 * @layer data  组合静态内容与 domain 生成器，不接触 Dexie
 * @see design/03-技术方案.md §4.1 出题调度器
 *
 * 调度器只决定「出哪个知识点、什么难度」，不关心题目长什么样。
 * 本模块负责查模板、调生成器、处理去重，产出最终题目列表。
 */

import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { generateFromTemplate } from '@/domain/generators'
import { randomPick } from '@/domain/generators/rng'
import type { GeneratedItem, ScheduledItem } from '@/domain/types'

/** 会话中的一道题：题目内容 + 它来自哪类排期 */
export interface SessionItem {
  item: GeneratedItem
  source: ScheduledItem['source']
}

/**
 * 按排期计划生成整段会话的题目。
 *
 * 跳过没有模板的知识点（M2 位置、M7 图形等待图片资源的单元），
 * 而不是抛错——调度器可能排到它们，此时静默跳过比中断整段会话合理。
 *
 * @param plan - 调度器产出的排期
 * @param rng - 注入的随机源
 * @returns 可作答的题目列表。长度可能小于 `plan.length`
 *
 * @example
 * const items = buildSessionItems(selectNextItems(input), createRng(Date.now()))
 */
export function buildSessionItems(
  plan: readonly ScheduledItem[],
  rng: () => number,
): SessionItem[] {
  const seen: string[] = []
  const result: SessionItem[] = []

  for (const scheduled of plan) {
    const templates = ITEM_TEMPLATE_BY_KP.get(scheduled.kpId)
    if (templates === undefined || templates.length === 0) continue

    // ⭐ 一个知识点可能同时有填空版和拖拽版，随机轮换。
    // 孩子的原话是「答题界面单一，都是题目 + 4 个选项」——
    // 同一个知识点换着花样问，比换掉某个知识点的题型更能解决这件事。
    const template = randomPick(rng, templates)
    const item = generateFromTemplate(template, scheduled.difficulty, rng, seen)
    seen.push(item.signature)
    result.push({ item, source: scheduled.source })
  }

  return result
}
