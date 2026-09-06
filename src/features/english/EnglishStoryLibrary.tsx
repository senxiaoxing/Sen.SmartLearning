/**
 * @file 英语短文乐园 —— 短文单，18 篇分 3 辑摆开
 * @layer features
 * @see src/data/seed/englishStories.ts  选篇依据与用词规矩
 * @see src/features/english/EnglishStoryView.tsx  点进去读的那一篇
 *
 * ## 它是短句页的下一步
 *
 * 短句页学完，她会说十八组话，但那些话彼此不相连。
 * 这一页把学过的词连成一小段能从头读到尾的文字——
 * 从「会说几句」到「**我能读了**」，与识字墙之后有短文是同一步。
 *
 * 与拼音乐园、识字墙、诗单一样：全部可点、没有对错判定、随时可走。
 * ⛔ 不出题、不落 attempts、不记 mastery、不给积分、不进宠物经验。
 *
 * ## ⚠️ 这一页刻意**没有**读过标记与进度
 *
 * 理由与识字墙、诗单、语文短文完全一致：短文没有题库，
 * 就没有「读懂了没有」的客观判据。打钩只会记录「她点开过哪篇」，
 * 而家长会把它读成「这些她都会了」。
 *
 * ⚠️ 但选中哪一辑**要记住**（`browseVolumeStore`）：她从第三辑点进一篇、
 * 退回来却在第一辑，这是导航的基本正确性问题。语文短文那边上机时踩过。
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import { ENGLISH_STORY_VOLUMES } from '@/data/seed/englishStories'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 兜底用的第一辑。短文是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = ENGLISH_STORY_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/enstories'

export function EnglishStoryLibrary() {
  const navigate = useNavigate()
  // ⚠️ 不能用 useState：点进一篇是导航，组件卸载后选中的辑就没了
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const volume = ENGLISH_STORY_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  return (
    <AppShell width="wide" layout="stack">
      {/* ⚠️ 回**学习乐园**不是首页，也不用 navigate(-1)——理由见 PhraseLibrary 同处注释 */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            英语短文
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <VolumePicker
        volumes={ENGLISH_STORY_VOLUMES}
        activeId={volume?.id ?? ''}
        onSelect={(id) => select(PAGE, id)}
      />

      <p className="py-3 text-center text-lg text-ink/60">这些词你都学过，试着自己读</p>

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
            aria-label={`${story.titleZh}，${story.title}`}
            onClick={() => navigate(`/enstories/${story.id}`)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-blob bg-surface px-3 py-4 text-ink shadow-drop-surface"
          >
            <span className="text-4xl leading-none" aria-hidden="true">
              {story.emoji}
            </span>
            {/* ⚠️ 中文标题在上、英文在下 —— 与短句页的话题卡同一个理由：
                英文标题她一个字都不认识，拿它当抓手等于让她在一堆卡片里猜 */}
            <span className="text-xl font-bold leading-tight text-primary">{story.titleZh}</span>
            <span className="text-sm text-ink/45">{story.title}</span>
          </motion.button>
        ))}
      </motion.div>
    </AppShell>
  )
}
