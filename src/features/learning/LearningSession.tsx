/**
 * @file 答题页 —— 会话的核心界面
 * @layer features
 * @see design/03-技术方案.md §4.1 出题调度器
 *
 * 布局遵循「层级极浅」原则：进度条 + 题目 + 反馈，没有任何二级入口。
 * 一年级孩子在答题时不该看到任何可以点进去的旁支。
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXPLAINERS } from '@/data/seed/explainers'
import { Explainer } from '@/features/learning/Explainer'
import { Feedback } from '@/features/learning/Feedback'
import { ItemRenderer } from '@/items/ItemRenderer'
import { stopSpeech } from '@/platform/speech'
import { useSessionStore } from '@/stores/sessionStore'

export function LearningSession() {
  const navigate = useNavigate()
  const status = useSessionStore((s) => s.status)
  const items = useSessionStore((s) => s.items)
  const index = useSessionStore((s) => s.index)
  const feedback = useSessionStore((s) => s.feedback)
  const answer = useSessionStore((s) => s.answer)
  const next = useSessionStore((s) => s.next)
  const countReplay = useSessionStore((s) => s.countReplay)
  const [showExplainer, setShowExplainer] = useState(false)

  // 跳转必须放在 effect 里：渲染期调用 navigate 会在更新另一个组件的同时
  // 更新当前组件，React 会告警且行为不确定
  useEffect(() => {
    if (status === 'finished') navigate('/summary', { replace: true })
  }, [status, navigate])

  if (status === 'loading') {
    return <CenteredMessage text="正在准备题目…" />
  }
  if (status === 'finished') return null

  const current = items[index]
  if (current === undefined) {
    return <CenteredMessage text="今天没有需要练习的内容～" />
  }

  // 当前题目所属知识点若有原理讲解，给一个入口让她自己决定要不要看
  const explainer = EXPLAINERS.get(current.item.kpId)

  if (showExplainer && explainer !== undefined) {
    // 用浮层而非路由跳转：会话状态全在内存里，离开页面会丢失整轮题目
    return (
      <Explainer
        explainer={explainer}
        doneLabel="继续答题"
        onDone={() => setShowExplainer(false)}
      />
    )
  }

  const progress = items.length === 0 ? 0 : (index / items.length) * 100

  return (
    <div className="safe-area flex h-full flex-col px-6 py-4">
      <header className="flex items-center gap-4">
        <button
          type="button"
          aria-label="退出"
          onClick={() => {
            stopSpeech()
            navigate('/')
          }}
          className="h-12 w-12 shrink-0 rounded-full bg-white/70 text-2xl text-ink/50"
        >
          ×
        </button>

        <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/70">
          {/* initial 必须显式给 0%：不给的话初始渲染是块级元素的默认满宽，
              进度条会先闪一下满格再动画回 0，看起来像「一进来就做完了」 */}
          <motion.div
            className="h-full rounded-full bg-honey"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>

        <span className="shrink-0 text-lg font-bold tabular-nums text-ink/50">
          {index + 1}/{items.length}
        </span>

        {/* 讲解入口只在这道题有原理讲解时出现，且永远是可选的 */}
        {explainer !== undefined && (
          <motion.button
            type="button"
            aria-label={`看${explainer.title}讲解`}
            onClick={() => {
              stopSpeech()
              setShowExplainer(true)
            }}
            whileTap={{ scale: 0.92 }}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-grape/15 px-4 text-base font-bold text-grape"
          >
            <span aria-hidden="true">💡</span>
            <span>看讲解</span>
          </motion.button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <ItemRenderer
          item={current.item}
          selectedOptionId={feedback?.selectedOptionId ?? null}
          revealed={status === 'feedback'}
          onSelect={(optionId) => void answer(optionId)}
          onReplay={countReplay}
        />
      </main>

      <footer className="flex min-h-[140px] items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'feedback' && feedback !== null && (
            <Feedback
              key={index}
              feedback={feedback}
              onNext={next}
              isLast={index + 1 >= items.length}
            />
          )}
        </AnimatePresence>
      </footer>
    </div>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-2xl text-ink/60">{text}</div>
  )
}
