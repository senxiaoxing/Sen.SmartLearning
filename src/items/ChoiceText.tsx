/**
 * @file 文字/符号选择题 —— 比大小等非算式题型
 * @layer items
 *
 * 与 `InputNumber` 的区别只在布局：符号（> < =）需要更大的字号和横向排列，
 * 因为它们的视觉差异比数字小得多，`symbol_reversed`（方向写反）本身就是高频误区。
 */

import { useEffect } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { OptionButton } from '@/items/OptionButton'
import { visualState } from '@/items/InputNumber'
import { isStemFigure, StemFigure } from '@/items/StemFigure'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

export function ChoiceText({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
  }, [item.signature, item.stem.ttsText])

  // 符号选项（> < =）只有 2~3 个且字形简单，横排更利于对比
  const columns = item.options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className="flex h-full flex-col justify-center gap-8">
      <div className="flex items-center justify-center gap-6">
        <p className="text-stem text-center tabular-nums">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} />
      </div>

      {/*
        ⭐ 题干配图。「哪个算式说的是这幅图？」「这个图形沿哪条线对称？」——
        这两句里的「这幅图」原先根本不存在，题问的是一幅没画出来的图。
        理由同 InputNumber 那处。
      */}
      {isStemFigure(item.visual) && (
        <div className="flex items-center justify-center">
          <StemFigure visual={item.visual} />
        </div>
      )}

      <div className={`grid ${columns} gap-4 sm:gap-6`}>
        {item.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            disabled={revealed}
            state={visualState(option.id, option.isCorrect, selectedOptionId, revealed)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
