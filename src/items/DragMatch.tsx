/**
 * @file 拖拽配对题 —— 给每个数找到能凑成总数的伙伴
 * @layer items
 * @see src/domain/generators/matchPairs.ts  题目从哪来（M3.1 / M3.2 分与合）
 *
 * 填空题一次只问一种分法（「5 分成 2 和几」），配对题把**同一个数的全部分法
 * 摆在一起**，建立的是整体结构感——知道 5 只能分成 1/4、2/3 这几种，
 * 凑十法才有得用。
 *
 * ⚠️ 设计文档写的是「左右两列**连线**」，这里实现为「右列卡片拖进左列旁边的槽」。
 * 两者是同一个配对任务，但连线要在触摸屏上画贝塞尔曲线并做端点命中判定，
 * 对六岁孩子的手指精度是真实门槛；而槽位可以直接复用点选通道，
 * 拖不准也能用点的完成。判定逻辑完全一致，`arrangementKey` 也一样。
 */

import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { SpeakerButton } from '@/components/SpeakerButton'
import { DragCard, DropSlot } from '@/items/DragCard'
import { usePlacement } from '@/items/usePlacement'
import { matchArrangement } from '@/domain/generators/arrangements'
import { num } from '@/domain/speech'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

export function DragMatch({ item, revealed, onSelect, onReplay }: ItemViewProps) {
  const visual = item.visual?.kind === 'matching' ? item.visual : undefined
  const lefts = visual?.left ?? []
  const rights = visual?.right ?? []
  const placement = usePlacement(lefts.length, { unique: true })
  const { reset } = placement

  // ⚠️ 依赖 `item` 对象而非 `item.signature` —— 签名不含难度，
  // 两道不同的题可能同签名，那样这个 effect 不触发，
  // 下一题会带着上一题的摆放出现。理由详见 DragOrder.tsx 的同一处注释。
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
    reset()
  }, [item, reset])

  if (visual === undefined) return null

  const submit = () => {
    // 槽的顺序就是 lefts 的顺序，而生成器的 pairKey 按左值升序拼接、
    // lefts 本身也是升序，两边天然对齐
    const key = lefts
      .map((left, i) => `${left}-${rights[placement.slots[i] as number]}`)
      .join(',')
    onSelect(matchArrangement(item.options, key))
  }

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-4">
        <p className="text-3xl font-bold">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} size="md" />
      </div>

      <div className="flex flex-col items-center gap-3">
        {lefts.map((left, i) => (
          <div key={left} className="flex items-center gap-3">
            <span className="min-w-[64px] text-right text-4xl font-bold tabular-nums">{left}</span>
            <span className="text-3xl text-ink/40">和</span>
            <DropSlot
              content={placement.slots[i] === null ? null : String(rights[placement.slots[i] as number])}
              inviting={placement.selectedCard !== null}
              disabled={revealed}
              onTap={() => placement.tapSlot(i)}
              registerRef={placement.registerSlot(i)}
            />
            <span className="text-2xl text-ink/40">= {visual.total}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {rights.map((value, i) => (
          <DragCard
            key={`${value}-${i}`}
            label={String(value)}
            placed={placement.isPlaced(i)}
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
