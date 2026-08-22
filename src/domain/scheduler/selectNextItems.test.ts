/**
 * @file 出题调度器测试
 * @layer domain
 *
 * 调度器排错了在 UI 上看不出来——孩子只会觉得「题目怎么老出这个」或
 * 「怎么突然这么难」。配比、难度自适应、回退、补救插入都必须靠测试锁住。
 */

import { describe, expect, it } from 'vitest'
import { ORDER_BASE } from '@/data/seed/gradeOrder'
import { KNOWLEDGE_POINTS, KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { createMastery } from '@/domain/mastery/updateMastery'
import { selectNextItems } from '@/domain/scheduler/selectNextItems'
import { addDays, isoFromString } from '@/domain/time'
import type {
  Grade,
  KnowledgePoint,
  Mastery,
  MasteryState,
  ScheduleInput,
  Subject,
} from '@/domain/types'

const NOW = isoFromString('2026-08-05T10:00:00.000Z')

function masteryFor(kpId: string, over: Partial<Mastery> = {}): Mastery {
  const kp = KNOWLEDGE_POINT_BY_ID.get(kpId)!
  return { ...createMastery(`m-${kpId}`, 'p1', kp, NOW), ...over }
}

function inputWith(
  entries: Mastery[],
  over: Partial<ScheduleInput> = {},
): ScheduleInput {
  return {
    profileId: 'p1',
    mode: 'daily',
    count: 20,
    masteryMap: new Map(entries.map((m) => [m.kpId, m])),
    knowledgePoints: KNOWLEDGE_POINTS,
    now: NOW,
    ...over,
  }
}

/** 构造一批处于指定状态的掌握度记录 */
function batch(kpIds: string[], state: MasteryState, over: Partial<Mastery> = {}): Mastery[] {
  return kpIds.map((id) => masteryFor(id, { state, masteryScore: 0.7, totalAttempts: 10, ...over }))
}

describe('题量与配比', () => {
  const entries = [
    ...batch(['M1.1', 'M1.2'], 'mastered', { dueAt: addDays(NOW, -1) }), // 到期复习
    ...batch(['M4.5', 'M4.6', 'M5.2'], 'learning'),
    ...batch(['M1.3', 'M1.5'], 'mastered', { dueAt: addDays(NOW, 10) }), // 未到期，巩固池
  ]

  it('产出题量等于请求量', () => {
    for (const count of [10, 20, 25]) {
      expect(selectNextItems(inputWith(entries, { count }))).toHaveLength(count)
    }
  })

  it('三类来源都有覆盖，学习占比最高', () => {
    const plan = selectNextItems(inputWith(entries, { count: 20 }))
    const counts = plan.reduce<Record<string, number>>((acc, item) => {
      acc[item.source] = (acc[item.source] ?? 0) + 1
      return acc
    }, {})

    expect(counts.review ?? 0).toBeGreaterThan(0)
    expect(counts.learning ?? 0).toBeGreaterThan(0)
    expect(counts.confidence ?? 0).toBeGreaterThan(0)
    expect(counts.learning).toBeGreaterThan(counts.review ?? 0)
  })

  it('⭐ 首尾都是巩固题：开头暖场，结尾让孩子带着成就感离开', () => {
    const plan = selectNextItems(inputWith(entries, { count: 20 }))
    expect(plan[0]!.source).toBe('confidence')
    expect(plan[0]!.difficulty).toBe(1)
    expect(plan.at(-1)!.source).toBe('confidence')
    expect(plan.at(-1)!.difficulty).toBe(1)
  })

  it('locked 与 available 的知识点不会被排进来', () => {
    const withLocked = [...entries, ...batch(['M5.5', 'M6.2'], 'locked')]
    const plan = selectNextItems(inputWith(withLocked, { count: 20 }))
    expect(plan.some((i) => i.kpId === 'M5.5' || i.kpId === 'M6.2')).toBe(false)
  })

  it('池子不足时用学习池补齐，不会少出题', () => {
    const onlyLearning = batch(['M4.5'], 'learning')
    expect(selectNextItems(inputWith(onlyLearning, { count: 15 }))).toHaveLength(15)
  })

  it('没有任何可出题的知识点时返回空而不是报错', () => {
    expect(selectNextItems(inputWith(batch(['M4.5'], 'locked')))).toEqual([])
  })
})

describe('首次使用（全新档案）', () => {
  /** 模拟 bootstrap 后的真实状态：无前置的 available，有前置的 locked */
  function freshProfile(): Mastery[] {
    return KNOWLEDGE_POINTS.filter((kp) => kp.subject === 'math').map((kp) =>
      masteryFor(kp.id, { state: kp.prerequisites.length === 0 ? 'available' : 'locked' }),
    )
  }

  it('⭐ 全新档案也能排出题目，不会一打开就结束', () => {
    const plan = selectNextItems(inputWith(freshProfile(), { count: 20 }))
    expect(plan.length, '新用户点开始学习必须有题可做').toBe(20)
  })

  it('新内容按教学顺序开启，不跳着来', () => {
    const plan = selectNextItems(inputWith(freshProfile(), { count: 20 }))
    const kpIds = new Set(plan.map((i) => i.kpId))
    // M1.1 是 order 最小的无前置知识点，必须最先开
    expect(kpIds.has('M1.1')).toBe(true)
  })

  it('一次最多开 2 个新知识点，避免孩子失焦', () => {
    const plan = selectNextItems(inputWith(freshProfile(), { count: 20 }))
    expect(new Set(plan.map((i) => i.kpId)).size).toBeLessThanOrEqual(2)
  })

  it('样本不足时不触发前置回退（没做过 ≠ 薄弱）', () => {
    const plan = selectNextItems(inputWith(freshProfile(), { count: 20 }))
    expect(plan.every((i) => i.source !== 'remedial')).toBe(true)
  })
})

describe('可出题范围过滤', () => {
  it('⭐ 只排真正出得了题的知识点，保证题量对得上', () => {
    // M2.1「上·下」尚无生成器（等图片资源），不该被排进来
    const entries = [
      ...batch(['M1.1'], 'available'),
      ...batch(['M2.1'], 'available'),
    ]
    const plan = selectNextItems(
      inputWith(entries, { count: 12, answerableKpIds: new Set(['M1.1']) }),
    )

    expect(plan).toHaveLength(12)
    expect(plan.every((i) => i.kpId === 'M1.1')).toBe(true)
  })

  it('省略 answerableKpIds 时视为全部可出，保持向后兼容', () => {
    const entries = batch(['M1.1', 'M2.1'], 'available')
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    expect(plan).toHaveLength(10)
  })
})

describe('难度自适应', () => {
  it('掌握度高于 0.85 时升难度', () => {
    const entries = batch(['M4.5'], 'learning', { masteryScore: 0.9, currentDifficulty: 1 })
    const plan = selectNextItems(inputWith(entries, { count: 5 }))
    const learning = plan.filter((i) => i.source === 'learning')
    expect(learning.every((i) => i.difficulty === 2)).toBe(true)
  })

  it('难度不会超过 3', () => {
    const entries = batch(['M4.5'], 'learning', { masteryScore: 0.95, currentDifficulty: 3 })
    const plan = selectNextItems(inputWith(entries, { count: 5 }))
    expect(plan.every((i) => i.difficulty <= 3)).toBe(true)
  })

  it('⭐ 掌握度跌破 0.6 时回退到最薄弱的前置知识点', () => {
    // M5.2 依赖 M5.1，M5.1 依赖 M3.3。M3.3 最弱 → 应回退到 M3.3
    const entries = [
      masteryFor('M5.2', { state: 'learning', masteryScore: 0.4, totalAttempts: 10 }),
      masteryFor('M5.1', { state: 'learning', masteryScore: 0.65, totalAttempts: 10 }),
      masteryFor('M3.3', { state: 'learning', masteryScore: 0.35, totalAttempts: 10 }),
      masteryFor('M1.9', { state: 'mastered', masteryScore: 0.9, dueAt: addDays(NOW, 5) }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    const fromM52 = plan.filter((i) => i.source === 'remedial')
    expect(fromM52.some((i) => i.kpId === 'M3.3')).toBe(true)
  })

  it('⭐ 巩固题优先用真正练过的知识点，而非幼稚的假定掌握内容', () => {
    const entries = [
      ...batch(['M4.5'], 'learning'),
      // M1.1 是起点预设假定掌握的，没有任何作答样本
      masteryFor('M1.1', {
        state: 'mastered',
        masteryScore: 0.7,
        totalAttempts: 0,
        dueAt: addDays(NOW, 5),
      }),
      // M3.1 是真正练过并掌握的
      masteryFor('M3.1', {
        state: 'mastered',
        masteryScore: 0.9,
        totalAttempts: 15,
        dueAt: addDays(NOW, 5),
      }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 12 }))
    expect(plan[0]!.kpId, '暖场题应是真正学会的内容，不是幼儿园数数').toBe('M3.1')
  })

  it('⭐ 新内容从学习前沿往后开，不从图谱最前面开', () => {
    // 摸底判定她会做退位减法（M6.2），下一步该学 M6.3，
    // 而不是回头学 order 最小但一直没碰过的 M1.2「认识 0」
    const entries = [
      masteryFor('M6.2', { state: 'mastered', masteryScore: 0.8, dueAt: addDays(NOW, 20) }),
      masteryFor('M1.2', { state: 'available' }),
      masteryFor('M6.3', { state: 'available' }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 12 }))
    const learningKps = new Set(plan.filter((i) => i.source === 'learning').map((i) => i.kpId))

    expect(learningKps.has('M6.3'), '应从前沿之后取新内容').toBe(true)
    expect(learningKps.has('M1.2'), '不该回头取远低于水平的内容').toBe(false)
  })

  it('前沿之后无内容时，回头补前沿之前最靠近的', () => {
    const entries = [
      masteryFor('M6.5', { state: 'mastered', masteryScore: 0.8, dueAt: addDays(NOW, 20) }),
      masteryFor('M1.2', { state: 'available' }),
      masteryFor('M4.7', { state: 'available' }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 12 }))
    const learningKps = new Set(plan.filter((i) => i.source === 'learning').map((i) => i.kpId))

    expect(learningKps.has('M4.7'), '应优先补离水平最近的遗漏').toBe(true)
  })

  it('⭐ 巩固池截断，远低于当前水平的内容不会被选中', () => {
    // 摸底判定她会做退位减法后，「数一数有几个苹果」不该再作为巩固题出现
    const mastered = ['M1.1', 'M1.2', 'M1.3', 'M1.5', 'M1.6', 'M1.7', 'M1.9', 'M3.1', 'M3.2', 'M3.3']
    const entries = [
      ...mastered.map((id) =>
        masteryFor(id, { state: 'mastered', masteryScore: 0.8, dueAt: addDays(NOW, 20) }),
      ),
      ...batch(['M6.2'], 'learning'),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 20 }))
    const confidenceKps = new Set(
      plan.filter((i) => i.source === 'confidence').map((i) => i.kpId),
    )
    expect(confidenceKps.has('M1.1'), '最幼稚的数数题应被截断掉').toBe(false)
  })

  it('巩固题永远用难度 1 且不回退', () => {
    const entries = [
      ...batch(['M4.5'], 'learning'),
      masteryFor('M1.1', { state: 'mastered', masteryScore: 0.3, dueAt: addDays(NOW, 5) }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    for (const item of plan.filter((i) => i.source === 'confidence')) {
      expect(item.difficulty).toBe(1)
      expect(item.kpId).toBe('M1.1')
    }
  })
})

describe('诊断驱动的补救', () => {
  it('⭐ 误区累计达阈值时插入对应专项', () => {
    const entries = [
      masteryFor('M5.2', {
        state: 'learning',
        masteryScore: 0.7,
        totalAttempts: 12,
        misconceptionCounts: { no_carry: 4 },
      }),
      masteryFor('M5.1', { state: 'learning', masteryScore: 0.7, totalAttempts: 8 }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    // no_carry → M5.1 凑十法原理专项
    expect(plan.some((i) => i.kpId === 'M5.1' && i.source === 'remedial')).toBe(true)
  })

  it('误区次数未达阈值时不插入', () => {
    const entries = [
      masteryFor('M5.2', {
        state: 'learning',
        masteryScore: 0.7,
        totalAttempts: 12,
        misconceptionCounts: { no_carry: 2 },
      }),
      masteryFor('M5.1', { state: 'learning', masteryScore: 0.7, totalAttempts: 8 }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    expect(plan.some((i) => i.source === 'remedial' && i.kpId === 'M5.1')).toBe(false)
  })

  it('自由练习模式不插入补救，保持孩子的自主选择', () => {
    const entries = [
      masteryFor('M5.2', {
        state: 'learning',
        masteryScore: 0.7,
        totalAttempts: 12,
        misconceptionCounts: { no_carry: 5 },
      }),
      masteryFor('M5.1', { state: 'learning', masteryScore: 0.7, totalAttempts: 8 }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10, mode: 'free' }))
    expect(plan.some((i) => i.kpId === 'M5.1' && i.source === 'remedial')).toBe(false)
  })
})

describe('模式差异', () => {
  const entries = [
    ...batch(['M1.1', 'M1.2'], 'mastered', { dueAt: addDays(NOW, -2) }),
    ...batch(['M4.5'], 'learning'),
    ...batch(['M1.3'], 'mastered', { dueAt: addDays(NOW, 10) }),
  ]

  it('review 模式只出到期复习题', () => {
    const plan = selectNextItems(inputWith(entries, { count: 10, mode: 'review' }))
    expect(plan.every((i) => i.source === 'review' || i.source === 'confidence')).toBe(true)
    expect(plan.some((i) => i.kpId === 'M4.5')).toBe(false)
  })

  it('assessment 模式返回空（由 domain/assessment 单独负责）', () => {
    expect(selectNextItems(inputWith(entries, { mode: 'assessment' }))).toEqual([])
  })

  it('按科目过滤时不会混入其他科目', () => {
    const mixed = [
      ...batch(['M4.5'], 'learning'),
      ...batch(['P2.1'], 'learning'),
      ...batch(['E4.1'], 'learning'),
    ]
    for (const subject of ['math', 'pinyin', 'english'] as Subject[]) {
      const plan = selectNextItems(inputWith(mixed, { count: 6, subject }))
      for (const item of plan) {
        expect(KNOWLEDGE_POINT_BY_ID.get(item.kpId)?.subject).toBe(subject)
      }
    }
  })
})

describe('复习优先级', () => {
  it('越早到期的知识点越优先', () => {
    const entries = [
      masteryFor('M1.1', { state: 'review', dueAt: addDays(NOW, -10), masteryScore: 0.8 }),
      masteryFor('M1.2', { state: 'review', dueAt: addDays(NOW, -1), masteryScore: 0.8 }),
      ...batch(['M4.5'], 'learning'),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 20 }))
    const reviews = plan.filter((i) => i.source === 'review')
    expect(reviews[0]!.kpId, '逾期最久的应排在前面').toBe('M1.1')
  })

  it('学习池按掌握度升序，最不熟的先练', () => {
    const entries = [
      masteryFor('M4.5', { state: 'learning', masteryScore: 0.8, totalAttempts: 10 }),
      masteryFor('M4.6', { state: 'learning', masteryScore: 0.65, totalAttempts: 10 }),
    ]
    const plan = selectNextItems(inputWith(entries, { count: 10 }))
    const learning = plan.filter((i) => i.source === 'learning')
    expect(learning[0]!.kpId).toBe('M4.6')
  })
})

describe('⭐ 年级天花板：只挡超前，不挡补漏', () => {
  /**
   * 造一个指定年级的知识点。
   *
   * 真实图谱目前只有一年级（`KNOWLEDGE_POINTS_BY_GRADE.G2` 是空的），
   * 跨年级行为只能靠构造来测——而这恰恰是最该提前锁住的部分：
   * 等二年级内容做出来才发现回退被年级墙挡住，那时已经错得很深了。
   */
  function kpAt(id: string, grade: Grade, order: number, pre: string[] = []): KnowledgePoint {
    return {
      id,
      subject: 'math',
      unit: 'M1',
      unitName: '测试单元',
      name: id,
      grade,
      order,
      prerequisites: pre,
      itemTypes: ['input_number'],
      difficulty: 1,
      isKeyNode: false,
      targetMastery: 0.85,
      estimatedItems: 20,
      misconceptions: [],
      collectionCardId: `card-${id}`,
    }
  }

  // order 取真实分区值，让「G2 大于 G1」这件事和线上完全一致
  const G1 = ORDER_BASE.math.G1
  const G2 = ORDER_BASE.math.G2

  const kpG1 = kpAt('T1.1', '1A', G1 + 1)
  const kpG1Next = kpAt('T1.2', '1A', G1 + 2)
  /** 二年级内容，前置在一年级 —— 跨年级前置是合法且必要的 */
  const kpG2 = kpAt('T2.1', '2A', G2 + 1, ['T1.1'])
  const kpG2Next = kpAt('T2.2', '2A', G2 + 2)
  const points = [kpG1, kpG1Next, kpG2, kpG2Next]

  function m(kp: KnowledgePoint, over: Partial<Mastery> = {}): Mastery {
    return { ...createMastery(`m-${kp.id}`, 'p1', kp, NOW), ...over }
  }

  function planWith(entries: Mastery[], over: Partial<ScheduleInput> = {}) {
    return selectNextItems({
      profileId: 'p1',
      mode: 'daily',
      count: 12,
      masteryMap: new Map(entries.map((e) => [e.kpId, e])),
      knowledgePoints: points,
      now: NOW,
      ...over,
    })
  }

  it('新内容只从当前年级开，不越级取更高年级', () => {
    const plan = planWith(
      [m(kpG1Next, { state: 'available' }), m(kpG2Next, { state: 'available' })],
      { gradeLevel: 'G1' },
    )
    const kps = new Set(plan.map((i) => i.kpId))

    expect(kps.has('T1.2'), '当前年级的新内容应该开').toBe(true)
    expect(kps.has('T2.2'), '不该跳到下一个年级').toBe(false)
  })

  it('不传 gradeLevel 时不做任何年级限制', () => {
    const plan = planWith([
      m(kpG1Next, { state: 'available' }),
      m(kpG2Next, { state: 'available' }),
    ])
    expect(new Set(plan.map((i) => i.kpId)).has('T2.2')).toBe(true)
  })

  it('⭐⭐ 前置回退能跨年级往下 —— 挡住它等于废掉诊断能力', () => {
    // 二年级内容一直错，真正的问题在一年级的地基上。
    // 这正是「两位数乘法一直错，其实是乘法口诀没记牢」的模型。
    const entries = [
      m(kpG2, { state: 'learning', masteryScore: 0.4, totalAttempts: 10 }),
      m(kpG1, { state: 'learning', masteryScore: 0.3, totalAttempts: 10 }),
    ]
    const plan = planWith(entries, { gradeLevel: 'G2' })

    expect(
      plan.some((i) => i.kpId === 'T1.1' && i.source === 'remedial'),
      '在二年级答题区也必须能退回一年级的薄弱前置',
    ).toBe(true)
  })

  it('复习池跨年级：低年级到期的内容照常复习', () => {
    const entries = [
      m(kpG1, {
        state: 'mastered',
        masteryScore: 0.8,
        totalAttempts: 10,
        dueAt: addDays(NOW, -3),
      }),
      m(kpG2Next, { state: 'learning', masteryScore: 0.7, totalAttempts: 10 }),
    ]
    const plan = planWith(entries, { gradeLevel: 'G2' })

    expect(plan.some((i) => i.kpId === 'T1.1' && i.source === 'review')).toBe(true)
  })

  it('巩固池跨年级：低年级学会的内容仍可用来暖场', () => {
    const entries = [
      m(kpG1, {
        state: 'mastered',
        masteryScore: 0.9,
        totalAttempts: 15,
        dueAt: addDays(NOW, 20),
      }),
      m(kpG2Next, { state: 'learning', masteryScore: 0.7, totalAttempts: 10 }),
    ]
    const plan = planWith(entries, { gradeLevel: 'G2' })

    expect(plan[0]!.kpId, '首题暖场应能取低年级已学会的内容').toBe('T1.1')
    expect(plan[0]!.source).toBe('confidence')
  })

  it('当前年级没有新内容时，回头补低年级的遗漏', () => {
    // frontier 落在 G2、G2 已无 available，此时 T1.2 这个遗漏应该补上
    const entries = [
      m(kpG2Next, {
        state: 'mastered',
        masteryScore: 0.8,
        totalAttempts: 10,
        dueAt: addDays(NOW, 20),
      }),
      m(kpG1Next, { state: 'available' }),
    ]
    const plan = planWith(entries, { gradeLevel: 'G2' })

    expect(
      plan.some((i) => i.kpId === 'T1.2'),
      '天花板只挡超前；前沿之后没内容时，补漏不受年级限制',
    ).toBe(true)
  })
})
