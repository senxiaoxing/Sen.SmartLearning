/**
 * @file 诊断驱动的定向补救 —— 由错误类型统计触发专项练习
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §4 P7 易混辨析（由错误统计触发，非线性推进）
 *
 * ⭐ 这是整套自适应系统最有价值的机制，也是本 App 区别于普通题库的地方。
 *
 * 普通题库：答错 → 再出一道同类题 → 继续错。
 * 本系统：答错 → 识别是 `bd_confusion`（b/d 分不清）→ 插入 P7.1 字形辨析专项 →
 *        解决根因后再回到原知识点。
 *
 * 前提是每个错误选项都带 `misconceptionTag`，见 generators/distractors.ts。
 */

import type { Mastery, MisconceptionTag } from '@/domain/types'

/**
 * 认知误区 → 专项补救知识点。
 *
 * 只映射「有对应专项练习」的误区。像 `op_confusion`（看错运算符）这类
 * 属于审题习惯问题，没有对应知识点可练，靠放慢节奏和高亮符号解决，因此不映射。
 */
export const REMEDIAL_TARGETS: Partial<Record<MisconceptionTag, string>> = {
  // —— 数学：回到原理层重建心理模型
  no_carry: 'M5.1', // 忘记进位 → 重练凑十法原理
  carry_lost: 'M5.1', // 凑十后忘记加 → 同上
  no_borrow: 'M6.1', // 不会退位 → 重练破十法原理
  borrow_lost: 'M6.1',
  whole_part_confusion: 'M3.3', // 整体部分混淆 → 回到 10 的分与合
  symbol_reversed: 'M1.6', // 大小号写反 → 专练符号
  count_skip: 'M1.1', // 数数跳数 → 回到计数
  zero_rule: 'M4.7', // 0 的运算误解
  solid_plane_confusion: 'M7.1', // 立体/平面混淆
  hand_swap: 'M8.1', // 时针分针看反
  lr_mirror: 'M2.3', // 左右镜像
  wrong_operation: 'M9.1', // 应用题选错运算

  // —— 拼音：P7 组就是为此设计的，不按教学顺序推进
  bd_confusion: 'P7.1',
  pq_confusion: 'P7.2',
  ft_confusion: 'P7.3',
  nl_confusion: 'P7.4',
  flat_curl_confusion: 'P7.5',
  nasal_confusion: 'P7.6',
  u_umlaut_kept: 'P3.3', // jü/ju → j q x 与 ü 相拼专项
  tone_wrong_position: 'P3.4', // 声调标注规则
  three_syllable_missing_medial: 'P3.2', // 三拼音节
  spell_integral: 'P6.1', // 整体认读当两拼去拼
  ui_iu_swap: 'P4.4', // 复韵母辨析
  ei_ie_swap: 'P4.4',

  // —— 英语
  similar_sound: 'E2.1', // 音近词混淆 → 回到基础词汇听辨（Pets）
  letter_mirror: 'E1.6', // 字母镜像 → 大小写配对
  number_teen_ty: 'E5.2', // teen 词尾没听见 → 回到 11~20
}

/**
 * 触发补救的错误次数阈值。
 *
 * 设为 3 而非 1：偶尔错一次是正常波动，连续 3 次同类错误才说明存在系统性误解。
 * 阈值过低会让孩子被频繁打断去做专项，破坏学习节奏。
 */
export const REMEDIAL_THRESHOLD = 3

/** 一次会话最多插入几个补救专项。太多会让整段课变成「纠错课」，打击积极性 */
export const MAX_REMEDIAL_PER_SESSION = 2

export interface RemedialTarget {
  /** 要插入的补救知识点 ID */
  kpId: string
  /** 触发它的认知误区 */
  tag: MisconceptionTag
  /** 该误区累计出现次数，用于排序——错得越多越优先 */
  count: number
  /** 误区来源知识点，用于「补完再回来」的提示文案 */
  sourceKpId: string
}

/**
 * 扫描掌握度记录，找出需要插入的补救专项。
 *
 * 会剔除「补救目标本身已经掌握」的情况——如果孩子 P7.1 已经 mastered
 * 却还在犯 `bd_confusion`，说明问题不在字形辨析，再插专项也没用。
 *
 * @param masteryList - 该档案的全部掌握度记录
 * @param masteryMap - 掌握度索引，用于检查补救目标自身的状态
 * @param threshold - 触发阈值，默认 {@link REMEDIAL_THRESHOLD}
 * @param limit - 最多返回几个，默认 {@link MAX_REMEDIAL_PER_SESSION}
 * @returns 按累计次数降序排列的补救目标
 *
 * @example
 * // 孩子在 M5.2 上犯了 4 次 no_carry
 * findRemedialTargets(list, map)
 * // → [{ kpId: 'M5.1', tag: 'no_carry', count: 4, sourceKpId: 'M5.2' }]
 * //   调度器据此在本段插入凑十法原理练习
 */
export function findRemedialTargets(
  masteryList: readonly Mastery[],
  masteryMap: ReadonlyMap<string, Mastery>,
  threshold: number = REMEDIAL_THRESHOLD,
  limit: number = MAX_REMEDIAL_PER_SESSION,
): RemedialTarget[] {
  const found: RemedialTarget[] = []

  for (const mastery of masteryList) {
    for (const [rawTag, count] of Object.entries(mastery.misconceptionCounts)) {
      if (count === undefined || count < threshold) continue

      const tag = rawTag as MisconceptionTag
      const targetKpId = REMEDIAL_TARGETS[tag]
      if (targetKpId === undefined) continue
      // 补救目标就是出错的知识点本身时，插专项没有意义
      if (targetKpId === mastery.kpId) continue

      const target = masteryMap.get(targetKpId)
      if (target === undefined || target.state === 'locked') continue
      if (target.state === 'mastered' || target.state === 'review') continue

      found.push({ kpId: targetKpId, tag, count, sourceKpId: mastery.kpId })
    }
  }

  // 同一补救目标可能被多个知识点触发，保留次数最高的那条
  const byTarget = new Map<string, RemedialTarget>()
  for (const item of found) {
    const existing = byTarget.get(item.kpId)
    if (existing === undefined || item.count > existing.count) {
      byTarget.set(item.kpId, item)
    }
  }

  return [...byTarget.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}
