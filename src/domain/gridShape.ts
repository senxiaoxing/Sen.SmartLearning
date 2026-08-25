/**
 * @file 网格图案 —— 轴对称 · 平移 · 旋转的底层表示
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/components/shape/GridPattern.tsx  画出来
 * @see src/domain/generators/gridMotion.ts   出题
 *
 * ## 为什么用格子而不是自由图形
 *
 * 「向右平移了几格」这个问法要求**移动量是可数的**，自由图形只能说
 * 「移了一点」。轴对称同理：格子对齐让「折过去能不能重合」变成一件
 * 孩子能自己一格一格验证的事，而不是靠眼力判断。
 *
 * ## ⭐ 对称相对于图案自己，不是网格
 *
 * 轴对称是图形自身的性质：一个靠左摆的对称图案，挪到右边还是对称的。
 * 因此判断前先把图案归一化到包围盒左上角，再在**包围盒内**做镜像。
 * 拿网格中心当轴会得出「同一个图案摆在不同位置对称性不同」的荒谬结论。
 */

/** 一个格子的位置，`[列, 行]`，均从 0 起 */
export type Cell = readonly [number, number]

/** 网格边长上限。⚠️ 编码时每个坐标占一位数字，超过 9 会解不出来 */
export const MAX_GRID = 9

const key = (c: Cell): string => `${c[0]},${c[1]}`

/** 按列、再按行排序，让同一组格子有唯一的书写顺序 */
function sorted(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

/** 把图案平移到贴着包围盒左上角 */
export function normalize(cells: readonly Cell[]): Cell[] {
  if (cells.length === 0) return []
  const minC = Math.min(...cells.map((c) => c[0]))
  const minR = Math.min(...cells.map((c) => c[1]))
  return sorted(cells.map((c) => [c[0] - minC, c[1] - minR] as Cell))
}

/** 包围盒的宽与高（格数） */
export function bbox(cells: readonly Cell[]): { w: number; h: number } {
  if (cells.length === 0) return { w: 0, h: 0 }
  const cs = cells.map((c) => c[0])
  const rs = cells.map((c) => c[1])
  return { w: Math.max(...cs) - Math.min(...cs) + 1, h: Math.max(...rs) - Math.min(...rs) + 1 }
}

/** 两组格子是不是同一个图案（与书写顺序无关） */
export function sameShape(a: readonly Cell[], b: readonly Cell[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(normalize(a).map(key))
  return normalize(b).every((c) => setA.has(key(c)))
}

/** 平移 */
export function translate(cells: readonly Cell[], dx: number, dy: number): Cell[] {
  return cells.map((c) => [c[0] + dx, c[1] + dy] as Cell)
}

/** 在包围盒内左右翻（沿竖直轴） */
export function mirrorX(cells: readonly Cell[]): Cell[] {
  const n = normalize(cells)
  const { w } = bbox(n)
  return normalize(n.map((c) => [w - 1 - c[0], c[1]] as Cell))
}

/** 在包围盒内上下翻（沿水平轴） */
export function mirrorY(cells: readonly Cell[]): Cell[] {
  const n = normalize(cells)
  const { h } = bbox(n)
  return normalize(n.map((c) => [c[0], h - 1 - c[1]] as Cell))
}

/**
 * 顺时针转 90°。
 *
 * `[列, 行]` → `[高 - 1 - 行, 列]`：转完宽高互换，因此要重新归一化。
 */
export function rotate90(cells: readonly Cell[]): Cell[] {
  const n = normalize(cells)
  const { h } = bbox(n)
  return normalize(n.map((c) => [h - 1 - c[1], c[0]] as Cell))
}

/** 沿竖直轴对称（左右折过去能重合） */
export function isSymmetricX(cells: readonly Cell[]): boolean {
  return sameShape(cells, mirrorX(cells))
}

/** 沿水平轴对称（上下折过去能重合） */
export function isSymmetricY(cells: readonly Cell[]): boolean {
  return sameShape(cells, mirrorY(cells))
}

/**
 * 编码成 `imageKey` 的一段：每格两位数字，`.` 分隔。
 *
 * @example
 * encodeCells([[0, 0], [1, 0], [1, 1]])   // '00.10.11'
 */
export function encodeCells(cells: readonly Cell[]): string {
  return sorted(cells)
    .map((c) => `${c[0]}${c[1]}`)
    .join('.')
}

/**
 * 解码。格式不对返回 `undefined`——由调用方决定是少画一张图还是报错，
 * ⛔ 绝不能静默产出一个空图案，那会让选项变成一片空白。
 *
 * @example
 * decodeCells('00.10.11')   // [[0,0],[1,0],[1,1]]
 */
export function decodeCells(text: string): Cell[] | undefined {
  if (text.length === 0) return undefined
  const cells: Cell[] = []
  for (const part of text.split('.')) {
    if (!/^\d\d$/.test(part)) return undefined
    cells.push([Number(part[0]), Number(part[1])])
  }
  return cells
}
