/**
 * @file 生成器注册表与出题入口 —— 按模板产出题目，含去重重试
 * @layer domain  纯函数
 * @see design/03-技术方案.md §4.2 生成器契约
 *
 * ⚠️ 本文件是 CLAUDE.md「禁止 barrel file」规则的**唯一例外**：
 * 它不是纯 re-export，而是承载注册表查找、参数分发、去重重试等实际逻辑。
 */

import { addWithCarry } from '@/domain/generators/addWithCarry'
import { arithmetic } from '@/domain/generators/arithmetic'
import { braceProblem } from '@/domain/generators/braceProblem'
import { classifyShape } from '@/domain/generators/classifyShape'
import { clock } from '@/domain/generators/clock'
import { comparison } from '@/domain/generators/comparison'
import { countShapes } from '@/domain/generators/countShapes'
import { counting } from '@/domain/generators/counting'
import { decomposition } from '@/domain/generators/decomposition'
import { englishListen } from '@/domain/generators/englishListen'
import { fourFacts } from '@/domain/generators/fourFacts'
import { matchPairs } from '@/domain/generators/matchPairs'
import { memoryPair } from '@/domain/generators/memoryPair'
import { orderSequence } from '@/domain/generators/orderSequence'
import { ordinal } from '@/domain/generators/ordinal'
import { placeValue } from '@/domain/generators/placeValue'
import { pinyinBlend } from '@/domain/generators/pinyinBlend'
import { pinyinFinal } from '@/domain/generators/pinyinFinal'
import { pinyinInitial } from '@/domain/generators/pinyinInitial'
import { pinyinIntegral } from '@/domain/generators/pinyinIntegral'
import { pinyinListen } from '@/domain/generators/pinyinListen'
import { pinyinOddOne } from '@/domain/generators/pinyinOddOne'
import { pinyinPicture } from '@/domain/generators/pinyinPicture'
import { pinyinRule } from '@/domain/generators/pinyinRule'
import { pinyinToChar } from '@/domain/generators/pinyinToChar'
import { pinyinTriple } from '@/domain/generators/pinyinTriple'
import { position } from '@/domain/generators/position'
import { shapes } from '@/domain/generators/shapes'
import { splitTen } from '@/domain/generators/splitTen'
import { storyProblem } from '@/domain/generators/storyProblem'
import { subWithBorrow } from '@/domain/generators/subWithBorrow'
import type { Difficulty, GeneratedItem, Generator, ItemTemplate } from '@/domain/types'

/**
 * 生成器注册表。键名与 `ItemTemplate.generator` 一一对应。
 *
 * 覆盖三科：数学 M1/M3/M4/M5/M6、拼音 P1~P7、英语 E1~E10。
 * 其中 `orderSequence` / `matchPairs` / `splitTen` 产出拖拽题型，
 * 与填空版并存供同一知识点轮换（见 data/seed/itemTemplates.ts）。
 *
 * M2 位置、M7 图形、M8 钟表、M9 应用题需要图片资源，待美术就位后补充。
 */
export const GENERATORS: Readonly<Record<string, Generator>> = {
  addWithCarry,
  arithmetic,
  braceProblem,
  classifyShape,
  clock,
  comparison,
  countShapes,
  counting,
  decomposition,
  englishListen,
  fourFacts,
  matchPairs,
  memoryPair,
  orderSequence,
  ordinal,
  placeValue,
  pinyinBlend,
  pinyinFinal,
  pinyinInitial,
  pinyinIntegral,
  pinyinListen,
  pinyinOddOne,
  pinyinPicture,
  pinyinRule,
  pinyinToChar,
  pinyinTriple,
  position,
  shapes,
  splitTen,
  storyProblem,
  subWithBorrow,
}

/** 同一签名最多重试几次以避开 `exclude`。超过后接受重复，避免死循环。 */
const MAX_DEDUPE_ATTEMPTS = 12

/**
 * 按模板生成一道题。
 *
 * 会尝试最多 {@link MAX_DEDUPE_ATTEMPTS} 次以避开 `exclude` 中已出现的签名。
 * 全部撞车时返回最后一次结果——题库参数空间有限时（如 M5.2 只有 8 种算式），
 * 宁可重复也不能让出题流程卡死。
 *
 * @param template - 题目模板，含生成器名与三档难度参数
 * @param difficulty - 本次要出的难度档
 * @param rng - 注入的随机源
 * @param exclude - 本次会话已出现的签名，用于去重
 * @returns 生成的题目
 * @throws 模板引用了未注册的生成器时抛错——这属于 seed 配置错误，必须显式失败
 *
 * @example
 * const item = generateFromTemplate(template, 2, createRng(42), ['M5.2#9+5'])
 * // 若随机到 9+5 会重试，直到产出不同算式
 */
export function generateFromTemplate(
  template: ItemTemplate,
  difficulty: Difficulty,
  rng: () => number,
  exclude: string[] = [],
): GeneratedItem {
  const generator = GENERATORS[template.generator]
  if (generator === undefined) {
    throw new Error(
      `未注册的生成器: ${template.generator}（模板 ${template.id}）。` +
        `已注册: ${Object.keys(GENERATORS).join(', ')}`,
    )
  }

  const params = template.params[difficulty]
  const excluded = new Set(exclude)
  let last: GeneratedItem | undefined

  for (let attempt = 0; attempt < MAX_DEDUPE_ATTEMPTS; attempt++) {
    last = generator({ kpId: template.kpId, difficulty, params, rng, exclude })
    if (!excluded.has(last.signature)) return last
  }

  return last as GeneratedItem
}

/**
 * 该生成器是否已注册。供 seed 数据的完整性测试使用。
 *
 * @example
 * isGeneratorRegistered('addWithCarry')   // true
 * isGeneratorRegistered('multiplication') // false
 */
export function isGeneratorRegistered(name: string): boolean {
  return name in GENERATORS
}
