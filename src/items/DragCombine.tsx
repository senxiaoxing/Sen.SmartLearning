/**
 * @file 拖拽拆分题 —— 凑十法 / 破十法把一个数拆成两份
 * @layer items
 * @see src/domain/generators/splitTen.ts   题目从哪来（M5.1 / M6.1，两个 ⭐⭐ 关键节点）
 * @see src/components/TenFrame.tsx         与填空脚手架共用的十格阵
 *
 * ⭐ 十格阵不是装饰。孩子看到「格子还空 1 个」就不需要理解抽象的进位规则了，
 * 而填空题的脚手架（`InputNumber`）用的是**同一个组件**——
 * 同一个概念在两种题型里长得一样，她才不用重新认一遍。
 */

import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { SpeakerButton } from '@/components/SpeakerButton'
import { LooseDots, TenFrame } from '@/components/TenFrame'
import { DragCard, DropSlot } from '@/items/DragCard'
import { PinyinBlend } from '@/items/PinyinBlend'
import { usePlacement } from '@/items/usePlacement'
import { matchArrangement } from '@/domain/generators/arrangements'
import { num } from '@/domain/speech'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

/** 拆成几份。凑十法与破十法都是两份 */
const SLOT_COUNT = 2

/**
 * `drag_combine` 的入口。
 *
 * 数学的凑十/破十拆分与拼音的拼读**共用这个题型**（交互一样：拖两个卡片进两个槽），
 * 但呈现完全不同——一个要十格阵和数字，一个要声母韵母两行字母。
 * 按 `visual.kind` 在这里分流，`ItemRenderer` 不必知道这层区别。
 */
export function DragCombine(props: ItemViewProps) {
  if (props.item.visual?.kind === 'blending') return <PinyinBlend {...props} />
  return <SplitTenView {...props} />
}

function SplitTenView({ item, revealed, onSelect, onReplay }: ItemViewProps) {
  const visual = item.visual?.kind === 'splitting' ? item.visual : undefined
  // ⚠️ unique: false —— 两份可能是同一个数（如 4 拆成 2 和 2），
  // 用唯一模式会让孩子放第二个 2 时把第一个弹走
  const placement = usePlacement(SLOT_COUNT, { unique: false })
  const { reset } = placement

  // ⚠️ 依赖 `item` 对象而非 `item.signature` —— 签名不含难度，
  // 两道不同的题可能同签名，那样这个 effect 不触发，
  // 下一题会带着上一题的摆放出现。理由详见 DragOrder.tsx 的同一处注释。
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
    reset()
  }, [item, reset])

  if (visual === undefined) return null

  const cards = visual.cards
  const submit = () => {
    const key = placement.slots.map((i) => cards[i as number]).join('+')
    onSelect(matchArrangement(item.options, key))
  }

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-4">
        <p className="text-3xl font-bold">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} size="md" />
      </div>

      {/* 十格阵 + 散点：把算式变成看得见的数量 */}
      <div className="flex items-center justify-center gap-4">
        <TenFrame filled={visual.frame} emphasis={visual.frame < 10 ? 'gap' : 'frame'} size="sm" />
        <LooseDots count={visual.loose} size="sm" />
      </div>

      {/* 两个槽：一份补给/拿走，一份剩下 */}
      <div className="flex items-start justify-center gap-6">
        {placement.slots.map((cardIndex, slotIndex) => (
          <DropSlot
            key={slotIndex}
            content={cardIndex === null ? null : String(cards[cardIndex])}
            label={visual.slotLabels[slotIndex]}
            inviting={placement.selectedCard !== null}
            disabled={revealed}
            onTap={() => placement.tapSlot(slotIndex)}
            registerRef={placement.registerSlot(slotIndex)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {cards.map((value, i) => (
          <DragCard
            key={`${value}-${i}`}
            label={String(value)}
            selected={placement.selectedCard === i}
            disabled={revealed}
            size="sm"
            onTap={() => {
              placement.tapCard(i)
              say({ parts: num(value), fallbackText: String(value) })
            }}
            onDrop={(point) => placement.dropAt(i, point)}
          />
        ))}
      </div>

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
