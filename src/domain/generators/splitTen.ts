/**
 * @file 凑十/破十拆分生成器 —— M5.1 凑十法原理、M6.1 破十法原理（drag_combine）
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M5 §M6  两者都是 ⭐⭐ 关键节点，题型指定为 drag_combine
 * @see src/components/TenFrame.tsx  共用的十格阵视觉语言
 *
 * M5.1 与 M6.1 只考**拆分这一步**，不考完整算式的结果——
 * 先建立心理模型，再去算 `9 + 5` 等于几（那是 M5.2 的事）。
 * 这与它们现有的填空版模板（`makeTen` / `breakTen`）目标一致，
 * 区别在于填空是「说出答案」，拖拽是「把它做出来」。
 *
 * ⭐ 十格阵在这里不是装饰：孩子看到「格子还空 1 个」，
 * 就不需要理解抽象的进位规则了。填空题的脚手架用的是同一个组件，
 * 保证「教」和「练」是同一套视觉语言（design/05-孩子反馈与响应.md 第 5 条）。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { readBoolean, readNumberList } from '@/domain/generators/params'
import { randomInt, randomPick } from '@/domain/generators/rng'
import { cardsFrom, nearMissSplits } from '@/domain/generators/splitCards'
import { num } from '@/domain/speech'
import type { Difficulty, GeneratedItem, Generator } from '@/domain/types'

/** 十格阵容量。凑十、破十都围绕这个数展开 */
const TEN = 10

/**
 * 生成一道拖拽拆分题。
 *
 * **凑十法**（`breakTen: false`）：`9 + 5` → 把 5 拆成 `1`（补给 9 凑十）和 `4`（剩下）
 * **破十法**（`breakTen: true`）：`13 - 9` → 把 13 拆成 `10`（拿来减 9）和 `3`（剩下）
 *
 * 干扰排列对照表（以 `9 + 5` 为例，正确拆法是 `1 + 4`）：
 *
 * | 拆法 | 标签 | 说明与补救 |
 * |---|---|---|
 * | `1+4` | — | 正确 |
 * | `0+5` | `no_carry` | 根本没凑十，等于没做这一步 |
 * | `5+0` | `carry_lost` | 把 5 整个倒进十格，忘了还有剩余要加 |
 * | `2+3` `0+5` 等 | `ten_split_wrong` | ⭐ 知道要拆但补数算错 → **回退 M3.3** |
 *
 * ⭐ `ten_split_wrong` 是这道题最有价值的产出：它把「进位规则不熟」和
 * 「10 的分与合没打牢」区分开了，而两者的补救路径完全不同。
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源，禁止 `Math.random()`
 * @returns 含 `splitting` 可视数据的题目，`cards` 已打乱
 *
 * @example
 * splitTen({ kpId: 'M5.1', difficulty: 1, params: { addends: [9] }, rng })
 * // 抽到 9 + 5 时 options 的 id 依次为：
 * //   '1+4'(正确) / '0+5'(no_carry) / '5+0'(carry_lost) / '2+3'(ten_split_wrong) / 'other'
 */
export const splitTen: Generator = ({ kpId, difficulty, params, rng }) => {
  const breakTen = readBoolean(params, 'breakTen', false)
  return breakTen
    ? buildBorrowItem(kpId, difficulty, params, rng)
    : buildCarryItem(kpId, difficulty, params, rng)
}

/** 凑十法：把第二个加数拆成「补满十格的」和「剩下的」 */
function buildCarryItem(
  kpId: string,
  difficulty: Difficulty,
  params: Record<string, unknown>,
  rng: () => number,
): GeneratedItem {
  const a = randomPick(rng, readNumberList(params, 'addends', [9]))
  const needed = TEN - a
  // 第二个加数必须大于缺口，否则根本凑不满十，这道题不成立
  const b = randomInt(rng, needed + 1, 9)
  const remainder = b - needed

  const options = buildArrangementOptions(
    { key: `${needed}+${remainder}`, text: `${needed} 和 ${remainder}` },
    [
      { key: `0+${b}`, tag: 'no_carry', text: `没有补，${a} 还差 ${needed} 才到 10` },
      { key: `${b}+0`, tag: 'carry_lost', text: `把 ${b} 全补进去了，忘了还剩 ${remainder}` },
      ...nearMissSplits(b, needed, `补给 ${a} 的不对，${a} 还差 ${needed} 才到 10`),
    ],
    { tag: 'ten_split_wrong', text: `要补 ${needed} 才能凑成 10` },
  )

  return {
    signature: `${kpId}-split#${a}+${b}`,
    kpId,
    type: 'drag_combine',
    difficulty,
    stem: {
      text: `${a} + ${b}：把 ${b} 分成两份`,
      // 「先把」而不是「把」：与 M5.1 填空版同一句式，且清单里已有该片段
      ttsText: `${a} 加 ${b}，先把 ${b} 分成两份，一份补给 ${a} 凑成 10，另一份剩下`,
      ttsParts: [
        ...num(a),
        'op.plus',
        ...num(b),
        'phrase.firstSplit',
        ...num(b),
        'phrase.splitIntoTwo',
        'phrase.oneGoesTo',
        ...num(a),
        'phrase.toMakeTen',
        'phrase.theRestLeft',
      ],
    },
    options,
    // ⚠️ `answer` 是**展示用文本**（契约：等于正确选项的 text），
    // 判定用的排列键在 `option.arrangementKey` 里
    answer: `${needed} 和 ${remainder}`,
    visual: {
      kind: 'splitting',
      total: b,
      cards: cardsFrom(rng, options, b),
      slotLabels: [`补给 ${a}`, '剩下'],
      frame: a,
      loose: b,
    },
  }
}

/** 破十法：把被减数拆成「10」和「个位」，先用 10 去减 */
function buildBorrowItem(
  kpId: string,
  difficulty: Difficulty,
  params: Record<string, unknown>,
  rng: () => number,
): GeneratedItem {
  const s = randomPick(rng, readNumberList(params, 'subtrahends', [9]))
  /**
   * 个位取 1..s-1 —— 两个边界都不能碰：
   *
   * - 下限必须 ≥ 1：取 0 会得到「10 - 8」，那是**十以内减法**（M4.6），
   *   压根不需要退位，「把 10 分成两份」还会退化成 `10+0` 这种荒谬的拆法。
   *   这是生成器契约测试实际抓到的 bug。
   * - 上限必须 < s：个位够减就同样用不上破十法。
   */
  const ones = randomInt(rng, 1, s - 1)
  const minuend = TEN + ones

  const options = buildArrangementOptions(
    { key: `${TEN}+${ones}`, text: `10 和 ${ones}` },
    [
      { key: `${minuend}+0`, tag: 'no_borrow', text: `没有拆，${ones} 不够减 ${s}` },
      { key: `${s}+${minuend - s}`, tag: 'no_borrow', text: `拿出的是 ${s} 而不是 10` },
      ...nearMissSplits(minuend, TEN, `要先拆出 10 来减 ${s}`),
    ],
    { tag: 'ten_split_wrong', text: '要先拆出一个 10' },
  )

  return {
    signature: `${kpId}-split#${minuend}-${s}`,
    kpId,
    type: 'drag_combine',
    difficulty,
    stem: {
      text: `${minuend} - ${s}：把 ${minuend} 分成两份`,
      // 同凑十版：句式统一为「先把」，片段清单里已备好
      ttsText: `${minuend} 减 ${s}，先把 ${minuend} 分成两份，一份拿来减 ${s}，另一份剩下`,
      ttsParts: [
        ...num(minuend),
        'op.minus',
        ...num(s),
        'phrase.firstSplit',
        ...num(minuend),
        'phrase.splitIntoTwo',
        'phrase.takeToSubtract',
        ...num(s),
        'phrase.theRestLeft',
      ],
    },
    options,
    answer: `10 和 ${ones}`,
    visual: {
      kind: 'splitting',
      total: minuend,
      cards: cardsFrom(rng, options, minuend),
      slotLabels: [`拿来减 ${s}`, '剩下'],
      frame: TEN,
      loose: ones,
    },
  }
}

