/**
 * @file 可拖 / 可点的数字卡 —— 三个拖拽题型共用的原子
 * @layer items
 * @see src/items/usePlacement.ts  它驱动的状态机
 *
 * ⚠️ 不用 HTML5 的 draggable / dragstart：**iOS Safari 完全不支持**，
 * 在 iPad 上会表现为「按住卡片什么也不会发生」。
 * Framer Motion 的 `drag` 走的是 Pointer Events，触摸与鼠标通吃。
 */

import { motion } from 'framer-motion'

interface DragCardProps {
  label: string
  /** 已被放进某个槽 —— 淡出并停用，避免孩子以为还能再拖一次 */
  placed?: boolean
  /** 点选通道里已选中 —— 高亮等待点目标槽 */
  selected?: boolean
  disabled?: boolean
  onTap: () => void
  /** 拖拽松手。返回 `true` 表示落进了某个槽 */
  onDrop: (point: { x: number; y: number }) => boolean
  size?: 'sm' | 'md'
}

const SIZE_CLASS = {
  // 88pt 触控下限见 CLAUDE.md：一年级孩子的手指精度远低于成人
  sm: 'min-h-touch min-w-touch px-3 text-3xl',
  md: 'min-h-touch min-w-[104px] px-5 text-4xl',
}

/**
 * 一张数字卡。同时支持拖拽和点选，两条通道都会走到同一个状态机。
 *
 * 拖失败（没落进任何槽）时 `dragSnapToOrigin` 让它自己弹回原位，
 * **不给任何失败提示**——拖不准是手的问题不是脑子的问题，
 * 在这里加一声错误音效等于因为她手小而惩罚她。
 *
 * @example
 * <DragCard label="7" onTap={() => tapCard(i)} onDrop={(p) => dropAt(i, p)} />
 */
export function DragCard({
  label,
  placed = false,
  selected = false,
  disabled = false,
  onTap,
  onDrop,
  size = 'md',
}: DragCardProps) {
  const inactive = disabled || placed

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={inactive}
      drag={!inactive}
      dragSnapToOrigin
      dragElastic={0.2}
      dragMomentum={false}
      whileDrag={{ scale: 1.15, zIndex: 50 }}
      whileTap={inactive ? undefined : { scale: 0.94 }}
      onDragEnd={(_, info) => onDrop(info.point)}
      onClick={() => {
        if (!inactive) onTap()
      }}
      animate={{ opacity: placed ? 0.25 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        SIZE_CLASS[size],
        'flex touch-none select-none items-center justify-center rounded-blob py-3',
        'font-bold tabular-nums',
        selected
          ? 'bg-primary text-on-primary shadow-drop-primary ring-4 ring-primary/40'
          : 'bg-surface text-ink shadow-drop-surface',
      ].join(' ')}
    >
      {label}
    </motion.button>
  )
}

interface DropSlotProps {
  /** 槽里的内容，空槽传 `null` */
  content: string | null
  /** 槽的说明文字（如「补给 9」）。拆分题需要，排序题不需要 */
  label?: string
  /** 有卡被选中 —— 提示「点我就放进来」 */
  inviting?: boolean
  disabled?: boolean
  onTap: () => void
  registerRef: (el: HTMLElement | null) => void
}

/**
 * 一个放置槽。
 *
 * 空槽时用虚线边框 + 呼吸动画，让「这里可以放东西」不用文字也看得出来
 * （孩子不识字，见 CLAUDE.md UI 约束）。
 */
export function DropSlot({
  content,
  label,
  inviting = false,
  disabled = false,
  onTap,
  registerRef,
}: DropSlotProps) {
  const filled = content !== null

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        ref={registerRef}
        type="button"
        aria-label={label === undefined ? '放置位置' : `放置位置：${label}`}
        disabled={disabled}
        onClick={onTap}
        // 只动 scale（GPU 合成属性），不碰 width/height —— 见 CLAUDE.md 性能规范
        animate={{ scale: inviting && !filled ? [1, 1.06, 1] : 1 }}
        transition={
          inviting && !filled
            ? { duration: 1.1, repeat: Infinity }
            : { type: 'spring', stiffness: 500, damping: 30 }
        }
        className={[
          'flex min-h-touch min-w-touch items-center justify-center rounded-blob px-5 py-3',
          'text-4xl font-bold tabular-nums',
          filled
            ? 'bg-correct/20 text-ink ring-4 ring-correct'
            : 'border-4 border-dashed border-ink/25 bg-surface/40 text-ink/30',
        ].join(' ')}
      >
        {content ?? '?'}
      </motion.button>
      {label !== undefined && <span className="text-base text-ink/50">{label}</span>}
    </div>
  )
}
