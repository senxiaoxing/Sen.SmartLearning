/**
 * @file 会话小结 —— 一轮结束后的成果、错题回顾与继续入口
 * @layer features
 *
 * 只说做对了多少、今天累计多少，**不展示正确率百分比**：
 * 百分比会把注意力引到「没做对的那些」上。这个阶段要建立的是
 * 「我学了东西」的感觉，不是绩效评估。
 *
 * 「再来一轮」是缩短轮次（25→10 题）后的配套：孩子说 25 题太多，
 * 拆成短轮次后必须给她**自己决定要不要继续**的权利——
 * 主动选择继续和被迫做完 25 题，是完全不同的体验。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { countTodayAttempts } from '@/data/repositories/masteryRepo'
import { playSfx } from '@/platform/audio'
import { todayLocal } from '@/domain/time'
import { PointsEarned } from '@/features/learning/PointsEarned'
import { WrongItemCard } from '@/features/learning/WrongItemCard'
import { PetAvatar } from '@/components/PetAvatar'
import { petDefinitionOf } from '@/data/seed/pets'
import { stageFromLevel } from '@/domain/pet/growth'
import { speak } from '@/platform/tts'
import { usePetStore, type LevelUpNotice } from '@/stores/petStore'
import { useSessionStore } from '@/stores/sessionStore'

export function SessionSummary() {
  const navigate = useNavigate()
  const correctCount = useSessionStore((s) => s.correctCount)
  const answeredCount = useSessionStore((s) => s.answeredCount)
  const wrongItems = useSessionStore((s) => s.wrongItems)
  const isRetrySession = useSessionStore((s) => s.isRetrySession)
  const profileId = useSessionStore((s) => s.profileId)
  const subject = useSessionStore((s) => s.subject)
  const start = useSessionStore((s) => s.start)
  const startRetry = useSessionStore((s) => s.startRetry)
  const reset = useSessionStore((s) => s.reset)
  const pointsEarned = useSessionStore((s) => s.pointsEarned)
  const balance = useSessionStore((s) => s.balance)

  const status = useSessionStore((s) => s.status)
  const levelUpNotice = usePetStore((s) => s.levelUpNotice)
  const [todayTotal, setTodayTotal] = useState(0)

  // 「再来一轮」「订正」把会话切回进行中，这里负责跟着跳回答题页
  useEffect(() => {
    if (status === 'active' || status === 'loading') {
      navigate('/learn', { replace: true })
    }
  }, [status, navigate])

  useEffect(() => {
    if (profileId === null) return
    void countTodayAttempts(profileId, todayLocal()).then((s) => setTodayTotal(s.total))
  }, [profileId, answeredCount])

  useEffect(() => {
    // 升级时用升级音代替完成音，两个一起放会糊在一起，
    // 而且升级本来就该是这一轮最响亮的时刻
    if (answeredCount > 0) {
      playSfx(levelUpNotice !== null ? 'levelUp' : 'complete')
    }

    if (answeredCount === 0) {
      speak('今天没有需要练习的内容')
    } else if (wrongItems.length === 0) {
      speak(`全部答对，太棒了`)
    } else {
      speak(`答对了 ${correctCount} 题，我们一起看看错的题目`)
    }
  }, [correctCount, answeredCount, wrongItems.length, levelUpNotice])

  const allCorrect = answeredCount > 0 && wrongItems.length === 0

  return (
    <div className="safe-area flex h-full flex-col items-center overflow-y-auto px-6 py-8">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="text-7xl"
      >
        {allCorrect ? '🏆' : '🎉'}
      </motion.div>

      {/* 升级放在小结页统一展示，不在答题中途弹窗打断学习流 */}
      {levelUpNotice !== null && <LevelUpBanner notice={levelUpNotice} />}

      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-3xl font-bold">
          {isRetrySession ? '订正完成！' : allCorrect ? '全部答对！' : '这一轮完成啦！'}
        </p>
        <p className="text-xl text-ink/70">
          答对了{' '}
          <span className="text-5xl font-bold tabular-nums text-mint">{correctCount}</span> 题
        </p>
        {todayTotal > answeredCount && (
          <p className="text-base text-ink/50">今天一共做了 {todayTotal} 题</p>
        )}
        <PointsEarned earned={pointsEarned} balance={balance} />
      </div>

      {wrongItems.length > 0 && (
        <section className="mt-8 w-full max-w-md">
          <h2 className="mb-3 text-center text-lg font-bold text-ink/70">
            再看看这几题 · 共 {wrongItems.length} 题
          </h2>
          <div className="flex flex-col gap-3">
            {wrongItems.map((entry, i) => (
              <WrongItemCard key={entry.item.signature} entry={entry} index={i} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex w-full max-w-md flex-col gap-4 pb-4">
        {wrongItems.length > 0 && (
          <BigButton tone="correct" fullWidth onClick={startRetry}>
            订正这 {wrongItems.length} 题
          </BigButton>
        )}

        {/* 「再来一轮」沿用本轮科目：她刚跟小飞龙学完拼音，
            下一轮不该被丢回数学去 */}
        <BigButton tone="primary" fullWidth onClick={() => void start('daily', subject)}>
          再来一轮
        </BigButton>

        <BigButton
          tone="neutral"
          fullWidth
          onClick={() => {
            reset()
            navigate('/', { replace: true })
          }}
        >
          回到首页
        </BigButton>
      </div>
    </div>
  )
}

/**
 * 升级横幅。
 *
 * 形态变化（破壳、进化）给更隆重的展示——那是孩子最期待的时刻，
 * 而普通升级保持轻量，避免每轮都大张旗鼓反而失去分量。
 */
function LevelUpBanner({ notice }: { notice: LevelUpNotice }) {
  const def = petDefinitionOf(notice.subject, notice.gradeLevel)
  const currentStage = def?.stages[stageFromLevel(notice.toLevel)]

  useEffect(() => {
    if (def === undefined || currentStage === undefined) return
    speak(
      notice.stageChanged
        ? `${notice.petName}变身啦！现在是${currentStage.label}`
        : `${notice.petName}升到 ${notice.toLevel} 级啦`,
    )
  }, [notice, def, currentStage])

  if (def === undefined || currentStage === undefined) return null

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className="mb-2 flex items-center gap-3 rounded-blob px-6 py-3"
      style={{ backgroundColor: `${def.themeColor}22` }}
    >
      {/* 变身是这一轮最值得看的一刻，横幅里的这只要动起来 */}
      <PetAvatar def={def} stageIndex={stageFromLevel(notice.toLevel)} size="md" animated />
      <div className="text-left">
        <p className="text-lg font-bold" style={{ color: def.themeColor }}>
          {notice.stageChanged ? `${notice.petName} 变身啦！` : `${notice.petName} 升级了！`}
        </p>
        <p className="text-sm text-ink/60">
          {notice.stageChanged ? `现在是${currentStage.label}` : `Lv${notice.toLevel}`}
        </p>
      </div>
    </motion.div>
  )
}
