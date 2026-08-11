/**
 * @file 数字选择题 —— 数学计算类题目的主力题型
 * @layer items
 *
 * 名为 `InputNumber` 但用四选一而非键盘输入：
 * 一年级孩子敲键盘慢且易错，输入本身的摩擦会盖过题目难度；
 * 更重要的是四选一才能承载**诊断性干扰项**——孩子选了 13 还是 10，
 * 对应完全不同的认知误区，这是自适应系统的数据来源。
 */

import { useEffect } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { LooseDots, TenFrame } from '@/components/TenFrame'
import { OptionButton, type OptionVisualState } from '@/items/OptionButton'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

/**
 * 渲染算式题干与四个数字选项。
 *
 * 挂载时自动朗读题干——孩子不识字，不能等她主动点喇叭。
 */
export function InputNumber({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
  }, [item.signature, item.stem.ttsText])

  const scaffold = item.visual?.kind === 'tenFrame' ? item.visual : undefined

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-6">
        <p className="text-stem tabular-nums text-center">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} />
      </div>

      {/* 难度 1 的脚手架：把算式里的数量画出来，凑十/破十变成看得见的事 */}
      {scaffold !== undefined && (
        <div className="flex items-center justify-center gap-4">
          <TenFrame filled={scaffold.frame} emphasis={scaffold.frame < 10 ? 'gap' : 'none'} size="sm" />
          {scaffold.loose > 0 && <LooseDots count={scaffold.loose} size="sm" />}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
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

/**
 * 计算选项的视觉状态。
 *
 * 答错时**同时**高亮正确答案：孩子不该只知道自己错了，
 * 更要立刻看到对的是哪个，否则这次错误没有产生任何学习价值。
 */
export function visualState(
  optionId: string,
  isCorrect: boolean,
  selectedOptionId: string | null,
  revealed: boolean,
): OptionVisualState {
  if (!revealed) return 'idle'
  if (optionId === selectedOptionId) return isCorrect ? 'selected-correct' : 'selected-wrong'
  if (isCorrect) return 'reveal-correct'
  return 'idle'
}
