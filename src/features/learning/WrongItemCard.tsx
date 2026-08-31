/**
 * @file 错题卡片 —— 小结页的单条错题回顾
 * @layer features
 *
 * 刻意**只显示题目和正确答案，不显示孩子当时选了什么**。
 * 教育上重复呈现错误答案会强化错误记忆，而且「你当时选了 13」
 * 对一年级孩子只是又一次提醒她做错了。回顾的目的是记住对的，不是复盘错的。
 */

import { motion } from 'framer-motion'
import { MathShape } from '@/components/shape/MathShape'
import { resolveAnswerSpeech } from '@/domain/resolveAnswerSpeech'
import { plain, utter } from '@/domain/speech'
import { say } from '@/platform/speech'
import type { SessionItem } from '@/data/buildSessionItems'

interface WrongItemCardProps {
  entry: SessionItem
  index: number
}

export function WrongItemCard({ entry, index }: WrongItemCardProps) {
  const { item } = entry
  const correctOption = item.options.find((o) => o.isCorrect)
  const correct = correctOption?.text ?? item.answer

  const speech = resolveAnswerSpeech(item)

  /**
   * 点读走预生成片段：题干 parts + 「答案是」 + 答案 parts。
   * 任何一环拿不到就整句 TTS（绝不混播）——与答错反馈同一套规则。
   * 本轮题目的片段在会话开始时就已预取，这里点了就响。
   *
   * ⭐ 答案念不出来的题（图案、拼音写法…，`parts` 为空）**只读题干**：
   * 卡片上的图和高亮已经把答案交代清楚了，硬念只会念出一串 `grid:5:00.11`。
   */
  const readAloud = () => {
    if (speech.parts?.length === 0) {
      say(
        item.stem.ttsParts === undefined
          ? plain(item.stem.ttsText)
          : utter([...item.stem.ttsParts], item.stem.ttsText),
      )
      return
    }

    const sentence = `${item.stem.ttsText}，答案是 ${speech.text}`
    say(
      item.stem.ttsParts === undefined || speech.parts === undefined
        ? plain(sentence)
        : utter([...item.stem.ttsParts, 'phrase.answerIs', ...speech.parts], sentence),
    )
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
      whileTap={{ scale: 0.97 }}
      onClick={readAloud}
      className="flex w-full items-center justify-between gap-3 rounded-blob bg-surface px-5 py-4 text-left shadow-card"
    >
      {/* min-w-0 + break-words 必须成对出现：计数题的题干是十几个 emoji，
          不允许换行的话会把右侧答案挤出卡片外 */}
      <span className="min-w-0 flex-1 break-words text-xl font-bold tabular-nums leading-snug text-ink/80">
        {item.stem.text}
      </span>
      {/* 答案是图就画出来。图案类选项的 text 存的是 `grid:5:00.11` 这串画图用的 key，
          原样显示等于在卡片右侧摆一串乱码。
          ⚠️ 尺寸压到 72：这里是一行卡片的右半边，按图形本来的尺寸（尺子 420）会把题干挤没。
          细节看不清没关系——这张卡片的主要用法是**点一下听**，图只负责让她认出是哪道题 */}
      {correctOption?.imageKey === undefined ? (
        <span className="shrink-0 text-3xl font-bold tabular-nums text-correct">{correct}</span>
      ) : (
        <span className="shrink-0">
          <MathShape imageKey={correctOption.imageKey} size={72} />
        </span>
      )}
    </motion.button>
  )
}
