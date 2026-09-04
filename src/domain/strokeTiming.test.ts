import { describe, expect, it } from 'vitest'
import { strokeTimings, totalDuration, type StrokeMedian } from '@/domain/strokeTiming'

/** 一条水平中线，长度 = `len` */
const line = (len: number): StrokeMedian => [
  [0, 0],
  [len, 0],
]

describe('strokeTimings', () => {
  it('空输入返回空数组', () => {
    expect(strokeTimings([])).toEqual([])
    expect(totalDuration([])).toBe(0)
  })

  it('⭐ 短笔画比长笔画快 —— 这是整个模块存在的理由', () => {
    const [dot, stroke] = strokeTimings([line(40), line(600)])
    expect(dot!.duration).toBeLessThan(stroke!.duration)
  })

  it('第一笔从 0 开始，后一笔等前一笔写完再起笔', () => {
    const timings = strokeTimings([line(300), line(300), line(300)])
    expect(timings[0]!.delay).toBe(0)
    for (let i = 1; i < timings.length; i += 1) {
      const prev = timings[i - 1]!
      expect(timings[i]!.delay).toBeGreaterThan(prev.delay + prev.duration)
    }
  })

  it('等长的笔画时长相同', () => {
    const timings = strokeTimings([line(200), line(200)])
    expect(timings[0]!.duration).toBe(timings[1]!.duration)
  })

  it('⚠️ 极短的「点」不会短到看不见（有下限）', () => {
    // 一个点混在四条长横里，按比例算会掉到 60ms 上下
    const timings = strokeTimings([line(5), line(800), line(800), line(800), line(800)])
    expect(timings[0]!.duration).toBeGreaterThanOrEqual(280)
  })

  it('⚠️ 中线长度为零也不产出 NaN（数据坏了时别把动画搞崩）', () => {
    const timings = strokeTimings([[[0, 0]], [[5, 5]]])
    for (const t of timings) {
      expect(Number.isFinite(t.delay)).toBe(true)
      expect(Number.isFinite(t.duration)).toBe(true)
    }
  })

  it('折线按实际路径长度算，不是首末直线距离', () => {
    // 两条中线首末点相同，但第二条绕了一圈 —— 它应该画得更久
    const straight: StrokeMedian = [
      [0, 0],
      [100, 0],
    ]
    const bent: StrokeMedian = [
      [0, 0],
      [50, 300],
      [100, 0],
    ]
    const [a, b] = strokeTimings([straight, bent])
    expect(b!.duration).toBeGreaterThan(a!.duration)
  })

  it('totalDuration 不含末尾停顿', () => {
    const timings = strokeTimings([line(300), line(300)])
    const last = timings[1]!
    expect(totalDuration(timings)).toBe(last.delay + last.duration)
  })
})
