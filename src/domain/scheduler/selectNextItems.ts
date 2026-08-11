/**
 * @file 出题调度器 —— 决定一次学习会话出哪些题、按什么顺序出
 * @layer domain  纯函数
 * @see design/03-技术方案.md §4.1 出题调度器
 *
 * 会话开始时一次性排完整段，而非逐题决策——这样才能在开课前批量预加载
 * 全部题目资源，避免答题中途卡顿。
 *
 * ⚠️ 「连续答错 3 题就插入简单题」属于**运行时**动态干预，不在这里。
 * 调度器只负责开课前的静态排期；运行时干预由会话状态层处理。
 */

import { findRemedialTargets } from '@/domain/scheduler/remedial'
import { findWeakestPrerequisite } from '@/domain/scheduler/unlockGraph'
import { isDue } from '@/domain/time'
import type {
  Difficulty,
  KnowledgePoint,
  Mastery,
  ScheduleInput,
  ScheduledItem,
} from '@/domain/types'

/** 各来源的题量配比。三者之和为 1 */
const MIX = {
  /** 到期复习，防遗忘 */
  review: 0.3,
  /** 当前学习中的知识点，主推进 */
  learning: 0.5,
  /** 已掌握的简单题，⭐ 保持成就感、防挫败 */
  confidence: 0.2,
} as const

/** 掌握度高于此值则升难度 */
const DIFFICULTY_UP_THRESHOLD = 0.85
/** 掌握度低于此值则降难度并回退到薄弱前置 */
const DIFFICULTY_DOWN_THRESHOLD = 0.6

/**
 * 一段会话最多同时开启几个**全新**知识点。
 *
 * 设为 2 是教学上的取舍：一次开太多新内容，孩子每个都只碰到两三题，
 * 什么都记不住；开得太少又会在已经会了的内容上空转。
 *
 * ⚠️ 这个常量还修复了一个致命的首次体验问题：新档案的知识点全是 `available`
 * （可以学但还没做过），若不把它们纳入出题范围，孩子第一次打开 App
 * 点「开始学习」会直接跳到结束页，一道题都没有。
 */
const MAX_NEW_KNOWLEDGE_POINTS = 2

/**
 * 触发「回退到薄弱前置」所需的最小作答样本量。
 *
 * 新知识点的 `masteryScore` 天然是 0，若不设这道门槛，
 * 每个刚开启的知识点都会被判为薄弱并回退到前置，孩子永远学不到新内容。
 */
const MIN_ATTEMPTS_FOR_REGRESSION = 4

/**
 * 巩固池最多保留几个知识点。
 *
 * ⚠️ 孩子实测反馈「像幼儿园小朋友做的题目」。巩固题的用意是建立成就感，
 * 但如果从**全部已掌握内容**里挑，一个能做 16-9 的孩子会被塞「数一数有几个苹果」——
 * 那传达的不是「我能行」而是「这个 App 看不起我」。
 *
 * 排序后只留最靠近当前水平的几个，让巩固题始终是「她刚学会的东西」。
 */
const MAX_CONFIDENCE_POOL = 5

/**
 * 排出一段学习会话的题目。
 *
 * 排期逻辑：
 * 1. **补救优先**：`misconceptionCounts` 达阈值的误区，插入对应专项（最多 2 个）
 * 2. **按配比取题**：复习 30% / 学习 50% / 巩固 20%
 * 3. **难度自适应**：分数 >0.85 升档；<0.6 降档并回退到最薄弱前置
 * 4. **排序**：首题必为已掌握的简单题（暖场），末题必为能答对的题（好心情结束）
 *
 * 各模式的差异：
 * - `daily` / `free` —— 完整配比
 * - `review` —— 只出到期复习题
 * - `remedial` —— 只出补救专项
 * - `assessment` —— 摸底测评由 `domain/assessment/` 单独负责，本函数返回空
 *
 * @param input - 排期输入，含掌握度索引、知识点、题量与当前时间
 * @returns 排好序的题目计划。数学题的 `itemId` 为空，由生成器运行时产出
 *
 * @example
 * selectNextItems({ profileId, mode: 'daily', count: 25, masteryMap, knowledgePoints, now })
 * // → 25 条计划：首题 confidence 暖场，中段 learning 推进，穿插 review，末题保证能答对
 */
export function selectNextItems(input: ScheduleInput): ScheduledItem[] {
  if (input.mode === 'assessment') return []

  const kpById = new Map(input.knowledgePoints.map((kp) => [kp.id, kp]))
  const all = [...input.masteryMap.values()].filter(
    (m) =>
      (input.subject === undefined || m.subject === input.subject) &&
      // 排除尚无生成器/题库的知识点，否则组装阶段会静默跳过、题量对不上
      (input.answerableKpIds === undefined || input.answerableKpIds.has(m.kpId)),
  )

  const pools = buildPools(all, input.now, kpById)
  const plan: ScheduledItem[] = []

  if (input.mode === 'review') {
    return finalize(takeFrom(pools.review, input.count, 'review', input.masteryMap, kpById), pools)
  }

  // —— 1. 补救专项优先占位
  if (input.mode !== 'free') {
    for (const target of findRemedialTargets(all, input.masteryMap)) {
      if (!kpById.has(target.kpId)) continue
      plan.push({ kpId: target.kpId, difficulty: 1, source: 'remedial' })
    }
  }
  if (input.mode === 'remedial') return plan

  // —— 2. 按配比填充剩余名额
  const remaining = Math.max(0, input.count - plan.length)
  const quota = {
    review: Math.round(remaining * MIX.review),
    confidence: Math.round(remaining * MIX.confidence),
  }
  const learningQuota = remaining - quota.review - quota.confidence

  plan.push(...takeFrom(pools.review, quota.review, 'review', input.masteryMap, kpById))
  plan.push(...takeFrom(pools.learning, learningQuota, 'learning', input.masteryMap, kpById))
  plan.push(
    ...takeFrom(pools.confidence, quota.confidence, 'confidence', input.masteryMap, kpById),
  )

  // 某类池子不足时用学习池补齐，保证题量达标
  const shortfall = input.count - plan.length
  if (shortfall > 0) {
    const fallback = pools.learning.length > 0 ? pools.learning : pools.confidence
    plan.push(...takeFrom(fallback, shortfall, 'learning', input.masteryMap, kpById))
  }

  return finalize(plan.slice(0, input.count), pools)
}

interface Pools {
  review: Mastery[]
  learning: Mastery[]
  confidence: Mastery[]
}

/**
 * 按状态与到期情况把掌握度记录分到三个池子。
 *
 * `available`（可学但没做过）的知识点会按教学顺序取前
 * {@link MAX_NEW_KNOWLEDGE_POINTS} 个并入学习池——它们是新内容的入口，
 * 排在正在学的知识点之后，保证「先学完手上的，再开新的」。
 */
function buildPools(
  all: readonly Mastery[],
  now: ScheduleInput['now'],
  kpById: ReadonlyMap<string, KnowledgePoint>,
): Pools {
  const review: Mastery[] = []
  const learning: Mastery[] = []
  const available: Mastery[] = []
  const confidence: Mastery[] = []

  for (const m of all) {
    if (m.state === 'locked') continue
    if (m.state === 'available') {
      available.push(m)
    } else if (m.state === 'review' || (m.state === 'mastered' && isDue(m.dueAt, now))) {
      review.push(m)
    } else if (m.state === 'learning') {
      learning.push(m)
    } else {
      confidence.push(m)
    }
  }

  // 复习池按到期时间排序，越早到期越紧急
  review.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  // 学习池按掌握度升序，最不熟的优先练
  learning.sort((a, b) => a.masteryScore - b.masteryScore)

  /**
   * 学习前沿：已掌握内容里最靠后的教学顺序。
   *
   * ⚠️ 新内容必须**从前沿往后**开，不能从图谱最前面开。
   * 摸底判定孩子会做 15-9（M6.2，order 33）后，若仍按全局 order 升序取新知识点，
   * 会取到 order 2 的「认识 0」——她会觉得「像幼儿园小朋友做的题目」。
   *
   * 前沿之前漏掉的知识点仍留在池中（排在后面），由回退机制和复习按需补上。
   */
  const frontier = Math.max(
    0,
    ...[...all]
      .filter((m) => m.state === 'mastered' || m.state === 'review' || m.state === 'learning')
      .map((m) => kpById.get(m.kpId)?.order ?? 0),
  )
  const orderOf = (m: Mastery): number => kpById.get(m.kpId)?.order ?? 0
  // 前沿之后的按教学顺序正着取；前沿之前遗漏的按逆序取（离她水平最近的先补）
  const ahead = available.filter((m) => orderOf(m) > frontier).sort((a, b) => orderOf(a) - orderOf(b))
  const behind = available.filter((m) => orderOf(m) <= frontier).sort((a, b) => orderOf(b) - orderOf(a))
  // ⚠️ 只有前沿之后完全没内容可学时才回头补遗漏。
  // 否则会出现「学会 15-9 之后被安排学『认识 0』」这种倒退观感。
  const newOnes = ahead.length > 0 ? ahead : behind
  // 巩固池优先用「真正练过的」且「最近学会的」知识点。
  // ⚠️ 孩子实测反馈「像幼儿园小朋友做的题目」——用最幼稚的内容暖场，
  // 传达的不是「我能行」而是「这个 App 看不起我」。
  // totalAttempts === 0 的是起点预设假定掌握的，没有任何作答样本，排到最后。
  confidence.sort((a, b) => {
    const practiced = Number(b.totalAttempts > 0) - Number(a.totalAttempts > 0)
    if (practiced !== 0) return practiced
    return (kpById.get(b.kpId)?.order ?? 0) - (kpById.get(a.kpId)?.order ?? 0)
  })

  return {
    review,
    learning: [...learning, ...newOnes.slice(0, MAX_NEW_KNOWLEDGE_POINTS)],
    // 截断到最靠近当前水平的几个，避免用远低于她水平的内容做巩固
    confidence: confidence.slice(0, MAX_CONFIDENCE_POOL),
  }
}

/** 从池中轮转取 `count` 条，池子较小时循环复用 */
function takeFrom(
  pool: readonly Mastery[],
  count: number,
  source: ScheduledItem['source'],
  masteryMap: ReadonlyMap<string, Mastery>,
  kpById: ReadonlyMap<string, KnowledgePoint>,
): ScheduledItem[] {
  if (pool.length === 0 || count <= 0) return []

  const result: ScheduledItem[] = []
  for (let i = 0; i < count; i++) {
    const mastery = pool[i % pool.length]!
    const resolved = resolveTarget(mastery, source, masteryMap, kpById)
    result.push(resolved)
  }
  return result
}

/**
 * 决定这道题实际出哪个知识点、哪个难度。
 *
 * 掌握度跌破 0.6 时会**回退到最薄弱的前置知识点**——
 * 孩子在 M5.2 上一直错，继续刷 M5.2 只会更挫败，
 * 真正的问题往往在 M3.3「10 的分与合」。
 */
function resolveTarget(
  mastery: Mastery,
  source: ScheduledItem['source'],
  masteryMap: ReadonlyMap<string, Mastery>,
  kpById: ReadonlyMap<string, KnowledgePoint>,
): ScheduledItem {
  // 巩固题的作用就是让孩子答对，永远用最低难度且不回退
  if (source === 'confidence') {
    return { kpId: mastery.kpId, difficulty: 1, source }
  }

  // 样本太少时不做回退判定：新知识点分数天然为 0，
  // 「没做过」不等于「薄弱」，据此回退会让孩子永远开不了新内容
  if (
    mastery.totalAttempts >= MIN_ATTEMPTS_FOR_REGRESSION &&
    mastery.masteryScore < DIFFICULTY_DOWN_THRESHOLD
  ) {
    const weakest = findWeakestPrerequisite(mastery.kpId, masteryMap, kpById)
    if (weakest !== undefined) {
      return { kpId: weakest, difficulty: 1, source: 'remedial' }
    }
    return { kpId: mastery.kpId, difficulty: 1, source }
  }

  const difficulty: Difficulty =
    mastery.masteryScore > DIFFICULTY_UP_THRESHOLD && mastery.currentDifficulty < 3
      ? ((mastery.currentDifficulty + 1) as Difficulty)
      : mastery.currentDifficulty

  return { kpId: mastery.kpId, difficulty, source }
}

/**
 * 收尾排序：首题暖场、末题保证能答对。
 *
 * 一段课的开头和结尾对孩子的情绪影响最大。开头先给一道稳能答对的题建立信心，
 * 结尾同样——让她带着「我做到了」的感觉离开，而不是卡在一道难题上退出。
 */
function finalize(plan: ScheduledItem[], pools: Pools): ScheduledItem[] {
  if (plan.length <= 2) return plan

  const warmup = pools.confidence[0]
  if (warmup === undefined) return plan

  // 替换首尾而非插入，保持题量与 input.count 一致
  const easy: ScheduledItem = { kpId: warmup.kpId, difficulty: 1, source: 'confidence' }
  const result = [...plan]
  result[0] = easy
  result[result.length - 1] = easy
  return result
}
