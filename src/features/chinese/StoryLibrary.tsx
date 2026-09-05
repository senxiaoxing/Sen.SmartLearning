/**
 * @file 短文乐园 —— 短文单，分辑摆开
 * @layer features
 * @see src/data/seed/hanziStories.ts  选篇依据与用字规矩
 * @see src/features/chinese/StoryView.tsx  点进去读的那一篇
 *
 * ## 它是识字墙的下一步
 *
 * 识字 300 学完就到头了，这一页把那些字连成她能读下来的句子——
 * 从「认字」到「**我能读了**」。
 *
 * 与拼音乐园、识字墙、诗单一样：全部可点、没有对错判定、随时可走。
 * ⛔ 不出题、不落 attempts、不记 mastery、不给积分、不进宠物经验。
 *
 * ## ⚠️ 这一页刻意**没有**读过标记与进度
 *
 * 理由与识字墙、诗单完全一致：短文没有题库，就没有「读懂了没有」的客观判据。
 * 打钩只会记录「她点开过哪篇」，而家长会把它读成「这些她都会了」。
 *
 * ⚠️ 但选中哪一辑**要记住**（放在 `browseVolumeStore` 里）：
 * 原先这里写着「每次从第一辑打开也没什么损失」，上机第一次就被推翻——
 * 她点了第三辑、进去一篇、退回来却在第一辑。见那个 store 的文件头。
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import { STORY_VOLUMES } from '@/data/seed/hanziStories'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 兜底用的第一辑。短文是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = STORY_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/stories'

export function StoryLibrary() {
  const navigate = useNavigate()
  // ⚠️ 不能用 useState：返回是导航到另一个路由，组件会卸载，选中的辑随之丢失
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const volume = STORY_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  return (
    <AppShell width="wide" layout="stack">
      {/*
        ⚠️ 回**学习乐园**不是首页：返回键是逐级的 ←。
        用固定路径而不是 navigate(-1)，直接打开这个 hash 时历史里没有上一页，
        -1 会退出 App —— 孩子会看到浏览器界面，而她不识字。
      */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            短文乐园
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      {/* 只有一辑时不摆切换条：一个孤零零的按钮点了也没变化，
          反而像是坏了。加了第二辑它自己就出现了 */}
      {STORY_VOLUMES.length > 1 && (
        <VolumePicker
          volumes={STORY_VOLUMES}
          activeId={volume?.id ?? ''}
          onSelect={(id) => select(PAGE, id)}
        />
      )}

      <p className="py-3 text-center text-lg text-ink/60">这些字你都认得，试着自己读</p>

      <motion.div
        // key 里带上辑：切辑时整片重新挂载，卡片会再入场一次，
        // 那一下动效就是「换了一批」的信号
        key={volume?.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3"
      >
        {volume?.stories.map((story) => (
          <motion.button
            key={story.id}
            type="button"
            aria-label={story.title}
            onClick={() => navigate(`/stories/${story.id}`)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-blob bg-surface px-3 py-4 text-ink shadow-drop-surface"
          >
            <span className="text-4xl leading-none" aria-hidden="true">
              {story.emoji}
            </span>
            <span className="text-2xl font-bold leading-tight text-primary">{story.title}</span>
            {/* 出处给家长看：她只认图和标题 */}
            <span className="text-sm text-ink/45">{story.source}</span>
          </motion.button>
        ))}
      </motion.div>
    </AppShell>
  )
}
