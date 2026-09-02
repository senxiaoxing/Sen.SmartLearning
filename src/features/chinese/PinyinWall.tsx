/**
 * @file 拼音乐园 —— 63 张声母韵母卡的墙，语文的第一站
 * @layer features
 * @see src/data/seed/pinyinChart.ts  卡面内容与分组
 * @see design/01-知识点图谱.md §4 汉语拼音
 *
 * ## 为什么拼音也需要一面「墙」
 *
 * 与字母乐园同一个道理（见 LetterWall 文件头）：拼音是**有边界、可数、能摆满一屏**
 * 的东西——23 个声母、24 个韵母、16 个整体认读，学完就是学完。
 * 而拼音题库里的「拼读」「辨析」学到哪了，孩子自己说不清；
 * 一面按课本顺序摆开的墙，她能指着说「这些我都会念了」。
 *
 * ## 三条体验约束（学习乐园里每一页都适用）
 *
 * 1. **全部可点** —— 没学到的组照样能听。这是「教」不是「练」
 * 2. **没有对错判定** —— 乱点、反复点、只点喜欢的，都不该有任何评价
 * 3. **随时可走** —— 顶部返回一直在
 *
 * 高亮圈只表示「这一组已经开始学了」，是**信息不是门槛**。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { loadMasteryMap } from '@/data/repositories/masteryRepo'
import { ALL_CHART_CARDS, PINYIN_CHART } from '@/data/seed/pinyinChart'
import { prefetchClips } from '@/platform/speech'
import { useSessionStore } from '@/stores/sessionStore'
import { PinyinCard } from '@/features/chinese/PinyinCard'

/** 已经开始学的状态。`available` 不算——那只是「解锁了」，她还没碰过 */
const LEARNED_STATES = new Set(['learning', 'mastered', 'review'])

/** 本页会用到的全部语音片段 —— 63 条，进页面就一次性预取 */
const CHART_CLIPS = ALL_CHART_CARDS.map((card) => card.clipKey)

export function PinyinWall() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const [learnedKpIds, setLearnedKpIds] = useState<ReadonlySet<string>>(new Set())

  /**
   * ⭐ 一进页面就把 63 条音频全部预取。
   *
   * 与字母乐园完全相同的理由：不预取的话每张卡都是首点现加载现解码，
   * 孩子连着点就会排队，听起来就是「后面的字母有延迟」。
   * 见 platform/speech.ts 的 prefetchClips。
   */
  useEffect(() => {
    prefetchClips(CHART_CLIPS)
  }, [])

  useEffect(() => {
    if (profileId === null) return
    void loadMasteryMap(profileId).then((map) => {
      const learned = new Set<string>()
      for (const [kpId, mastery] of map) {
        if (LEARNED_STATES.has(mastery.state)) learned.add(kpId)
      }
      setLearnedKpIds(learned)
    })
  }, [profileId])

  return (
    // 整页滚动而不是「头部固定 + 内部滚动」：六组卡片必然超过一屏，
    // 让整页跟着手指走才是孩子熟悉的手感（与字母乐园一致）
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            拼音乐园
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <p className="py-3 text-center text-lg text-ink/60">点一下卡片，听听它怎么念</p>

      <div className="flex flex-col gap-6 pb-6">
        {PINYIN_CHART.map((group, index) => (
          <motion.section
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // 逐组错开一点点入场。⚠️ 上限 0.2s——再久孩子会觉得页面卡住了
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: Math.min(index * 0.04, 0.2) }}
            className="rounded-blob bg-surface/60 p-3 sm:p-4"
          >
            <h2 className="flex items-center gap-2 px-1 pb-3 text-xl font-bold">
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.name}</span>
              <span className="ml-auto text-base font-normal tabular-nums text-ink/40">
                {group.cards.length} 个
              </span>
            </h2>

            {/* 每排 4 张：再多就得把卡片缩小，而字形是这一页要看清的东西 */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {group.cards.map((card) => (
                <PinyinCard
                  key={card.form}
                  card={card}
                  learned={group.kpIds.some((kpId) => learnedKpIds.has(kpId))}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </AppShell>
  )
}
