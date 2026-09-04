/**
 * @file 听算题 —— 只报题、不显示算式，听完在心里算
 * @layer items
 * @see src/domain/types.ts  `listen_number` 的说明（为什么它和 input_number 是同一批数据）
 * @see design/09-竞品借鉴.md §2.2  学自小猿口算的听算
 *
 * ## ⛔ 绝不显示 `item.stem.text`
 *
 * 那是算式（`9 + 5 = ?`）。显示出来这道题就变成看算，听力完全不参与——
 * 与 `ChoiceAudio` 的「题面绝不能出现答案拼音」是同一条铁律。
 * 这里连**题目本身**都不给看，喇叭就是全部题面。
 *
 * ## 为什么值得单独做一个题型
 *
 * 看着算靠的是读，听着算要先把数字在脑子里存住再动手——**工作记忆参与了**，
 * 而那正是口算熟练度的一部分。顺带，孩子那句「答题界面单一，都是题目 + 4 个选项」
 * 在这里得到的是最彻底的回答：没有题面。
 *
 * ## ⚠️ 重听不该有任何代价
 *
 * 听算考的是算，不是听力。没听清就再点一次，**次数不影响判定**
 * （`ttsReplayCount` 只进统计，不进 `isCorrect`，也不进掌握度公式）。
 * ⛔ 不做「只念一遍」——那是考试的框架，不是练习的。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { SpeakerButton } from '@/components/SpeakerButton'
import { visualState } from '@/items/InputNumber'
import { OptionButton } from '@/items/OptionButton'
import { say } from '@/platform/speech'
import type { ItemViewProps } from '@/items/ItemRenderer'

/**
 * 声波的每根竖条有多高（px）。中间高两边低，看着才像一段声音。
 *
 * 写死高度而不是让它自适应：这块是**题干框的替身**，尺寸恒定她才认得出
 * 「这里就是题目该在的地方」。
 */
const WAVE_BARS = [18, 34, 52, 40, 58, 34, 20]

export function ListenNumber({
  item,
  selectedOptionId,
  revealed,
  onSelect,
  onReplay,
}: ItemViewProps) {
  // 依赖 item 对象而非 signature —— 签名不含难度，同签名的两道题不会触发重播
  useEffect(() => {
    say({ parts: item.stem.ttsParts ?? [], fallbackText: item.stem.ttsText })
  }, [item])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      {/*
        ⚠️ 这行字是给家长和读屏的，孩子不识字——她认的是下面那个声波框。
        ⛔ 这里绝不能改成 {item.stem.text}，那是算式。
      */}
      <p className="text-2xl text-ink/60">听一听，算一算</p>

      {/*
        ⭐⭐ 题干框**留在原位**，里面画声波。

        上机反馈的担心是「孩子以为程序出问题了、题目没显示出来」——
        而她判断「有没有坏」的依据是**题目该在的地方有没有东西**。
        直接留白，那块空白就是故障；放一个还在动的声波，
        它说的是「题目在这儿，只不过要用耳朵看」。

        ⚠️ 动画只用 scaleY / opacity（GPU 合成），不碰 height（见 CLAUDE.md 性能规范）。
      */}
      <div
        aria-hidden="true"
        className="flex h-[92px] w-full max-w-sm items-center justify-center gap-2 rounded-blob border-4 border-dashed border-info/30 bg-info/5"
      >
        {WAVE_BARS.map((height, i) => (
          <motion.span
            key={i}
            className="w-2.5 rounded-full bg-info/70"
            style={{ height }}
            animate={{ scaleY: [1, 0.45, 1] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: 'easeInOut',
              // 逐根错开，看着才像声音在起伏，而不是一起呼吸
              delay: i * 0.12,
            }}
          />
        ))}
      </div>

      {/* ⭐ 喇叭在这里是题目本身，不是辅助功能，所以给最大尺寸、放在正中 */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex flex-col items-center gap-3"
      >
        <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={onReplay} />
        <span className="text-base text-ink/40">没听清就再点一下</span>
      </motion.div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:gap-6">
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
