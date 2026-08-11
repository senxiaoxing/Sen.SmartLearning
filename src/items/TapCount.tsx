/**
 * @file 点击计数题 —— 逐个点物体来数，而不是看一眼选数字
 * @layer items
 * @see design/05-孩子反馈与响应.md 第 4 条反馈「答题界面太单一」
 *
 * 数数的本质是**一一对应**：手指点一个、嘴里数一个。
 * 只让孩子看着一堆 emoji 选数字，练的是「一眼估数」而不是数数能力，
 * 而且四道题长一个样，正是她说的「界面太单一」。
 *
 * 这里让她真的去点：点一个亮一个，同时朗读「1、2、3」。
 * 点过的不能再点（避免重复计数），漏点则会数少——那正是 `count_skip` 的真实成因。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { OptionButton, type OptionVisualState } from '@/items/OptionButton'
import { visualState } from '@/items/InputNumber'
import { num } from '@/domain/speech'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

/** 物体的最大随机偏移（像素）。散布得不规则才需要认真数，整齐排列一眼就看出来了 */
const JITTER_PX = 10

export function TapCount({ item, selectedOptionId, revealed, onSelect, onReplay }: ItemViewProps) {
  const [tapped, setTapped] = useState<Set<number>>(new Set())

  // 依赖 `item` 对象而非 `item.signature`：签名不含难度，两道不同的题
  // 可能同签名，那样这里不会重置，下一题会带着上一题数过的个数出现
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
    setTapped(new Set())
  }, [item])

  const visual = item.visual?.kind === 'countable' ? item.visual : undefined

  /**
   * 由签名派生的确定性抖动。
   * 用签名而非 `Math.random()`：同一道题每次渲染位置一致，
   * 否则重新渲染时物体会乱跳，孩子刚数到一半就找不着了。
   */
  const jitters = useMemo(() => {
    const seed = [...(visual?.emoji ?? 'x'), ...item.signature].reduce(
      (acc, ch) => acc + ch.codePointAt(0)!,
      0,
    )
    return Array.from({ length: visual?.count ?? 0 }, (_, i) => {
      const h = Math.sin(seed + i * 37.7) * 10000
      const v = Math.sin(seed + i * 91.3) * 10000
      return {
        x: ((h - Math.floor(h)) * 2 - 1) * JITTER_PX,
        y: ((v - Math.floor(v)) * 2 - 1) * JITTER_PX,
      }
    })
  }, [item.signature, visual?.emoji, visual?.count])

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-4">
        <p className="text-3xl font-bold">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} size="md" />
      </div>

      {visual !== undefined && visual.count > 0 && (
        <div className="flex min-h-[120px] flex-wrap items-center justify-center gap-3 rounded-blob bg-surface/50 p-4">
          {Array.from({ length: visual.count }, (_, i) => {
            const isTapped = tapped.has(i)
            return (
              <motion.button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 个${visual.name}`}
                disabled={revealed || isTapped}
                style={{ x: jitters[i]?.x ?? 0, y: jitters[i]?.y ?? 0 }}
                whileTap={{ scale: 0.8 }}
                animate={{ scale: isTapped ? 1.1 : 1, opacity: isTapped ? 1 : 0.75 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                onClick={() => {
                  const next = new Set(tapped)
                  next.add(i)
                  setTapped(next)
                  // 报数：点一个数一个，这才是「一一对应」
                  say({ parts: num(next.size), fallbackText: String(next.size) })
                }}
                className={[
                  'flex h-16 w-16 items-center justify-center rounded-2xl text-4xl',
                  isTapped ? 'bg-correct/25 ring-4 ring-correct' : 'bg-surface',
                ].join(' ')}
              >
                {visual.emoji}
              </motion.button>
            )
          })}
        </div>
      )}

      {tapped.size > 0 && !revealed && (
        <motion.p
          key={tapped.size}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-2xl font-bold text-correct"
        >
          数了 {tapped.size} 个
        </motion.p>
      )}

      <div className="grid grid-cols-4 gap-3">
        {item.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            disabled={revealed}
            state={optionState(option.id, option.isCorrect, selectedOptionId, revealed)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

/** 复用与其他题型一致的选项视觉状态逻辑 */
function optionState(
  optionId: string,
  isCorrect: boolean,
  selectedOptionId: string | null,
  revealed: boolean,
): OptionVisualState {
  return visualState(optionId, isCorrect, selectedOptionId, revealed)
}
