/**
 * @file 看图选择题 —— 题干是一张图，选项是图或大字
 * @layer items
 * @see src/items/StemFigure.tsx  题干配图的四种画法
 * @see src/components/shape/MathShape.tsx  SVG 图形
 *
 * 无障碍约束（一年级孩子不识字，见 CLAUDE.md 代码规范要点）：
 * - 挂载后自动朗读题干，无需任何操作
 * - 题干右侧固定一个喇叭，随时可重听
 * - 选项触控区最小 88×88 pt，图形选项不配文字标签
 *   （标了「正方体」三个字，这道题就从认图形变成了认字）
 */

import { useEffect } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { visualState } from '@/items/InputNumber'
import { OptionButton } from '@/items/OptionButton'
import { StemFigure } from '@/items/StemFigure'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

export function ChoiceImage({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  useEffect(() => {
    say({
      parts: item.stem.ttsParts ?? [],
      fallbackText: item.stem.ttsText,
      lang: item.stem.ttsLang,
    })
  }, [item])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-4">
        <p className="text-2xl text-ink/70">{item.stem.text}</p>
        <SpeakerButton
          text={item.stem.ttsText}
          parts={item.stem.ttsParts}
          lang={item.stem.ttsLang}
          size="md"
          onReplay={onReplay}
        />
      </div>

      {item.visual !== undefined && <StemFigure visual={item.visual} />}

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        {item.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            disabled={revealed}
            state={visualState(option.id, option.isCorrect, selectedOptionId, revealed)}
            onSelect={onSelect}
            /* 图形选项没有可念的文字，念 ttsText（如「正方体」）反而会报答案；
               只有挂了 ttsText 的非图形选项才允许点读 */
            speakOnTap={option.imageKey === undefined && option.ttsText !== undefined}
          />
        ))}
      </div>
    </div>
  )
}
