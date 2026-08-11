/**
 * @file 拼读题 —— 拖一个声母 + 一个韵母，拼出听到的音节
 * @layer items
 * @see src/domain/generators/pinyinBlend.ts  题目从哪来（P3.1 两拼音节）
 * @see src/items/DragCombine.tsx             同为 drag_combine，按 visual.kind 分流到这里
 *
 * ⚠️ **题干只有声音、没有拼音**。显示出来就成了照抄，
 * 而拼读要练的恰恰是「听到音 → 想出是哪两个部件」这一步。
 * 所以喇叭按钮在这里不是无障碍功能，是题目本身。
 */

import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { SpeakerButton } from '@/components/SpeakerButton'
import { DragCard, DropSlot } from '@/items/DragCard'
import { usePlacement } from '@/items/usePlacement'
import { matchArrangement } from '@/domain/generators/arrangements'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

export function PinyinBlend({ item, revealed, onSelect, onReplay }: ItemViewProps) {
  const visual = item.visual?.kind === 'blending' ? item.visual : undefined
  /**
   * 槽数由数据决定：两拼两个（声母+韵母），三拼三个（声母+介母+韵母）。
   * ⚠️ hook 不能条件调用，所以 visual 为空时也得先算出一个合法的槽数。
   */
  const slotCount = visual?.slotLabels.length ?? 2
  // unique:false —— 各组卡片相互独立，不存在互相挤占
  const placement = usePlacement(slotCount, { unique: false })
  const { reset } = placement

  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
    reset()
  }, [item, reset])

  if (visual === undefined) return null

  // 卡片索引统一编址：声母段 → 介母段（可能没有）→ 韵母段
  const medials = visual.medials ?? []
  const cards = [...visual.initials, ...medials, ...visual.finals]
  const medialOffset = visual.initials.length
  const finalOffset = medialOffset + medials.length

  const submit = () => {
    const key = placement.slots.map((i) => cards[i as number]).join('+')
    onSelect(matchArrangement(item.options, key))
  }

  return (
    <div className="flex h-full flex-col justify-center gap-7">
      <div className="flex items-center justify-center gap-4">
        <p className="text-3xl font-bold">{item.stem.text}</p>
        {/* ⭐ 这个喇叭是题目本身，不是辅助功能 */}
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} size="lg" onReplay={onReplay} />
      </div>

      <div className="flex items-start justify-center gap-4">
        {placement.slots.map((cardIndex, slotIndex) => (
          <DropSlot
            key={slotIndex}
            content={cardIndex === null ? null : String(cards[cardIndex])}
            label={visual.slotLabels[slotIndex] ?? ''}
            inviting={placement.selectedCard !== null}
            disabled={revealed}
            onTap={() => placement.tapSlot(slotIndex)}
            registerRef={placement.registerSlot(slotIndex)}
          />
        ))}
      </div>

      {/* 每类部件各占一行，视觉上强化「音节由几部分组成」——
          三拼时中间多出一行介母，正是 P3.2 要让孩子看见的那个部件 */}
      <CardRow
        label="声母"
        values={visual.initials}
        offset={0}
        placement={placement}
        disabled={revealed}
      />
      {medials.length > 0 && (
        <CardRow
          label="介母"
          values={medials}
          offset={medialOffset}
          placement={placement}
          disabled={revealed}
        />
      )}
      <CardRow
        label="韵母"
        values={visual.finals}
        offset={finalOffset}
        placement={placement}
        disabled={revealed}
      />

      <div className="flex justify-center">
        <BigButton
          tone="primary"
          className="px-10 py-4 text-2xl"
          disabled={!placement.isComplete || revealed}
          onClick={submit}
        >
          好了
        </BigButton>
      </div>
    </div>
  )
}

interface CardRowProps {
  label: string
  values: readonly string[]
  /** 本行卡片在统一编址里的起始下标 */
  offset: number
  placement: ReturnType<typeof usePlacement>
  disabled: boolean
}

function CardRow({ label, values, offset, placement, disabled }: CardRowProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="w-12 text-right text-base text-ink/40">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {values.map((value, i) => (
          <DragCard
            key={`${value}-${i}`}
            label={value}
            selected={placement.selectedCard === offset + i}
            disabled={disabled}
            size="sm"
            // 点卡片时不朗读单个字母：声母单念（如 b 念「玻」）和它在音节里的音不同，
            // 单独念反而会干扰孩子对拼读的理解
            onTap={() => placement.tapCard(offset + i)}
            onDrop={(point) => placement.dropAt(offset + i, point)}
          />
        ))}
      </div>
    </div>
  )
}
