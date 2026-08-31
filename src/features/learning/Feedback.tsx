/**
 * @file 答题反馈 —— 答对答错后的即时回应
 * @layer features
 * @see CLAUDE.md 产品红线「答错反馈要温和」
 *
 * 答对：星星 + 上扬语气，给足正反馈。
 * 答错：**绝不用红叉、绝不用刺耳音效、绝不出现「错误」字样**。
 * 文案是「再看看～」而不是「答错了」——这个年龄段孩子放弃学习的首要原因是挫败感，
 * 而不是题目太难。
 *
 * ⭐ **本轮伙伴会在这里说话**：鼓励语池 = 通用鼓励语 + 这只宠物自己的台词。
 * 数学轮听到的是团团的「哇，算对了！」，拼音轮是墨墨的「妙哉妙哉！」——
 * 宠物因此不再只是宠物页里的一个头像，而是陪着她做题的伙伴。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { BigButton } from '@/components/BigButton'
import { MathShape } from '@/components/shape/MathShape'
import { petDefinitionOf } from '@/data/seed/pets'
import { PRAISE_POOL } from '@/data/seed/voiceManifest'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { praiseLine } from '@/domain/encourage/praiseLine'
import { pickLine } from '@/domain/pet/personality'
import { plain, utter, type Utterance } from '@/domain/speech'
import { gradeLevelOf } from '@/domain/types'
import type { PetLine } from '@/data/seed/pets'
import { playSfx } from '@/platform/audio'
import { say } from '@/platform/speech'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { AnswerFeedback } from '@/stores/sessionStore'

interface FeedbackProps {
  feedback: AnswerFeedback
  onNext: () => void
  isLast: boolean
}

/**
 * 答错时说的那句：「（伙伴安慰），答案是 X」。
 *
 * ⭐ 正确答案带片段（`feedback.correctParts`）时**整句走预生成音色**：
 * 伙伴台词（petline.*）与「答案是」（phrase.answerIs / phrase.lookAgain）
 * 都是现成片段。答案拿不到片段就整句 TTS——
 * 绝不「半句真声半句机器声」（design/07 §2.5 的混播禁令）。
 *
 * ⭐ **答案念不出来时（`correctParts` 为空数组）只说安慰语**，不接「答案是」。
 * 方格图案没有名字、`ju` 和 `jü` 念出来一模一样——硬念不是无用而是有害：
 * TTS 会把 `grid:5:00.11` 一个字符一个字符念出来。
 * 正确答案本来就在屏幕上高亮（图案还会画出来），这半句不是唯一的告知途径。
 */
function wrongUtterance(feedback: AnswerFeedback, consolation: PetLine | null): Utterance {
  if (feedback.correctParts?.length === 0) {
    // ⚠️ 这里不能用 phrase.lookAgain —— 那条片段念的是「再看看，**答案是**」，
    //    后面不接答案就成了半句话
    return consolation === null ? plain('再看看') : utter([consolation.clipKey], consolation.text)
  }

  const fallback = `${consolation?.text ?? '再看看'}，答案是 ${feedback.correctSpokenText}`
  if (feedback.correctParts === undefined) return plain(fallback)
  return consolation === null
    ? // phrase.lookAgain 念的就是「再看看，答案是」，与 fallback 文本一致
      utter(['phrase.lookAgain', ...feedback.correctParts], fallback)
    : utter([consolation.clipKey, 'phrase.answerIs', ...feedback.correctParts], fallback)
}

export function Feedback({ feedback, onNext, isLast }: FeedbackProps) {
  const nicknames = useProfileStore((s) => s.nicknames)
  const subject = useSessionStore((s) => s.subject)
  // 陪她做题的是**正在养的**那只，与这轮做的是哪个年级的题无关
  const gradeLevel = gradeLevelOf(useProfileStore((s) => s.grade))
  const pet = petDefinitionOf(subject, gradeLevel)

  /**
   * 通用鼓励语 + 本轮伙伴的台词。
   *
   * 混在一起而不是二选一：全用宠物台词的话，4 句很快就听腻；
   * 掺进通用的 5 句之后，9 句轮换里大约一半带宠物的口吻，
   * 既有性格又不重复。⚠️ 宠物台词也是预生成片段，音色与通用鼓励语一致。
   */
  const pool = useMemo(
    () => (pet === undefined ? PRAISE_POOL : [...PRAISE_POOL, ...pet.personality.correct]),
    [pet],
  )

  // ⚠️ 必须记住这一题选中的那句，否则任何一次重渲染都会换一句鼓励语，
  // 出现「听到的是『太棒了』、屏幕上写的是『真厉害』」。
  // 称呼也在这里一起抽：⭐ 逐题轮换正是它该有的节奏——
  // 十道题听到的不是十遍同一个叫法
  const praise = useMemo(
    () => praiseLine(pickNickname(nicknames, Math.random()), pool, Math.random()),
    [feedback, nicknames, pool], // eslint-disable-line react-hooks/exhaustive-deps
  )

  /** 答错时伙伴说的那句。⚠️ 全是温和口吻的安慰，绝不是判错 */
  const consolation = useMemo(
    () => (pet === undefined ? null : pickLine(pet.personality, 'wrong', Math.random())),
    [feedback, pet], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    // 音效先于语音：音效是即时的，语音有合成延迟。
    // 反过来会让「叮」迟到，孩子先听到人声再听到提示音，节奏是乱的。
    // ⚠️ wrong.wav 是下行小三度 + 慢起音，不是蜂鸣 —— 见 CLAUDE.md 答错反馈红线
    playSfx(feedback.isCorrect ? 'correct' : 'wrong')
    // ⭐ 答错时**不叫名字**：「小恩宝，再看看」听起来像点名。
    //    昵称只出现在正向语境，见 domain/encourage/addressed.ts 的文件头。
    say(feedback.isCorrect ? praise.utterance : wrongUtterance(feedback, consolation))
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
        // 加上昵称后这行最长会到「小恩宝，就是这样！」，iPhone 竖屏放不下 text-4xl，
        // 因此小屏降一档，而不是让它顶出屏幕
        <div className="flex items-center gap-3 text-center text-3xl font-bold text-correct sm:text-4xl">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            className="shrink-0"
          >
            ⭐
          </motion.span>
          <span>{praise.text}！</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* 语气词而非否定判断——不说「错了」。
              伙伴的安慰（「没关系，我也常常数错」）比一句通用的「再看看」更有温度，
              而台词池里每一句都是按这条红线写的，可以直接顶上来 */}
          <p className="text-center text-3xl font-bold text-primary">
            {consolation?.text ?? '再看看～'}
          </p>
          {/* ⭐ 答案是图就**画出来**：方格图案、角、线段的 `correctText` 存的是
              `grid:5:00.11.21.30` 这串画图用的 key，直接显示等于给孩子看天书。
              图形有名字时（正方体、8 点整）图和名字一起给，那是这道题要记住的词 */}
          {feedback.correctImageKey === undefined ? (
            <p className="text-xl text-ink/70">
              答案是 <span className="text-3xl font-bold text-correct">{feedback.correctText}</span>
            </p>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xl text-ink/70">答案是</p>
              <MathShape imageKey={feedback.correctImageKey} />
              {feedback.correctText !== feedback.correctImageKey && (
                <span className="text-2xl font-bold text-correct">{feedback.correctText}</span>
              )}
            </div>
          )}
        </div>
      )}

      <BigButton tone="primary" onClick={onNext}>
        {isLast ? '看看成果' : '下一题'}
      </BigButton>
    </motion.div>
  )
}
