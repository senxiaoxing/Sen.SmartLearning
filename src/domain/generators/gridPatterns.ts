/**
 * @file 网格图案的构造 —— 造对称的、造不对称的、凑齐干扰项
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/gridShape.ts  图案的表示与变换
 * @see src/domain/generators/gridSymmetry.ts   轴对称与对称轴
 * @see src/domain/generators/gridTransform.ts  平移与旋转
 *
 * ## ⭐ 图案是**造**出来的，不是随机撒格子再检查
 *
 * 要一个轴对称图案，就取半边随机、镜像复制——必然对称。
 * 要不对称的，就在对称图案上挪掉一格再确认。
 * 「随机撒完再判断合不合格」在参数收紧时会反复空转，
 * 而重试次数不定就固定不住种子，测试也就锁不住。
 */

import { randomInt, shuffle } from '@/domain/generators/rng'
import {
  bbox,
  encodeCells,
  isSymmetricX,
  mirrorX,
  normalize,
  rotate90,
  type Cell,
} from '@/domain/gridShape'
import type { ItemOption, MisconceptionTag } from '@/domain/types'

/** 网格边长。5 格够摆下 3~4 格宽的图案，再大格子就细得数不清 */
export const GRID = 5

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

/** 一个确定不对称、且转四次都各不相同的 L 形。多处兜底共用 */
export const FALLBACK_L: Cell[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
]

/** 图案能不能摆进网格 */
export function fits(cells: readonly Cell[]): boolean {
  const { w, h } = bbox(cells)
  return w <= GRID && h <= GRID
}

/** 图案的 `imageKey` */
export function patternKey(cells: readonly Cell[]): string {
  return `grid:${GRID}:${encodeCells(cells)}`
}

/**
 * 半边随机、镜像复制 —— 造出来的必然左右对称。
 *
 * @param rng - 注入的随机源
 * @param halfCells - 半边最多几格，镜像后总数约为它的两倍
 *
 * @example
 * makeSymmetric(rng, 2)   // 可能得到 [[0,0],[1,0],[2,0],[3,0]] 这种左右对称的
 */
export function makeSymmetric(rng: () => number, halfCells: number): Cell[] {
  const half: Cell[] = []
  const seen = new Set<string>()
  for (let i = 0; i < halfCells; i++) {
    const c = randomInt(rng, 0, 1)
    const r = randomInt(rng, 0, 2)
    if (seen.has(`${c},${r}`)) continue
    seen.add(`${c},${r}`)
    half.push([c, r])
  }
  // 保证至少有一格，否则镜像出来是空图案
  if (half.length === 0) half.push([0, 0])

  const width = Math.max(...half.map((c) => c[0])) + 1
  const mirrored = half.map((c) => [width * 2 - 1 - c[0], c[1]] as Cell)
  return normalize([...half, ...mirrored])
}

/**
 * 在对称图案上挪掉一格，造出确定不对称的。
 *
 * @example
 * makeAsymmetric(rng, 2)   // 一个左右折过去合不上的图案
 */
export function makeAsymmetric(rng: () => number, halfCells: number): Cell[] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const base = makeSymmetric(rng, halfCells)
    if (base.length < 3) continue
    const dropped = base.filter((_, i) => i !== randomInt(rng, 0, base.length - 1))
    if (!isSymmetricX(dropped) && dropped.length >= 3) return normalize(dropped)
  }
  return FALLBACK_L
}

/**
 * 把干扰图案补到三个。
 *
 * ⭐ 靠**旋转已有的不对称图案**来补：转过来还是不对称，
 * 所以永远不会意外造出第二个正确答案。
 * 随机重掷则可能一直撞车，凑不满就少一个选项。
 *
 * ⚠️ 每一轮都在**上一次的结果**上再转，而不是反复转同一个图案——
 * 后者在撞车时会一直算出同一个值，白白耗光重试次数。
 * 一个基转四次仍不够，就换下一个基：L 形与它的镜像共八个朝向，
 * 补三个绰绰有余。
 */
export function padWrong(wrong: Cell[][], seen: Set<string>): Cell[][] {
  const bases = [wrong.at(-1) ?? FALLBACK_L, FALLBACK_L, mirrorX(FALLBACK_L)]

  for (const base of bases) {
    let cand = base
    for (let turn = 0; turn < 4 && wrong.length < 3; turn++) {
      cand = rotate90(cand)
      const k = encodeCells(cand)
      if (seen.has(k) || !fits(cand)) continue
      seen.add(k)
      wrong.push(cand)
    }
    if (wrong.length >= 3) break
  }
  return wrong
}

/** 把一组图案拼成图片选项，正确的那个混在里面 */
export function toPatternOptions(
  rng: () => number,
  correct: readonly Cell[],
  wrong: readonly (readonly Cell[])[],
  tag: MisconceptionTag,
): ItemOption[] {
  const picked = shuffle(rng, [
    { cells: correct, isCorrect: true, tag: undefined as MisconceptionTag | undefined },
    ...wrong.map((cells) => ({ cells, isCorrect: false, tag })),
  ])

  return picked.map((o, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: patternKey(o.cells),
    imageKey: patternKey(o.cells),
    isCorrect: o.isCorrect,
    ...(o.tag === undefined ? {} : { misconceptionTag: o.tag }),
  }))
}
