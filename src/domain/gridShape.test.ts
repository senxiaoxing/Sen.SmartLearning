/**
 * @file 网格图案的变换测试
 * @layer domain
 *
 * ⭐ 对称判断相对于**图案自己的包围盒**，不是网格：
 * 一个靠左摆的对称图案，挪到右边还是对称的。
 * 拿网格中心当轴会得出「同一个图案摆在不同位置对称性不同」的荒谬结论。
 */

import { describe, expect, it } from 'vitest'
import {
  bbox,
  decodeCells,
  encodeCells,
  isSymmetricX,
  isSymmetricY,
  mirrorX,
  mirrorY,
  normalize,
  rotate90,
  sameShape,
  translate,
  type Cell,
} from '@/domain/gridShape'

/** 一个 T 形：左右对称，上下不对称 */
const T_SHAPE: Cell[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [1, 1],
]

/** 一个 L 形：两个方向都不对称 */
const L_SHAPE: Cell[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
]

describe('归一化与包围盒', () => {
  it('归一化把图案贴到左上角', () => {
    expect(normalize(translate(T_SHAPE, 3, 2))).toEqual(normalize(T_SHAPE))
  })

  it('包围盒是图案的实际宽高', () => {
    expect(bbox(T_SHAPE)).toEqual({ w: 3, h: 2 })
    expect(bbox(L_SHAPE)).toEqual({ w: 2, h: 3 })
  })

  it('sameShape 与摆放位置和书写顺序无关', () => {
    expect(sameShape(T_SHAPE, translate(T_SHAPE, 4, 1))).toBe(true)
    expect(sameShape(T_SHAPE, [...T_SHAPE].reverse())).toBe(true)
    expect(sameShape(T_SHAPE, L_SHAPE)).toBe(false)
  })
})

describe('⭐ 对称相对于图案自己，不是网格', () => {
  it('T 形左右对称、上下不对称', () => {
    expect(isSymmetricX(T_SHAPE)).toBe(true)
    expect(isSymmetricY(T_SHAPE)).toBe(false)
  })

  it('L 形两个方向都不对称', () => {
    expect(isSymmetricX(L_SHAPE)).toBe(false)
    expect(isSymmetricY(L_SHAPE)).toBe(false)
  })

  it('⭐ 挪到网格别处，对称性不变', () => {
    for (const [dx, dy] of [
      [3, 0],
      [0, 2],
      [2, 2],
    ]) {
      const moved = translate(T_SHAPE, dx!, dy!)
      expect(isSymmetricX(moved), `挪到 (${dx},${dy}) 后不该改变对称性`).toBe(true)
      expect(isSymmetricY(moved)).toBe(false)
    }
  })

  it('正方形两个方向都对称', () => {
    const square: Cell[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    expect(isSymmetricX(square)).toBe(true)
    expect(isSymmetricY(square)).toBe(true)
  })
})

describe('变换', () => {
  it('翻两次回到原样', () => {
    expect(sameShape(mirrorX(mirrorX(L_SHAPE)), L_SHAPE)).toBe(true)
    expect(sameShape(mirrorY(mirrorY(L_SHAPE)), L_SHAPE)).toBe(true)
  })

  it('转四次回到原样', () => {
    expect(sameShape(rotate90(rotate90(rotate90(rotate90(L_SHAPE)))), L_SHAPE)).toBe(true)
  })

  it('转一次与转两次不同 —— L 形没有旋转对称', () => {
    expect(sameShape(rotate90(L_SHAPE), L_SHAPE)).toBe(false)
    expect(sameShape(rotate90(rotate90(L_SHAPE)), rotate90(L_SHAPE))).toBe(false)
  })

  it('转 90° 后宽高互换', () => {
    const before = bbox(L_SHAPE)
    const after = bbox(rotate90(L_SHAPE))
    expect(after.w).toBe(before.h)
    expect(after.h).toBe(before.w)
  })

  it('格子数量在任何变换下都不变', () => {
    for (const t of [mirrorX, mirrorY, rotate90]) {
      expect(t(L_SHAPE)).toHaveLength(L_SHAPE.length)
    }
  })

  it('⭐ 转不对称的图案，转出来还是不对称 —— 补干扰项靠的就是这条', () => {
    let p = L_SHAPE
    for (let i = 0; i < 4; i++) {
      p = rotate90(p)
      expect(isSymmetricX(p), `转 ${(i + 1) * 90}° 后变对称了`).toBe(false)
    }
  })
})

describe('编解码', () => {
  it('编码后再解码得到同一个图案', () => {
    for (const shape of [T_SHAPE, L_SHAPE]) {
      const back = decodeCells(encodeCells(shape))
      expect(back).toBeDefined()
      expect(sameShape(back!, shape)).toBe(true)
    }
  })

  it('编码与书写顺序无关 —— 同一个图案只有一种写法', () => {
    expect(encodeCells(T_SHAPE)).toBe(encodeCells([...T_SHAPE].reverse()))
  })

  it('坏格式返回 undefined，不静默产出空图案', () => {
    expect(decodeCells('')).toBeUndefined()
    expect(decodeCells('0')).toBeUndefined()
    expect(decodeCells('00.1')).toBeUndefined()
    expect(decodeCells('ab')).toBeUndefined()
  })
})
