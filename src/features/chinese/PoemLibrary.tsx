/**
 * @file 古诗 20 —— 诗单
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
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { POEM_COVERS, POEMS } from '@/data/seed/poems'
import { poemTitleClipKey } from '@/domain/poem'
import { prefetchClips } from '@/platform/speech'

/** 诗单上只预取诗名 —— 全文在点进那一首时才取，20 首的全部句子一次拉完太浪费 */
const TITLE_CLIPS = POEMS.map((poem) => poemTitleClipKey(poem.id))

export function PoemLibrary() {
  const navigate = useNavigate()

  useEffect(() => {
    prefetchClips(TITLE_CLIPS)
  }, [])

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            古诗 20
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <p className="py-3 text-center text-lg text-ink/60">挑一首，我念给你听</p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3"
      >
        {POEMS.map((poem) => (
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
            <span className="text-2xl font-bold text-primary">{poem.title}</span>
            <span className="text-sm text-ink/45">
              {poem.dynasty} · {poem.author}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </AppShell>
  )
}
