/**
 * @file 记忆翻牌题 —— 翻开两张找配对
 * @layer items
 * @see src/domain/generators/memoryPair.ts  题目从哪来、判定规则
 *
 * ⚠️ **翻错不给任何失败反馈**：没有错误音效、没有摇动、不变红。
 * 记忆游戏本来就靠试错，翻错是机制的一部分而不是做错了事。
 * 在这里加惩罚性反馈，等于因为她记性还没练出来而责备她
 * （同 `usePlacement` 里「拖不准是手的问题不是脑子的问题」那条）。
 *
 * 判对错只看错误次数有没有超出 `mistakeBudget`，孩子全程看不到这个计数。
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { matchArrangement } from '@/domain/generators/arrangements'
import { KEY_CLEAN, KEY_MIRROR } from '@/domain/generators/memoryPair'
import { isMirrorMistake } from '@/domain/generators/memoryCards'
import { OTHER_ARRANGEMENT_KEY } from '@/domain/generators/arrangements'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'
import type { MemoryCard } from '@/domain/types'

/** 配错后停留多久再翻回。太短看不清翻的是什么，太长会等得不耐烦 */
const FLIP_BACK_MS = 900

export function MemoryPair({ item, revealed, onSelect }: ItemViewProps) {
  const visual = item.visual?.kind === 'memoryPairs' ? item.visual : undefined
  const cards = visual?.cards ?? []
  const pairCount = new Set(cards.map((c) => c.pairId)).size

  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [sawMirror, setSawMirror] = useState(false)
  /** 配错后的翻回等待期，此间禁止再翻，否则会翻出第三张 */
  const [busy, setBusy] = useState(false)
  const submitted = useRef(false)

  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText, lang: item.stem.ttsLang })
  }, [item])

  // 全部配对完成 → 按「错了几次、错成什么样」提交
  useEffect(() => {
    if (submitted.current || pairCount === 0 || matched.length < pairCount) return
    submitted.current = true

    const budget = visual?.mistakeBudget ?? 0
    const key =
      mistakes <= budget ? KEY_CLEAN : sawMirror ? KEY_MIRROR : OTHER_ARRANGEMENT_KEY
    onSelect(matchArrangement(item.options, key))
  }, [matched, pairCount, mistakes, sawMirror, visual, item.options, onSelect])

  const flip = (card: MemoryCard) => {
    if (busy || revealed) return
    if (matched.includes(card.pairId) || flipped.includes(card.id)) return

    say({ parts: card.ttsParts ?? [], fallbackText: card.ttsText ?? card.face, lang: card.ttsLang })

    const next = [...flipped, card.id]
    if (next.length < 2) {
      setFlipped(next)
      return
    }

    const first = cards.find((c) => c.id === next[0])
    if (first === undefined) return

    if (first.pairId === card.pairId) {
      setMatched((m) => [...m, card.pairId])
      setFlipped([])
      return
    }

    // 配错了：记一次，看看是不是镜像混淆，然后翻回去
    setMistakes((n) => n + 1)
    if (isMirrorMistake(first.face, card.face)) setSawMirror(true)
    setFlipped(next)
    setBusy(true)
    setTimeout(() => {
      setFlipped([])
      setBusy(false)
    }, FLIP_BACK_MS)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <p className="text-2xl text-ink/70">{item.stem.text}</p>

      <div className="grid max-w-2xl grid-cols-4 gap-3">
        {cards.map((card) => (
          <MemoryCardView
            key={card.id}
            card={card}
            open={revealed || matched.includes(card.pairId) || flipped.includes(card.id)}
            done={matched.includes(card.pairId)}
            onFlip={() => flip(card)}
          />
        ))}
      </div>
    </div>
  )
}

interface CardViewProps {
  card: MemoryCard
  open: boolean
  done: boolean
  onFlip: () => void
}

/**
 * 一张卡。
 *
 * 翻转用 `rotateY`（GPU 合成属性），不动 width/height——
 * 见 CLAUDE.md 性能规范。配对成功的卡留在正面并轻微缩小，
 * 表示「这张已经收好了」，⚠️ 不是变灰或消失：消失会让孩子失去已完成的成就感参照。
 */
function MemoryCardView({ card, open, done, onFlip }: CardViewProps) {
  return (
    <motion.button
      type="button"
      onClick={onFlip}
      disabled={done}
      animate={{ rotateY: open ? 0 : 180, scale: done ? 0.94 : 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={[
        'flex min-h-touch min-w-touch flex-col items-center justify-center gap-1',
        'rounded-blob px-2 py-5 font-bold',
        done ? 'bg-correct/25 ring-2 ring-correct' : 'bg-surface shadow-drop-surface',
      ].join(' ')}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {open ? (
        <>
          <span className="text-4xl leading-none">{card.face}</span>
          {card.caption !== undefined && (
            <span className="text-sm font-normal text-ink/50">{card.caption}</span>
          )}
        </>
      ) : (
        // 背面朝上时整体旋转了 180°，问号要再转回来才不是镜像的
        <span style={{ transform: 'rotateY(180deg)' }}>
          <Icon name="question" className="h-8 w-8 text-ink/30" />
        </span>
      )}
    </motion.button>
  )
}
