/**
 * @file 首页底部的自由入口 —— 五个「随时可来玩」的地方
 * @layer features
 * @see src/features/home/HomePage.tsx  调用方
 *
 * ## 这几个入口的共同点：**不绑在答题流程里**
 *
 * 拼音乐园、识字、古诗、字母乐园都是「教」不是「练」——
 * 全部可点、没有对错判定、随时可走（见各页面的文件头）。
 * 看讲解同理：它是唯一的求助入口，任何时候都该在。
 *
 * 所以它们排在「开始学习」之后：**先给她主线，再给她可以逛的地方**。
 * 反过来的话，一个还没决定要做什么的孩子会一直在这几个入口之间打转。
 *
 * ⚠️ 抽成独立组件是因为 `HomePage` 已经顶到 200 行的上限，
 * 而这一块内聚得很干净：它只做一件事——把人送到某个自由页面去。
 */

import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/iconPaths'

interface PlayEntry {
  path: string
  label: string
  icon: IconName
  /**
   * 图标配色。⚠️ 孩子靠**颜色 + 形状**认路，不靠那两个字。
   *
   * 主题只有五个语义色（primary / correct / alert / info / accent），
   * 第六个入口只能用 `primary-deep`。这里可以接受重复色相，是因为
   * 房子的轮廓在这六个图标里独一无二——没有第二个东西长得像它，
   * 形状那一半的区分度足够扛住颜色那一半的妥协。
   */
  tint: string
}

/**
 * 六个入口，顺序固定：语文三块 → 英语 → 讲解 → 小屋。
 *
 * ⚠️ 顺序**写死**，不要按使用频率重排。孩子记的是「古诗在第三个」这种
 * 位置记忆，入口自己动来动去比多点一次严重得多——
 * 与 `SUBJECT_ORDER` 写死是同一个道理。
 *
 * ⚠️ 小屋是后加的，因此**只能追加在末尾**：加在中间会把她已经记住的
 * 五个位置整体推移一格，那正是上面这条要避免的事。
 * 它不属于「教」也不属于「练」，但符合这几个入口真正的共同点——
 * 随时可来、随时可走、不绑在答题流程里。
 */
const ENTRIES: readonly PlayEntry[] = [
  { path: '/pinyin', label: '拼音乐园', icon: 'pinyin', tint: 'text-primary' },
  { path: '/hanzi', label: '识字', icon: 'hanzi', tint: 'text-correct' },
  { path: '/poems', label: '古诗', icon: 'poem', tint: 'text-alert' },
  { path: '/letters', label: '字母乐园', icon: 'letters', tint: 'text-info' },
  { path: '/explain', label: '看讲解', icon: 'bulb', tint: 'text-accent' },
  { path: '/room', label: '宠物小屋', icon: 'house', tint: 'text-primary-deep' },
]

interface PlayEntriesProps {
  /**
   * 打开某个页面。
   *
   * ⚠️ 调用方**必须**在这里面解锁音频（`unlockAllAudio`）：
   * 这五页的全部内容都是听的，而 iOS 只认用户手势那一瞬间的调用栈。
   * 见 HomePage 的 `enterSession` 与 design/03-技术方案.md §4.4。
   */
  onOpen: (path: string) => void
}

export function PlayEntries({ onOpen }: PlayEntriesProps) {
  return (
    // 换行居中：五个按钮在手机上排不下一行，让它自然折成两行，
    // 而不是把按钮缩小 —— 触控区不能低于 88pt
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {ENTRIES.map((entry) => (
        <BigButton
          key={entry.path}
          tone="neutral"
          className="px-5 py-4 text-xl sm:px-6"
          onClick={() => onOpen(entry.path)}
        >
          <Icon name={entry.icon} className={`h-7 w-7 ${entry.tint}`} />
          <span>{entry.label}</span>
        </BigButton>
      ))}
    </div>
  )
}
