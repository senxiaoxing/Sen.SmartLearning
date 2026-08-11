/**
 * @file 拖拽题的排列选项构造 —— 让「摆放结果」也能被诊断
 * @layer domain  纯函数
 * @see design/03-技术方案.md §4.2 干扰项铁律
 * @see src/domain/generators/distractors.ts  点选题的同类构造
 *
 * ⭐ **拖拽题为什么也走 `options`**
 *
 * 选择题的答案是「点了哪个选项」，拖拽题的答案是「摆成了什么样」——
 * 看起来是两回事，但如果为拖拽题另开一条作答通路，
 * `Attempt` / `itemSnapshot` / 掌握度 / 错题订正 / 备份格式全都要跟着分叉。
 *
 * 这里的做法是把**排列本身编码成 `option.id`**：
 * 生成器预先列出「正确排列」和「各认知误区对应的排列」，
 * 组件把孩子摆出来的结果序列化成同样的键去匹配。
 * 于是拖拽题在数据层与选择题完全同构，一行 store 代码都不用改，
 * 而诊断性一点没丢——她摆成倒序还是乱序，落库时是两个不同的 tag。
 *
 * ⚠️ 排列键放在 `option.arrangementKey` 而**不是** `option.id`：
 * 全项目的 `option.id` 一律是 a/b/c/d 顺序（生成器契约测试强制校验），
 * 而 `Attempt.selectedOptionId` 存的就是它。把排列塞进 id 会让拖拽题的
 * 作答记录长得和其他题型不一样，错题本、报告都得为它开分支。
 */

import type { ItemOption, MisconceptionTag } from '@/domain/types'

/**
 * 选项 ID 序列。
 *
 * 比选择题的 a/b/c/d 长：拖拽题的选项**永远不会作为按钮渲染**，
 * 它是一张「摆法 → 诊断」的查找表，不受「一年级注意力容纳不了 4 个以上」
 * 那条 UI 约束的限制。凑十法要同时覆盖 no_carry / carry_lost /
 * ten_split_wrong 三类误区，4 个位置根本不够。
 */
const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

/**
 * 兜底排列的键。
 *
 * 排列的可能性是阶乘级的（4 张卡就有 24 种），不可能全部枚举成选项。
 * 没命中任何已知误区的摆法一律归到这里，组件必须能找到它——
 * 找不到对应选项时 `sessionStore.answer()` 会直接 return，
 * 表现为「孩子摆完点确认，App 毫无反应」。
 */
export const OTHER_ARRANGEMENT_KEY = 'other'

/** 一个「摆错了」的排列及其诊断含义 */
export interface ArrangementDistractor {
  /** 排列键，与组件序列化孩子摆放结果的格式必须完全一致 */
  key: string
  tag: MisconceptionTag
  /** 可读描述，用于错题本与反馈文案 */
  text: string
}

/**
 * 把「正确排列」与「误区排列」组装成选项数组。
 *
 * 不洗牌（与 {@link buildNumericOptions} 不同）：拖拽题的选项永远不会
 * 作为按钮渲染出来，顺序对孩子不可见，洗牌只会让测试更难写。
 *
 * @param correct - 正确排列的键与可读描述
 * @param candidates - 各认知误区对应的排列，键重复或与正确项相同的会被剔除
 * @param fallback - 兜底项的误区标签与描述。⚠️ 必填——
 *                   CLAUDE.md 铁律要求每个错误选项都带 `misconceptionTag`，
 *                   兜底项也不例外，否则「乱摆一气」这种最常见的错误反而没有诊断信息
 * @returns 选项数组，首项为正确项，末项为兜底项
 *
 * @example
 * buildArrangementOptions(
 *   { key: '3,4,5,6', text: '3 4 5 6' },
 *   [{ key: '6,5,4,3', tag: 'order_reversed', text: '6 5 4 3（反了）' }],
 *   { tag: 'count_skip', text: '顺序不对' },
 * )
 * // → id 依次为 a / b / c，arrangementKey 依次为 '3,4,5,6' / '6,5,4,3' / 'other'
 */
export function buildArrangementOptions(
  correct: { key: string; text: string },
  candidates: ArrangementDistractor[],
  fallback: { tag: MisconceptionTag; text: string },
): ItemOption[] {
  const seenKeys = new Set<string>([correct.key, OTHER_ARRANGEMENT_KEY])
  // 契约测试要求选项文本互不重复（选择题里重复文本会让四选一退化成三选一）。
  // 拖拽题虽不显示选项，但文本会进错题本，重复的说明文字同样没有意义。
  const seenTexts = new Set<string>([correct.text])

  const distractors = candidates.filter((c) => {
    // 某些参数下误区排列恰好等于正确排列（如 9+2 的「补少了」正好是「没补」），
    // 留着会造成「摆对了却判错」，必须剔除
    if (seenKeys.has(c.key) || seenTexts.has(c.text)) return false
    seenKeys.add(c.key)
    seenTexts.add(c.text)
    return true
  })

  const all = [
    { key: correct.key, text: correct.text, isCorrect: true, tag: undefined },
    ...distractors.map((d) => ({ key: d.key, text: d.text, isCorrect: false, tag: d.tag })),
    {
      key: OTHER_ARRANGEMENT_KEY,
      text: seenTexts.has(fallback.text) ? `${fallback.text}（再看看）` : fallback.text,
      isCorrect: false,
      tag: fallback.tag,
    },
  ]

  return all.map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: o.text,
    isCorrect: o.isCorrect,
    arrangementKey: o.key,
    ...(o.tag !== undefined && { misconceptionTag: o.tag }),
  }))
}

/**
 * 把孩子摆出的结果匹配到某个选项 ID。
 *
 * 组件在孩子点「好了」时调用，拿到的 ID 直接交给 `onSelect`，
 * 于是拖拽题走的是和选择题**完全相同**的落库路径。
 *
 * @param options - 题目的选项数组
 * @param key - 孩子摆放结果的序列化键
 * @returns 命中选项的 ID；没命中任何已知排列则返回兜底选项的 ID
 *
 * @example
 * matchArrangement(item.options, '6,5,4,3')   // 'b' —— 命中 order_reversed
 * matchArrangement(item.options, '4,3,6,5')   // 'c' —— 落进兜底项
 */
export function matchArrangement(options: readonly ItemOption[], key: string): string {
  const hit = options.find((o) => o.arrangementKey === key)
  if (hit !== undefined) return hit.id

  const fallback = options.find((o) => o.arrangementKey === OTHER_ARRANGEMENT_KEY)
  // 兜底项一定存在（buildArrangementOptions 总会加），末项兜底只为类型安全
  return fallback?.id ?? (options[options.length - 1]?.id ?? 'a')
}
