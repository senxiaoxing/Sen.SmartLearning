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
import { hasCompletedAssessment } from '@/data/repositories/assessmentRepo'
import { countTodayAttempts } from '@/data/repositories/masteryRepo'
import { loadPendingRetry } from '@/data/repositories/reportRepo'
import { VolumePicker } from '@/components/VolumePicker'
import { GRADE_BADGE, GRADE_NAME } from '@/data/seed/gradeLabels'
import { openedGradeLevels, openedSubjectsOf } from '@/data/seed/pets'
import { birthdayLine, isBirthday } from '@/domain/encourage/birthdayLine'
import { greetingLine } from '@/domain/encourage/greetingLine'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { timeOfDay } from '@/domain/encourage/timeOfDay'
import { plain } from '@/domain/speech'
import { todayLocal } from '@/domain/time'
import { GradeUpCeremony } from '@/features/home/GradeUpCeremony'
import { HomeCompanion } from '@/features/home/HomeCompanion'
import { HomeGates } from '@/features/home/HomeGates'
import { HomeGreeting } from '@/features/home/HomeGreeting'
import { HomeNotices } from '@/features/home/HomeNotices'
import { HomePets } from '@/features/home/HomePets'
import { HomeStartAction } from '@/features/home/HomeStartAction'
import { unlockAllAudio } from '@/features/home/unlockAllAudio'
import { useCompanionPets } from '@/features/home/useCompanionPets'
import { InstallPrompt } from '@/features/onboarding/InstallPrompt'
import { ParentEntry } from '@/features/parent/ParentEntry'
import { say } from '@/platform/speech'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import { gradeLevelOf, type GradeLevel, type Subject } from '@/domain/types'

export function HomePage() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  /** 她在读几年级 —— 养的是这一批伙伴，成果也结算给它们 */
  const gradeLevel = gradeLevelOf(useProfileStore((s) => s.grade))
  /** 这次想做哪个年级的题。`null` = 跟着档案年级走 */
  const contentGrade = useSessionStore((s) => s.contentGradeLevel)
  const setContentGrade = useSessionStore((s) => s.setContentGrade)
  const start = useSessionStore((s) => s.start)
  const startWrongBookRetry = useSessionStore((s) => s.startWrongBookRetry)
  /** 这次实际要做哪个年级的题 */
  const activeGrade = contentGrade ?? gradeLevel
  // ⭐ 形象跟内容年级走，结算不跟（见 useCompanionPets 的文件头）
  const companions = useCompanionPets(profileId, gradeLevel, activeGrade)
  const nicknames = useProfileStore((s) => s.nicknames)
  const birthDate = useProfileStore((s) => s.birthDate)
  const parentMessage = useProfileStore((s) => s.parentMessage)
  const markMessageHeard = useProfileStore((s) => s.markMessageHeard)
  /** 家长刚升了年级，还欠孩子一场过场。见 design/08 §6.3 */
  const pendingGradeUp = useProfileStore((s) => s.pendingGradeUp)
  const dismissGradeUp = useProfileStore((s) => s.dismissGradeUp)
  const [today, setToday] = useState({ total: 0, correct: 0 })
  const [needsAssessment, setNeedsAssessment] = useState(false)
  /** 还没解决的错题总数，决定要不要显示「再练一练」 */
  const [pendingRetry, setPendingRetry] = useState(0)

  useEffect(() => {
    if (profileId === null) return
    void countTodayAttempts(profileId, todayLocal()).then(setToday)
    void hasCompletedAssessment(profileId).then((done) => setNeedsAssessment(!done))
    void loadPendingRetry(profileId).then((groups) =>
      setPendingRetry(groups.reduce((n, g) => n + g.total, 0)),
    )
  }, [profileId])

  /** 已经做好内容的年级。只有多于一个时才值得让她选 */
  const grades = openedGradeLevels()
  // 开放的科目按「要做哪个年级」算——二年级英语做出来之前，那只熊猫还睡着
  const openSubjects = useMemo(() => openedSubjectsOf(activeGrade), [activeGrade])

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

  /**
   * ⭐ 升年级过场挡在整个首页前面。
   *
   * 家长在家长区改的年级，孩子看不到那一下；不拦一次，
   * 她下次打开 App 只会发现企鹅变成了猫。见 design/08 §6.3
   * 「绝不能让 App 无声无息地换掉一切」。
   *
   * 过场自己去读上一批伙伴（它露脸的是旧的那三只，不是新的——
   * 见 `loadPreviousGradePets`），所以这里只把 `profileId` 递进去。
   */
  if (pendingGradeUp !== undefined && profileId !== null) {
    return (
      <GradeUpCeremony
        gradeLevel={pendingGradeUp}
        profileId={profileId}
        nickname={nickname}
        onDismiss={() => void dismissGradeUp()}
      />
    )
  }

  return (
    <AppShell width="wide" aside={<HomeCompanion today={today} pendingRetry={pendingRetry} />}>
      {/*
        ⭐ 间距按「iPad 横屏（1194×834）不用滚」倒推出来。
        主轴最多五段（伙伴问候 / 科目 / 年级 / 提醒 / 两扇门），
        gap-11 时光间距就吃掉 220px，最后那两扇门必掉到折叠线以下——
        而她不会去滚一个「看起来已经完整」的首页，那两扇门等于不存在。
        ⚠️ 往这条主轴上加东西之前，先想清楚要挤掉谁。
      */}
      <div className="flex flex-col items-center gap-6 sm:gap-7">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="flex flex-col items-center gap-4"
        >
          <HomePets pets={companions} festive={birthday} onOpen={() => navigate('/pets')} />
          {/* 点击是用户手势，顺手把音频解锁了 —— 见 HomeGreeting 的文件头 */}
          <HomeGreeting
            line={greeting}
            celebrating={birthday}
            onSpeak={() => {
              unlockAllAudio(nickname)
              say(greeting.utterance)
            }}
          />

          {/*
            今日进度贴在问候语底下当副标题，**不占主轴一段**。
            ⚠️ 这不是排版洁癖：iPad 横屏（1194）够不到 `xl`，这行是显示的，
            而它一旦占掉主轴一段（约 54px），底下那两扇门就会被顶到折叠线以下。
            宽屏（xl 起）让位给侧栏的今日面板——同一份信息不在一屏里出现两次。
          */}
          {today.total > 0 && (
            <p className="text-lg text-ink/60 xl:hidden">
              今天已经做了 <span className="font-bold tabular-nums text-primary">{today.total}</span>{' '}
              题， 答对 <span className="font-bold tabular-nums text-correct">{today.correct}</span>{' '}
              题
            </p>
          )}
        </motion.div>

        <HomeStartAction
          needsAssessment={needsAssessment}
          openSubjects={openSubjects}
          pets={companions}
          onAssess={() => navigate('/assessment')}
          onStart={beginSession}
        />

        {/* ⭐ 年级切换。只在做好了一个以上年级时出现——只有一个年级时，
            多这一层对她是纯粹的干扰（同 SubjectPicker 的出现条件）。
            复用识字墙/诗单那个 VolumePicker：她已经学会「按数字换一批」了 */}
        {grades.length > 1 && (
          <VolumePicker
            volumes={grades.map((g) => ({
              id: g,
              name: GRADE_NAME[g],
              badge: GRADE_BADGE[g],
              hint: g === gradeLevel ? '你现在读的年级' : '换这个年级的题做做看',
            }))}
            activeId={activeGrade}
            onSelect={(id) => setContentGrade(id === gradeLevel ? null : (id as GradeLevel))}
          />
        )}

        {/* 留言与错题订正并成一行。都排在「开始学习」之后：它们是惊喜和邀请，
            不是必经的关卡——她想先做题就先做题，信一直在那儿。
            ⚠️ 摸底还没做时不给「再练一练」：那时既没有错题，也不该分散注意力 */}
        <HomeNotices
          message={parentMessage}
          onPlayMessage={() => {
            // 点击是用户手势 —— iOS 只认这一瞬间的调用栈。
            // 留言是家长手写的，没有预生成片段，只能走 TTS
            unlockAllAudio(nickname)
            if (parentMessage !== undefined) say(plain(parentMessage.text))
            void markMessageHeard()
          }}
          pendingRetry={needsAssessment ? 0 : pendingRetry}
          onRetry={beginRetry}
        />

        {/* 两扇门：宠物小屋 · 学习乐园。⚠️ 进去之前必须解锁音频 ——
            门后面的内容全是听的（商品名要念给不识字的孩子听，
            乐园里每一页都靠朗读），而 iOS 只认手势那一瞬间的调用栈 */}
        <HomeGates
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
