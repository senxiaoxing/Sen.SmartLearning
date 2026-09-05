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
import { isStemFigure, StemFigure } from '@/items/StemFigure'
import { shouldShowScaffold } from '@/domain/scheduler/shouldShowScaffold'
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
  showScaffold,
}: ItemViewProps) {
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
  }, [item.signature, item.stem.ttsText])

  // 缺省时按难度走默认：摸底与预览没有作答历史，不能因为没人传 prop
  // 就把难度 1 该有的脚手架弄丢。默认逻辑只此一份，在纯函数里。
  const visible =
    showScaffold ?? shouldShowScaffold({ difficulty: item.difficulty, type: item.type })
  const scaffold = visible && item.scaffold?.kind === 'tenFrame' ? item.scaffold : undefined

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-6">
        <p className="text-stem tabular-nums text-center">{item.stem.text}</p>
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} />
      </div>

      {/*
        脚手架：把算式里的数量画出来，凑十/破十变成看得见的事。
        ⭐ 显不显示看**她的状态**不看难度——她在难度 3 连错两次同样会看到它，
        在难度 1 连对两次它就撤了。见 domain/scheduler/shouldShowScaffold.ts。
      */}
      {scaffold !== undefined && (
        <div className="flex items-center justify-center gap-4">
          <TenFrame filled={scaffold.frame} emphasis={scaffold.frame < 10 ? 'gap' : 'none'} size="sm" />
          {scaffold.loose > 0 && <LooseDots count={scaffold.loose} size="sm" />}
        </div>
      )}

      {/*
        ⭐ 题干配图。**不是装饰，是题目的一半**——二年级有整批题的条件只在图里：
        「它有多长？」要尺子、「一共有几个角？」要图形、「饼干有几个？」要条形图。
        原先只有 ChoiceImage 画它，于是这些题在 App 里是一句话加四个数字，**无解**。
        二年级开放前进不去，所以一直没人看见。
      */}
      {isStemFigure(item.visual) && (
        <div className="flex items-center justify-center">
          <StemFigure visual={item.visual} />
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
