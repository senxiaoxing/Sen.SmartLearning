/**
 * @file 网格图案 —— M2-10 图形的运动
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/gridShape.ts  图案的表示与变换
 *
 * 画一张浅色网格，把图案的格子涂上颜色。
 *
 * ⭐ **网格线必须画出来**：平移题问的是「移了几格」，
 * 没有格子她就只能说「移了一点」。网格是这道题的量尺。
 */

import { decodeCells, type Cell } from '@/domain/gridShape'

const CELL = 18
const PAD = 4
const GRID_LINE = '#D9D2C2'
const FILL = '#FFB84D'
const FILL_LINE = '#A8681A'
/** 平移题里「原来的位置」用它，虚线空心，与实心的新位置区分 */
const GHOST_LINE = '#B9AE97'

interface GridPatternProps {
  size: number
  cells: readonly Cell[]
  /** 平移前的位置。给了就画成虚线空心 */
  ghost?: readonly Cell[]
  displaySize?: number
}

/**
 * 一张网格加上面的图案。
 *
 * @example
 * <GridPattern size={5} cells={[[0,0],[1,0],[1,1]]} />
 */
export function GridPattern({ size, cells, ghost, displaySize = 150 }: GridPatternProps) {
  const span = size * CELL + PAD * 2

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      width={displaySize}
      height={displaySize}
      role="img"
      aria-label="方格纸上的图形"
    >
      {/* 网格线 */}
      {Array.from({ length: size + 1 }, (_, i) => (
        <g key={i}>
          <line
            x1={PAD + i * CELL}
            y1={PAD}
            x2={PAD + i * CELL}
            y2={PAD + size * CELL}
            stroke={GRID_LINE}
            strokeWidth={1}
          />
          <line
            x1={PAD}
            y1={PAD + i * CELL}
            x2={PAD + size * CELL}
            y2={PAD + i * CELL}
            stroke={GRID_LINE}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* 平移前的位置：虚线空心，让「从哪儿移到哪儿」一眼可见 */}
      {ghost?.map(([c, r]) => (
        <rect
          key={`g${c}-${r}`}
          x={PAD + c * CELL + 1}
          y={PAD + r * CELL + 1}
          width={CELL - 2}
          height={CELL - 2}
          fill="none"
          stroke={GHOST_LINE}
          strokeWidth={1.5}
          strokeDasharray="3 2"
          rx={2}
        />
      ))}

      {/* 图案本体 */}
      {cells.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={PAD + c * CELL + 1}
          y={PAD + r * CELL + 1}
          width={CELL - 2}
          height={CELL - 2}
          fill={FILL}
          stroke={FILL_LINE}
          strokeWidth={1.5}
          rx={2}
        />
      ))}
    </svg>
  )
}

/**
 * 从 `imageKey` 的两种格式渲染。
 *
 * - `grid:<边长>:<格子>` 一个图案
 * - `gridpair:<边长>:<原位置>:<新位置>` 平移前后
 *
 * 解不出来返回 `null` 而不是抛错——一道题里混进坏 key 应该表现为
 * 「少了一张图」，而不是整个答题页白屏。
 */
export function GridPatternFromKey({
  family,
  a,
  b,
  c,
  size,
}: {
  family: string
  a?: string
  b?: string
  c?: string
  size?: number
}) {
  const span = Number(a)
  if (!Number.isFinite(span) || b === undefined) return null

  const cells = decodeCells(b)
  if (cells === undefined) return null

  if (family === 'gridpair') {
    const moved = c === undefined ? undefined : decodeCells(c)
    if (moved === undefined) return null
    return <GridPattern size={span} cells={moved} ghost={cells} displaySize={size} />
  }

  return <GridPattern size={span} cells={cells} displaySize={size} />
}
