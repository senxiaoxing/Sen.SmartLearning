/**
 * @file 摸底探测序列 —— 每个「科目 × 年级」考哪几个知识点
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/assessment/nextProbe.ts  怎么走这些序列
 * @see design/08-年级分区与内容扩展.md §7  摸底跨年级下探
 *
 * ## 一级一条序列，**按难度递增**
 *
 * 每个大单元只取一个代表知识点，覆盖该年级从头到尾的完整跨度。
 * 只选**真的出得了题**的知识点——探测题出不来，那一站就等于没考，
 * 而孩子会看到一道空白题。由 `placement.test.ts` 强制校验。
 *
 * ## ⚠️ `Partial` 是有意的：没做过的年级要「查不到」，不能是空数组
 *
 * G3~G6 的图谱还没有，拼音与英语也还没做摸底。
 * 写成必填会逼着填一堆 `[]`，而「这一级没做」和「这一级做了但一题都不考」
 * 是两件完全不同的事——前者应当让下探直接停下，后者是配置错误。
 * 查不到即视为「这一级不参与摸底」，`lowerGradeWithProbes()` 会跳过它。
 */

import { GRADE_LEVELS, type GradeLevel, type Subject } from '@/domain/types'

/**
 * 探测序列表。
 *
 * ⚠️ 加新年级时，序列必须按 `order` **严格递增**排列——
 * 整套探测流程（正序找边界、倒序下探）都建立在「越往后越难」这个前提上。
 * 顺序写反不会报错，只会让定位结果悄悄失真。
 */
export const PLACEMENT_PROBES: Record<
  Subject,
  Partial<Record<GradeLevel, readonly string[]>>
> = {
  math: {
    G1: [
      'M1.6', // 比大小 —— 基础数感
      'M1.9', // 数的组成（十几 = 10 + 几）
      'M3.3', // ⭐ 10 的分与合，凑十法与破十法的地基
      'M4.5', // 6~10 的加法
      'M4.6', // 6~10 的减法
      'M5.2', // 9 加几（进位）
      'M6.2', // 十几减 9（退位）
    ],
    G2: [
      'M2-1.2', // 用尺子量长度 —— 二年级开篇
      'M2-2.2', // ⭐ 两位数加两位数（进位）
      'M2-3.2', // 认识直角
      'M2-4.3', // 5 的乘法口诀 —— 乘法的入口
      'M2-4.10', // ⭐ 表内乘法综合（1~9 口诀）
      'M2-9.4', // 用 7~9 的口诀求商
      'M2-12.3', // 有余数除法的计算 —— 二年级的上限
    ],
  },
  // 拼音与英语目前不做摸底：它们的起点靠「从第一课开始」就够了，
  // 而硬造一条探测序列会让摸底页多考几道无用的题
  pinyin: {},
  english: {},
}

/**
 * 取某个「科目 × 年级」的探测序列。
 *
 * @returns 没做过这一级则为空数组
 *
 * @example
 * sequenceOf('math', 'G2').length   // 7
 * sequenceOf('math', 'G5')          // [] —— 五年级图谱还没做
 * sequenceOf('pinyin', 'G1')        // [] —— 拼音不做摸底
 */
export function sequenceOf(subject: Subject, gradeLevel: GradeLevel): readonly string[] {
  return PLACEMENT_PROBES[subject][gradeLevel] ?? []
}

/**
 * 找**紧邻的、真的有探测序列的**低一级年级。
 *
 * ⚠️ 不是简单地「年级减一」：中间可能有还没做图谱的年级
 * （比如四年级做好了、三年级还没做），那一级必须跳过，
 * 否则下探会落到一条空序列上、一题都出不来。
 *
 * @returns 没有更低的年级（或都没做过）时为 `undefined`——
 *          此时摸底就此结束，不再下探
 *
 * @example
 * lowerGradeWithProbes('math', 'G2')   // 'G1'
 * lowerGradeWithProbes('math', 'G1')   // undefined —— 一年级已经是最低的
 */
export function lowerGradeWithProbes(
  subject: Subject,
  gradeLevel: GradeLevel,
): GradeLevel | undefined {
  const index = GRADE_LEVELS.indexOf(gradeLevel)

  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = GRADE_LEVELS[i]
    if (candidate !== undefined && sequenceOf(subject, candidate).length > 0) return candidate
  }
  return undefined
}
