/**
 * @file 摸底三段式流程测试
 * @layer domain
 * @see src/domain/assessment/nextProbe.ts
 *
 * 这里守的两条都是**产品红线**，不是算法正确性：
 *
 * 1. 连错 2 题不能直接把她扔到低年级——孩子会手滑、会没听清
 * 2. 下探必须倒序——正序意味着她从「数一数」重做，
 *    而「像幼儿园小朋友做的题目」是流失前兆
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_DESCEND_PROBES,
  MAX_PROBE_COUNT,
  nextProbe,
  type ProbeResult,
} from '@/domain/assessment/nextProbe'
import { sequenceOf } from '@/domain/assessment/placementProbes'
import type { GradeLevel } from '@/domain/types'

const G1 = sequenceOf('math', 'G1')
const G2 = sequenceOf('math', 'G2')

const probe = (kpId: string, isCorrect: boolean, gradeLevel: GradeLevel = 'G2'): ProbeResult => ({
  kpId,
  isCorrect,
  gradeLevel,
  phase: 'probe',
})
const safety = (isCorrect: boolean): ProbeResult => ({
  kpId: G2[0]!,
  isCorrect,
  gradeLevel: 'G2',
  phase: 'safety',
})
const descend = (kpId: string, isCorrect: boolean): ProbeResult => ({
  kpId,
  isCorrect,
  gradeLevel: 'G1',
  phase: 'descend',
})

/** 二年级孩子开局连错两题——三段式的入口条件 */
const twoWrongG2: ProbeResult[] = [probe(G2[0]!, false), probe(G2[1]!, false)]

describe('① 本级正序', () => {
  it('从第一题开始', () => {
    expect(nextProbe('math', 'G2', [])).toEqual({
      kpId: G2[0],
      gradeLevel: 'G2',
      phase: 'probe',
    })
  })

  it('答对则继续往难处探', () => {
    expect(nextProbe('math', 'G2', [probe(G2[0]!, true)])?.kpId).toBe(G2[1])
  })

  it('错一题仍继续 —— 可能只是手滑或没听清', () => {
    expect(nextProbe('math', 'G2', [probe(G2[0]!, false)])?.kpId).toBe(G2[1])
    expect(nextProbe('math', 'G2', [probe(G2[0]!, false)])?.phase).toBe('probe')
  })

  it('中间错一题后又答对，连错计数归零', () => {
    const results = [probe(G2[0]!, false), probe(G2[1]!, true), probe(G2[2]!, false)]
    expect(nextProbe('math', 'G2', results)?.phase).toBe('probe')
  })

  it('探完整条序列就结束', () => {
    const all = G2.map((id) => probe(id, true))
    expect(nextProbe('math', 'G2', all)).toBeUndefined()
  })
})

describe('⭐ ② 保底题：把「手滑」和「真不会」分开', () => {
  /**
   * 同一个「连错 2」不能背两种后果：停止探测误判的代价只是起点低一点，
   * 换年级误判的代价是让她做一整轮低年级的题。
   */
  it('⭐ 连错两题**不直接下探**，先给一道本级最简单的', () => {
    const next = nextProbe('math', 'G2', twoWrongG2)

    expect(next?.phase).toBe('safety')
    expect(next?.gradeLevel, '保底题仍在本级').toBe('G2')
    expect(next?.kpId, '取本级序列里最简单的那个').toBe(G2[0])
  })

  it('⭐ 保底题答对 → 就此结束，绝不下探', () => {
    expect(nextProbe('math', 'G2', [...twoWrongG2, safety(true)])).toBeUndefined()
  })

  it('保底题答错 → 才开始下探', () => {
    expect(nextProbe('math', 'G2', [...twoWrongG2, safety(false)])?.phase).toBe('descend')
  })

  it('⭐ 本级答对过就不出保底题 —— 边界已经在这一级找到了', () => {
    // 对、错、错：连错 2 触发了，但她证明过自己能做这一级
    const results = [probe(G2[0]!, true), probe(G2[1]!, false), probe(G2[2]!, false)]
    expect(nextProbe('math', 'G2', results)).toBeUndefined()
  })
})

describe('⭐ ③ 下探必须倒序', () => {
  const afterSafety = [...twoWrongG2, safety(false)]

  /**
   * 正序下探 = 让她从「数一数」重做。孩子的原话是「像幼儿园小朋友做的题目」，
   * 那是流失前兆——她刚在本年级受挫，紧接着被塞一年前就会的题只会再补一刀。
   */
  it('⭐ 从低一级序列的**末尾**开始，不是开头', () => {
    const next = nextProbe('math', 'G2', afterSafety)

    expect(next?.gradeLevel).toBe('G1')
    expect(next?.kpId, '取一年级最难的那个').toBe(G1[G1.length - 1])
    expect(next?.kpId, '绝不能是最简单的').not.toBe(G1[0])
  })

  it('答错则继续往回（由难到易）', () => {
    const results = [...afterSafety, descend(G1[G1.length - 1]!, false)]
    expect(nextProbe('math', 'G2', results)?.kpId).toBe(G1[G1.length - 2])
  })

  it('⭐ 第一个答对就停 —— 边界找到了，不再往简单处考', () => {
    const results = [...afterSafety, descend(G1[G1.length - 1]!, true)]
    expect(nextProbe('math', 'G2', results)).toBeUndefined()
  })

  it(`最多探 ${MAX_DESCEND_PROBES} 题，再往回已经没有信息量`, () => {
    const results = [...afterSafety]
    for (let i = 0; i < MAX_DESCEND_PROBES; i += 1) {
      results.push(descend(G1[G1.length - 1 - i]!, false))
    }
    expect(nextProbe('math', 'G2', results)).toBeUndefined()
  })

  it('⛔ 只下探一级 —— 不会从 G1 再往下找', () => {
    // G1 已是最低，倒序全错也不该出现第二级下探
    const results = [...afterSafety]
    for (let i = 0; i < MAX_DESCEND_PROBES; i += 1) {
      results.push(descend(G1[G1.length - 1 - i]!, false))
    }
    expect(nextProbe('math', 'G1', results)).toBeUndefined()
  })
})

describe('⭐ 一年级孩子的流程一行都没变', () => {
  /**
   * 这是当前唯一真实在跑的路径（档案年级最高只能设到二年级，而绝大多数
   * 情况是一年级）。加下探之前它是「连错 2 → 停」，加完必须还是这样。
   */
  it('连错两题直接结束，不出保底题、不下探', () => {
    const results = [probe(G1[0]!, false, 'G1'), probe(G1[1]!, false, 'G1')]
    expect(nextProbe('math', 'G1', results)).toBeUndefined()
  })

  it('正常正序走到底', () => {
    expect(nextProbe('math', 'G1', [])?.kpId).toBe(G1[0])
    expect(nextProbe('math', 'G1', [probe(G1[0]!, true, 'G1')])?.kpId).toBe(G1[1])
  })
})

describe('题数与配置边界', () => {
  it(`整场硬上限 ${MAX_PROBE_COUNT} 题 —— 孩子反馈过「怎么还没做完啊」`, () => {
    const many = Array.from({ length: MAX_PROBE_COUNT }, () => probe(G2[0]!, true))
    expect(nextProbe('math', 'G2', many)).toBeUndefined()
  })

  it('最坏路径也不超过硬上限', () => {
    // 本级做满 + 保底 + 下探做满
    const worst = G2.length + 1 + MAX_DESCEND_PROBES
    expect(worst).toBeLessThanOrEqual(MAX_PROBE_COUNT)
  })

  it('没有探测序列的科目直接结束，不抛错', () => {
    expect(nextProbe('pinyin', 'G1', [])).toBeUndefined()
    expect(nextProbe('english', 'G2', [])).toBeUndefined()
  })

  it('没做过图谱的年级直接结束', () => {
    expect(nextProbe('math', 'G5', [])).toBeUndefined()
  })
})
