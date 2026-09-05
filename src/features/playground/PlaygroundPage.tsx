/**
 * @file 学习乐园 —— 「教」类内容的总入口
 * @layer features
 * @see src/features/playground/playgroundSections.ts  分区与条目
 * @see src/features/home/HomeGates.tsx  首页那扇通往这里的门
 *
 * ## 顶部分区复用识字墙那套动作
 *
 * 她在识字墙和诗单上学会的「按顶上那排按钮换一批」，到这里要能原样再用一次——
 * 所以用的是同一个 {@link VolumePicker}，而不是另写一个长得像的切换条。
 * 三处共用一个组件，间距和选中态才不会在某一处被改出差别，
 * 而那点差别足以让她以为这是另一个不认识的东西。
 *
 * ⚠️ 分区**不落库**：每次进来都从第一个分区开始。
 * 记住上次的选择需要一张用户数据表，还要连带处理导出/导入与 schemaVersion 迁移，
 * 而她翻过去只要一下——与识字墙「选中哪一辑不落库」同一个判断。
 *
 * ## 这一页自己不发声
 *
 * 点分区不朗读（理由同 VolumePicker 文件头：那是「换一批」不是试听），
 * 点条目直接进页面，由那一页自己念。全页没有 `say()`——
 * 「一次只说一句话」在这里的形态是**一句都不说**。
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import {
  DEFAULT_SECTION_ID,
  PLAYGROUND_SECTIONS,
  type PlaygroundEntry,
} from '@/features/playground/playgroundSections'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/playground'

export function PlaygroundPage() {
  const navigate = useNavigate()
  /**
   * ⚠️ 不能用 useState —— 这一页是**所有浏览内容的中转站**，
   * 每进一块（拼音/识字/古诗/写字/短文/字母）都要卸载一次。
   * 用组件状态的话，她从英语分区点进字母乐园、退回来会发现自己在语文分区，
   * 而她的记忆是「我刚才在英语那一格」。
   */
  const sectionId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const section =
    PLAYGROUND_SECTIONS.find((s) => s.id === sectionId) ??
    PLAYGROUND_SECTIONS.find((s) => s.id === DEFAULT_SECTION_ID) ??
    PLAYGROUND_SECTIONS[0]

  return (
    // ⚠️ 限宽走 AppShell 的 `narrow` 而不是给 main 单独加 max-w：
    // 后者只收窄内容、收不到 PageHeader，结果是返回键在左、下面整块右移一百多像素。
    // 页头和内容必须共用同一个容器宽度才对得齐。
    <AppShell width="narrow" layout="stack">
      <PageHeader onBack={() => navigate('/')} title="学习乐园" />

      {/*
        `my-auto` 而不是 `flex-1 justify-center`：分区只有三四格时下面会空一大片，
        居中好看得多；而条目加多之后 my-auto 自己会退化成顶部对齐并正常滚动，
        justify-center 则会把顶部裁掉且滚不上去（见 AppShell 的 `layout` 注释）。
      */}
      <main className="my-auto flex w-full flex-col gap-8">
        {/* 只有一个分区时不显示切换条 —— 多这一层对她是纯粹的干扰
            （同 SubjectPicker、首页年级选择器的出现条件） */}
        {PLAYGROUND_SECTIONS.length > 1 && (
          <VolumePicker
            volumes={PLAYGROUND_SECTIONS.map((s) => ({
              id: s.id,
              name: s.name,
              badge: <Icon name={s.icon} className="h-8 w-8" />,
              hint: s.hint,
            }))}
            activeId={section?.id ?? ''}
            onSelect={(id) => select(PAGE, id)}
          />
        )}

        {/*
          ⭐ 格子宽度**写死**（`w-36`）而不是由文字撑开，这是位置记忆的前提：
          宽度固定后「一行放得下几个」就是确定的，「古诗在第三个」到哪块屏上都成立。
          原来首页那排按钮之所以会漂，正是因为宽度跟着「拼音乐园」「识字」的字数走。

          外层用 wrap + 居中而不是固定列数的 grid：分区里只有一两个条目时
          （英语现在就只有字母乐园），grid 会把那一格死死钉在最左边，看着像没加载完。
        */}
        <div className="flex flex-wrap justify-center gap-4">
          {(section?.entries ?? []).map((entry, i) => (
            <EntryCard
              key={entry.path}
              entry={entry}
              index={i}
              onOpen={() => navigate(entry.path)}
            />
          ))}
        </div>
      </main>
    </AppShell>
  )
}

interface EntryCardProps {
  entry: PlaygroundEntry
  /** 入场动画的序号，逐个错开 */
  index: number
  onOpen: () => void
}

/**
 * 乐园里的一格。大图标在上、名字在下。
 *
 * 方块而不是横向 pill：同样的宽度能摆下更多格，
 * 且图标能画得更大——孩子靠**颜色 + 形状**认路，那两个字是给家长看的。
 */
function EntryCard({ entry, index, onOpen }: EntryCardProps) {
  return (
    <motion.button
      type="button"
      aria-label={entry.label}
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      // 只动 opacity / y / scale（GPU 合成属性），不碰布局属性
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
      whileTap={{ scale: 0.96, y: 4 }}
      className="flex min-h-touch w-36 flex-col items-center justify-center gap-2 rounded-blob bg-surface px-3 py-6 shadow-drop-surface sm:w-40"
      /* 顶部一层本条目主题色的光晕，压在卡片面的微渐变之上 ——
         与首页三张科目卡、两扇门同一个手法，见 playgroundSections 的 `glowVar` */
      style={{
        backgroundImage: `radial-gradient(120% 78% at 50% 0%, rgb(var(${entry.glowVar}) / 0.16), transparent 68%), var(--sf-raised)`,
      }}
    >
      <Icon name={entry.icon} className={`h-12 w-12 ${entry.tint}`} />
      <span className="text-xl font-bold">{entry.label}</span>
    </motion.button>
  )
}
