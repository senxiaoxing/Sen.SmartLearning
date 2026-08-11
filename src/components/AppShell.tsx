/**
 * @file 页面外壳 —— 背景装饰层 / 安全区 / 桌面舞台布局
 * @layer components  无业务逻辑
 * @see src/styles/tokens.css  `--deco` 背景装饰的定义
 *
 * ## 桌面端为什么不是「把手机布局拉宽」
 *
 * 答题区的宽度在任何屏幕上都**保持不变**：孩子的视线扫描距离是固定的，
 * 题干在 27 寸屏上摊成一行两米宽，只会让她读得更慢。
 * 宽屏多出来的空间给侧栏放宠物陪伴，而不是拉伸内容。
 *
 * 侧栏从 `xl`(1280) 才出现：`lg`(1024, iPad 横屏) 时主区居中已经占掉大半，
 * 再塞侧栏会和内容打架。
 */

import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  /**
   * 宽屏侧栏内容（宠物、今日进度这类陪伴信息）。
   * ⚠️ 只能放**重复的、可有可无的**信息——窄屏下它整个不渲染，
   * 放了唯一入口的话手机上就再也点不到了。
   */
  aside?: ReactNode
  /** narrow 用于答题（680px 是一行算式最舒服的宽度），wide 用于首页与报告 */
  width?: 'narrow' | 'wide'
  /**
   * center：内容垂直居中，内容变多时自动改为顶部对齐并滚动（用 my-auto 而非
   * justify-center —— 后者在内容超高时会把顶部裁掉且滚不上去）。
   * stack：内容撑满，由调用方自己排 header / main / footer。
   */
  layout?: 'center' | 'stack'
  className?: string
}

const WIDTH_CLASS: Record<'narrow' | 'wide', string> = {
  narrow: 'max-w-[680px]',
  wide: 'max-w-[900px]',
}

/**
 * 所有页面的根容器。
 *
 * @param aside - 宽屏侧栏，窄屏不渲染
 * @param width - 主内容限宽档位
 * @param layout - 主内容纵向排布方式
 *
 * @example
 * <AppShell width="narrow" layout="stack" aside={<PetCompanion />}>
 *   <header>…</header>
 *   <main className="flex-1">…</main>
 * </AppShell>
 */
export function AppShell({
  children,
  aside,
  width = 'wide',
  layout = 'center',
  className = '',
}: AppShellProps) {
  return (
    <div className="relative flex h-full flex-col">
      {/* 背景装饰。fixed 而非 absolute：滚动时星空/柔光不该跟着页面走，
          它是舞台背景不是页面内容。纯 CSS 渐变，不产生重绘压力 */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-deco" />

      {aside !== undefined && (
        <aside className="absolute left-8 top-1/2 z-10 hidden w-[260px] -translate-y-1/2 flex-col items-center gap-5 xl:flex">
          {aside}
        </aside>
      )}

      <div
        className={`safe-area relative z-10 flex flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6 ${className}`}
      >
        <div
          className={[
            'mx-auto flex w-full flex-col',
            WIDTH_CLASS[width],
            layout === 'center' ? 'my-auto' : 'flex-1',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
