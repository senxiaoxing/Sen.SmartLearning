/**
 * @file 10 加几和相应的减法生成器 —— 覆盖 M1.11
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M1 数感与计数
 * @see design/03-技术方案.md §4.2 干扰项铁律
 *
 * ⭐ 这是 M1.9「数的组成」通向 M5.1「凑十法」的桥梁。
 * 凑十法的最后一步就是 `10 + 4`：这一步不到条件反射，
 * `9 + 5` 会卡在终点线上——孩子明明拆对了，却算不出结果。
 * 它与 M3.3「10 的分与合」是凑十法的两条腿，缺一条都走不动。
 */

import { buildNumericOptions, type NumericDistractor } from '@/domain/generators/distractors'
import { readEnum } from '@/domain/generators/params'
import { randomInt } from '@/domain/generators/rng'
import { num } from '@/domain/speech'
import type { GeneratedItem, Generator, GeneratorContext } from '@/domain/types'

const MODES = ['tenPlus', 'tenMinus', 'noRegroup'] as const
type Mode = (typeof MODES)[number]

/** 一道算式的全部要素。三种模式各自算出它，再由 {@link toItem} 统一构造题目。 */
interface Equation {
  a: number
  op: '+' | '-'
  b: number
  answer: number
  /** 干扰项候选，**顺序即优先级**（高频误区在前） */
  candidates: NumericDistractor[]
}

/**
 * 生成一道「10 加几和相应的减法」题目（M1.11）。
 *
 * 三档难度递进是**换一种思维方式**，不是换更大的数：
 * - **`tenPlus`（1）**：`10 + 3 = ?` 正向，直接读出「十和几」
 * - **`tenMinus`（2）**：`13 - 3 = ?` / `13 - 10 = ?` 反向，把十几拆回去
 * - **`noRegroup`（3）**：`12 + 3 = ?` / `15 - 2 = ?` 十位不动，只动个位
 *
 * 干扰项按认知误区构造：
 *
 * | 选项 | 误区 | 孩子的想法 |
 * |---|---|---|
 * | 把 10 当成 1 算出的值 | `place_value_swap` | 10 的「1」被当成 1 个一，而非 1 个十 |
 * | 加减互换的结果 | `op_confusion` | 运算符看反了 |
 * | 被减数或减数本身 | `whole_part_confusion` | 没做运算，直接把看到的数报出来 |
 *
 * ⚠️ `place_value_swap` 在这里表示「10 的 1 被当成 1 个一」（`10 + 3` 答 4），
 * 与 M1.10 的「问十位答个位」是同一种病的两种表现——位值没建立起来，
 * 补救路径同为回到小棒 / 十格阵。因此共用这一个标签，不新增。
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源，禁止 `Math.random()`
 * @param ctx.params.mode - `'tenPlus'` | `'tenMinus'` | `'noRegroup'`，默认 `'tenPlus'`
 * @returns 含 4 个选项的题目，每个错误选项都带 `misconceptionTag`
 *
 * @example
 * teenArithmetic({ kpId: 'M1.11', difficulty: 1, params: { mode: 'tenPlus' }, rng })
 * // 当 b=3 时 '10 + 3 = ?'：
 * //   13 → 正确
 * //    4 → place_value_swap  把 10 当成 1，算成 1+3
 * //    7 → op_confusion      做成了减法
 * //   14 → off_by_one        兜底补位
 */
export const teenArithmetic: Generator = (ctx: GeneratorContext): GeneratedItem => {
  const mode = readEnum(ctx.params, 'mode', MODES, 'tenPlus')
  return toItem(ctx, buildEquation(mode, ctx.rng))
}

function buildEquation(mode: Mode, rng: () => number): Equation {
  if (mode === 'tenMinus') return tenMinusEq(rng)
  if (mode === 'noRegroup') return noRegroupEq(rng)
  return tenPlusEq(rng)
}

/**
 * 「加减看反」干扰项 —— 结果超过 20 时**主动放弃**。
 *
 * 20 以内的题目里出现大于 20 的选项会被孩子一眼排除，
 * 四选一就退化成三选一，蒙对概率从 25% 涨到 33%，掌握度被猜出来的分污染。
 * 同 addWithCarry 对 `digit_concat`、subWithBorrow 对 `add_instead` 的处理。
 * 返回空数组时由 `buildNumericOptions` 用 `off_by_one` 兜底补位。
 */
function opConfusion(value: number): NumericDistractor[] {
  return value <= 20 ? [{ value, tag: 'op_confusion' }] : []
}

/** 10 加几：`10 + 3 = ?` */
function tenPlusEq(rng: () => number): Equation {
  const b = randomInt(rng, 1, 9)
  return {
    a: 10, op: '+', b, answer: 10 + b,
    candidates: [
      { value: 1 + b, tag: 'place_value_swap' },
      { value: 10 - b, tag: 'op_confusion' },
    ],
  }
}

/**
 * 相应的减法：`13 - 3 = 10` 或 `13 - 10 = 3`。
 *
 * 两种考法指向同一个结构（十几 = 十 + 几），轮流出才不会让她背下
 * 某一种的答案形状——「减个位就得整十」本身是可以记住的规律。
 */
function tenMinusEq(rng: () => number): Equation {
  const ones = randomInt(rng, 1, 9)
  const minuend = 10 + ones

  if (rng() < 0.5) {
    return {
      a: minuend, op: '-', b: ones, answer: 10,
      candidates: [
        { value: 0, tag: 'place_value_swap' }, // 忽略十位，算成 3 - 3
        ...opConfusion(minuend + ones),
        { value: ones, tag: 'whole_part_confusion' },
      ],
    }
  }

  return {
    a: minuend, op: '-', b: 10, answer: ones,
    candidates: [
      { value: minuend - 1, tag: 'place_value_swap' }, // 把 10 当成 1 来减
      // 这一支恒无 op_confusion：`13 + 10` 必然超过 20，被 opConfusion 滤掉
      { value: minuend, tag: 'whole_part_confusion' },
    ],
  }
}

/**
 * 十几加几（不进位）与十几减几（不退位）：`12 + 3 = ?` / `15 - 2 = ?`。
 *
 * 被减数取 11~18 而不是 11~19：`ones` 落在 1~8，
 * 保证加法那一支的 `b` 至少有 1 个可选值（个位相加不能满 10）。
 */
function noRegroupEq(rng: () => number): Equation {
  const a = randomInt(rng, 11, 18)
  const ones = a - 10

  if (rng() < 0.5) {
    const b = randomInt(rng, 1, 9 - ones)
    return {
      a, op: '+', b, answer: a + b,
      candidates: [
        { value: 1 + ones + b, tag: 'place_value_swap' }, // 把 12 拆成 1 和 2 一起加
        { value: a - b, tag: 'op_confusion' },
      ],
    }
  }

  const b = randomInt(rng, 1, ones)
  return {
    a, op: '-', b, answer: a - b,
    candidates: [
      { value: ones - b, tag: 'place_value_swap' }, // 只算个位，丢掉整十
      ...opConfusion(a + b),
      { value: b, tag: 'whole_part_confusion' },
    ],
  }
}

/** 把算式要素组装成题目。三种模式共用，保证题面与语音拼法完全一致。 */
function toItem(ctx: GeneratorContext, eq: Equation): GeneratedItem {
  return {
    signature: `${ctx.kpId}#${eq.a}${eq.op}${eq.b}`,
    kpId: ctx.kpId,
    type: 'input_number',
    difficulty: ctx.difficulty,
    stem: {
      text: `${eq.a} ${eq.op} ${eq.b} = ?`,
      ttsText: `${eq.a} ${eq.op === '+' ? '加' : '减'} ${eq.b} 等于几`,
      ttsParts: [
        ...num(eq.a),
        eq.op === '+' ? 'op.plus' : 'op.minus',
        ...num(eq.b),
        'phrase.equalsWhat',
      ],
    },
    options: buildNumericOptions(eq.answer, eq.candidates, ctx.rng),
    answer: String(eq.answer),
  }
}
