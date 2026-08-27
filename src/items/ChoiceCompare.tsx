/**
 * @file 对比试听题 —— 挨个听、比出不一样的那个
 * @layer items
 * @see src/domain/generators/pinyinOddOne.ts  题目从哪来
 * @see src/domain/types.ts  `ItemType` 里 choice_audio 与 choice_compare 的区别
 *
 * ## ⭐ 为什么不能沿用 ChoiceAudio
 *
 * 两者要听的东西是**相反**的：
 *
 * | | 要听的是什么 | 点选项等于 |
 * |---|---|---|
 * | `ChoiceAudio` | **题干**（喇叭就是题目本身，如「听 gē 选 gē」） | 提交答案 |
 * | 这里 | **选项**（四个音节挨个听，比出不一样的那个） | 试听 ＋ 选中 |
 *
 * 「gē kē hē jī 里哪个声母不一样」——不听完根本没法比。
 * 原先它错用了 `choice_audio`，于是题干写着「点一点听一听」，
 * 孩子照做点了第一个想听，**直接被判做错了**（2026-08-27 真机反馈）。
 * 题干没写错，是渲染层没兑现它。
 *
 * ## ⚠️ 这不违反「点击选项不朗读」那条红线
 *
 * 红线的理由是「那一下是提交答案，紧接着就响反馈的鼓励语，
 * 两个声音叠在一起，而 iOS 的 `speechSynthesis.cancel()` 拦不干净」。
 *
 * 这里点选项**不提交**，反馈语要等她点「好了」才响——两者隔着一次点击，
 * 声音不可能叠。判据是「这一下会不会立刻提交」，不是「选项能不能发声」。
 *
 * ## 确认按钮沿用「好了」
 *
 * 四个拖拽题型（DragMatch / DragOrder / DragCombine / PinyinBlend）
 * 用的都是这两个字，孩子已经认得这个动作。这里不另造一个说法。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { SpeakerButton } from '@/components/SpeakerButton'
import { OptionButton, type OptionVisualState } from '@/items/OptionButton'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'
import type { ItemOption } from '@/domain/types'

export function ChoiceCompare({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  /** 试听并选中的那个，还没提交。换题时清空，否则新题一出现就已经选好了 */
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    setPreviewId(null)
    say({
      parts: item.stem.ttsParts ?? [],
      fallbackText: item.stem.ttsText,
      lang: item.stem.ttsLang,
    })
  }, [item])

  /**
   * 回到未作答态时也要清选中。
   *
   * ⚠️ 光靠上面那个 effect 不够：它依赖 `item`，而**同一道题重新作答**
   * （小结页的订正会重出原题）时 `item` 没变，上一次的选中就留在屏幕上——
   * 孩子会看到题目已经替她选好了一个。
   */
  useEffect(() => {
    if (!revealed) setPreviewId(null)
  }, [revealed])

  /** 点一下：念这个选项 ＋ 选中它。⛔ 不提交 */
  const preview = (option: ItemOption): void => {
    setPreviewId(option.id)
    say({
      parts: option.ttsParts ?? [],
      fallbackText: option.ttsText ?? option.text ?? '',
      lang: item.stem.ttsLang,
    })
    onReplay?.()
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-3">
        <p className="text-2xl text-ink/60">{item.stem.text}</p>
        {/* 题干的喇叭只读题目，选项的音在选项自己身上 */}
        <SpeakerButton
          text={item.stem.ttsText}
          parts={item.stem.ttsParts}
          lang={item.stem.ttsLang}
          size="md"
          onReplay={onReplay}
        />
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        {item.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            disabled={revealed}
            state={optionState(option.id, option.isCorrect, selectedOptionId, previewId, revealed)}
            onSelect={() => preview(option)}
          />
        ))}
      </div>

      {/* ⚠️ 选中之前不出现：一个点不动的按钮会让她反复去戳，
          以为是自己没点对 */}
      {!revealed && previewId !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
        >
          <BigButton tone="primary" className="px-10 py-4 text-2xl" onClick={() => onSelect(previewId)}>
            好了
          </BigButton>
        </motion.div>
      )}

      {!revealed && previewId === null && (
        <span className="text-base text-ink/40">点一个听听看</span>
      )}
    </div>
  )
}

/**
 * 选项该显示成什么样。
 *
 * 比别的题型多一个 `previewing`：**试听选中、但还没提交**。
 * ⚠️ 它必须排在对错判定**之后**——一旦进入反馈态，
 * 显示的就该是对错，而不是「你刚才点过这个」。
 */
function optionState(
  optionId: string,
  isCorrect: boolean,
  selectedOptionId: string | null,
  previewId: string | null,
  revealed: boolean,
): OptionVisualState {
  if (revealed) {
    if (optionId === selectedOptionId) return isCorrect ? 'selected-correct' : 'selected-wrong'
    return isCorrect ? 'reveal-correct' : 'idle'
  }
  return optionId === previewId ? 'previewing' : 'idle'
}
