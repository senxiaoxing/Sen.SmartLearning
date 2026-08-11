/**
 * @file 讲解库 —— 独立的原理讲解模块，随时可反复观看
 * @layer features
 * @see src/data/seed/explainers.ts 讲解脚本
 *
 * 独立成模块而非塞进答题流程，是刻意的设计：
 * 强制插播讲解会打断孩子的答题节奏，而她未必需要——
 * 已经会了的知识点被迫看一遍，和内容太简单一样让人厌烦。
 *
 * 把选择权交给她：想看的时候来看，看几遍都行。
 */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { EXPLAINERS } from '@/data/seed/explainers'
import { KNOWLEDGE_POINT_BY_ID } from '@/data/seed/knowledgePoints'
import { Explainer } from '@/features/learning/Explainer'
import { speak } from '@/platform/tts'

export function ExplainerLibrary() {
  const navigate = useNavigate()
  const [openKpId, setOpenKpId] = useState<string | null>(null)

  const opened = openKpId === null ? undefined : EXPLAINERS.get(openKpId)
  if (opened !== undefined) {
    return <Explainer explainer={opened} onDone={() => setOpenKpId(null)} />
  }

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} title="看讲解" />

      <main className="mx-auto mt-6 flex w-full max-w-md flex-1 flex-col gap-4">
        {[...EXPLAINERS.values()].map((explainer, i) => {
          const kp = KNOWLEDGE_POINT_BY_ID.get(explainer.kpId)
          return (
            <motion.button
              key={explainer.kpId}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 26 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                speak(`${explainer.title}`)
                setOpenKpId(explainer.kpId)
              }}
              className="flex items-center gap-4 rounded-blob bg-surface px-6 py-5 text-left shadow-drop-surface"
            >
              <Icon name="bulb" className="h-10 w-10 shrink-0 text-accent" />
              <span className="flex-1">
                <span className="block text-2xl font-bold">{explainer.title}</span>
                <span className="block text-base text-ink/50">
                  {kp?.unitName ?? ''} · {explainer.steps.length} 步
                </span>
              </span>
              <span className="text-2xl text-ink/30">›</span>
            </motion.button>
          )
        })}
      </main>
    </AppShell>
  )
}
