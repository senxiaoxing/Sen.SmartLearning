/**
 * @file 摸底测评页 —— 包装成「和小鸡去探险」的起点定位
 * @layer features
 * @see design/01-知识点图谱.md §6 摸底测评
 *
 * ⚠️ 三条不可违背的体验约束：
 * 1. **绝不出现「测试」「考试」字样**，叫「探险」
 * 2. **答错不给红叉**，说「这里有点难，我们回头再来」
 * 3. **不显示得分**，只说走了多远
 *
 * 第一次体验产生挫败感，后面所有功能都白做。这一页的目的是定位起点，
 * 不是评估水平——孩子完全不需要知道自己在被测。
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { PLACEMENT_PROBES } from '@/domain/assessment/placement'
import { addressed } from '@/domain/encourage/addressed'
import { primaryNickname } from '@/domain/encourage/pickNickname'
import { ItemRenderer } from '@/items/ItemRenderer'
import { unlockAudio } from '@/platform/audio'
import { say } from '@/platform/speech'
import { speak, unlockSpeech } from '@/platform/tts'
import { useAssessmentStore } from '@/stores/assessmentStore'
import { useProfileStore } from '@/stores/profileStore'

export function Assessment() {
  const navigate = useNavigate()
  const status = useAssessmentStore((s) => s.status)
  const currentItem = useAssessmentStore((s) => s.currentItem)
  const results = useAssessmentStore((s) => s.results)
  const lastCorrect = useAssessmentStore((s) => s.lastCorrect)
  const startKpName = useAssessmentStore((s) => s.startKpName)
  const start = useAssessmentStore((s) => s.start)
  const answer = useAssessmentStore((s) => s.answer)
  const next = useAssessmentStore((s) => s.next)

  if (status === 'idle') return <Intro onStart={() => void start()} />
  if (status === 'done') return <Done startKpName={startKpName} onFinish={() => navigate('/')} />
  if (currentItem === null) return null

  const step = results.length + (status === 'feedback' ? 0 : 1)

  return (
    <AppShell width="narrow" layout="stack">
      {/* 走过的站插旗，没走到的是小圆点。⚠️ 没有「失败」的标记——
          探险只有走到哪里，没有对错 */}
      <header className="flex items-center justify-center gap-3 py-2">
        {PLACEMENT_PROBES.map((_, i) => (
          <motion.span
            key={i}
            animate={{ scale: i < results.length ? 1 : 0.7, opacity: i < results.length ? 1 : 0.35 }}
            className="flex h-7 w-7 items-center justify-center"
          >
            {i < results.length ? (
              <Icon name="flag" className="h-6 w-6 text-primary" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-ink/40" />
            )}
          </motion.span>
        ))}
      </header>

      <p className="text-center text-base text-ink/50">
        探险第 {step} 站 · 一共 {PLACEMENT_PROBES.length} 站
      </p>

      <main className="flex w-full flex-1 flex-col justify-center">
        <ItemRenderer
          item={currentItem}
          selectedOptionId={null}
          revealed={status === 'feedback'}
          onSelect={answer}
        />
      </main>

      <footer className="flex min-h-[140px] items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'feedback' && (
            <ProbeFeedback
              key={results.length}
              isCorrect={lastCorrect === true}
              onNext={() => void next()}
            />
          )}
        </AnimatePresence>
      </footer>
    </AppShell>
  )
}

/** 探测题的反馈。答错时刻意不显示正确答案——这是定位不是教学，给答案会干扰后续判断 */
function ProbeFeedback({ isCorrect, onNext }: { isCorrect: boolean; onNext: () => void }) {
  useEffect(() => {
    speak(isCorrect ? '走对啦，继续往前' : '这里有点难，我们回头再来')
  }, [isCorrect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-4"
    >
      <p
        className={`flex items-center gap-2 text-2xl font-bold ${
          isCorrect ? 'text-correct' : 'text-primary'
        }`}
      >
        {/* 走不动的那一站给一座山：是「前面有座山」，不是「你失败了」 */}
        <Icon name={isCorrect ? 'flag' : 'mountain'} className="h-7 w-7" />
        {isCorrect ? '走对啦，继续往前！' : '这里有点难，我们回头再来'}
      </p>
      <BigButton tone="primary" onClick={onNext}>
        继续
      </BigButton>
    </motion.div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  const nicknames = useProfileStore((s) => s.nicknames)
  // 用主昵称而不是随机抽：这句话孩子只看一次，用最正式的那个叫法
  const primary = primaryNickname(nicknames)
  /** 「小鸡想知道**小恩宝**能走多远」——把她拉进这个故事里，而不是被测的对象 */
  const who = primary.text.length > 0 ? primary.text : '你'

  return (
    <AppShell width="narrow">
      <div className="flex flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <Icon name="egg" className="h-24 w-24 text-primary" />
        </motion.div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">一起去探险吧！</h1>
          <p className="max-w-sm text-lg leading-relaxed text-ink/60">
            小鸡想知道{who}能走多远。
            <br />
            走不动了也没关系，我们从那里开始一起练。
          </p>
        </div>
        <BigButton
          tone="primary"
          className="px-12 py-6 text-3xl"
          onClick={() => {
            // ⚠️ 必须在用户手势的同步栈里解锁 iOS 音频（语音 + 音效）
            unlockSpeech()
            unlockAudio()
            onStart()
          }}
        >
          出发！
        </BigButton>
      </div>
    </AppShell>
  )
}

function Done({ startKpName, onFinish }: { startKpName: string | null; onFinish: () => void }) {
  const nicknames = useProfileStore((s) => s.nicknames)
  const nickname = primaryNickname(nicknames)

  useEffect(() => {
    // 探险的终点是全程最值得庆祝的一刻，叫上名字。
    // 顺带从实时 TTS 换成预生成片段——这两句本来就在清单里
    const line =
      startKpName === null
        ? addressed(nickname, ['phrase.finishedAll'], '你全部都走完了，太厉害了')
        : addressed(nickname, ['phrase.startHere'], '找到啦，我们从这里开始练习')
    say(line.utterance)
  }, [startKpName, nickname])

  return (
    <AppShell width="narrow">
      <div className="flex flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          <Icon
            name={startKpName === null ? 'trophy' : 'map'}
            className="h-24 w-24 text-primary"
          />
        </motion.div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">
            {startKpName === null ? '全部走完了，太厉害了！' : '找到你的起点啦！'}
          </h1>
          {startKpName !== null && (
            <p className="text-lg text-ink/60">
              我们从 <span className="font-bold text-primary">{startKpName}</span> 开始一起练
            </p>
          )}
        </div>

        <BigButton tone="primary" className="px-10 py-5 text-2xl" onClick={onFinish}>
          开始学习
        </BigButton>
      </div>
    </AppShell>
  )
}
