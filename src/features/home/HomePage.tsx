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
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { PetAvatar } from '@/components/PetAvatar'
import { hasCompletedAssessment } from '@/data/repositories/assessmentRepo'
import { countTodayAttempts } from '@/data/repositories/masteryRepo'
import { loadPendingRetry } from '@/data/repositories/reportRepo'
import { isSubjectOpened, OPENED_SUBJECTS, petDefinitionOf } from '@/data/seed/pets'
import { WARMUP_CLIPS } from '@/data/seed/voiceManifest'
import { levelProgress } from '@/domain/pet/growth'
import { todayLocal } from '@/domain/time'
import { RetryEntry } from '@/features/home/RetryEntry'
import { SubjectPicker } from '@/features/home/SubjectPicker'
import { InstallPrompt } from '@/features/onboarding/InstallPrompt'
import { ParentEntry } from '@/features/parent/ParentEntry'
import { unlockAudio } from '@/platform/audio'
import { unlockSpeechPlayback } from '@/platform/speech'
import { unlockSpeech } from '@/platform/tts'
import { usePetStore } from '@/stores/petStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { Subject } from '@/domain/types'

/**
 * 在用户手势中解锁全部音频通道。
 *
 * ⚠️ 三者都必须**同步**调用，不能 await 任何东西之后再调 ——
 * iOS 只认用户手势那一瞬间的调用栈。
 *
 * 顺带预热数字片段：不预热会出现「有的数字没读出来」——
 * 片段按需加载时会被新的朗读打断，低频数字（如 15）经常整个被吞掉。
 */
function unlockAllAudio(): void {
  unlockSpeech() // Web Speech，仅作缺片段时的兜底
  unlockAudio() // 音效
  unlockSpeechPlayback(WARMUP_CLIPS) // 预生成语音片段
}

export function HomePage() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const gradeLevel = useSessionStore((s) => s.gradeLevel)
  const start = useSessionStore((s) => s.start)
  const startWrongBookRetry = useSessionStore((s) => s.startWrongBookRetry)
  const pets = usePetStore((s) => s.pets)
  const loadPets = usePetStore((s) => s.load)
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
   * 进入答题页。所有开课入口都必须走这里。
   *
   * ⚠️ `unlockAllAudio()` 必须留在这个同步调用栈里 —— 异步之后再调 iOS 会忽略，
   * 后果是全程无声，而孩子不识字，等于 App 报废。
   */
  const enterSession = (begin: () => void) => {
    unlockAllAudio()
    begin()
    navigate('/learn')
  }

  const beginSession = (subject: Subject) => enterSession(() => void start('daily', subject))
  /** 订正的科目由 store 挑（待订正最多的那一科），这里不做决定 */
  const beginRetry = () => enterSession(() => void startWrongBookRetry())

  return (
    <div className="safe-area flex h-full flex-col items-center justify-center gap-12 px-6">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="flex flex-col items-center gap-4"
      >
        {/* 三只科目伙伴。⚠️ 平铺展示，绝不排名——见 CLAUDE.md 产品红线 */}
        <button
          type="button"
          aria-label="我的伙伴"
          onClick={() => navigate('/pets')}
          className="flex items-end gap-2 rounded-blob px-4 py-2"
        >
          {pets.map((pet) => {
            const def = petDefinitionOf(pet.subject, pet.gradeLevel)
            if (def === undefined) return null
            return (
              <PetAvatar
                key={pet.id}
                def={def}
                stageIndex={levelProgress(pet.exp).stage}
                size={pet.subject === 'math' ? 'md' : 'sm'}
                asleep={!isSubjectOpened(pet.subject)}
                animated={false}
              />
            )
          })}
        </button>
        <h1 className="text-3xl font-bold">今天想学点什么？</h1>
      </motion.div>

      {today.total > 0 && (
        <p className="text-xl text-ink/60">
          今天已经做了 <span className="font-bold tabular-nums text-honey">{today.total}</span> 题，
          答对 <span className="font-bold tabular-nums text-mint">{today.correct}</span> 题
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

      {/* 错题订正的长期入口，为什么必须有见 RetryEntry 文件头。
          摸底还没做时不出现——那时既没有错题，也不该分散注意力 */}
      {!needsAssessment && pendingRetry > 0 && (
        <RetryEntry count={pendingRetry} onClick={beginRetry} />
      )}

      {/* 两个独立模块，随时可来反复玩/看，都不绑在答题流程里。
          ⚠️ 进去之前必须解锁音频 —— 这两页的全部内容都是听的 */}
      <div className="flex gap-3">
        <BigButton
          tone="neutral"
          className="px-8 py-4 text-xl"
          onClick={() => {
            unlockAllAudio()
            navigate('/letters')
          }}
        >
          🔤 字母乐园
        </BigButton>
        <BigButton
          tone="neutral"
          className="px-8 py-4 text-xl"
          onClick={() => {
            unlockAllAudio()
            navigate('/explain')
          }}
        >
          💡 看讲解
        </BigButton>
      </div>

      <InstallPrompt />

      {/* 右上角不可见热区，长按 3 秒进家长区（备份/恢复） */}
      <ParentEntry onEnter={() => navigate('/parent')} />
    </div>
  )
}
