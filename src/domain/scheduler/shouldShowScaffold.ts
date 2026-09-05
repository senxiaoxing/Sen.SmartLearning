/**
 * @file 脚手架判定 —— 这一题给不给十格阵
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/09-竞品借鉴.md §4  脚手架按状态自动打开
 * @see design/03-技术方案.md §4.5  脚手架要逐步撤除
 *
 * 原先脚手架只看难度（难度 1 有、2/3 无），写死在生成器里。那有两处失灵：
 *
 * - 她在难度 2 卡住时拿不到任何帮助，只能一直错到掌握度跌破 0.6 触发回退
 * - 她在难度 1 已经会了，十格阵还一直摆着 —— 「逐步撤除」从来没真的发生过
 *
 * 所以判据从「这道题多难」换成「**她现在怎么样**」，难度只作为没有历史时的默认。
 */

import type { Difficulty, ItemType } from '@/domain/types'

/**
 * 连错几次自动挂上脚手架。
 *
 * 取 2 而不是 1：一次错很可能是手滑或没听清，那时塞一幅图进来
 * 是把偶然当成不会。两次连错才是稳定的信号。
 */
const SCAFFOLD_ON_AFTER_WRONG = 2

/**
 * 连对几次自动撤掉脚手架。
 *
 * 与 {@link SCAFFOLD_ON_AFTER_WRONG} 同为 2，构成一个带迟滞的闭环：
 * 撤掉之后再连错两次它会回来，她不会被永久剥夺帮助。
 *
 * ⚠️ 这条**也作用于难度 1** —— 那正是「脚手架逐步撤除」真正发生的地方。
 * 只按难度撤除的话，同一档里她永远等不到撤，得等升档才一次性全没了。
 */
const SCAFFOLD_OFF_AFTER_CORRECT = 2

export interface ScaffoldInput {
  /** 本题难度。没有作答历史时唯一的依据 */
  difficulty: Difficulty
  /** 本题题型。听算题一律不给，见实现处 */
  type: ItemType
  /**
   * 该知识点当前的连错次数（答对即归零，即 `Mastery.consecutiveWrong`）。
   * 省略视为 0 —— 摸底与预览没有历史，那时按难度走默认。
   */
  consecutiveWrong?: number
  /** 该知识点当前的连对次数（答错即归零）。省略视为 0 */
  consecutiveCorrect?: number
}

/**
 * 判断这一题该不该显示十格阵脚手架。
 *
 * 判据顺序即优先级：
 *
 * | 条件 | 结果 | 为什么 |
 * |---|---|---|
 * | 听算题 | ❌ | 题面本来就藏着，再挂一幅图就成了「一张没有问题的画」 |
 * | 连错 ≥2 | ✅ | 她卡住了，不论难度都该给帮助 |
 * | 连对 ≥2 | ❌ | 她会了，撤掉（难度 1 也撤） |
 * | 难度 1 | ✅ | 初次接触必须看得见，这是默认 |
 * | 其余 | ❌ | 难度 2/3 靠心算 |
 *
 * ⭐ **听算那条是最先判的，不能挪位置。** 她在听算题上连错两次同样会触发
 * 「连错 ≥2」，若顺序反了就会给听算题挂上十格阵——而听算题不显示算式，
 * 屏幕上只剩一幅没有问题的图。她在听算上卡住，正确的补救是回到看算，
 * 不是给听算配图。见 design/09 §2.2 ⛔ 什么题不该挂听算。
 *
 * @param input - 本题难度与题型，以及该知识点的连错/连对次数
 * @returns 显示脚手架为 `true`
 *
 * @example
 * shouldShowScaffold({ difficulty: 1, type: 'input_number' })                            // true  初次接触
 * shouldShowScaffold({ difficulty: 1, type: 'input_number', consecutiveCorrect: 2 })     // false 会了，撤掉
 * shouldShowScaffold({ difficulty: 3, type: 'input_number', consecutiveWrong: 2 })       // true  卡住了，挂上
 * shouldShowScaffold({ difficulty: 1, type: 'listen_number', consecutiveWrong: 5 })      // false 听算永不给
 */
export function shouldShowScaffold(input: ScaffoldInput): boolean {
  // ⛔ 必须最先判：听算题的题面是藏起来的，挂上脚手架就只剩一幅没有问题的图
  if (input.type === 'listen_number') return false

  if ((input.consecutiveWrong ?? 0) >= SCAFFOLD_ON_AFTER_WRONG) return true
  if ((input.consecutiveCorrect ?? 0) >= SCAFFOLD_OFF_AFTER_CORRECT) return false

  return input.difficulty === 1
}
