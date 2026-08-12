/**
 * @file 拼音卡 —— 一个声母或韵母，点一下听发音
 * @layer features
 * @see src/data/seed/pinyinChart.ts  卡面内容
 * @see src/features/chinese/PinyinWall.tsx  这面墙
 *
 * ⚠️ 点一下只是**朗读**，没有翻面、没有对错。
 * 与字母卡（LetterCard）的差别正在这里：字母有正反两面（字形 / 首字母单词），
 * 而拼音卡该看的东西——字母、口诀、怎么念——本来就该同时在眼前，
 * 藏一半到背面只会逼她多点一次。
 *
 * 动画只用 `scale`（GPU 合成），不碰 width/height。
 */

import { motion } from 'framer-motion'
import { say } from '@/platform/speech'
import type { PinyinChartCard } from '@/data/seed/pinyinChart'

interface PinyinCardProps {
  card: PinyinChartCard
  /** 这张卡所在的组是否已经开始学了，用于加一圈高亮 */
  learned: boolean
}

export function PinyinCard({ card, learned }: PinyinCardProps) {
  return (
    <motion.button
      type="button"
      // 读出口诀而不是「按钮」：VoiceOver 下也该听到内容本身
      aria-label={`${card.form}，${card.mnemonic}`}
      onClick={() => say({ parts: [card.clipKey], fallbackText: card.spoken })}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={[
        // 一年级触控下限是 88pt，这里远超——字形本身就是要看清的东西
        'flex min-h-[150px] flex-col items-center justify-center gap-1 rounded-blob px-2 py-3',
        'bg-surface text-ink shadow-drop-surface',
        learned ? 'ring-4 ring-primary' : '',
      ].join(' ')}
    >
      <span className="text-5xl font-bold leading-none text-primary">{card.form}</span>

      <span className="mt-1 text-base text-ink/70">{card.mnemonic}</span>
      <span className="text-sm tabular-nums text-ink/40">{card.chant}</span>

      {/*
        ⭐ 借例词发音的那几张（ei / ün / eng / ong，以及 d t n l）必须把实际念出来的字
        显示出来，否则就是「卡面写 eng、耳朵听到 fēng」的错位。
        见 pinyinChart.ts 文件头。
      */}
      {card.carrier !== undefined && (
        <span className="mt-0.5 rounded-full bg-info/15 px-2 py-0.5 text-sm text-info">
          听「{card.carrier}」
        </span>
      )}
    </motion.button>
  )
}
