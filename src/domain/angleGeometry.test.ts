/**
 * @file 角的几何测试
 * @layer domain
 *
 * 角画歪了在 App 里是看得出来的，但二年级没开放之前根本进不去——
 * 这些断言是唯一的防线。
 *
 * ⭐ 最要紧的是**端点不能跑出画布**：超框会被裁掉半条边，
 * 而那看起来就像「这个角只有一条边」。
 */

import { describe, expect, it } from 'vitest'
import {
  ANGLE_CANVAS,
  ANGLE_VERTEX,
  ARC_RADIUS,
  MAX_ARM,
  angleGeometry,
  arcPath,
  armsPath,
} from '@/domain/angleGeometry'

/** 两点距离 */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** 从顶点看，某点在哪个方向（度，逆时针为正） */
function bearing(vertex: { x: number; y: number }, p: { x: number; y: number }): number {
  const deg = (Math.atan2(vertex.y - p.y, p.x - vertex.x) * 180) / Math.PI
  return (deg + 360) % 360
}

describe('边与弧的长度', () => {
  it('两条边都恰好等于 arm', () => {
    for (const degrees of [30, 60, 90, 120, 150]) {
      for (const arm of [20, 30, 44]) {
        const g = angleGeometry(degrees, arm, 0)
        expect(dist(g.vertex, g.armA), `${degrees}° arm=${arm}`).toBeCloseTo(arm, 6)
        expect(dist(g.vertex, g.armB)).toBeCloseTo(arm, 6)
      }
    }
  })

  it('⭐ 弧的半径固定，不随边长变 —— 它就是「角的大小」本身', () => {
    for (const arm of [20, 30, 44]) {
      const g = angleGeometry(90, arm, 0)
      expect(dist(g.vertex, g.arcA)).toBeCloseTo(ARC_RADIUS, 6)
      expect(dist(g.vertex, g.arcB)).toBeCloseTo(ARC_RADIUS, 6)
    }
  })
})

describe('开口度数', () => {
  it('两条边的夹角恰好等于 degrees', () => {
    for (const degrees of [15, 30, 45, 90, 120, 150, 179]) {
      for (const rotate of [0, 20, 40]) {
        const g = angleGeometry(degrees, 38, rotate)
        const a = bearing(g.vertex, g.armA)
        const b = bearing(g.vertex, g.armB)
        // 两个方向之差归一到 0~180
        const diff = (((b - a) % 360) + 360) % 360
        const between = Math.min(diff, 360 - diff)
        expect(between, `${degrees}° rotate=${rotate}`).toBeCloseTo(degrees, 4)
      }
    }
  })

  it('rotate 只转朝向，不改开口', () => {
    const a = angleGeometry(90, 38, 0)
    const b = angleGeometry(90, 38, 35)
    // 两条边都转了同样的角度，夹角不变
    expect(bearing(a.vertex, a.armB) - bearing(a.vertex, a.armA)).toBeCloseTo(
      bearing(b.vertex, b.armB) - bearing(b.vertex, b.armA),
      4,
    )
  })
})

describe('⭐ 端点不跑出画布', () => {
  it('生成器实际用到的全部取值都落在画布内', () => {
    // 覆盖 angles.ts 的取值范围：度数 15~150、边长 20~44、朝向 0~40
    const outside: string[] = []
    for (let degrees = 15; degrees <= 150; degrees += 5) {
      for (let arm = 20; arm <= MAX_ARM; arm += 4) {
        for (let rotate = 0; rotate <= 40; rotate += 5) {
          const g = angleGeometry(degrees, arm, rotate)
          for (const [name, p] of Object.entries({ armA: g.armA, armB: g.armB })) {
            if (p.x < 0 || p.x > ANGLE_CANVAS || p.y < 0 || p.y > ANGLE_CANVAS) {
              outside.push(`${degrees}°/${arm}/${rotate} 的 ${name} 在 (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`)
            }
          }
        }
      }
    }
    expect(outside.slice(0, 5), '超框会被裁掉半条边，看起来像「只有一条边的角」').toEqual([])
  })

  it('顶点在画布内且不贴边', () => {
    expect(ANGLE_VERTEX.x).toBeGreaterThan(MAX_ARM * 0.2)
    expect(ANGLE_VERTEX.y).toBeGreaterThan(MAX_ARM * 0.2)
    expect(ANGLE_VERTEX.x).toBeLessThan(ANGLE_CANVAS)
    expect(ANGLE_VERTEX.y).toBeLessThan(ANGLE_CANVAS)
  })
})

describe('SVG path', () => {
  it('弧与折线都产出合法的 path 字符串', () => {
    const g = angleGeometry(90, 38, 15)
    expect(arcPath(g)).toMatch(/^M [\d.-]+ [\d.-]+ A 17 17 0 0 0 [\d.-]+ [\d.-]+$/)
    expect(armsPath(g)).toMatch(/^M [\d.-]+ [\d.-]+ L 46 58 L [\d.-]+ [\d.-]+$/)
  })

  it('⭐ 开口相同、边长不同时，弧完全一样 —— 这正是要给孩子看的', () => {
    const short = angleGeometry(90, 22, 10)
    const long = angleGeometry(90, 42, 10)
    expect(arcPath(short)).toBe(arcPath(long))
    expect(armsPath(short)).not.toBe(armsPath(long))
  })
})
