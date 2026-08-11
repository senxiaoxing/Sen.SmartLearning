/**
 * @file 十格阵（ten frame）—— 数感可视化的基础组件
 * @layer components  纯渲染，无业务逻辑
 *
 * 十格阵是国际通用的数感教具：2×5 的格子让「凑十」变成看得见的事——
 * 孩子不需要理解抽象的进位规则，只要看到「十格还空 1 个」就懂了。
 *
 * 讲解动画和拖拽凑十题型共用这个组件，保证同一个概念在「教」和「练」时
 * 呈现方式完全一致。孩子在讲解里看到的和自己动手做的是同一套视觉语言。
 */

import { motion } from 'framer-motion'

const FRAME_CAPACITY = 10
const CELLS_PER_ROW = 5

export type TenFrameEmphasis = 'none' | 'frame' | 'gap' | 'loose'

interface TenFrameProps {
  /** 格内已填充的点数，0~10 */
  filled: number
  /** 强调部位：`gap` 会让空位闪烁提示「还差几个」 */
  emphasis?: TenFrameEmphasis
  size?: 'sm' | 'md'
}

const DOT_SIZE = { sm: 'h-7 w-7', md: 'h-10 w-10' }
const CELL_SIZE = { sm: 'h-9 w-9', md: 'h-12 w-12' }

/**
 * 渲染一个十格阵。
 *
 * 点的进出用 Framer Motion 的 `layout` 动画，
 * 从散点飞入格子的过程是连续的，孩子能看清「这一个是从哪来的」。
 *
 * @example
 * <TenFrame filled={9} emphasis="gap" />   // 9 个点 + 闪烁的空位
 */
export function TenFrame({ filled, emphasis = 'none', size = 'md' }: TenFrameProps) {
  const count = Math.max(0, Math.min(FRAME_CAPACITY, filled))

  return (
    <div
      className={[
        'grid grid-cols-5 gap-1 rounded-2xl border-4 p-2',
        emphasis === 'frame' ? 'border-primary bg-primary/10' : 'border-ink/15 bg-surface/60',
      ].join(' ')}
      style={{ gridTemplateRows: `repeat(${FRAME_CAPACITY / CELLS_PER_ROW}, minmax(0, 1fr))` }}
      aria-label={`十格阵，已放入 ${count} 个`}
    >
      {Array.from({ length: FRAME_CAPACITY }, (_, i) => {
        const occupied = i < count
        const isGap = !occupied && emphasis === 'gap'

        return (
          <div
            key={i}
            className={[
              CELL_SIZE[size],
              'flex items-center justify-center rounded-lg',
              isGap ? 'bg-primary/20' : 'bg-ink/5',
            ].join(' ')}
          >
            {occupied && (
              <motion.span
                layout
                layoutId={`frame-dot-${i}`}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`${DOT_SIZE[size]} rounded-full bg-info`}
              />
            )}
            {isGap && (
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={`${DOT_SIZE[size]} rounded-full border-4 border-dashed border-primary`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface LooseDotsProps {
  count: number
  emphasis?: boolean
  size?: 'sm' | 'md'
  /** 点的颜色语义。`take` 用于标记「即将被拿走」的那些 */
  tone?: 'default' | 'take'
}

/**
 * 十格阵旁边的散点组，表示还没进格子的数量。
 *
 * @example
 * <LooseDots count={5} emphasis />
 */
export function LooseDots({
  count,
  emphasis = false,
  size = 'md',
  tone = 'default',
}: LooseDotsProps) {
  return (
    <div
      className={[
        'flex max-w-[180px] flex-wrap items-center justify-center gap-2 rounded-2xl p-2',
        emphasis ? 'bg-alert/10 ring-4 ring-alert/30' : '',
      ].join(' ')}
      aria-label={`还有 ${count} 个`}
    >
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <motion.span
          key={i}
          layout
          layoutId={`loose-dot-${i}`}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className={[
            DOT_SIZE[size],
            'rounded-full',
            tone === 'take' ? 'bg-alert' : 'bg-correct',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
