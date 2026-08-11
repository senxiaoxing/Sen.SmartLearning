/**
 * @file 字母乐园 —— 26 张字母卡的收集墙，英语的第一站
 * @layer features
 * @see src/data/seed/englishLetters.ts  卡面内容
 * @see design/01-知识点图谱.md §5 E1 字母
 *
 * ## 为什么英语从这里开始，而不是直接做题
 *
 * 字母是英语里**唯一有边界、可数、可收集**的东西：26 个，学完就是学完。
 * 问候语、颜色这些学完了孩子说不清「我学到哪了」，
 * 而一面墙上的 26 张卡，亮了几张一眼就看得见。
 *
 * ## 三条体验约束（与 Explainer 同源）
 *
 * 1. **全部可点** —— 没学到的字母也能翻能听。这是「教」不是「练」，
 *    任何锁都会挡住她玩，而玩本身就是这一页存在的理由
 * 2. **没有对错判定** —— 乱点、反复点、只挑喜欢的点，都不该有任何评价
 * 3. **随时可走** —— 顶部返回一直在
 *
 * 高亮圈只表示「这一组已经开始学了」，是**信息不是门槛**。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LETTER_CARDS } from '@/data/seed/englishLetters'
import { loadMasteryMap } from '@/data/repositories/masteryRepo'
import { prefetchClips } from '@/platform/speech'
import { useSessionStore } from '@/stores/sessionStore'
import { LetterCard } from '@/features/english/LetterCard'

/** 已经开始学的状态。`available` 不算——那只是「解锁了」，她还没碰过 */
const LEARNED_STATES = new Set(['learning', 'mastered', 'review'])

/** 本页会用到的全部语音片段 —— 26 条，进页面就一次性预取 */
const LETTER_CLIPS = LETTER_CARDS.map((card) => card.clipKey)

export function LetterWall() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  const [learnedKpIds, setLearnedKpIds] = useState<ReadonlySet<string>>(new Set())

  /**
   * ⭐ 一进页面就把 26 条字母音频全部预取。
   *
   * 不预取的话每张卡都是首点现加载现解码，孩子连着翻就会排队——
   * 实测反馈是「L 及后面的字母发音有延迟」。
   * 这与当初「有的数字没读出来」同源，解法也一样（见 platform/speech.ts）。
   */
  useEffect(() => {
    prefetchClips(LETTER_CLIPS)
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

  const learnedCount = LETTER_CARDS.filter((card) => learnedKpIds.has(card.kpId)).length

  const toggle = (upper: string) =>
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(upper)) next.delete(upper)
      else next.add(upper)
      return next
    })

  return (
    // ⚠️ 整页滚动而不是「头部固定 + 卡片区内部滚动」：
    // 26 张大卡在 iPad 上必然超过一屏，让整页跟着手指走才是孩子熟悉的手感，
    // 内部滚动区在触屏上还容易和卡片点击抢手势
    <div className="safe-area h-full overflow-y-auto px-4 py-4">
      <header className="flex items-center justify-between px-2">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/')}
          className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-ink/5 text-2xl"
        >
          ←
        </button>
        <span className="rounded-full bg-grape/15 px-4 py-2 text-lg font-bold text-grape">
          字母乐园
        </span>
        {/* 占位，让标题真正居中 */}
        <span className="h-[64px] w-[64px]" />
      </header>

      <p className="py-3 text-center text-lg text-ink/60">
        {learnedCount > 0 ? (
          <>
            已经认识 <span className="font-bold tabular-nums text-honey">{learnedCount}</span> 个字母
          </>
        ) : (
          '点一下卡片，听听它是谁'
        )}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        // 固定每排 4 张：再多就得把卡片缩小，而字形本身是这一页要看清的东西
        className="grid grid-cols-4 gap-4 pb-6"
      >
        {LETTER_CARDS.map((card) => (
          <LetterCard
            key={card.upper}
            card={card}
            flipped={flipped.has(card.upper)}
            learned={learnedKpIds.has(card.kpId)}
            onFlip={toggle}
          />
        ))}
      </motion.div>
    </div>
  )
}
