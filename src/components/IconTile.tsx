/**
 * @file 拟物图标底座 —— 把线描图标装进一块有厚度的彩色牌子
 * @layer components  无业务逻辑
 * @see src/components/Icon.tsx   装进来的图标本身
 * @see src/styles/tokens.css     --c-*-deep 与这套阴影语言的定义
 * @see design/09-竞品借鉴.md §9  为什么要做这一层
 *
 * ## 为什么要这一层
 *
 * `Icon` 是单色线描（stroke 2.2、`currentColor`），在正文和小按钮里正合适；
 * 但当图标是一个**入口的主角**时——首页那两扇门、乐园的分区——
 * 一根绿线撑不起「这是一个可以去的地方」。
 * 竞品对比里差距最刺眼的恰恰是这类位置：人家那一排是有厚度的彩色牌子，
 * 我们是一根线。
 *
 * 这一层**不引入任何美术资源**：底座只由斜向渐变 + 实心厚度边 + 环境投影 +
 * 顶部内高光拼成，与 tokens.css 里按钮用的是同一套语言，换皮肤自动跟着变。
 *
 * ⚠️ 只给**入口级**图标用。列表项、行内提示继续用裸 `Icon`——
 * 满屏都是彩色方块的时候，它就不再表示「这里重要」了。
 */

import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/iconPaths'

/**
 * 底座配色。
 *
 * ⚠️ 只接受在 tokens.css 里**同时**定义了 `--c-x`、`--c-x-deep` 与 `--c-on-x`
 * 的语义色。`info` / `accent` 只有主值，没有后两者——传进来会得到一块
 * 没有厚度、且图标颜色不可控的平色块，所以类型上直接不给这个机会。
 */
export type IconTileTone = 'primary' | 'correct' | 'alert'

/** ⚠️ 必须是静态完整类名：Tailwind 扫的是源码里的字符串，`text-on-${tone}` 扫不到，
 *  拼出来的类名在产物里根本不存在，图标会退回继承色。 */
const TONE_TEXT: Record<IconTileTone, string> = {
  primary: 'text-on-primary',
  correct: 'text-on-correct',
  alert: 'text-on-alert',
}

interface IconTileProps {
  name: IconName
  tone: IconTileTone
  /** 底座尺寸类，如 `h-20 w-20` */
  className?: string
  /** 图标尺寸类。占底座一半左右最像一枚 App 图标，太大会撑满显得闷 */
  iconClassName?: string
}

/**
 * 拟物图标底座：一块带厚度的彩色牌子，图标压在正中。
 *
 * @param name - 图标名，见 {@link IconName}
 * @param tone - 底座配色，跟随当前皮肤
 * @param className - 底座尺寸类
 * @param iconClassName - 图标尺寸类
 *
 * @example
 * <IconTile name="house" tone="primary" className="h-20 w-20" iconClassName="h-11 w-11" />
 */
export function IconTile({
  name,
  tone,
  className = 'h-20 w-20',
  iconClassName = 'h-10 w-10',
}: IconTileProps) {
  const base = `--c-${tone}`
  const deep = `--c-${tone}-deep`

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-card ${TONE_TEXT[tone]} ${className}`}
      style={{
        backgroundImage: `linear-gradient(158deg, rgb(var(${base})) 0%, rgb(var(${deep})) 100%)`,
        /* 三层各司其职：实心边给「侧面」，环境投影给高度，内高光给「受光」。
           ⚠️ 内高光在这里写死而**不取** `var(--sh-inner)`：清晨草地把它设成了
           `none`（白卡片加内高光会显得像塑料），而 `none` 混进 box-shadow 列表
           会让整条声明**静默失效**，底座会连厚度边一起丢掉。
           彩色底座和白卡片是两回事——一块彩色的牌子顶上有光，三套皮肤下都成立。 */
        boxShadow: `0 4px 0 rgb(var(${deep})), 0 8px 14px -6px rgb(var(${deep}) / 0.5), inset 0 2px 0 rgb(255 255 255 / 0.3)`,
      }}
    >
      <Icon name={name} className={iconClassName} />
    </span>
  )
}
