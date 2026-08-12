/**
 * @file 数序排列生成器 —— M1.3 数的顺序、M1.8 20以内数的顺序（drag_order）
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §M1  M1.3 / M1.8 指定题型为 drag_order
 * @see src/domain/generators/arrangements.ts  排列如何编码成可诊断的选项
 *
 * 排序和「选出下一个数」考的不是同一件事：
 * 选择题只需要局部判断（6 的后面是 7），排序要求孩子在脑子里**同时持有整个数列**。
 * 这是数序真正建立起来的标志，也是选择题永远测不到的部分。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { readEnum, readRange } from '@/domain/generators/params'
import { randomInt, shuffle } from '@/domain/generators/rng'
import type { Generator } from '@/domain/types'

/** 一次排几张卡。4 张是权衡：3 张太容易，5 张在 iPad 竖屏放不下且超出注意广度 */
const CARD_COUNT = 4

/**
 * 生成一道拖拽排序题。
 *
 * 三档难度不是「换更大的数」，而是**换一种更难的数列**——
 * 与本项目其他生成器的难度设计原则一致（见 itemTemplates.ts 顶部说明）：
 *
 * | 难度 | 模式 | 为什么更难 |
 * |---|---|---|
 * | 1 | `consecutive` 连续数（5 6 7 8） | 有相邻关系可依赖，数一遍就能排 |
 * | 2 | `gapped` 有间隔（3 6 7 10） | 不能靠「下一个」推，必须真的比大小 |
 * | 3 | `descending` 从大到小 | 方向与本能相反，最容易顺手排成升序 |
 *
 * ⚠️ 难度 3 的正确答案是**降序**，此时「升序」才是错误排列。
 * 两个方向共用一个 `order_reversed` 标签：命中它说明孩子没听清方向要求，
 * 而不是不会排序——补救是强调题干里的「从大到小」，不是回去练数数。
 *
 * @param ctx - 生成上下文。`ctx.rng` 必须是注入的随机源，禁止 `Math.random()`
 * @returns 含 `ordering` 可视数据的题目；`options` 里每个错误排列都带诊断标签
 *
 * @example
 * orderSequence({ kpId: 'M1.3', difficulty: 1, params: { range: [1, 10] }, rng })
 * // 抽到 5 6 7 8 时：
 * //   '5,6,7,8' → 正确
 * //   '8,7,6,5' → order_reversed  方向反了，懂排序但没听清「从小到大」
 * //   其他摆法  → count_skip       数序本身不熟，得回去练数数
 *
 * @see design/01-知识点图谱.md §M1 misconceptions
 */
export const orderSequence: Generator = ({ kpId, difficulty, params, rng }) => {
  const [min, max] = readRange(params, 'range', [1, 10])
  const mode = readEnum(params, 'mode', ['consecutive', 'gapped', 'descending'] as const, 'consecutive')

  const values = pickValues(rng, min, max, mode)
  const ascending = [...values].sort((a, b) => a - b)
  const descending = [...ascending].reverse()

  const wantsDescending = mode === 'descending'
  const correct = wantsDescending ? descending : ascending
  const reversed = wantsDescending ? ascending : descending

  const directionText = wantsDescending ? '从大到小' : '从小到大'

  // 卡片必须打乱，否则孩子直接把卡按原样放进槽就对了，什么也没练到
  const cards = shuffleUntilScrambled(rng, values, correct)

  return {
    signature: `${kpId}-order#${mode}:${values.join('.')}`,
    kpId,
    type: 'drag_order',
    difficulty,
    stem: {
      text: `把它们${directionText}排好`,
      ttsText: `请把这些数${directionText}排好`,
      ttsParts: [wantsDescending ? 'phrase.arrangeDesc' : 'phrase.arrangeAsc'],
    },
    options: buildArrangementOptions(
      { key: correct.join(','), text: correct.join(' ') },
      [
        {
          key: reversed.join(','),
          tag: 'order_reversed',
          text: `${reversed.join(' ')}（方向反了）`,
        },
      ],
      // 既不是正序也不是倒序 —— 数列本身没建立起来
      { tag: 'count_skip', text: '顺序不对' },
    ),
    // ⚠️ `answer` 是展示用文本（契约：等于正确选项的 text），
    // 判定用的排列键在 `option.arrangementKey` 里
    answer: correct.join(' '),
    visual: { kind: 'ordering', cards },
  }
}

/**
 * 按模式抽出一组待排的数。
 *
 * `gapped` 会保证至少有一处间隔大于 1，否则它退化成 `consecutive`——
 * 孩子仍然能靠「下一个是谁」蒙对，难度 2 就白设了。
 */
function pickValues(
  rng: () => number,
  min: number,
  max: number,
  mode: 'consecutive' | 'gapped' | 'descending',
): number[] {
  if (mode === 'gapped') {
    const pool = new Set<number>()
    // 上限保护：区间太窄时凑不满 4 个不同的数，退化为连续数而不是死循环
    for (let guard = 0; guard < 50 && pool.size < CARD_COUNT; guard += 1) {
      pool.add(randomInt(rng, min, max))
    }
    const values = [...pool].sort((a, b) => a - b)
    if (values.length === CARD_COUNT && hasGap(values)) return values
  }

  const start = randomInt(rng, min, Math.max(min, max - CARD_COUNT + 1))
  return Array.from({ length: CARD_COUNT }, (_, i) => start + i)
}

/** 是否存在大于 1 的相邻间隔 */
function hasGap(sorted: number[]): boolean {
  return sorted.some((v, i) => i > 0 && v - (sorted[i - 1] as number) > 1)
}

/**
 * 打乱到「不等于正确答案」为止。
 *
 * 洗牌有 1/24 的概率恰好洗成正确顺序，那道题就成了送分题——
 * 孩子什么都不做点确认就对了，还会误导掌握度。
 */
function shuffleUntilScrambled(
  rng: () => number,
  values: number[],
  correct: number[],
): number[] {
  const target = correct.join(',')
  let cards = shuffle(rng, values)
  for (let guard = 0; guard < 10 && cards.join(',') === target; guard += 1) {
    cards = shuffle(rng, values)
  }
  return cards
}
