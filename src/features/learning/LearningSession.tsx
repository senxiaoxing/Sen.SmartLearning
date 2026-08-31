/**
 * @file 答题页 —— 会话的核心界面
 * @layer features
 * @see design/03-技术方案.md §4.1 出题调度器
 *
 * 布局遵循「层级极浅」原则：进度条 + 题目 + 反馈，没有任何二级入口。
 * 一年级孩子在答题时不该看到任何可以点进去的旁支。
 *
 * ⭐ 答题区宽度在任何屏幕上都固定（AppShell 的 `narrow`）。
 * 桌面端把题干摊成一行两米宽只会让她读得更慢——视线扫描距离必须是常量。
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { EXPLAINERS } from '@/data/seed/explainers'
import { SESSION_CLIPS } from '@/data/seed/voiceManifest'
import { Explainer } from '@/features/learning/Explainer'
import { Feedback } from '@/features/learning/Feedback'
import { ItemRenderer } from '@/items/ItemRenderer'
import { resolveAnswerSpeech } from '@/domain/resolveAnswerSpeech'
import { prefetchClips, stopSpeech } from '@/platform/speech'
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

  /**
   * 进会话就预取反馈与小结要用的片段。
   *
   * 首屏预热只管「首屏必需」；这里的（答错引导语、小结语、升级播报件）
   * 只在会话里出现，进会话时取正好。宠物台词已并入 App 挂载的 WARMUP_CLIPS，
   * 不再按科目单独取。
   */
  useEffect(() => {
    prefetchClips(SESSION_CLIPS)
  }, [])

  /**
   * ⭐ 预取本轮全部题目的语音：题干 + 选项点读 + **答错时那句里的答案**。
   *
   * 十道题在会话开始时就已选好（design/03「会话开始前预加载本段全部题目资源」），
   * 转场那零点几秒足够 fetch + 解码完。不取的话每道新题的题干
   * 都要现解码，听感上就是「点了下一题，隔半拍才开口」——
   * 与当初「有的数字没读出来」「按了没反应」同一个根因。
   *
   * ⚠️ 答案片段（`resolveAnswerSpeech`）**必须一起取**：它不在题干里，
   * 却紧跟着答错那一下立刻要播，是全会话最等不起的一句。
   */
  useEffect(() => {
    prefetchClips(
      items.flatMap(({ item }) => [
        ...(item.stem.ttsParts ?? []),
        ...item.options.flatMap((option) => option.ttsParts ?? []),
        ...(resolveAnswerSpeech(item).parts ?? []),
      ]),
    )
  }, [items])

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

  /** 0~1 的比例，直接喂给 scaleX */
  const progress = items.length === 0 ? 0 : index / items.length

  return (
    <AppShell width="narrow" layout="stack">
      <PageHeader
        onBack={() => {
          stopSpeech()
          navigate('/')
        }}
        backLabel="退出"
        backIcon="close"
      >
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface">
          {/*
            ⚠️ 用 scaleX 而不是 width —— 动画 width 会触发 layout，在 iPad 上必掉帧
            （CLAUDE.md 性能红线）。内部条**不加圆角**：外层 overflow-hidden 已经
            裁出左端的半圆，内部再加圆角会被 scaleX 拉成椭圆。
            initial 显式给 0 是必须的：不给的话初始渲染是满宽，进度条会先闪一下满格
            再动画回 0，看起来像「一进来就做完了」。
          */}
          <motion.div
            className="h-full w-full origin-left bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
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
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-4 text-base font-bold text-accent"
          >
            <Icon name="bulb" className="h-5 w-5" />
            {/* 窄屏只留图标：进度条比这几个字重要，挤掉进度条是本末倒置 */}
            <span className="hidden sm:inline">看讲解</span>
          </motion.button>
        )}
      </PageHeader>

      <main className="flex w-full flex-1 flex-col justify-center">
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
    </AppShell>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <AppShell width="narrow">
      <p className="text-center text-2xl text-ink/60">{text}</p>
    </AppShell>
  )
}
