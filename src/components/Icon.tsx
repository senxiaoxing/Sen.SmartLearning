/**
 * @file 图标 —— 渲染 iconPaths 里的路径
 * @layer components  无业务逻辑
 * @see src/components/iconPaths.ts  路径数据与「为什么不用 emoji」
 *
 * 尺寸与颜色全部由外部 class 控制（`h-7 w-7 text-primary`），
 * 组件自己不定尺寸——同一个图标在按钮里和在标题里该有不同大小。
 */

import { ICON_PATHS, type IconName } from '@/components/iconPaths'

interface IconProps {
  name: IconName
  /** 尺寸与颜色。颜色走 `currentColor`，所以给 `text-*` 就能上色 */
  className?: string
}

/**
 * 内联 SVG 图标。始终 `aria-hidden`——图标从不承担语义，
 * 语义在包裹它的按钮的 `aria-label` 上（孩子不识字，读屏和语音提示靠那个）。
 *
 * @param name - 图标名，见 {@link ICON_PATHS}
 * @param className - Tailwind 类，至少要给尺寸
 *
 * @example
 * <Icon name="bulb" className="h-7 w-7 text-accent" />
 */
export function Icon({ name, className = 'h-6 w-6' }: IconProps) {
  const def = ICON_PATHS[name]
  const filled = 'filled' in def && def.filled === true

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={def.d} />
    </svg>
  )
}
