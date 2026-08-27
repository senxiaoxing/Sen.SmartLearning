/**
 * @file 学习起点预设 —— 避免让上过幼小衔接的孩子从「数一数」开始
 * @layer data  静态配置
 * @see design/01-知识点图谱.md §6 摸底测评
 *
 * 孩子的原话是「像幼儿园小朋友做的题目」。这句话的潜台词不是「给我难一点的」，
 * 而是「这个 App 不适合我」——它是流失前兆，必须优先处理。
 *
 * 这里是**临时方案**：按经验假定一批幼儿园阶段已覆盖的知识点为已掌握，
 * 让起点直接落在真正需要练的地方。正式方案是摸底测评（`domain/assessment/`），
 * 测评完成后其结果会覆盖这里的假定。
 *
 * 假定错了也不要紧：这些知识点会以「巩固题」和「复习题」的形式回来验证，
 * 孩子若真的不会，答错两次就会退回 learning 重新学。
 */

import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { GRADE_LEVELS, gradeLevelOf, type GradeLevel } from '@/domain/types'

/**
 * 幼小衔接阶段通常已覆盖的知识点。
 *
 * 挑选标准：**幼儿园大班普遍教过**的内容。
 * 刻意不含 M3 分与合与 M4 加减法——那是一年级的核心，宁可让她重练也不能跳过。
 */
export const KINDERGARTEN_KP_IDS: readonly string[] = [
  'M1.1', // 数一数 1~10
  'M1.2', // 认识 0
  'M1.3', // 数的顺序 1~10
  'M1.5', // 比多少
  'M1.7', // 数一数 11~20
  'M2.1', // 上·下
  'M2.2', // 前·后
]

/**
 * 这个年级的孩子，**假定**已经掌握了哪些知识点。
 *
 * ## ⭐ 为什么假定「所有低年级内容」而不只是幼儿园那几个
 *
 * 起点假定唯一真正起作用的场合，是她**跳过了摸底**（首页那行小灰字）。
 * 若只假定幼儿园那 7 个，一个三年级的孩子跳过摸底后，
 * 「学习前沿」会落在 M1.9 附近——她打开 App 做到的第一道题是「数一数」。
 *
 * 孩子的原话是 **「像幼儿园小朋友做的题目」**，那句话的潜台词不是
 * 「给我难一点的」而是「这个 App 不适合我」，是流失前兆（CLAUDE.md 产品红线）。
 * 相比之下「偏难」的代价小得多：难题她会答错，而答错有一整套机制接住
 * （降难度、回退到薄弱前置、退回 learning 重学）；
 * **而「太简单」没有任何机制能把她挽回来。**
 *
 * ## 假定错了会怎样
 *
 * 分数取 {@link ASSUMED_MASTERY_SCORE}(0.7) 而非 0.9，低于 `targetMastery`(0.85)：
 * 这些知识点会以**巩固题**形式回来接受验证，答错两次就退回 learning 重新学。
 * 所以这不是「永久跳过」，是「先按会了排，边做边验」。
 *
 * ⚠️ 数学还有摸底兜底（`saveAndApplyPlacement` 会用实测结果覆盖假定），
 * 而**拼音与英语目前不做摸底**，它们的假定只能靠巩固题验证。
 * 这是有意的取舍：那两科现在只有一年级内容，
 * 二年级的孩子对它们本来就只有「复习」这一种需求。
 *
 * @param gradeLevel - 她在读几年级
 * @returns 假定已掌握的知识点 ID 集合
 *
 * @example
 * assumedMasteredFor('G1').size    // 7 —— 只有幼小衔接那几个
 * assumedMasteredFor('G2')         // 幼小衔接 ＋ 全部一年级内容
 */
export function assumedMasteredFor(gradeLevel: GradeLevel): Set<string> {
  const assumed = new Set(KINDERGARTEN_KP_IDS)
  const current = GRADE_LEVELS.indexOf(gradeLevel)

  for (const kp of KNOWLEDGE_POINTS) {
    if (GRADE_LEVELS.indexOf(gradeLevelOf(kp.grade)) < current) assumed.add(kp.id)
  }
  return assumed
}

/**
 * 假定掌握的初始分数。
 *
 * 刻意取 0.7 而不是 0.9：这只是**假定**，没有任何作答样本支撑。
 * 0.7 低于 `targetMastery`(0.85)，意味着它们会以巩固题形式出现接受验证，
 * 而不是被当成板上钉钉的已掌握内容永久跳过。
 */
export const ASSUMED_MASTERY_SCORE = 0.7

/**
 * 假定掌握的知识点距首次复习的天数区间。
 *
 * 分散在 1~5 天内而非全部堆在同一天：
 * 否则孩子某天打开会撞上一整轮全是复习题的会话，体验很怪。
 */
export const ASSUMED_REVIEW_SPREAD_DAYS = 5
