/**
 * @file 英语短句乐园 —— 话题单，18 个话题分 3 辑摆开
 * @layer features
 * @see src/data/seed/englishPhrases.ts  选篇依据与全部句子
 * @see src/features/english/PhraseView.tsx  点进去看的那一组
 *
 * ## 卡片上是**中文话题名**，英文小字在下
 *
 * 与诗单相反：那边卡片上最大的是诗名（她记的就是「那首鹅鹅鹅」），
 * 而这里的英文名（`Say Hello`）她一个字都不认识——
 * 拿它当抓手等于让她在十八张一样的卡片里猜。
 * 中文名 + 图才是她的索引，英文名放小字是让她**先见一眼**这几个词长什么样。
 *
 * 与拼音乐园、识字墙、诗单一样：全部可点、没有对错判定、随时可走。
 * ⛔ 不出题、不落 attempts、不记 mastery、不给积分、不影响宠物经验。
 *
 * ## ⚠️ 这一页刻意**没有**进度与收藏
 *
 * 理由与识字墙、诗单完全一致：短语没有题库，就没有「会说了没有」的客观判据，
 * 星标只会记录「她点过哪个话题」，而家长会把它读成「这些她都会说了」。
 *
 * ⚠️ 但选中哪一辑**要记住**（`browseVolumeStore`）：她从第三辑点进一个话题，
 * 返回时理应还在第三辑。这是导航的基本正确性，不是「记住偏好」。
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import { PHRASE_VOLUMES } from '@/data/seed/englishPhrases'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 兜底用的第一辑。话题单是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = PHRASE_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/phrases'

export function PhraseLibrary() {
  const navigate = useNavigate()
  // ⚠️ 不能用 useState：点进一个话题是导航，组件卸载后选中的辑就没了
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const volume = PHRASE_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  return (
    <AppShell width="wide" layout="stack">
      {/*
        ⚠️ 回**学习乐园**不是首页（首页 → 乐园 → 这一页）：返回键是逐级的 ←。
        用固定路径而不是 `navigate(-1)`：直接打开这个 hash 时历史里没有上一页，
        `-1` 会退出 App —— 孩子会看到浏览器界面，而她不识字。
      */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            英语短句
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <VolumePicker
        volumes={PHRASE_VOLUMES}
        activeId={volume?.id ?? ''}
        countLabel="6 组话"
        onSelect={(id) => select(PAGE, id)}
      />

      <p className="py-3 text-center text-lg text-ink/60">挑一组，跟我一起说</p>

      <motion.div
        // ⭐ key 里带上辑：切辑时整片重新挂载，六张卡会再入场一次。
        // 那一下动效就是「换了一批」的信号，比任何文字提示都直接
        key={volume?.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3"
      >
        {volume?.topics.map((topic) => (
          <motion.button
            key={topic.id}
            type="button"
            aria-label={`${topic.title}，${topic.titleEn}`}
            onClick={() => navigate(`/phrases/${topic.id}`)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-blob bg-surface px-3 py-4 text-ink shadow-drop-surface"
          >
            <span className="text-4xl leading-none" aria-hidden="true">
              {topic.emoji}
            </span>
            <span className="text-2xl font-bold leading-tight text-primary">{topic.title}</span>
            {/* 英文名给家长看，也让她先见一眼这几个词长什么样 */}
            <span className="text-sm text-ink/45">{topic.titleEn}</span>
          </motion.button>
        ))}
      </motion.div>
    </AppShell>
  )
}
