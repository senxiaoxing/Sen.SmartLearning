/**
 * @file 英语词汇乐园 —— 180 个词，分 3 辑摆开
 * @layer features
 * @see src/data/seed/englishWordCards.ts  选词依据、分辑理由与卡面内容
 * @see src/features/chinese/HanziWall.tsx  识字墙，这一页处处对标它
 *
 * ## 它是英语区的识字墙
 *
 * 与拼音乐园、字母乐园、识字墙同一类：「有边界、可数、摆得满一屏」的收集墙，
 * 180 个词学完就是学完。三条体验约束照旧——全部可点、没有对错、随时可走。
 *
 * ## ⚠️ 这一页刻意**没有**进度与收藏
 *
 * 理由与识字墙完全一致：在没有词汇题库、无法自动判定「认识了没有」之前，
 * 星标只能靠她自己点，那记录的是「她点过什么」而不是「她认识什么」，
 * 反而会让家长误读。
 *
 * 想加进度的话，正确的顺序是先有词汇题库（产出 mastery），再让这面墙读 mastery，
 * 与拼音乐园的高亮圈完全一致。
 *
 * ⚠️ 但选中哪一辑**要记住**（`browseVolumeStore`）：那是导航的基本正确性，
 * 与「跨会话记住偏好」是两件事。识字墙那边的注释还停在旧结论上，别照抄。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import { WORD_VOLUMES } from '@/data/seed/englishWordCards'
import { englishCardClipKey } from '@/domain/englishCard'
import { prefetchClips } from '@/platform/speech'
import { WordCard } from '@/features/english/WordCard'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 兜底用的第一辑。词表是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = WORD_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/words'

export function WordWall() {
  const navigate = useNavigate()
  // ⚠️ 不能用 useState：离开这一页组件就卸载，再进来会退回第一辑，
  //    而她记的是自己刚翻到哪一辑
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const volume = WORD_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  /**
   * ⭐ 只预取**当前这一辑**的 60 条，不是全部 180 条。
   *
   * 理由与识字墙、字母乐园一样：按需加载时孩子连着点会排队，
   * 表现为「后面的词有延迟」；而 180 条一次性解码会在 iPad 上卡一下，
   * 何况她一次停留里几乎不会翻完三辑。
   */
  const clipKeys = useMemo(
    () =>
      volume?.groups.flatMap((group) => group.cards.map((card) => englishCardClipKey(card.word))) ??
      [],
    [volume],
  )

  useEffect(() => {
    prefetchClips(clipKeys)
  }, [clipKeys])

  return (
    <AppShell width="wide" layout="stack">
      {/* ⚠️ 回**学习乐园**不是首页（首页 → 乐园 → 这一页）：返回键是逐级的 ←，
          而 `navigate(-1)` 在直接打开 hash 时会退出 App */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            英语词汇
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <VolumePicker
        volumes={WORD_VOLUMES}
        activeId={volume?.id ?? ''}
        countLabel="60 个词"
        onSelect={(id) => select(PAGE, id)}
      />

      <p className="py-3 text-center text-lg text-ink/60">点一下词，听听它念什么</p>

      <div className="flex flex-col gap-6 pb-6">
        {volume?.groups.map((group, index) => (
          <motion.section
            // ⭐ key 里带上辑：切辑时整片重新挂载，六组卡会再错开入场一次。
            // 那一下动效就是「换了一批新词」的信号，比任何文字提示都直接
            key={`${volume.id}-${group.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // 逐组错开入场，上限 0.2s —— 再久孩子会觉得页面卡住了
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 24,
              delay: Math.min(index * 0.04, 0.2),
            }}
            className="rounded-blob bg-surface/60 p-3 sm:p-4"
          >
            <h2 className="flex items-center gap-2 px-1 pb-3 text-xl font-bold">
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.name}</span>
              <span className="ml-auto text-base font-normal tabular-nums text-ink/40">
                {group.cards.length} 个
              </span>
            </h2>

            {/* ⚠️ 每排 2 张（宽屏 3 张），比识字墙少一张：英文词比汉字长得多，
                `watermelon` 按识字墙那样一排 3~4 张会被压成两行 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.cards.map((card) => (
                <WordCard key={card.word} card={card} />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </AppShell>
  )
}
