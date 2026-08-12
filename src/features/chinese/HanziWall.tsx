/**
 * @file 识字 100 —— 一年级最先认的 100 个字，分 10 组摆开
 * @layer features
 * @see src/data/seed/hanziCards.ts  选字依据与卡面内容
 *
 * ## 与拼音乐园、字母乐园是同一类页面
 *
 * 都是「有边界、可数、摆得满一屏」的收集墙：100 个字学完就是学完。
 * 三条体验约束照旧——全部可点、没有对错、随时可走。
 *
 * ## ⚠️ 这一页刻意**没有**进度与收藏
 *
 * 参考里的识字应用会给每个字挂「今日 1/5」和收藏星标，这里没做，
 * 因为那需要一张新的用户数据表，而新表要连带处理导出/导入与
 * `schemaVersion` 迁移（见 design/02-数据库Schema.md）。
 * 在没有题库、无法自动判定「认识了没有」之前，那个星标只能靠她自己点——
 * 那记录的是「她点过什么」，不是「她认识什么」，反而会让家长误读。
 *
 * 想加的话，正确的顺序是先有识字题库（产出 mastery），再让这面墙读 mastery，
 * 与拼音乐园的高亮圈完全一致。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { ALL_HANZI_CARDS, HANZI_GROUPS } from '@/data/seed/hanziCards'
import { hanziClipKey } from '@/domain/hanzi'
import { prefetchClips } from '@/platform/speech'
import { HanziCard } from '@/features/chinese/HanziCard'

/** 本页会用到的全部语音片段 —— 100 条，进页面就一次性预取 */
const HANZI_CLIPS = ALL_HANZI_CARDS.map((card) => hanziClipKey(card.char))

export function HanziWall() {
  const navigate = useNavigate()

  /**
   * ⭐ 一进页面就把 100 条音频全部预取，理由同字母乐园：
   * 按需加载时孩子连着点会排队，表现为「后面的字有延迟」。
   * 见 platform/speech.ts 的 prefetchClips。
   */
  useEffect(() => {
    prefetchClips(HANZI_CLIPS)
  }, [])

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            识字 100
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <p className="py-3 text-center text-lg text-ink/60">点一下字，听听它念什么</p>

      <div className="flex flex-col gap-6 pb-6">
        {HANZI_GROUPS.map((group, index) => (
          <motion.section
            key={group.id}
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

            {/* 每排 3 张（宽屏 4 张）：字号是这一页的主角，排太密就看不清笔画了 */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {group.cards.map((card) => (
                <HanziCard key={card.char} card={card} />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </AppShell>
  )
}
