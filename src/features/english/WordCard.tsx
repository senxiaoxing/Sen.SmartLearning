/**
 * @file 词汇卡 —— 一个词，点一下听「Apple. A red apple.」
 * @layer features
 * @see src/data/seed/englishWordCards.ts  卡面内容
 * @see src/domain/englishCard.ts  朗读文本怎么拼
 * @see src/features/chinese/HanziCard.tsx  识字卡，这一张处处对标它
 *
 * ## 卡面顺序：图在上、词在中、中文在下、例句最后
 *
 * ⚠️ 与识字卡**不完全一样**，差别只有一处，但那一处是有理由的：
 * 识字卡把拼音放在字的**正上方**（课本的注音排版，她在别处见到的就是那样），
 * 而这里最上面是**图**。
 *
 * 因为一个英文词对她来说是一串**没有意义的形状**——汉字至少还带着字形线索，
 * `apple` 不带。图是她认出这张卡的第一抓手，必须在最显眼的位置。
 * 中文释义退到词的下面：那是「确认一下」，不是「找到它」。
 *
 * 词用整张卡最大的字号：这一页要认的就是**词形本身**，
 * 其余元素（图、中文、例句）都是帮她记住这串字母的拐杖。
 *
 * ⚠️ 点一下只是朗读，没有对错、不记进度。这是「玩」的地方。
 */

import { motion } from 'framer-motion'
import { englishCardClipKey, englishCardSpokenText } from '@/domain/englishCard'
import { say } from '@/platform/speech'
import { useHoldToSlow } from '@/platform/useHoldToSlow'
import type { EnglishCard } from '@/domain/englishCard'

interface WordCardProps {
  card: EnglishCard
}

export function WordCard({ card }: WordCardProps) {
  const spoken = englishCardSpokenText(card)
  /** 按住会慢一档 —— 整句慢下来，听得清那个词的每个音 */
  const utteranceOf = () => ({
    parts: [englishCardClipKey(card.word)],
    fallbackText: spoken,
    // ⚠️ 必须标 en-US：片段缺失时兜底走系统 TTS，中文引擎念 apple 是教错音
    lang: 'en-US' as const,
  })
  const { holdProps, consumeHold } = useHoldToSlow(utteranceOf)

  return (
    <motion.button
      type="button"
      // 读出「apple，苹果」而不是「按钮」：VoiceOver 下也该听到内容本身
      aria-label={`${card.word}，${card.zh}`}
      {...holdProps}
      onClick={() => {
        if (consumeHold()) return
        say(utteranceOf())
      }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      // 长按要不被 iOS 的系统菜单抢走，见 useHoldToSlow.ts 文件头第 3 条
      className="flex min-h-[168px] select-none touch-manipulation flex-col items-center justify-center gap-1 rounded-blob bg-surface px-2 py-3 text-ink shadow-drop-surface [-webkit-touch-callout:none]"
    >
      {/* 图配不出来的词这里是空的（big / new / fast…），留空比放一张要猜的图好。
          ⚠️ 空的时候**不占位**：形容词那一组整组没图，留一排空白会让那一组
          看起来像是没加载完；少了图它自然就是一张「以词为主」的卡 */}
      {card.emoji !== '' && (
        <span className="text-4xl leading-none" aria-hidden="true">
          {card.emoji}
        </span>
      )}

      {/* ⚠️ `break-all` 而不是默认换行：watermelon / strawberry 这类长词
          在窄屏上会把卡片撑破，宁可断在词中间也不能让整排卡参差不齐 */}
      <span className="break-all text-2xl font-bold leading-tight text-primary">{card.word}</span>

      <span className="text-base text-ink/70">{card.zh}</span>

      {/* 例句给家长看，也让她看见这个词用在句子里的样子。
          最小字号：她读不了，但它是**念出来的后半句**，屏幕上得有 */}
      <span className="text-xs leading-tight text-ink/40">{card.example}</span>
    </motion.button>
  )
}
