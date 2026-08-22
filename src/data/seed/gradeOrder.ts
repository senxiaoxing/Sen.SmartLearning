/**
 * @file 知识点 order 的年级分区表 —— 保证 order 同科目内跨年级严格递增
 * @layer data  静态常量，无运行时逻辑
 * @see design/08-年级分区与内容扩展.md §2.2  为什么必须有这张表
 *
 * ## 为什么不能再手工分配 startOrder
 *
 * 加年级之前三个科目靠手写的 1 / 101 / 201 错开，六个年级 × 三科之后
 * 手分必然撞车，而撞车的后果不是报错——`duplicate_order` 校验会拦下，
 * 但**在拦下之前每加一个年级都要重算一遍全部起点**。
 *
 * ## ⭐ 真正的硬约束：同科目内跨年级必须递增
 *
 * 调度器的「学习前沿 frontier」是拿 order 比大小算出来的
 * （`selectNextItems.ts` 里那段 `Math.max(...orders)`）。
 * 若二年级的 order 小于一年级，二年级内容会被判成「前沿之前的遗漏」，
 * 只有在前沿之后完全没内容可学时才会被取到——
 * 表现是「升了年级却一直在做旧题」，而且不报任何错。
 */

import { GRADE_LEVELS, type GradeLevel, type Subject } from '@/domain/types'

/**
 * 每个 `(科目 × 年级)` 分区能容纳的知识点上限。
 *
 * 1000 远超实际需要（一年级数学最多的一科也才 48 个），
 * 留这么宽是为了让中途插入知识点不必重排后面所有年级的 order。
 */
export const ORDER_SPAN = 1000

/** 把一个科目的起点展开成六个年级的分区起点 */
const byGrade = (base: number): Record<GradeLevel, number> => ({
  G1: base,
  G2: base + ORDER_SPAN,
  G3: base + ORDER_SPAN * 2,
  G4: base + ORDER_SPAN * 3,
  G5: base + ORDER_SPAN * 4,
  G6: base + ORDER_SPAN * 5,
})

/**
 * 各 `(科目, 年级)` 的 order 起始值。
 *
 * 科目之间相隔 10000（= 六个年级用掉 6000，还剩 4000 余量），
 * 保证任意两个分区永不重叠。
 *
 * ⚠️ 改这张表等于改全部知识点的 order，**必须同时递增 `CONTENT_VERSION`**——
 * `syncStaticContent()` 靠它判断要不要重新导入，不递增的话新 order 根本写不进库，
 * 表现是「改了没反应」。
 *
 * @example
 * ORDER_BASE.math.G1      // 1000
 * ORDER_BASE.english.G3   // 23000
 */
export const ORDER_BASE: Record<Subject, Record<GradeLevel, number>> = {
  math: byGrade(1_000),
  pinyin: byGrade(11_000),
  english: byGrade(21_000),
}

/**
 * 取某个分区的 order 区间 `[起, 止)`。供完整性测试校验区间不重叠。
 *
 * @example
 * orderRangeOf('math', 'G1')   // [1000, 2000]
 */
export function orderRangeOf(subject: Subject, gradeLevel: GradeLevel): [number, number] {
  const start = ORDER_BASE[subject][gradeLevel]
  return [start, start + ORDER_SPAN]
}

/** 全部分区，供测试遍历。顺序无意义，只保证覆盖完整 */
export function allOrderPartitions(): Array<{
  subject: Subject
  gradeLevel: GradeLevel
  range: [number, number]
}> {
  const subjects = Object.keys(ORDER_BASE) as Subject[]
  return subjects.flatMap((subject) =>
    GRADE_LEVELS.map((gradeLevel) => ({
      subject,
      gradeLevel,
      range: orderRangeOf(subject, gradeLevel),
    })),
  )
}
