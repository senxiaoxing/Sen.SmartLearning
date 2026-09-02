/**
 * @file 学习乐园的分区与条目 —— 「教」类内容的唯一目录
 * @layer features  纯导航配置，无业务逻辑
 * @see src/features/playground/PlaygroundPage.tsx  渲染它的页面
 * @see src/features/home/HomeGates.tsx  首页那扇通往这里的门
 *
 * ## 为什么这些内容不再摆在首页
 *
 * 它们原来是首页底部一排按钮，加一块内容就往下长一截，
 * 而首页真正的主线（三个科目入口）会被一路挤出第一屏。
 * 收进乐园之后，**首页高度恒定**：以后加内容只往某个分区里加，首页一格不动。
 *
 * 代价是浏览类内容多一层（首页 → 乐园 → 拼音）。这是刻意放开的，
 * 见 CLAUDE.md UI 约束「主线两层，浏览三层」。
 *
 * ## 这里每一页的共同点：**不绑在答题流程里**
 *
 * 全部可点（没学到的也能听）· 没有对错判定 · 随时可走。
 * 不出题、不落 attempts、不记 mastery、不给积分、不影响宠物经验。
 * 见 CLAUDE.md 产品红线「语文三块是『教』不是『练』」。
 */

import type { IconName } from '@/components/iconPaths'

/** 乐园里的一个去处 */
export interface PlaygroundEntry {
  path: string
  label: string
  icon: IconName
  /**
   * 图标配色。⚠️ 孩子靠**颜色 + 形状**认路，不靠那两个字。
   *
   * 同一分区内的颜色必须两两不同；跨分区可以重复——她一次只看得到一个分区，
   * 而分区之间的区别由顶部那一排标签承担。
   */
  tint: string
  /**
   * 卡片顶部光晕用的皮肤变量名（`--c-*`），**与 `tint` 同色**。
   *
   * ⭐ 光晕把颜色识别从那个小图标扩到整张卡：几张同样的白卡片摆在一起时，
   * 24px 的图标是唯一的区别，而她是扫一眼就要认出来的。
   * 与首页三张科目卡、两扇门是同一个手法。
   *
   * ⚠️ 存变量名而不是色值 —— 这些是皮肤语义色，换皮肤要跟着变。
   */
  glowVar: string
}

/**
 * 一个分区。顶部一排标签，一次只摆一个分区的内容。
 *
 * ⚠️ 分区**按内容类别分，不按科目分**。早先想过用三只宠物头像作标签
 * （宠物即标签，孩子认形象不认字），但那样第四个分区就无处安放了——
 * 「活动区」这类东西不属于任何一只宠物。
 */
export interface PlaygroundSection {
  id: string
  /** 「语文」这类分区名，家长看的；孩子认的是 `icon` */
  name: string
  /** ⭐ 孩子真正认的东西。⚠️ 不要与分区内条目的图标撞脸，见 iconPaths 的 `bookshelf` */
  icon: IconName
  /** 这个分区装了什么，家长看的一句话（也进读屏文本） */
  hint: string
  entries: readonly PlaygroundEntry[]
}

/**
 * 全部分区，顺序固定。
 *
 * ⚠️ 顺序与分区内条目顺序都**写死**，不要按使用频率重排。
 * 孩子记的是「古诗在第三个」这种位置记忆，入口自己动来动去
 * 比多点一次严重得多——与 `SUBJECT_ORDER` 写死是同一个道理。
 *
 * ⭐ **加内容 = 往某个分区末尾追加，或新开一个分区**。
 * 追加在中间会把她已经记住的位置整体推移一格，那正是上面这条要避免的事。
 */
export const PLAYGROUND_SECTIONS: readonly PlaygroundSection[] = [
  {
    id: 'chinese',
    name: '语文',
    icon: 'bookshelf',
    hint: '拼音、识字、古诗',
    entries: [
      {
        path: '/pinyin',
        label: '拼音乐园',
        icon: 'pinyin',
        // ⚠️ 别改回 primary：清晨草地皮肤下 primary(#3B7F62) 与 correct(#3E9B72)
        //    对比度只有 1.4:1（tokens.css 已登记的已知代价），拼音和识字两张卡
        //    会变成同一个绿。答题反馈那里有星星/文案/音效补偿，
        //    而这里四张卡并排，**颜色就是主要的区分手段**。
        //    accent 同时是语文小飞龙墨墨的主题色，拼音用它正好。
        tint: 'text-accent',
        glowVar: '--c-accent',
      },
      { path: '/hanzi', label: '识字', icon: 'hanzi', tint: 'text-correct', glowVar: '--c-correct' },
      { path: '/poems', label: '古诗', icon: 'poem', tint: 'text-alert', glowVar: '--c-alert' },
    ],
  },
  {
    id: 'english',
    name: '英语',
    icon: 'globe',
    hint: '字母',
    entries: [
      {
        path: '/letters',
        label: '字母乐园',
        icon: 'letters',
        tint: 'text-info',
        glowVar: '--c-info',
      },
    ],
  },
]

/** 默认落在哪个分区。第一个，不做「记住上次」——她每次进来看到的东西要一样 */
export const DEFAULT_SECTION_ID = PLAYGROUND_SECTIONS[0]?.id ?? 'chinese'
