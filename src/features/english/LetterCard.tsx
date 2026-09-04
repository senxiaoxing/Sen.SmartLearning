/**
 * @file 字母卡 —— 正面字母、背面首字母单词，点一下翻过来
 * @layer features
 * @see src/data/seed/englishLetters.ts  卡面内容
 * @see src/features/english/LetterWall.tsx  26 张卡的墙
 *
 * 翻转只用 `rotateY`（GPU 合成属性），不碰 width/height/top/left ——
 * 26 张卡同屏，任何触发 layout 的动画都会在 iPad 上掉帧。
 *
 * ⚠️ 点一下就翻 + 朗读，**没有"答对/答错"**。
 * 这是「教」的环节不是「练」：孩子可以乱点、反复点、只挑喜欢的点，
 * 不该有任何判定。判定留给后面的题。
 */

import { motion } from 'framer-motion'
import { say } from '@/platform/speech'
import { useHoldToSlow } from '@/platform/useHoldToSlow'
import type { LetterCard as LetterCardData } from '@/data/seed/englishLetters'
import type { Utterance } from '@/domain/speech'

interface LetterCardProps {
  card: LetterCardData
  flipped: boolean
  /** 这个字母所在的一组是否已经开始学了，用于给卡片加一圈高亮 */
  learned: boolean
  onFlip: (upper: string) => void
}

/** 背面朝外时要藏住正面，Tailwind 3 没有这个 utility，只能内联 */
const BACKFACE_HIDDEN = { backfaceVisibility: 'hidden' as const }

export function LetterCard({ card, flipped, learned, onFlip }: LetterCardProps) {
  /** 按住会慢一档。英语发音是教学内容本身，听不清那个音就学不对 */
  const utteranceOf = (): Utterance => ({
    parts: [card.clipKey],
    fallbackText: card.sentence,
    lang: 'en-US',
  })
  const { holdProps, consumeHold } = useHoldToSlow(utteranceOf)

  return (
    <button
      type="button"
      // 读出字母而不是「按钮」：VoiceOver 下也该听到内容本身
      aria-label={`${card.upper}，${card.wordZh}`}
      {...holdProps}
      onClick={() => {
        // ⚠️ 长按只是想听慢一点，不该顺手把卡翻过去
        if (consumeHold()) return
        // ⭐ 每次点击都朗读，包括翻回正面时 —— 她可能只是想再听一遍
        say(utteranceOf())
        onFlip(card.upper)
      }}
      // 一年级的触控下限是 88pt（成人 44pt），这里远超——
      // 卡片是这一页的主角，大到能一眼看清字形本身。
      // select-none 那一串是为了长按不被 iOS 的系统菜单抢走
      className="min-h-[170px] select-none touch-manipulation [perspective:600px] [-webkit-touch-callout:none]"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative h-full w-full"
      >
        <Face
          style={BACKFACE_HIDDEN}
          className={
            learned
              ? 'bg-surface text-ink ring-4 ring-primary shadow-drop-surface'
              : 'bg-surface text-ink shadow-drop-surface'
          }
        >
          {/*
            ⭐ 大小写拆成两个字排开，不写成挤在一起的「Aa」。
            这一页要教的正是「这两个形状是同一个字母」——
            贴在一起时 `Aa` 看着像一个整体的图案，
            分开才看得出是**两个各自独立的字形**。
          */}
          <span className="flex items-baseline gap-3 text-6xl font-bold leading-none">
            <span>{card.upper}</span>
            <span>{card.upper.toLowerCase()}</span>
          </span>
        </Face>

        <Face
          style={{ ...BACKFACE_HIDDEN, transform: 'rotateY(180deg)' }}
          // 高亮圈跟着翻过来：翻个面就不算「已学」了会很奇怪
          className={`bg-info/15 text-ink shadow-drop-surface ${
            learned ? 'ring-4 ring-primary' : ''
          }`}
        >
          <span className="text-6xl leading-none">{card.emoji}</span>
          <span className="text-xl font-bold">{card.word}</span>
          <span className="text-base opacity-60">{card.wordZh}</span>
        </Face>
      </motion.div>
    </button>
  )
}

/** 卡片的一面。两面绝对定位叠在一起，靠 backface 决定谁可见 */
function Face({
  className,
  style,
  children,
}: {
  className: string
  style: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      style={style}
      className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-blob ${className}`}
    >
      {children}
    </div>
  )
}
