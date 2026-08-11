/**
 * @file 诊断性干扰项构造 —— 本项目自适应能力的核心
 * @layer domain  纯函数
 * @see design/03-技术方案.md §4.2 干扰项铁律
 * @see design/01-知识点图谱.md 各单元的 misconceptions 清单
 *
 * ⚠️ 铁律：干扰项按**认知误区**生成，绝不用随机数。
 *
 * `9 + 5 = ?` 的选项必须是 14(正确) / 13(no_carry) / 10(carry_lost) / 4(sub_instead)。
 * 孩子选了 13 说明凑十过程丢了 1，选了 10 说明凑十后忘记加剩余——
 * 两种错误的补救路径完全不同。随机干扰项提供零信息，等于废掉整个诊断系统。
 */

import { shuffle } from '@/domain/generators/rng'
import type { ItemOption, MisconceptionTag } from '@/domain/types'

/** 选项 ID 序列。题目最多 4 个选项，一年级孩子的注意力容纳不了更多。 */
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 默认选项数量（1 正确 + 3 干扰） */
const DEFAULT_OPTION_COUNT = 4

/**
 * 数值型干扰项候选。由各生成器按知识点的认知误区计算得出。
 */
export interface NumericDistractor {
  /** 该误区会导致孩子算出的错误答案 */
  value: number
  /** 对应的认知误区，孩子选中即命中诊断 */
  tag: MisconceptionTag
}

/**
 * 把正确答案与认知误区候选组装成一组选项。
 *
 * 处理规则（顺序即优先级）：
 * 1. **剔除等于正确答案的候选** —— 某些参数下误区恰好算出正确值（如 `2+2` 加减同解）
 * 2. **剔除负数** —— 一年级不学负数，出现负数选项会造成困惑
 * 3. **按出现顺序去重** —— 不同误区可能算出同一个值，保留先出现的（权重更高的）
 * 4. **数量不足时补位** —— 用 ±1、±2 兜底并标记 `off_by_one`（数手指多数少数 1）
 * 5. **洗牌** —— 正确答案若总在固定位置，孩子会学会「选第二个」而不是算答案
 *
 * @param correct - 正确答案
 * @param candidates - 按认知误区算出的错误答案，**顺序即优先级**（高频误区放前面）
 * @param rng - 注入的随机源，用于洗牌
 * @param optionCount - 选项总数，默认 4
 * @returns 已洗牌的选项数组，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * // 9 + 5 = 14
 * buildNumericOptions(14, [
 *   { value: 13, tag: 'no_carry' },      // 忘记进位，当成 9+4
 *   { value: 10, tag: 'carry_lost' },    // 凑十后忘记加剩余的 4
 *   { value: 4,  tag: 'sub_instead' },   // 做成了减法
 * ], rng)
 * // → 4 个选项，正确项 14 无 tag，其余三项各带自己的误区标签
 */
export function buildNumericOptions(
  correct: number,
  candidates: NumericDistractor[],
  rng: () => number,
  optionCount: number = DEFAULT_OPTION_COUNT,
): ItemOption[] {
  const needed = optionCount - 1
  const picked: NumericDistractor[] = []
  const seen = new Set<number>([correct])

  for (const c of candidates) {
    if (picked.length >= needed) break
    if (c.value < 0 || seen.has(c.value)) continue
    seen.add(c.value)
    picked.push(c)
  }

  picked.push(...padDistractors(correct, seen, needed - picked.length))

  const options: ItemOption[] = [
    { id: 'a', text: String(correct), isCorrect: true },
    ...picked.map((d, i) => ({
      id: OPTION_IDS[i + 1] ?? `x${i}`,
      text: String(d.value),
      isCorrect: false,
      misconceptionTag: d.tag,
    })),
  ]

  // 洗牌后重新分配 ID，保证 ID 始终是 a/b/c/d 的顺序而位置随机
  return shuffle(rng, options).map((opt, i) => ({
    ...opt,
    id: OPTION_IDS[i] ?? `x${i}`,
  }))
}

/**
 * 候选不足时的兜底干扰项。
 *
 * 按 +1, -1, +2, -2, +10, -10 的顺序找未被占用的非负值。
 * 统一标记为 `off_by_one`（数手指多数或少数 1）——这是低年级最普遍的计算失误，
 * 用它兜底不会污染诊断数据。
 *
 * @param correct - 正确答案
 * @param seen - 已占用的值，会被本函数就地更新
 * @param count - 还需要几个
 */
function padDistractors(
  correct: number,
  seen: Set<number>,
  count: number,
): NumericDistractor[] {
  if (count <= 0) return []

  const result: NumericDistractor[] = []
  const offsets = [1, -1, 2, -2, 3, -3, 10, -10]

  for (const offset of offsets) {
    if (result.length >= count) break
    const value = correct + offset
    if (value < 0 || seen.has(value)) continue
    seen.add(value)
    result.push({ value, tag: 'off_by_one' })
  }

  return result
}

/**
 * 把文本型候选组装成选项（用于比大小符号、图形名称等非数值题）。
 *
 * 规则与 {@link buildNumericOptions} 相同，只是去重按字符串比较。
 *
 * @param correct - 正确选项文本
 * @param candidates - 错误选项文本及其认知误区
 * @param rng - 注入的随机源
 *
 * @example
 * buildTextOptions('>', [{ text: '<', tag: 'symbol_reversed' }, { text: '=', tag: 'off_by_one' }], rng)
 */
export function buildTextOptions(
  correct: string,
  candidates: Array<{ text: string; tag: MisconceptionTag }>,
  rng: () => number,
): ItemOption[] {
  const seen = new Set<string>([correct])
  const picked = candidates.filter((c) => {
    if (seen.has(c.text)) return false
    seen.add(c.text)
    return true
  })

  const options: ItemOption[] = [
    { id: 'a', text: correct, isCorrect: true },
    ...picked.map((c, i) => ({
      id: OPTION_IDS[i + 1] ?? `x${i}`,
      text: c.text,
      isCorrect: false,
      misconceptionTag: c.tag,
    })),
  ]

  return shuffle(rng, options).map((opt, i) => ({
    ...opt,
    id: OPTION_IDS[i] ?? `x${i}`,
  }))
}
