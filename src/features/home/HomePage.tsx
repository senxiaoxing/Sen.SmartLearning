/**
 * @file 主页 —— App 的唯一入口
 * @layer features
 *
 * ⚠️「开始学习」按钮承担一个关键的技术职责：**在用户手势中解锁 iOS 音频**。
 * 语音合成与音效都必须在这里解锁，否则后续全部静默失败，
 * 而孩子不识字，App 等于报废。
 * 见 design/03-技术方案.md §4.4「iOS 音频三条铁律」。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { hasCompletedAssessment } from '@/data/repositories/assessmentRepo'
import { countTodayAttempts } from '@/data/repositories/masteryRepo'
import { loadPendingRetry } from '@/data/repositories/reportRepo'
import { OPENED_SUBJECTS } from '@/data/seed/pets'
import { birthdayLine, isBirthday } from '@/domain/encourage/birthdayLine'
import { greetingLine } from '@/domain/encourage/greetingLine'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { timeOfDay } from '@/domain/encourage/timeOfDay'
import { plain } from '@/domain/speech'
import { todayLocal } from '@/domain/time'
import { HomeCompanion } from '@/features/home/HomeCompanion'
import { HomeGreeting } from '@/features/home/HomeGreeting'
import { HomePets } from '@/features/home/HomePets'
import { ParentMessageCard } from '@/features/home/ParentMessageCard'
import { PlayEntries } from '@/features/home/PlayEntries'
import { RetryEntry } from '@/features/home/RetryEntry'
import { SubjectPicker } from '@/features/home/SubjectPicker'
import { unlockAllAudio } from '@/features/home/unlockAllAudio'
import { InstallPrompt } from '@/features/onboarding/InstallPrompt'
import { ParentEntry } from '@/features/parent/ParentEntry'
import { say } from '@/platform/speech'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { Subject } from '@/domain/types'

export function HomePage() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const gradeLevel = useSessionStore((s) => s.gradeLevel)
  const start = useSessionStore((s) => s.start)
  const startWrongBookRetry = useSessionStore((s) => s.startWrongBookRetry)
  const pets = usePetStore((s) => s.pets)
  const loadPets = usePetStore((s) => s.load)
  const nicknames = useProfileStore((s) => s.nicknames)
  const birthDate = useProfileStore((s) => s.birthDate)
  const parentMessage = useProfileStore((s) => s.parentMessage)
  const markMessageHeard = useProfileStore((s) => s.markMessageHeard)
  const [today, setToday] = useState({ total: 0, correct: 0 })
  const [needsAssessment, setNeedsAssessment] = useState(false)
  /** 还没解决的错题总数，决定要不要显示「再练一练」 */
  const [pendingRetry, setPendingRetry] = useState(0)

  useEffect(() => {
    if (profileId === null) return
    void countTodayAttempts(profileId, todayLocal()).then(setToday)
    void hasCompletedAssessment(profileId).then((done) => setNeedsAssessment(!done))
    void loadPets(profileId, gradeLevel)
    void loadPendingRetry(profileId).then((groups) =>
      setPendingRetry(groups.reduce((n, g) => n + g.total, 0)),
    )
  }, [profileId, gradeLevel, loadPets])

  const openSubjects = OPENED_SUBJECTS

  /**
   * 这次停留期间用哪个称呼。
   *
   * ⚠️ `useMemo` 锁定在 `nicknames` 上：不缓存的话每次重渲染都会重新抽，
   * 标题会自己跳字（「小恩宝」→「恩宝」），看起来像出了故障。
   * 轮换发生在**每次回到首页**，而不是每一帧。
   */
  const nickname = useMemo(() => pickNickname(nicknames, Math.random()), [nicknames])

  // 生日当天换一句话、给伙伴挂个蛋糕，**不给任何奖励**——
  // 挂上奖励它就变成又一个每日任务了。见 domain/encourage/birthdayLine.ts
  const birthday = isBirthday(birthDate, todayLocal())
  // 时段在这里读系统时间而不是 domain 里读 —— domain 必须保持纯函数可测试
  const greeting = birthday
    ? birthdayLine(nickname)
    : greetingLine(nickname, timeOfDay(new Date().getHours()))

  /**
   * 进入答题页。所有开课入口都必须走这里。
   *
   * ⚠️ `unlockAllAudio()` 必须留在这个同步调用栈里 —— 异步之后再调 iOS 会忽略，
   * 后果是全程无声，而孩子不识字，等于 App 报废。
   */
  const enterSession = (begin: () => void) => {
    unlockAllAudio(nickname)
    begin()
    navigate('/learn')
  }

  const beginSession = (subject: Subject) => enterSession(() => void start('daily', subject))
  /** 订正的科目由 store 挑（待订正最多的那一科），这里不做决定 */
  const beginRetry = () => enterSession(() => void startWrongBookRetry())

  return (
    <AppShell width="wide" aside={<HomeCompanion today={today} pendingRetry={pendingRetry} />}>
      <div className="flex flex-col items-center gap-9 sm:gap-11">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="flex flex-col items-center gap-4"
        >
          <HomePets pets={pets} festive={birthday} onOpen={() => navigate('/pets')} />
          {/* 点击是用户手势，顺手把音频解锁了 —— 见 HomeGreeting 的文件头 */}
          <HomeGreeting
            line={greeting}
            celebrating={birthday}
            onSpeak={() => {
              unlockAllAudio(nickname)
              say(greeting.utterance)
            }}
          />
        </motion.div>

        {/* 宽屏时这行让位给侧栏的今日面板 —— 同一份信息不在一屏里出现两次 */}
        {today.total > 0 && (
          <p className="text-xl text-ink/60 xl:hidden">
            今天已经做了 <span className="font-bold tabular-nums text-primary">{today.total}</span>{' '}
            题， 答对 <span className="font-bold tabular-nums text-correct">{today.correct}</span> 题
          </p>
        )}

        {needsAssessment ? (
          // 首次使用先做摸底，避免让上过幼小衔接的孩子从「数一数」开始
          <div className="flex flex-col items-center gap-3">
            <BigButton
              tone="primary"
              className="px-12 py-6 text-3xl"
              onClick={() => navigate('/assessment')}
            >
              一起去探险
            </BigButton>
            <button
              type="button"
              onClick={() => beginSession('math')}
              className="px-4 py-2 text-base text-ink/40"
            >
              跳过，直接开始
            </button>
          </div>
        ) : openSubjects.length > 1 ? (
          // 开放了多个科目就让她自己挑 —— 宠物即标签，她认形象不认字
          <SubjectPicker pets={pets} onPick={(subject) => beginSession(subject)} />
        ) : (
          <BigButton
            tone="primary"
            className="px-12 py-6 text-3xl"
            onClick={() => beginSession(openSubjects[0] ?? 'math')}
          >
            开始学习
          </BigButton>
        )}

        {/* 爸妈的留言。排在「开始学习」之后：它是惊喜，不是必经的关卡，
            她想先做题就先做题，信一直在那儿 */}
        {parentMessage !== undefined && (
          <ParentMessageCard
            message={parentMessage}
            onPlay={() => {
              // 点击是用户手势 —— iOS 只认这一瞬间的调用栈。
              // 留言是家长手写的，没有预生成片段，只能走 TTS
              unlockAllAudio(nickname)
              say(plain(parentMessage.text))
              void markMessageHeard()
            }}
          />
        )}

        {/* 错题订正的长期入口，为什么必须有见 RetryEntry 文件头。
            摸底还没做时不出现——那时既没有错题，也不该分散注意力 */}
        {!needsAssessment && pendingRetry > 0 && (
          <RetryEntry count={pendingRetry} onClick={beginRetry} />
        )}

        {/* 六个自由入口（拼音 / 识字 / 古诗 / 字母 / 讲解 / 小屋），都不绑在答题流程里。
            ⚠️ 进去之前必须解锁音频 —— 这几页的全部内容都是听的，
            商店也一样（商品名要念给不识字的孩子听），所以它只从小屋进 */}
        <PlayEntries
          onOpen={(path) => {
            unlockAllAudio(nickname)
            navigate(path)
          }}
        />
      </div>

      <InstallPrompt />

      {/* 右上角不可见热区，长按 3 秒进家长区（备份/恢复） */}
      <ParentEntry onEnter={() => navigate('/parent')} />
    </AppShell>
  )
}
