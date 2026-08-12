/**
 * @file 识字卡 —— 一个字，点一下听「天。蓝天的天。」
 * @layer features
 * @see src/data/seed/hanziCards.ts  卡面内容
 * @see src/domain/hanzi.ts  朗读文本怎么拼、为什么不念孤立单字
 *
 * ## 卡面的顺序是有讲究的：拼音在上、字在中、词在下
 *
 * 拼音在字的**正上方**，与课本、与识字卡的通行排版一致——
 * 她在别处见到的就是这个样子，换个位置等于让她重新学怎么看卡片。
 *
 * 字用整张卡最大的字号：这一页要认的就是**字形本身**，
 * 其余元素（拼音、图、组词）都是帮她记住这个形状的拐杖。
 *
 * ⚠️ 点一下只是朗读，没有对错、不记进度。这是「玩」的地方。
 */

import { motion } from 'framer-motion'
import { hanziClipKey, hanziSpokenText } from '@/domain/hanzi'
import { say } from '@/platform/speech'
import type { HanziCard as HanziCardData } from '@/domain/hanzi'

interface HanziCardProps {
  card: HanziCardData
}

export function HanziCard({ card }: HanziCardProps) {
  const spoken = hanziSpokenText(card)

  return (
    <motion.button
      type="button"
      // 读出「天，蓝天」而不是「按钮」：VoiceOver 下也该听到内容本身
      aria-label={`${card.char}，${card.word}`}
      onClick={() => say({ parts: [hanziClipKey(card.char)], fallbackText: spoken })}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="flex min-h-[170px] flex-col items-center justify-center gap-1 rounded-blob bg-surface px-2 py-3 text-ink shadow-drop-surface"
    >
      <span className="text-base tabular-nums text-ink/45">{card.pinyin}</span>

      <span className="text-6xl font-bold leading-none text-primary">{card.char}</span>

      {/* 图配不出来的字这里是空的（「大」「多」「来」「去」…），
          留空比放一张要猜的图好 —— 见 hanziCards.ts 文件头 */}
      {card.emoji !== '' && (
        <span className="text-3xl leading-none" aria-hidden="true">
          {card.emoji}
        </span>
      )}

      <span className="text-base text-ink/70">{card.word}</span>
    </motion.button>
  )
}
