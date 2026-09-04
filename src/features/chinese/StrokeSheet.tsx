/**
 * @file 笔顺演示浮层 —— 这个字怎么写，一遍一遍地写给她看
 * @layer features
 * @see src/components/TianGrid.tsx  田字格与描画动画
 * @see src/features/chinese/StrokeWall.tsx  从写字墙点进来
 *
 * ## 为什么是浮层而不是一页
 *
 * 写字墙已经是第三层（首页 → 乐园 → 写字），再开一页就是第四层，
 * 撞 CLAUDE.md「浏览三层」的上限。浮层不占层级，关掉就回到原来的位置——
 * 她刚才滚到哪一组，回来还在哪一组。
 *
 * ## ⭐ 这一屏只有三样东西：字、跟随图、拼音组词
 *
 * 没有「再写一遍」按钮，因为**它本来就在一遍一遍地写**：
 * 一轮写完停一下，接着从头再来。她没看清就等下一遍，
 * 这比让她先认出一个按钮、再点它要自然得多——而且那个按钮占的地方，
 * 正好是笔画该有的地方。
 *
 * 也没有喇叭和关闭按钮：**点田字格就念这个字**（不打断动画），
 * 点窗外任何地方就关掉。
 *
 * ⚠️ 代价是「点外面能关」这件事她得有人告诉一次。取舍是刻意的：
 * 这一屏的全部注意力应该在那个字上。
 *
 * ## ⭐ 底下那排是笔顺跟随，不是序号
 *
 * 试过把序号标在田字格里每一笔的起点上，**压着笔画**，而这一屏要看的正是笔画本身。
 * 改成课本与字帖的通行画法：一排小格，第 k 格画到第 k 笔，最新那笔标色。
 *
 * ⚠️ 这排图**不写「横竖撇捺」那些字**——一年级孩子不识字，那串文字对她是纯噪音。
 * ⚠️ 它在**第一遍写完时浮现，之后一直留着**：后面每一轮重写都不再收走，
 * 否则她的眼睛要跟着一个忽有忽无的东西跑。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { TianGrid } from '@/components/TianGrid'
import { hanziClipKey, hanziSpokenText, type HanziCard, type StrokeOrder } from '@/domain/hanzi'
import { say, stopSpeech } from '@/platform/speech'
import { totalDuration, strokeTimings } from '@/domain/strokeTiming'
import { useHoldToSlow } from '@/platform/useHoldToSlow'

/**
 * 浮层入场动画放完要多久（毫秒）。
 *
 * ⚠️ 写字必须等窗开完再开始：窗还在放大时就动笔，**起笔那一下**
 * 会连着窗口一起缩放着划过去，而那正是笔顺里最要看清的部分。
 * 与下面 `motion.div` 的 spring 参数配套，改动画参数要一起调。
 */
const OPEN_MS = 420

/** 一遍写完之后停多久再从头写。够她看清最后一笔落在哪儿，又不至于以为播完了 */
const LOOP_PAUSE_MS = 1100

interface StrokeSheetProps {
  card: HanziCard
  order: StrokeOrder
  onClose: () => void
}

export function StrokeSheet({ card, order, onClose }: StrokeSheetProps) {
  /** 写第几遍。⭐ 0 = 还没开始（等窗开完），之后每加一次就从头写一遍 */
  const [round, setRound] = useState(0)
  /** 第一遍写完了没有。⚠️ 一旦为 true 就不再变回去，见文件头 */
  const [everFinished, setEverFinished] = useState(false)

  const cycleMs = useMemo(() => totalDuration(strokeTimings(order.medians)), [order])

  /**
   * 笔顺跟随图。⭐ 缓存住：它的内容从头到尾不变，而这个组件**每一轮循环都会重渲染**
   * （`round` 在变）。不缓存的话，11 笔的字每轮要重建 11 个田字格、66 个 path 的
   * JSX 再让 React diff 一遍——这一屏对渲染开销已经证明很敏感了。
   */
  const followers = useMemo(
    () =>
      order.strokes.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          // ⚠️ 别再调小：44px 时 11 笔的字（黄、黑）在格子里糊成一团，
          //    而这排图的用处正是「这一笔加在哪儿」
          className="w-[52px] rounded-lg bg-surface-2 p-0.5"
        >
          <TianGrid strokes={order.strokes} upTo={i + 1} highlightLast className="w-full" />
        </motion.div>
      )),
    [order],
  )

  const utteranceOf = () => ({
    parts: [hanziClipKey(card.char)],
    fallbackText: hanziSpokenText(card),
  })
  const { holdProps, consumeHold } = useHoldToSlow(utteranceOf)

  // 等窗开完再动笔
  useEffect(() => {
    const timer = window.setTimeout(() => setRound(1), OPEN_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // 写完 → 亮出跟随图 → 停一下 → 从头再写
  useEffect(() => {
    if (round === 0) return
    const done = window.setTimeout(() => setEverFinished(true), cycleMs)
    const next = window.setTimeout(() => setRound((n) => n + 1), cycleMs + LOOP_PAUSE_MS)
    return () => {
      window.clearTimeout(done)
      window.clearTimeout(next)
    }
  }, [round, cycleMs])

  // ⚠️ 关掉时要停朗读，不然这个字会一路念到墙上去
  useEffect(() => () => stopSpeech(), [])

  // 键盘 / 读屏的退路：没有 ✕ 按钮，Esc 得管用
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="button"
      tabIndex={-1}
      aria-label="关闭"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        // 点内容区不关闭——她会去点田字格听读音
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.char}，${card.pinyin}，${card.word}`}
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-blob bg-surface p-4 shadow-drop-surface"
      >
        {/* 拼音与组词是这一屏仅有的两处文字，家长会照着念，做得清楚些 */}
        <div className="flex w-full items-baseline justify-between px-1">
          <span className="text-xl font-bold tabular-nums text-ink/70">{card.pinyin}</span>
          <span className="text-xl font-bold text-ink/70">{card.word}</span>
        </div>

        {/* 点田字格 = 念这个字，⚠️ 不打断书写；长按 = 慢速念，与识字卡一致 */}
        <button
          type="button"
          aria-label={`${card.char}，点一下听读音`}
          {...holdProps}
          onClick={() => {
            if (consumeHold()) return
            say(utteranceOf())
          }}
          className="w-full max-w-[300px] select-none touch-manipulation [-webkit-touch-callout:none]"
        >
          <TianGrid
            strokes={order.strokes}
            medians={order.medians}
            grid
            playToken={round}
            className="w-full"
          />
        </button>

        {/* 笔顺跟随。第一遍写完才浮现，此后一直留着 */}
        <div className="flex min-h-[56px] w-full flex-wrap justify-center gap-1.5">
          {everFinished && followers}
        </div>
      </motion.div>
    </motion.div>
  )
}
