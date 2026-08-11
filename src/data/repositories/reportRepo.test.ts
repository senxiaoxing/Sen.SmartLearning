/**
 * @file 家长报告数据读取的集成测试
 * @layer data
 *
 * 这里最容易错的是**按科目分组**：`Attempt` 没有 subject 字段，
 * 全靠 `kpId → 知识点 → subject` 推。推错了报告就串科，
 * 而串科的报告比没有报告更糟——家长会照着错的结论去辅导。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import { loadPendingRetry, loadReport, loadWrongBook } from '@/data/repositories/reportRepo'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { DEFAULT_RESOLVE_STREAK } from '@/domain/report/hasStreakAfter'
import { toIso, todayLocal } from '@/domain/time'
import type { Attempt, Uuid } from '@/domain/types'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

/**
 * 构造一条作答。
 *
 * `offsetMs` 让同一批记录的时间严格递增——`collectWrongItems` 的
 * 「之后是否答对/连对」全靠 `createdAt` 比较，同毫秒会让判定失效。
 */
function attemptOf(
  profileId: Uuid,
  kpId: string,
  isCorrect: boolean,
  offsetMs = 0,
): Attempt {
  return {
    id: crypto.randomUUID(),
    profileId,
    sessionId: 'test-session' as Uuid,
    kpId,
    itemId: `${kpId}-gen#${crypto.randomUUID().slice(0, 8)}`,
    itemSnapshot: {
      stem: '9 + 5 = ?',
      options: [
        { id: 'a', text: '14' },
        { id: 'b', text: '13', misconceptionTag: 'no_carry' },
      ],
      answer: '14',
    },
    difficulty: 2,
    isCorrect,
    selectedOptionId: isCorrect ? 'a' : 'b',
    ...(isCorrect ? {} : { misconceptionTag: 'no_carry' as const }),
    responseTimeMs: 4000,
    hintUsed: false,
    ttsReplayCount: 0,
    isRetry: false,
    createdAt: toIso(new Date(Date.now() + offsetMs)),
    localDate: todayLocal(),
  }
}

describe('loadReport', () => {
  it('刚初始化时 isEmpty 为 true', async () => {
    const profileId = await bootstrap()
    const report = await loadReport(profileId)
    expect(report.isEmpty).toBe(true)
  })

  it('⭐ 三个分区顺序固定为数学·拼音·英语，绝不按成绩排序', async () => {
    const profileId = await bootstrap()
    const report = await loadReport(profileId)
    expect(report.sections.map((s) => s.report.subject)).toEqual(['math', 'pinyin', 'english'])
  })

  it('⭐ 掌握数按科目分开统计，不串科', async () => {
    const profileId = await bootstrap()
    const mathKp = KNOWLEDGE_POINTS.find((k) => k.subject === 'math')!
    const pinyinKp = KNOWLEDGE_POINTS.find((k) => k.subject === 'pinyin')!

    for (const kpId of [mathKp.id, pinyinKp.id]) {
      const m = await db.mastery.where('[profileId+kpId]').equals([profileId, kpId]).first()
      await db.mastery.put({ ...m!, state: 'mastered', totalAttempts: 10, correctAttempts: 8 })
    }

    const report = await loadReport(profileId)
    const math = report.sections.find((s) => s.report.subject === 'math')!.report
    const english = report.sections.find((s) => s.report.subject === 'english')!.report

    expect(math.totalAttempts).toBe(10)
    expect(math.correctAttempts).toBe(8)
    expect(english.totalAttempts, '英语一题没做，不该被数学的记录污染').toBe(0)
  })

  it('分母是「出得了题的知识点数」，不是图谱总数', async () => {
    const profileId = await bootstrap()
    const report = await loadReport(profileId)

    for (const section of report.sections) {
      const answerable = KNOWLEDGE_POINTS.filter(
        (k) => k.subject === section.report.subject && ITEM_TEMPLATE_BY_KP.has(k.id),
      ).length
      const all = KNOWLEDGE_POINTS.filter((k) => k.subject === section.report.subject).length

      expect(section.report.answerableCount).toBe(answerable)
      expect(section.report.answerableCount).toBeLessThanOrEqual(all)
    }
  })

  it('趋势长度等于请求天数，且各科独立', async () => {
    const profileId = await bootstrap()
    const mathKp = KNOWLEDGE_POINTS.find(
      (k) => k.subject === 'math' && ITEM_TEMPLATE_BY_KP.has(k.id),
    )!
    await db.attempts.add(attemptOf(profileId, mathKp.id, true))

    const report = await loadReport(profileId, 5)
    const math = report.sections.find((s) => s.report.subject === 'math')!
    const pinyin = report.sections.find((s) => s.report.subject === 'pinyin')!

    expect(math.trend).toHaveLength(5)
    expect(math.trend.at(-1)?.total).toBe(1)
    expect(pinyin.trend.at(-1)?.total, '拼音今天没做题').toBe(0)
  })

  it('今天做过题就有连续天数', async () => {
    const profileId = await bootstrap()
    const kp = KNOWLEDGE_POINTS.find((k) => ITEM_TEMPLATE_BY_KP.has(k.id))!
    await db.attempts.add(attemptOf(profileId, kp.id, true))

    expect((await loadReport(profileId)).streak).toBe(1)
  })
})

describe('loadWrongBook', () => {
  it('没有错题时每科都是空列表', async () => {
    const profileId = await bootstrap()
    const sections = await loadWrongBook(profileId)

    expect(sections).toHaveLength(3)
    expect(sections.every((s) => s.items.length === 0)).toBe(true)
  })

  it('⭐ 错题落到正确的科目分区', async () => {
    const profileId = await bootstrap()
    const mathKp = KNOWLEDGE_POINTS.find(
      (k) => k.subject === 'math' && ITEM_TEMPLATE_BY_KP.has(k.id),
    )!
    await db.attempts.add(attemptOf(profileId, mathKp.id, false))

    const sections = await loadWrongBook(profileId)
    const math = sections.find((s) => s.subject === 'math')!
    const pinyin = sections.find((s) => s.subject === 'pinyin')!

    expect(math.items).toHaveLength(1)
    expect(math.items[0]?.kpId).toBe(mathKp.id)
    expect(pinyin.items).toHaveLength(0)
  })

  it('答对的题不进错题本', async () => {
    const profileId = await bootstrap()
    const kp = KNOWLEDGE_POINTS.find((k) => ITEM_TEMPLATE_BY_KP.has(k.id))!
    await db.attempts.add(attemptOf(profileId, kp.id, true))

    const sections = await loadWrongBook(profileId)
    expect(sections.every((s) => s.items.length === 0)).toBe(true)
  })

  it('⭐ 错题带上家长做诊断需要的信息', async () => {
    const profileId = await bootstrap()
    const mathKp = KNOWLEDGE_POINTS.find(
      (k) => k.subject === 'math' && ITEM_TEMPLATE_BY_KP.has(k.id),
    )!
    await db.attempts.add(attemptOf(profileId, mathKp.id, false))

    const item = (await loadWrongBook(profileId)).find((s) => s.subject === 'math')!.items[0]

    expect(item).toMatchObject({
      stem: '9 + 5 = ?',
      correctAnswer: '14',
      selectedText: '13',
      misconceptionTag: 'no_carry',
    })
    expect(item?.resolvedBy, '刚错完，还没解决').toBeUndefined()
  })
})

describe('loadPendingRetry', () => {
  /** 取一个确实出得了题的数学知识点 */
  function mathKpId(): string {
    return KNOWLEDGE_POINTS.find(
      (k) => k.subject === 'math' && ITEM_TEMPLATE_BY_KP.has(k.id),
    )!.id
  }

  it('没有错题时返回空数组，主页据此隐藏入口', async () => {
    const profileId = await bootstrap()
    expect(await loadPendingRetry(profileId)).toEqual([])
  })

  it('汇总每个知识点的待订正题数', async () => {
    const profileId = await bootstrap()
    const kpId = mathKpId()
    await db.attempts.bulkAdd([
      attemptOf(profileId, kpId, false, 0),
      attemptOf(profileId, kpId, false, 1000),
    ])

    const [group] = await loadPendingRetry(profileId)
    expect(group?.subject).toBe('math')
    expect(group?.total).toBe(2)
    expect(group?.kps).toEqual([{ kpId, count: 2 }])
  })

  it('按待订正数降序，主页取第一个作为本轮科目', async () => {
    const profileId = await bootstrap()
    const math = mathKpId()
    const pinyin = KNOWLEDGE_POINTS.find(
      (k) => k.subject === 'pinyin' && ITEM_TEMPLATE_BY_KP.has(k.id),
    )!.id

    await db.attempts.bulkAdd([
      attemptOf(profileId, pinyin, false, 0),
      attemptOf(profileId, math, false, 1000),
      attemptOf(profileId, math, false, 2000),
    ])

    const groups = await loadPendingRetry(profileId)
    expect(groups.map((g) => g.subject)).toEqual(['math', 'pinyin'])
  })

  it(`⭐ 闭环：同知识点连对 ${DEFAULT_RESOLVE_STREAK} 次后，待订正清零`, async () => {
    const profileId = await bootstrap()
    const kpId = mathKpId()

    await db.attempts.add(attemptOf(profileId, kpId, false, 0))
    expect((await loadPendingRetry(profileId))[0]?.total, '错完之后应该有一条').toBe(1)

    // 订正轮：同知识点、新生成的题，连续答对
    for (let i = 0; i < DEFAULT_RESOLVE_STREAK; i++) {
      await db.attempts.add(attemptOf(profileId, kpId, true, 1000 * (i + 1)))
    }

    expect(
      await loadPendingRetry(profileId),
      '原题再没出现过，但知识点已经练熟，错题应当自动消失',
    ).toEqual([])
  })

  it('连对次数不够时仍然留着', async () => {
    const profileId = await bootstrap()
    const kpId = mathKpId()

    await db.attempts.add(attemptOf(profileId, kpId, false, 0))
    for (let i = 0; i < DEFAULT_RESOLVE_STREAK - 1; i++) {
      await db.attempts.add(attemptOf(profileId, kpId, true, 1000 * (i + 1)))
    }

    expect((await loadPendingRetry(profileId))[0]?.total).toBe(1)
  })
})
