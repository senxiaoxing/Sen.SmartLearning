/**
 * @file 答题反馈 —— 答对答错后的即时回应
 * @layer features
 * @see CLAUDE.md 产品红线「答错反馈要温和」
 *
 * 答对：星星 + 上扬语气，给足正反馈。
 * 答错：**绝不用红叉、绝不用刺耳音效、绝不出现「错误」字样**。
 * 文案是「再看看～」而不是「答错了」——这个年龄段孩子放弃学习的首要原因是挫败感，
 * 而不是题目太难。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { playSfx } from '@/platform/audio'
import { speak } from '@/platform/tts'
import type { AnswerFeedback } from '@/stores/sessionStore'

interface FeedbackProps {
  feedback: AnswerFeedback
  onNext: () => void
  isLast: boolean
}

/** 答对时轮换的鼓励语，避免每次都是同一句而显得敷衍 */
const PRAISE = ['太棒了！', '答对啦！', '真厉害！', '就是这样！', '好厉害呀！']

export function Feedback({ feedback, onNext, isLast }: FeedbackProps) {
  const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)] ?? PRAISE[0]!

  useEffect(() => {
    // 音效先于语音：音效是即时的，语音有合成延迟。
    // 反过来会让「叮」迟到，孩子先听到人声再听到提示音，节奏是乱的。
    // ⚠️ wrong.wav 是下行小三度 + 慢起音，不是蜂鸣 —— 见 CLAUDE.md 答错反馈红线
    playSfx(feedback.isCorrect ? 'correct' : 'wrong')
    speak(feedback.isCorrect ? praise : `再看看，答案是 ${feedback.correctText}`)
    // 反馈语只在进入反馈态时播一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex flex-col items-center gap-6"
    >
      {feedback.isCorrect ? (
        <div className="flex items-center gap-3 text-4xl font-bold text-correct">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          >
            ⭐
          </motion.span>
          <span>{praise}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* 语气词而非否定判断——不说「错了」 */}
          <p className="text-3xl font-bold text-primary">再看看～</p>
          <p className="text-xl text-ink/70">
            答案是 <span className="text-3xl font-bold text-correct">{feedback.correctText}</span>
          </p>
        </div>
      )}

      <BigButton tone="primary" onClick={onNext}>
        {isLast ? '看看成果' : '下一题'}
      </BigButton>
    </motion.div>
  )
}
