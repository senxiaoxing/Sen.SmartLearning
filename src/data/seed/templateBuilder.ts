/**
 * @file 题目模板构造器 —— 各年级各科的模板文件共用
 * @layer data  纯函数，供 seed 数据文件使用
 * @see design/02-数据库Schema.md §3.6 ItemTemplate
 * @see src/data/seed/itemTemplates.ts  总注册表
 *
 * 与 `kpBuilder.ts` 同一个位置：把「怎么构造」从「有哪些」里分出来。
 *
 * 单独成文件是为了让 `mathG2Templates.ts` 能用同一套 `tpl` / `altTpl`
 * 而不反向依赖总注册表——`itemTemplates.ts` 要 import 二年级模板，
 * 二年级模板再 import 回去就成了循环。
 */

import type { Difficulty, ItemTemplate, ItemType } from '@/domain/types'

/** 三档难度各自的生成器参数 */
export type ParamsByDifficulty = Record<Difficulty, Record<string, unknown>>

/**
 * 构造一条模板配置。`id` 统一为 `<kpId>-gen`。
 *
 * @param kpId - 知识点 ID
 * @param generator - 生成器注册名
 * @param params - 三档难度的参数
 * @param type - 题型，默认 `'input_number'`
 *
 * @example
 * tpl('M2-4.3', 'mulTable', { 1: { factors: [5] }, 2: {...}, 3: {...} })
 */
export function tpl(
  kpId: string,
  generator: string,
  params: ParamsByDifficulty,
  type: ItemType = 'input_number',
): ItemTemplate {
  return { id: `${kpId}-gen`, kpId, generator, type, params }
}

/**
 * 构造同一知识点的**备选**模板，`id` 后缀区分。
 *
 * ⚠️ 一个知识点可以有多条模板，出题时随机轮换——
 * 孩子的原话是「答题界面单一，都是题目 + 4 个选项」
 * （design/05-孩子反馈与响应.md 第 4 条）。
 * 只把某个知识点从填空**换成**拖拽，单一性只是从一种变成了另一种；
 * 让同一个知识点时而填空、时而拖拽，才真正解决问题。
 *
 * ⭐ 二年级起这不再是可选项：每个知识点必须挂 ≥2 条且**题型不同**的模板，
 * 由 `itemTemplates.test.ts` 强制。一年级维持现状，不追溯。
 *
 * @example
 * altTpl('M2-4.3', 'pick', 'mulTable', { 1: { factors: [5], as: 'choice_text' }, … }, 'choice_text')
 */
export function altTpl(
  kpId: string,
  suffix: string,
  generator: string,
  params: ParamsByDifficulty,
  type: ItemType,
): ItemTemplate {
  return { id: `${kpId}-${suffix}`, kpId, generator, type, params }
}
