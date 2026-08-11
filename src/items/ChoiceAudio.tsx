/**
 * @file 听音选择题 —— 拼音的主力题型
 * @layer items
 * @see src/domain/generators/pinyinListen.ts  题目从哪来
 * @see design/01-知识点图谱.md §P 拼音知识点
 *
 * ⭐ **这是全 App 唯一「零阅读门槛」的题型**，也是拼音板块的主力。
 * 一年级上学期孩子不识字：看图选、看字选都掺进了别的能力，
 * 「听一个音、从几个拼音里挑出来」才是纯粹在考拼音本身。
 *
 * ⚠️ 因此**题面绝不能出现答案拼音**（生成器已保证，`pinyinListen.test.ts` 强制校验）。
 * 显示出来这道题就变成照着抄，听力完全不参与。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { OptionButton, type OptionVisualState } from '@/items/OptionButton'
import { visualState } from '@/items/InputNumber'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

export function ChoiceAudio({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  // 依赖 item 对象而非 signature —— 签名不含难度，同签名的两道题不会触发重播
  useEffect(() => {
    say({
      parts: item.stem.ttsParts ?? [],
      fallbackText: item.stem.ttsText,
      lang: item.stem.ttsLang,
    })
  }, [item])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      <p className="text-2xl text-ink/60">{item.stem.text}</p>

      {/* ⭐ 喇叭在这里是题目本身，不是辅助功能，所以给最大尺寸、放在正中 */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex flex-col items-center gap-3"
      >
        <SpeakerButton
          text={item.stem.ttsText}
          parts={item.stem.ttsParts}
          lang={item.stem.ttsLang}
          size="lg"
          onReplay={onReplay}
        />
        <span className="text-base text-ink/40">没听清就再点一下</span>
      </motion.div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        {item.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            disabled={revealed}
            state={optionState(option.id, option.isCorrect, selectedOptionId, revealed)}
            onSelect={onSelect}
            /*
             * 拼音题的选项**就是答案本身**，朗读出来等于直接报答案，所以不许点读。
             * 英语题的选项是 emoji，朗读的是挂在 `ttsText` 上的中文释义——
             * 她仍然得先听懂 apple 指的是苹果才选得对，不泄题，
             * 而「每个选项可单独点击朗读」是本项目的无障碍硬要求。
             */
            speakOnTap={option.ttsText !== undefined}
          />
        ))}
      </div>
    </div>
  )
}

/** 复用与其他题型一致的选项视觉状态逻辑 */
function optionState(
  optionId: string,
  isCorrect: boolean,
  selectedOptionId: string | null,
  revealed: boolean,
): OptionVisualState {
  return visualState(optionId, isCorrect, selectedOptionId, revealed)
}
