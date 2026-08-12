/**
 * @file 分与合配对生成器 —— M3.1 / M3.2 的 drag_match 题型
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M3  M3.1 指定题型为 input_number + drag_match
 * @see src/domain/generators/decomposition.ts  同一批知识点的填空版
 *
 * 填空题一次只问一种分法（「5 分成 2 和几」），配对题把**同一个数的全部分法
 * 摆在一起**让孩子一次性建立起来。这正是 M3「分与合」要的整体结构感——
 * 知道 5 只能分成 1/4、2/3 这几种，凑十法才有得用。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { ArrangementDistractor } from '@/domain/generators/arrangements'
import type { Generator } from '@/domain/types'

/** 一次连几对。3 对足以呈现结构，再多在 iPad 上连线会挤成一团 */
const MAX_PAIRS = 3

/** 总数下限。低于 4 时分法不足两种，构不成配对题 */
const MIN_TOTAL = 4

/**
 * 生成一道拖拽配对题：左右两列连线，每对之和等于给定总数。
 *
 * 干扰排列按 M3 的两个认知误区构造：
 *
 * | 摆法 | 标签 | 含义与补救 |
 * |---|---|---|
 * | 左右两列按大小顺序对齐连 | `whole_part_confusion` | 没在算和，只是「第一个连第一个」 |
 * | 连成**差**等于总数的对 | `op_confusion` | 把分解做成了减法 |
 * | 其他乱连 | `whole_part_confusion` | 整体与部分的关系没建立 |
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源
 * @returns 含 `matching` 可视数据的题目
 *
 * @example
 * matchPairs({ kpId: 'M3.1', difficulty: 1, params: { totalRange: [5, 5] }, rng })
 * // total=5，左列 [1, 2]，右列打乱的 [4, 3]：
 * //   '1-4,2-3' → 正确
 * //   其他连法  → 带 whole_part_confusion / op_confusion
 *
 * @see design/01-知识点图谱.md §M3 misconceptions
 */
export const matchPairs: Generator = ({ kpId, difficulty, params, rng }) => {
  // 下限锁死 4：总数 2 或 3 只有「1 和 2」一种分法，连线题就只剩一对，
  // 既谈不上配对也构造不出干扰排列。这类总数留给填空版的 decomposition 出。
  const [lo, hi] = readRange(params, 'totalRange', [4, 5])
  const total = randomInt(rng, Math.max(MIN_TOTAL, lo), Math.max(MIN_TOTAL, hi))

  // 分法只取 1..floor(total/2)，避免同时出现 (1,4) 和 (4,1) 这种镜像重复——
  // 对孩子来说它们是同一种分法，摆成两对只会让她困惑
  const allParts = Array.from({ length: Math.floor(total / 2) }, (_, i) => i + 1)
  const lefts = shuffle(rng, allParts).slice(0, Math.min(MAX_PAIRS, allParts.length))
  lefts.sort((a, b) => a - b)

  const rights = lefts.map((l) => total - l)
  const shownRights = shuffleUntilScrambled(rng, rights)

  const correctKey = pairKey(lefts.map((l) => [l, total - l]))
  const correctText = lefts.map((l) => `${l} 和 ${total - l}`).join('、')

  return {
    signature: `${kpId}-match#${total}:${lefts.join('.')}`,
    kpId,
    type: 'drag_match',
    difficulty,
    stem: {
      text: `连一连，每组合起来是 ${total}`,
      ttsText: `把左边和右边连起来，每一组合起来都要是 ${total}`,
      ttsParts: ['phrase.connectPairs', ...num(total)],
    },
    options: buildArrangementOptions(
      { key: correctKey, text: correctText },
      buildDistractors(lefts, shownRights, total),
      // 乱连 —— 没有在算「合起来是几」，整体与部分的关系还没建立
      { tag: 'whole_part_confusion', text: `每组要合成 ${total}` },
    ),
    // ⚠️ `answer` 是展示用文本（契约：等于正确选项的 text），
    // 判定用的排列键在 `option.arrangementKey` 里
    answer: correctText,
    visual: { kind: 'matching', left: lefts, right: shownRights, total },
  }
}

/**
 * 构造诊断性错误连法。
 *
 * 两种都是**真实会发生**且**一定构造得出来**的错误：
 *
 * ① **按位置连** —— 孩子放弃计算时的默认策略（第一个连第一个）。
 *    和为 `total ± 各种值`，完全没在算。
 *
 * ② **相邻分法互换** —— 把 `(1,4) (2,3)` 连成 `(1,3) (2,4)`。
 *    交换两个差 1 的左值的伙伴，和恰好变成 `total ± 1`——
 *    她**在算**，只是数差了一个，这与 ① 是完全不同的病。
 *
 * ⚠️ 早先这里写过一个「连成差等于 total」的减法误区，但右列的值全都小于
 * `total`，差永远凑不出 `total`，那个干扰项一次也命中不了——
 * 构造不出来的干扰项等于没有，还会让人误以为覆盖了这个误区。
 */
function buildDistractors(
  lefts: number[],
  shownRights: number[],
  total: number,
): ArrangementDistractor[] {
  const candidates: ArrangementDistractor[] = []

  // ① 不算和，直接第 i 个连第 i 个
  candidates.push({
    key: pairKey(lefts.map((l, i) => [l, shownRights[i] as number])),
    tag: 'whole_part_confusion',
    text: '按位置连的，没有算合起来是几',
  })

  // ② 相邻两种分法互换伙伴 → 和差 1
  const swapAt = lefts.findIndex(
    (l, i) => i > 0 && l - (lefts[i - 1] as number) === 1,
  )
  if (swapAt > 0) {
    const pairs = lefts.map((l) => [l, total - l] as [number, number])
    const a = pairs[swapAt - 1] as [number, number]
    const b = pairs[swapAt] as [number, number]
    pairs[swapAt - 1] = [a[0], b[1]]
    pairs[swapAt] = [b[0], a[1]]
    candidates.push({
      key: pairKey(pairs),
      tag: 'off_by_one',
      text: '有一组差了 1',
    })
  }

  return candidates
}

/**
 * 把若干配对序列化成排列键。
 *
 * 按左值排序后再拼接：孩子连线的**先后顺序不应影响判定**——
 * 先连 2-3 再连 1-4 和反过来是同一个答案，
 * 不归一化会让一半的正确作答被判错。
 */
function pairKey(pairs: Array<[number, number]>): string {
  return [...pairs]
    .sort((a, b) => a[0] - b[0])
    .map(([l, r]) => `${l}-${r}`)
    .join(',')
}

/**
 * 打乱右列到「不与左列一一对应」为止。
 *
 * 若右列恰好洗成与左列同序，「按位置连」就等于正确答案，
 * 那道题既送了分，又让 `whole_part_confusion` 这个干扰项失去意义。
 */
function shuffleUntilScrambled(rng: () => number, rights: number[]): number[] {
  if (rights.length < 2) return [...rights]

  const sorted = [...rights].sort((a, b) => b - a).join(',')
  let shown = shuffle(rng, rights)
  for (let guard = 0; guard < 10 && shown.join(',') === sorted; guard += 1) {
    shown = shuffle(rng, rights)
  }
  return shown
}
