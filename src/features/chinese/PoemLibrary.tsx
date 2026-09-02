/**
 * @file 古诗乐园 —— 诗单，60 首分 3 辑摆开
 * @layer features
 * @see src/data/seed/poems.ts  选篇依据与全文
 * @see src/features/chinese/PoemView.tsx  点进去看的那一首
 *
 * ## 诗单上显示的是**诗名**，不是第一句
 *
 * 一年级孩子记住一首诗的抓手是「那首鹅鹅鹅」——诗名比首句更接近她的记忆索引。
 * 每张卡上再放一个图，让不识字的她也能凭图找回昨天读过的那首。
 *
 * 与拼音乐园、识字墙一样：全部可点、没有对错、随时可走。
 *
 * ## ⭐ 为什么要分辑，而不是一片排下去
 *
 * 她把前 20 首都听熟之后要加诗。如果直接往后接，新的那些会排在滚过两屏之后——
 * **她点开的永远是第一排那几首**，而那正是「像幼儿园小朋友做的题目」
 * 那句话的另一种形态（见 CLAUDE.md 产品红线）。
 *
 * 分辑之后每一辑仍是 20 首，一屏半翻完，
 * 而顶部那两个新按钮本身就是「这里有你没听过的诗」的信号。
 * 切换条与识字墙共用同一个组件，连按钮上的 1️⃣2️⃣3️⃣ 都是同一套——
 * 她在那边已经学会这个动作了，到这里不必再学一次。
 *
 * ## ⚠️ 这一页刻意**没有**进度与收藏
 *
 * 理由与识字墙完全一致（见 `HanziWall.tsx`）：古诗没有题库，
 * 就没有「背下来了没有」的客观判据，星标只会记录「她点过哪首」。
 * 选中哪一辑同样**不落库**——记住上次的选择需要一张新的用户数据表，
 * 而每次从第一辑打开也没什么损失，翻过去只要一下。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { VolumePicker } from '@/components/VolumePicker'
import { POEM_COVERS, POEM_VOLUMES } from '@/data/seed/poems'
import { poemTitleClipKey } from '@/domain/poem'
import { prefetchClips } from '@/platform/speech'

/** 兜底用的第一辑。诗单是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = POEM_VOLUMES[0]

export function PoemLibrary() {
  const navigate = useNavigate()
  const [volumeId, setVolumeId] = useState(FIRST_VOLUME?.id ?? '')

  const volume = POEM_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  /**
   * 诗单上**只预取当前这一辑的诗名**。
   *
   * 全文在点进那一首时才取（见 `PoemView.tsx`）：60 首的全部句子一次拉完
   * 是两百多条，在 iPad 上会卡一下，而她一次停留里根本翻不完一辑。
   */
  const titleClips = useMemo(
    () => volume?.poems.map((poem) => poemTitleClipKey(poem.id)) ?? [],
    [volume],
  )

  useEffect(() => {
    prefetchClips(titleClips)
  }, [titleClips])

  return (
    <AppShell width="wide" layout="stack">
      {/*
        ⚠️ 回**学习乐园**不是首页：这一页现在挂在乐园里（首页 → 乐园 → 诗单），
        返回键是逐级的 ←，一下跳回首页会把中间那层吃掉。

        ⚠️ 用固定路径而不是 `navigate(-1)`：直接打开这个 hash 时
        （刷新、Service Worker 更新后重载）历史里没有上一页，
        `-1` 会退出 App —— 孩子会看到浏览器界面或空白页，而她不识字。
      */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            古诗乐园
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <VolumePicker
        volumes={POEM_VOLUMES}
        activeId={volume?.id ?? ''}
        countLabel="20 首诗"
        onSelect={setVolumeId}
      />

      <p className="py-3 text-center text-lg text-ink/60">挑一首，我念给你听</p>

      <motion.div
        // ⭐ key 里带上辑：切辑时整片重新挂载，二十张卡会再入场一次。
        // 那一下动效就是「换了一批新诗」的信号，比任何文字提示都直接
        key={volume?.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3"
      >
        {volume?.poems.map((poem) => (
          <motion.button
            key={poem.id}
            type="button"
            aria-label={`${poem.title}，${poem.dynasty}，${poem.author}`}
            onClick={() => navigate(`/poems/${poem.id}`)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-blob bg-surface px-3 py-4 text-ink shadow-drop-surface"
          >
            <span className="text-4xl leading-none" aria-hidden="true">
              {POEM_COVERS[poem.id] ?? '📜'}
            </span>
            {/* ⚠️ 长诗名要小一号。第三辑有「九月九日忆山东兄弟」这样的九字诗名，
                一律 text-2xl 会折成三行、把这一格撑得比旁边高出一截，
                整片卡就参差不齐了 */}
            <span
              className={[
                'font-bold leading-tight text-primary',
                poem.title.length >= 7 ? 'text-xl' : 'text-2xl',
              ].join(' ')}
            >
              {poem.title}
            </span>
            <span className="text-sm text-ink/45">
              {poem.dynasty} · {poem.author}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </AppShell>
  )
}
