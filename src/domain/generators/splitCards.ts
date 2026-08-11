/**
 * @file 拆分题的候选卡片与近似误区构造 —— 凑十法与破十法共用
 * @layer domain  纯函数
 * @see src/domain/generators/splitTen.ts  唯一使用者
 *
 * 从 `splitTen.ts` 拆出来是因为那个文件超了 150 行上限（CLAUDE.md 文件规模规范）。
 * 这两个函数是一组的：一个负责「枚举哪些拆错的方式值得诊断」，
 * 一个负责「保证这些拆法孩子真的摆得出来」——后者依赖前者的产出。
 */

import type { ArrangementDistractor } from '@/domain/generators/arrangements'
import { shuffle } from '@/domain/generators/rng'
import type { ItemOption } from '@/domain/types'

/** 卡片数量下限。少于这个数会让卡片集合几乎等于答案集合，退化成排除法 */
const MIN_CARD_COUNT = 6

/**
 * 正确拆法两侧各差 1 的拆法 —— 「知道要拆但补数算错」。
 *
 * 全部标 `ten_split_wrong`：⭐ 它们指向 M3.3「10 的分与合」没打牢，
 * 而不是进位规则不懂。调度器据此回退到关键节点，
 * 见 design/03-技术方案.md §4.1 关键节点保护。
 *
 * 只取相邻两个：更远的拆法没有额外诊断信息，
 * 反正没枚举到的都会落进兜底项，标签是同一个。
 *
 * @param total - 被拆的数
 * @param correctFirst - 正确拆法里第一份的值
 * @param text - 说明文案，会被补上具体拆法以保证各条互不重复
 *
 * @example
 * nearMissSplits(5, 3, '补给 7 的不对')
 * // → [{ key: '2+3', ... }, { key: '4+1', ... }]，都标 ten_split_wrong
 */
export function nearMissSplits(
  total: number,
  correctFirst: number,
  text: string,
): ArrangementDistractor[] {
  return [correctFirst - 1, correctFirst + 1]
    .filter((first) => first >= 0 && first <= total)
    .map((first) => ({
      key: `${first}+${total - first}`,
      tag: 'ten_split_wrong' as const,
      // 带上具体拆法，两条 near-miss 的文案才不会撞在一起
      // （生成器契约测试要求选项文本互不重复）
      text: `${first} 和 ${total - first}：${text}`,
    }))
}

/**
 * 从选项反推可拖的卡片集合。
 *
 * ⭐ **卡片必须由选项派生，而不是另外随便给一批。**
 * 早先版本按 `0..min(total, 10)` 生成卡片，结果破十法的 `13+0` 这个
 * `no_borrow` 干扰项根本摆不出来（没有 13 的卡）——
 * 一个构造不出来的干扰项等于没有，还会让人误以为覆盖了这个误区。
 * 由选项派生则保证**每一种被枚举的拆法都摆得出来**，
 * 这条不变量由 `arrangements.test.ts` 的「排列可达性」用例强制校验。
 *
 * 额外补到至少 {@link MIN_CARD_COUNT} 张，避免卡片集合恰好等于答案集合
 * 而退化成排除法：那样孩子会转去猜「哪两张能凑成一组」，
 * 而不是真的算「9 还差几」。
 *
 * @param rng - 注入的随机源
 * @param options - 已构造好的选项，从中读取 `arrangementKey`
 * @param total - 被拆的数，补位时的取值上限
 *
 * @example
 * cardsFrom(rng, options, 5)   // → [0, 1, 2, 3, 4, 5] 的某个打乱顺序
 */
export function cardsFrom(
  rng: () => number,
  options: readonly ItemOption[],
  total: number,
): number[] {
  const values = new Set<number>()

  for (const option of options) {
    // ⚠️ 读 arrangementKey 而不是 id —— id 是 a/b/c，拆不出数字。
    // 兜底项的键是 'other'，同样不是拆法
    const parts = (option.arrangementKey ?? '').split('+')
    if (parts.length !== 2) continue
    for (const part of parts) {
      const n = Number(part)
      if (Number.isInteger(n) && n >= 0) values.add(n)
    }
  }

  for (let n = 0; n <= total && values.size < MIN_CARD_COUNT; n += 1) {
    values.add(n)
  }

  return shuffle(rng, [...values].sort((x, y) => x - y))
}
