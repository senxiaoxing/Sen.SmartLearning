/**
 * @file 题型分发 —— 按 `item.type` 渲染对应的题型组件
 * @layer items
 *
 * 新增题型时只需在此登记一行。当前 6 种题型覆盖全部数学生成器；
 * 英语的 `memory_pair`、拼音的 `record_compare` 等待各自的题库就位后补充。
 */

import { ChoiceAudio } from '@/items/ChoiceAudio'
import { ChoiceCompare } from '@/items/ChoiceCompare'
import { ChoiceImage } from '@/items/ChoiceImage'
import { ChoiceText } from '@/items/ChoiceText'
import { DragCombine } from '@/items/DragCombine'
import { DragMatch } from '@/items/DragMatch'
import { DragOrder } from '@/items/DragOrder'
import { InputNumber } from '@/items/InputNumber'
import { ListenNumber } from '@/items/ListenNumber'
import { MemoryPair } from '@/items/MemoryPair'
import { TapCount } from '@/items/TapCount'
import type { GeneratedItem } from '@/domain/types'

export interface ItemViewProps {
  item: GeneratedItem
  /** 已选中的选项 ID，未作答时为 null */
  selectedOptionId: string | null
  /** 是否处于反馈态（已作答，展示对错） */
  revealed: boolean
  onSelect: (optionId: string) => void
  onReplay?: () => void
}

/**
 * 根据题型渲染题目。
 *
 * 未实现的题型渲染为提示文案而非崩溃——调度器可能排到尚无 UI 的题型，
 * 此时应让孩子能跳过，而不是整段会话白屏。
 */
export function ItemRenderer(props: ItemViewProps) {
  switch (props.item.type) {
    case 'input_number':
      return <InputNumber {...props} />
    // ⚠️ 同一批数据的另一种考法：只报题、不显示算式。见 domain/types.ts
    case 'listen_number':
      return <ListenNumber {...props} />
    case 'choice_text':
      return <ChoiceText {...props} />
    case 'choice_audio':
      return <ChoiceAudio {...props} />
    // ⚠️ 与 choice_audio 只差一个词，交互却相反 —— 见 domain/types.ts 的说明
    case 'choice_compare':
      return <ChoiceCompare {...props} />
    case 'choice_image':
      return <ChoiceImage {...props} />
    case 'tap_count':
      return <TapCount {...props} />
    case 'drag_order':
      return <DragOrder {...props} />
    case 'drag_match':
      return <DragMatch {...props} />
    case 'drag_combine':
      return <DragCombine {...props} />
    case 'memory_pair':
      return <MemoryPair {...props} />
    default:
      return (
        <div className="flex h-full items-center justify-center text-xl text-ink/50">
          这种题目还在准备中～
        </div>
      )
  }
}
