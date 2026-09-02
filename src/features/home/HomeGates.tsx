/**
 * @file 首页底部的两扇门 —— 宠物小屋 · 学习乐园
 * @layer features
 * @see src/features/playground/playgroundSections.ts  乐园那扇门后面有什么
 * @see src/features/home/HomePage.tsx  调用方
 *
 * ## 从六个按钮变成两扇门
 *
 * 这里原来是拼音/识字/古诗/字母/讲解/小屋六个并排按钮（`PlayEntries`），
 * 问题不在于它当时多长，而在于**它只能继续变长**：每加一块内容就多一格，
 * 而首页真正的主线（三个科目入口）会被一路挤出第一屏。
 *
 * 现在浏览类内容全部收进学习乐园，这一行**永远只有两格**。
 * 加内容加到乐园的分区里去，首页一格不动。
 *
 * ## 为什么是「门」不是「按钮」
 *
 * 两格都是**一个可以逛的地方**，不是一个功能开关，所以做成大卡片而不是小 pill。
 * 小屋本来就是她最爱去的地方（实测），把它跟「识字」做成一样大是低估了它。
 *
 * ⚠️ 两个图标的轮廓必须截然不同（房子 / 树）：她扫一眼认的是形状，不是那四个字。
 */

import { motion } from 'framer-motion'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/iconPaths'

interface Gate {
  path: string
  label: string
  icon: IconName
  /** 图标配色。⚠️ 两扇门必须用不同色相，形状之外再加一重区分 */
  tint: string
  /**
   * 卡片顶部光晕用的皮肤变量名（`--c-*`）。
   *
   * ⚠️ 存变量名而不是色值：这两扇门用的是**皮肤语义色**，换皮肤时要跟着变
   * （科目卡不同，那里用的是宠物的固定主题色，见 SubjectPicker）。
   */
  glowVar: string
}

/**
 * 两扇门，顺序固定。
 *
 * ⚠️ 小屋在左：它是她实测最常去的地方，而左边是拇指和视线的起点。
 * 顺序**写死**，不要按使用频率重排——位置记忆比省一次点击重要得多。
 */
const GATES: readonly Gate[] = [
  {
    path: '/room',
    label: '宠物小屋',
    icon: 'house',
    tint: 'text-primary-deep',
    glowVar: '--c-primary',
  },
  {
    path: '/playground',
    label: '学习乐园',
    icon: 'tree',
    tint: 'text-correct',
    glowVar: '--c-correct',
  },
]

interface HomeGatesProps {
  /**
   * 打开某扇门。
   *
   * ⚠️ 调用方**必须**在这里面解锁音频（`unlockAllAudio`）：
   * 两扇门后面的内容全都是听的（商品名要念给不识字的孩子听，乐园里每一页都靠朗读），
   * 而 iOS 只认用户手势那一瞬间的调用栈。
   * 见 HomePage 的 `enterSession` 与 design/03-技术方案.md §4.4。
   */
  onOpen: (path: string) => void
}

export function HomeGates({ onOpen }: HomeGatesProps) {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-4">
      {GATES.map((gate, i) => (
        <motion.button
          key={gate.path}
          type="button"
          aria-label={gate.label}
          onClick={() => onOpen(gate.path)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          // 只动 opacity / y / scale（GPU 合成属性），不碰布局属性
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 26 }}
          whileTap={{ scale: 0.96, y: 4 }}
          className="flex min-h-touch flex-col items-center justify-center gap-2 rounded-blob bg-surface px-4 py-6 shadow-drop-surface"
          /* 顶部一层本门主题色的光晕，压在卡片面的微渐变之上。
             ⚠️ 走 `rgb(var(--c-*) / …)` 而不是写死颜色，换皮肤时跟着变 */
          style={{
            backgroundImage: `radial-gradient(120% 78% at 50% 0%, rgb(var(${gate.glowVar}) / 0.16), transparent 68%), var(--sf-raised)`,
          }}
        >
          <Icon name={gate.icon} className={`h-14 w-14 ${gate.tint}`} />
          <span className="text-2xl font-bold">{gate.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
