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
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { countTodayAttempts } from '@/data/repositories/masteryRepo'
import { petNameClipKey } from '@/data/seed/voiceManifest'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { summaryLine } from '@/domain/encourage/summaryLine'
import type { LevelUpFacts } from '@/domain/encourage/levelUpLine'
import { todayLocal } from '@/domain/time'
import { LevelUpBanner } from '@/features/learning/LevelUpBanner'
import { PointsEarned } from '@/features/learning/PointsEarned'
import { WrongItemCard } from '@/features/learning/WrongItemCard'
import { playSfx } from '@/platform/audio'
import { say } from '@/platform/speech'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
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
  const nicknames = useProfileStore((s) => s.nicknames)
  const [todayTotal, setTodayTotal] = useState(0)

  /**
   * 这一轮小结用哪个称呼。
   *
   * ⚠️ 抽一次给标题和语音共用：各抽各的会出现「屏幕上写着小恩宝、
   * 耳朵里听到恩宝」。依赖 `answeredCount` 是为了每完成一轮重新抽，
   * 而不是每次重渲染都抽。
   */
  const nickname = useMemo(
    () => pickNickname(nicknames, Math.random()),
    [nicknames, answeredCount],
  )

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

    // ⭐ 升级播报拼进同一句话，不让横幅自己再念一遍 ——
    //    两个 effect 各自朗读会互相打断，升级那句从来没被听全过。
    //    见 domain/encourage/levelUpLine.ts 的文件头
    const levelUp: LevelUpFacts | undefined =
      levelUpNotice === null
        ? undefined
        : {
            petName: levelUpNotice.petName,
            // 孩子改过宠物名就查不到片段，那时整句会降级为 TTS
            petNameClipKey: petNameClipKey(levelUpNotice.petName),
            toLevel: levelUpNotice.toLevel,
            stageChanged: levelUpNotice.stageChanged,
          }

    say(
      summaryLine(
        nickname,
        {
          answered: answeredCount,
          correct: correctCount,
          pendingWrong: wrongItems.length,
        },
        levelUp,
      ).utterance,
    )
  }, [correctCount, answeredCount, wrongItems.length, levelUpNotice, nickname])

  const allCorrect = answeredCount > 0 && wrongItems.length === 0

  return (
    <AppShell width="wide">
      <div className="flex flex-col items-center py-4">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          {/* 全对给奖杯，其余给闪光。⚠️ 不用 🎉 彩带：「派对」调子每轮都放会迅速贬值，
              而一轮只有 10 题，完成本来就该是平常事 */}
          <Icon
            name={allCorrect ? 'trophy' : 'sparkles'}
            className={`h-20 w-20 ${allCorrect ? 'text-primary' : 'text-correct'}`}
          />
        </motion.div>

        {/* 升级放在小结页统一展示，不在答题中途弹窗打断学习流 */}
        {levelUpNotice !== null && <LevelUpBanner notice={levelUpNotice} />}

        <div className="mt-4 flex flex-col items-center gap-2">
          {/* 标题里的昵称与语音的开头一致（都是「小恩宝，」），
              两个通道说的是同一句话，不会互相打架 */}
          <p className="text-center text-3xl font-bold">
            {nickname.text.length > 0 && `${nickname.text}，`}
            {isRetrySession ? '订正完成！' : allCorrect ? '全部答对！' : '这一轮完成啦！'}
          </p>
          <p className="text-xl text-ink/70">
            答对了{' '}
            <span className="text-5xl font-bold tabular-nums text-correct">{correctCount}</span> 题
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
    </AppShell>
  )
}
