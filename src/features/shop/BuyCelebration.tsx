/**
 * @file 买到了 —— 星星变成了它
 * @layer features
 * @see src/stores/shopStore.ts  `Celebration` 的来源
 *
 * ## ⭐ 这个组件存在的唯一理由：把「花掉」演成「变成」
 *
 * 首页和小结页一直显示「一共 N 颗」，那是她努力的证明。
 * 一旦能花，这个数字会开始**往下掉**——对孩子来说那是「我的东西被拿走了」。
 *
 * 解法不是加第二个数字（一年级理解不了两个余额），而是在这一刻
 * 把消费**演成转化**：星星缩小消失、物品放大出现。
 * 全程不出现 `-300`，一个减号都没有。
 *
 * 动画只用 `scale` / `opacity`（GPU 合成属性）——CLAUDE.md 性能红线。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { ShopItemArt } from '@/components/room/ShopItemArt'
import type { Celebration } from '@/stores/shopStore'

/** 星星淡出到物品浮现之间的间隔（秒）。太快看不出「变成」，太慢会等得不耐烦 */
const MORPH_DELAY = 0.45

interface BuyCelebrationProps {
  celebration: Celebration
  /** 说一句庆祝语。⚠️ 一次只说一句 —— 见 CLAUDE.md 产品红线 */
  onSpeak: (text: string) => void
  onClose: () => void
}

export function BuyCelebration({ celebration, onSpeak, onClose }: BuyCelebrationProps) {
  const line = celebration.pending
    ? `${celebration.label}，已经告诉爸爸妈妈啦`
    : `${celebration.label}，是你的啦`

  // ⚠️ 整屏只有这一处发声。要加新播报就拼进 `line`，不要新开 effect——
  //    React 先跑子组件 effect 再跑父组件，后开的必然把先开的掐掉
  useEffect(() => {
    onSpeak(line)
  }, [line, onSpeak])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label={line}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-blob bg-surface p-8 shadow-card"
      >
        <span className="relative flex h-32 w-32 items-center justify-center">
          {/* 星星：先在，然后缩小消失 */}
          <motion.span
            aria-hidden
            className="absolute text-7xl"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 0.2, opacity: 0 }}
            transition={{ duration: MORPH_DELAY, ease: 'easeIn' }}
          >
            ⭐
          </motion.span>

          {/* 物品：从星星消失的地方长出来 */}
          <motion.span
            aria-hidden
            className="flex h-full w-full items-center justify-center"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: MORPH_DELAY,
              type: 'spring',
              stiffness: 260,
              damping: 16,
            }}
          >
            <Prize celebration={celebration} />
          </motion.span>
        </span>

        <p className="text-center text-2xl font-bold leading-snug">{line}</p>

        <BigButton tone="primary" fullWidth className="py-4 text-xl" onClick={onClose}>
          好
        </BigButton>
      </motion.div>
    </motion.div>
  )
}

function Prize({ celebration }: { celebration: Celebration }) {
  if (celebration.art !== undefined) return <ShopItemArt art={celebration.art} />
  return <span className="text-7xl">{celebration.emoji}</span>
}
