/**
 * @file 拖拽排序题 —— 把打乱的数字卡按顺序放进一排槽
 * @layer items
 * @see src/domain/generators/orderSequence.ts  题目从哪来
 * @see src/domain/generators/arrangements.ts   摆放结果怎么变成可诊断的作答
 *
 * 排序考的是「脑子里同时持有整个数列」，而「6 的后面是几」只需要局部判断。
 * 这是选择题永远测不到的一层。
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

export function DragOrder({ item, revealed, onSelect, onReplay }: ItemViewProps) {
  const visual = item.visual?.kind === 'ordering' ? item.visual : undefined
  const cards = visual?.cards ?? []
  const placement = usePlacement(cards.length, { unique: true })
  const { reset } = placement

  /**
   * 换题时清空上一题的摆放，否则新题一出现就已经填好了答案。
   *
   * ⚠️ 依赖的是 `item` **对象本身**而不是 `item.signature`：
   * 签名只编码题目参数、**不含难度**，所以「M3.1 难度1」和「M3.1 难度2」
   * 完全可能是同一个签名。而调度器在去重重试用尽后是允许出重复签名的
   * （见 generators/index.ts 的 MAX_DEDUPE_ATTEMPTS），
   * 一旦连着出两道同签名的题，这个 effect 就不会触发——
   * 孩子会看到下一题已经摆好了答案。真机验证时实际撞到过。
   */
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
    reset()
  }, [item, reset])

  if (visual === undefined) return null

  const submit = () => {
    const key = placement.slots.map((cardIndex) => cards[cardIndex as number]).join(',')
    onSelect(matchArrangement(item.options, key))
  }

  return (
    <div className="flex h-full flex-col justify-center gap-8">
      <div className="flex items-center justify-center gap-4">
        <p className="text-3xl font-bold">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} size="md" />
      </div>

      {/* 槽位一排，从左到右就是顺序 */}
      <div className="flex flex-wrap items-start justify-center gap-3">
        {placement.slots.map((cardIndex, slotIndex) => (
          <DropSlot
            key={slotIndex}
            content={cardIndex === null ? null : String(cards[cardIndex])}
            inviting={placement.selectedCard !== null}
            disabled={revealed}
            onTap={() => placement.tapSlot(slotIndex)}
            registerRef={placement.registerSlot(slotIndex)}
          />
        ))}
      </div>

      {/* 待排的卡片 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {cards.map((value, i) => (
          <DragCard
            key={`${value}-${i}`}
            label={String(value)}
            placed={placement.isPlaced(i)}
            selected={placement.selectedCard === i}
            disabled={revealed}
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
