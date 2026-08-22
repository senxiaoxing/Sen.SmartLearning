/**
 * @file 知识点图谱完整性测试
 * @layer data
 *
 * 手写 113 条依赖关系必然出错，而这类错误在 UI 上看不出来——
 * 悬空的前置引用会让知识点**永远无法解锁**，环形依赖会让解锁判定**无限递归**。
 * 这些测试是唯一能在动手写调度器之前发现问题的手段。
 */

import { describe, expect, it } from 'vitest'
import { allOrderPartitions, ORDER_BASE, ORDER_SPAN } from '@/data/seed/gradeOrder'
import {
  KEY_NODE_IDS,
  KNOWLEDGE_POINTS,
  KNOWLEDGE_POINTS_BY_GRADE,
  KNOWLEDGE_POINTS_BY_SUBJECT,
  KNOWLEDGE_POINT_BY_ID,
  validateKnowledgeGraph,
  type GraphValidationError,
} from '@/data/seed/knowledgePoints'
import { GRADE_LEVELS, gradeLevelOf, type KnowledgePoint, type Subject } from '@/domain/types'

function format(errors: GraphValidationError[]): string {
  return errors.map((e) => `[${e.kind}] ${e.detail}`).join('\n')
}

describe('知识点图谱完整性', () => {
  it('图谱无任何结构性错误', () => {
    const errors = validateKnowledgeGraph()
    expect(errors, format(errors)).toEqual([])
  })

  it('各科目数量符合设计文档', () => {
    expect(KNOWLEDGE_POINTS_BY_SUBJECT.math).toHaveLength(48)
    expect(KNOWLEDGE_POINTS_BY_SUBJECT.pinyin).toHaveLength(35)
    expect(KNOWLEDGE_POINTS_BY_SUBJECT.english).toHaveLength(30)
    expect(KNOWLEDGE_POINTS).toHaveLength(113)
  })

  it('ID 索引覆盖全部知识点', () => {
    expect(KNOWLEDGE_POINT_BY_ID.size).toBe(KNOWLEDGE_POINTS.length)
  })
})

describe('校验器本身能发现问题', () => {
  const base: KnowledgePoint = {
    id: 'M1.1',
    subject: 'math',
    unit: 'M1',
    unitName: '测试单元',
    name: '测试',
    grade: '1A',
    order: 1,
    prerequisites: [],
    itemTypes: ['input_number'],
    difficulty: 1,
    isKeyNode: false,
    targetMastery: 0.85,
    estimatedItems: 20,
    misconceptions: [],
    collectionCardId: 'card-M1.1',
  }

  it('检出悬空前置引用', () => {
    const errors = validateKnowledgeGraph([{ ...base, prerequisites: ['M9.9'] }])
    expect(errors).toHaveLength(1)
    expect(errors[0]?.kind).toBe('missing_prerequisite')
  })

  it('检出环形依赖', () => {
    const errors = validateKnowledgeGraph([
      { ...base, id: 'A', order: 1, prerequisites: ['B'], collectionCardId: 'card-A' },
      { ...base, id: 'B', order: 2, prerequisites: ['A'], collectionCardId: 'card-B' },
    ])
    expect(errors.some((e) => e.kind === 'cycle')).toBe(true)
  })

  it('检出跨科目依赖', () => {
    const errors = validateKnowledgeGraph([
      { ...base, id: 'P1.1', subject: 'pinyin', order: 1, prerequisites: [] },
      { ...base, id: 'M1.1', subject: 'math', order: 2, prerequisites: ['P1.1'] },
    ])
    expect(errors.some((e) => e.kind === 'cross_subject_prerequisite')).toBe(true)
  })

  it('检出 ID 重复与 order 冲突', () => {
    const dup = validateKnowledgeGraph([base, { ...base }])
    expect(dup.some((e) => e.kind === 'duplicate_id')).toBe(true)

    const conflict = validateKnowledgeGraph([
      base,
      { ...base, id: 'M1.2', collectionCardId: 'card-M1.2' },
    ])
    expect(conflict.some((e) => e.kind === 'duplicate_order')).toBe(true)
  })

  it('检出自依赖', () => {
    const errors = validateKnowledgeGraph([{ ...base, prerequisites: ['M1.1'] }])
    expect(errors.some((e) => e.kind === 'self_prerequisite')).toBe(true)
  })

  it('⭐ 检出「前置排在自己后面」——那会让知识点永远解不开锁', () => {
    const errors = validateKnowledgeGraph([
      { ...base, id: 'M1.1', order: 2000, prerequisites: ['M1.2'] },
      { ...base, id: 'M1.2', order: 3000, prerequisites: [], collectionCardId: 'card-M1.2' },
    ])
    expect(errors.some((e) => e.kind === 'prerequisite_order_inverted')).toBe(true)
  })

  it('跨年级前置是合法的 —— 三年级的内容本来就该依赖二年级', () => {
    const errors = validateKnowledgeGraph([
      { ...base, id: 'M2.1', grade: '2A', order: 2000, prerequisites: [] },
      {
        ...base,
        id: 'M3.1',
        grade: '3A',
        order: 3000,
        prerequisites: ['M2.1'],
        collectionCardId: 'card-M3.1',
      },
    ])
    expect(errors).toEqual([])
  })
})

describe('order 年级分区', () => {
  it('各 (科目 × 年级) 分区互不重叠', () => {
    const partitions = allOrderPartitions()

    for (const a of partitions) {
      for (const b of partitions) {
        if (a.subject === b.subject && a.gradeLevel === b.gradeLevel) continue
        const overlap = a.range[0] < b.range[1] && b.range[0] < a.range[1]
        expect(
          overlap,
          `${a.subject}/${a.gradeLevel} 与 ${b.subject}/${b.gradeLevel} 的 order 区间重叠`,
        ).toBe(false)
      }
    }
  })

  it('⭐ 同科目内年级序与 order 序一致 —— frontier 靠它判断新旧', () => {
    // 顺序反了不会报错，只会让新年级被判成「前沿之前的遗漏」，
    // 表现是「升了年级却一直在做旧题」
    for (const subject of Object.keys(ORDER_BASE) as Subject[]) {
      for (let i = 1; i < GRADE_LEVELS.length; i++) {
        const prev = ORDER_BASE[subject][GRADE_LEVELS[i - 1]!]
        const curr = ORDER_BASE[subject][GRADE_LEVELS[i]!]
        expect(curr, `${subject} ${GRADE_LEVELS[i]} 的起点应大于 ${GRADE_LEVELS[i - 1]}`).toBeGreaterThan(prev)
      }
    }
  })

  it('每个知识点的 order 落在自己那个分区内', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      const start = ORDER_BASE[kp.subject][gradeLevelOf(kp.grade)]
      expect(kp.order, `${kp.id} 的 order ${kp.order} 不在 ${kp.subject}/${kp.grade} 的分区内`)
        .toBeGreaterThanOrEqual(start)
      expect(kp.order).toBeLessThan(start + ORDER_SPAN)
    }
  })
})

describe('年级索引', () => {
  it('按年级分组覆盖全部知识点', () => {
    const total = GRADE_LEVELS.reduce((n, g) => n + KNOWLEDGE_POINTS_BY_GRADE[g].length, 0)
    expect(total).toBe(KNOWLEDGE_POINTS.length)
  })

  it('当前内容全部属于一年级，其余年级为空', () => {
    expect(KNOWLEDGE_POINTS_BY_GRADE.G1).toHaveLength(KNOWLEDGE_POINTS.length)
    for (const g of GRADE_LEVELS.filter((g) => g !== 'G1')) {
      expect(KNOWLEDGE_POINTS_BY_GRADE[g], `${g} 还没有内容`).toHaveLength(0)
    }
  })

  it('1A 与 1B 都归到 G1 —— 一个年级横跨两个学期', () => {
    const hasSecondTerm = KNOWLEDGE_POINTS.some((kp) => kp.grade === '1B')
    expect(hasSecondTerm, 'M2 位置整单元在一下，应存在 1B 的知识点').toBe(true)
    expect(KNOWLEDGE_POINTS_BY_GRADE.G1.some((kp) => kp.grade === '1B')).toBe(true)
  })
})

describe('关键节点配置', () => {
  it('关键节点使用更高的掌握阈值与题量', () => {
    for (const id of KEY_NODE_IDS) {
      const kp = KNOWLEDGE_POINT_BY_ID.get(id)
      expect(kp, `关键节点 ${id} 不存在`).toBeDefined()
      expect(kp!.targetMastery, `${id} 掌握阈值应为 0.95`).toBe(0.95)
      expect(kp!.estimatedItems, `${id} 题量应为 60`).toBe(60)
    }
  })

  it('M3.3「10 的分与合」是凑十法与破十法的共同前置', () => {
    expect(KNOWLEDGE_POINT_BY_ID.get('M3.3')?.isKeyNode).toBe(true)
    expect(KNOWLEDGE_POINT_BY_ID.get('M5.1')?.prerequisites).toContain('M3.3')
    expect(KNOWLEDGE_POINT_BY_ID.get('M6.1')?.prerequisites).toContain('M3.3')
  })
})

describe('数据一致性', () => {
  it('每个知识点都有对应的图鉴卡 ID', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      expect(kp.collectionCardId).toBe(`card-${kp.id}`)
    }
  })

  it('unit 与 id 前缀一致', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      expect(kp.id.startsWith(`${kp.unit}.`), `${kp.id} 的 unit 是 ${kp.unit}`).toBe(true)
    }
  })

  it('每个知识点至少有一种题型', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      expect(kp.itemTypes.length, `${kp.id} 没有题型`).toBeGreaterThan(0)
    }
  })

  it('无前置的知识点存在（否则没有任何入口可解锁）', () => {
    const roots = KNOWLEDGE_POINTS.filter((kp) => kp.prerequisites.length === 0)
    expect(roots.length).toBeGreaterThan(0)
    // 三个科目各自都要有入口，否则该科目整体无法开始
    for (const subject of ['math', 'pinyin', 'english'] as const) {
      expect(
        roots.some((kp) => kp.subject === subject),
        `${subject} 没有无前置的入口知识点`,
      ).toBe(true)
    }
  })
})
