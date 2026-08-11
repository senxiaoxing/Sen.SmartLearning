/**
 * @file 知识点讲解 —— 用动画讲清原理，可反复观看
 * @layer features
 * @see src/data/seed/explainers.ts 讲解脚本
 * @see design/05-孩子反馈与响应.md 第 5 条反馈
 *
 * 四条体验约束：
 * 1. **孩子自己点着走**，不自动播放——她需要多久看懂就看多久
 * 2. **每步都朗读**，文字只是辅助（一年级不识字）
 * 3. **永远自愿观看**——不在答题流程里强制插入，由她自己决定要不要看
 * 4. **随时可退出**，也可以反复重看
 *
 * 两种用法：讲解库里的独立页面，以及答题页点「看讲解」弹出的浮层。
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { LooseDots, TenFrame } from '@/components/TenFrame'
import { utter } from '@/domain/speech'
import { prefetchClips, say, stopSpeech } from '@/platform/speech'
import type { Explainer as ExplainerData } from '@/data/seed/explainers'

interface ExplainerProps {
  explainer: ExplainerData
  /** 关闭/看完时调用 */
  onDone: () => void
  /** 最后一步的按钮文案。答题浮层用「继续答题」，讲解库用「看完了」 */
  doneLabel?: string
}

export function Explainer({ explainer, onDone, doneLabel = '看完了' }: ExplainerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = explainer.steps[stepIndex]

  /**
   * 一进来就把整段讲解的片段全部预取。
   *
   * 讲解是孩子自己一步步点着走的，每一步都要立刻出声。按需加载的话
   * 每次点「下一步」都要现 fetch + 解码，听感就是「每一步都慢半拍」——
   * 与当初「有的数字没读出来」是同一个根因（见 voiceManifest.ts 的 WARMUP_CLIPS）。
   * 一段讲解只有四句，代价可以忽略。
   */
  useEffect(() => {
    prefetchClips(explainer.steps.map((s) => s.clipKey))
  }, [explainer])

  useEffect(() => {
    // ⚠️ 讲解句全部预生成了片段（explain.*），不要退回 `{ parts: [] }`——
    // 那会让整段讲解掉成机械合成音，而讲解的全部价值就在于「听懂」
    if (step !== undefined) say(utter([step.clipKey], step.ttsText))
  }, [step])

  useEffect(() => stopSpeech, [])

  if (step === undefined) return null

  const isLast = stepIndex === explainer.steps.length - 1

  return (
    <AppShell width="wide" layout="stack">
      <header className="flex items-center justify-between">
        <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
          {explainer.title}
        </span>
        {/* 随时可退出：讲解是自愿看的，不该有任何「被困住」的感觉。
            ⚠️ 关闭在右上——这是浮层的通用位置，与页面级的左上返回键区分开 */}
        <button
          type="button"
          aria-label="关闭"
          onClick={() => {
            stopSpeech()
            onDone()
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink/50 shadow-card"
        >
          <Icon name="close" className="h-6 w-6" />
        </button>
      </header>

      <div className="mt-2 flex items-center justify-center gap-2">
        {explainer.steps.map((_, i) => (
          // ⚠️ 用 scaleX 而不是动画 width：动 width 触发 layout，必掉帧
          // （CLAUDE.md 性能红线）。宽度固定 28px，未选中时压到 0.36 ≈ 10px
          <motion.span
            key={i}
            animate={{ scaleX: i === stepIndex ? 1 : 0.36, opacity: i <= stepIndex ? 1 : 0.3 }}
            className="h-2.5 w-7 rounded-full bg-accent"
          />
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="flex items-center justify-center gap-6">
          <TenFrame filled={step.frame} emphasis={step.emphasis ?? 'none'} />
          {step.loose > 0 && (
            <LooseDots count={step.loose} emphasis={step.emphasis === 'loose'} />
          )}
        </div>

        {step.formula !== undefined && (
          <AnimatePresence mode="wait">
            <motion.p
              key={step.formula}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-4xl font-bold tabular-nums text-ink/80"
            >
              {step.formula}
            </motion.p>
          </AnimatePresence>
        )}

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-lg text-center text-2xl font-bold leading-relaxed"
          >
            {step.text}
          </motion.p>
        </AnimatePresence>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-4">
        {stepIndex > 0 && (
          <BigButton tone="neutral" onClick={() => setStepIndex((i) => i - 1)}>
            上一步
          </BigButton>
        )}
        <BigButton
          tone="primary"
          onClick={() => {
            if (isLast) {
              stopSpeech()
              onDone()
            } else {
              setStepIndex((i) => i + 1)
            }
          }}
        >
          {isLast ? doneLabel : '下一步'}
        </BigButton>
        {isLast && (
          <BigButton tone="neutral" onClick={() => setStepIndex(0)}>
            再看一遍
          </BigButton>
        )}
      </footer>
    </AppShell>
  )
}
