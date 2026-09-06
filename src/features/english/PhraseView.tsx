/**
 * @file 一组英语短句 —— 整屏六句，逐句可点，可连着听一遍
 * @layer features
 * @see src/data/seed/englishPhrases.ts  全部句子与选篇依据
 * @see src/domain/englishPhrase.ts  片段 key 规则
 *
 * ## 英文在上、中文在下，一句一块
 *
 * 与古诗的「拼音在上、汉字在下」是同一个排版意图，只是**不逐字对齐**：
 * 英语的读音落在词上不落在字母上，逐字母标注既没有意义也挤不下。
 * 她要的是「这一整句念出来是什么声音、意思是什么」。
 *
 * 长按一句会慢一档——与诗句同一个手势（`useHoldToSlow`）。
 * 跟读时想磨的本来就是**某一句**，而不是整组。
 *
 * ## ⭐ 一次只说一句话
 *
 * 这一页有两个发声入口（整组、单句），但**任何时刻只有一个在响**：
 * `say()` 本身是打断式的，后一次调用会掐掉前一次。
 * 所以这里绝不能有「进页面自动念话题名」之类的 effect ——
 * 它会和孩子随手点的那一句撞车，而 React 的 effect 顺序保证撞车时
 * 自动播报赢、她点的那句输。见 CLAUDE.md「一次只说一句话」。
 *
 * 进页面不自动朗读还有一个硬理由：iOS 禁止无手势的播放。
 */

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { PageHeader } from '@/components/PageHeader'
import { phraseTopicById } from '@/data/seed/englishPhrases'
import {
  phraseLineClipKeys,
  phraseLineUtterance,
  wholeTopicUtterance,
} from '@/domain/englishPhrase'
import { prefetchClips, say, stopSpeech } from '@/platform/speech'
import { useHoldToSlow } from '@/platform/useHoldToSlow'
import type { PhraseLine } from '@/domain/englishPhrase'

/** 长按放慢时，不让 iOS 的系统菜单把这一下抢走 */
const HOLDABLE = 'select-none touch-manipulation [-webkit-touch-callout:none]'

export function PhraseView() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const topic = phraseTopicById(id)

  /**
   * 进页面把这一组的六条片段预取好。
   *
   * ⚠️ 「全部读一遍」是一次播六条，不预取的话第一次点下去要等六次
   * fetch + 解码 —— 那一下就是「按了没反应」。
   * `topic` 可能是 undefined（乱输 hash），此时不取。
   */
  useEffect(() => {
    if (topic === undefined) return
    prefetchClips(phraseLineClipKeys(topic))
  }, [topic])

  // 乱输的 hash（如 #/phrases/abc）直接回话题单，不显示错误页——
  // 孩子看不懂错误页，而「回到能选话题的地方」永远是对的
  if (topic === undefined) return <Navigate to="/phrases" replace />

  return (
    <AppShell width="narrow" layout="stack">
      <PageHeader
        onBack={() => {
          // ⚠️ 必须停掉朗读再走：不停的话这一组会一直念到下一页去
          stopSpeech()
          navigate('/phrases')
        }}
        backLabel="返回"
      />

      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="flex flex-col items-center gap-1 pb-6"
      >
        <span className="text-4xl leading-none" aria-hidden="true">
          {topic.emoji}
        </span>
        <h1 className="pt-2 text-3xl font-bold text-primary">{topic.title}</h1>
        <p className="text-base text-ink/45">{topic.titleEn}</p>

        <div className="mt-5 flex w-full flex-col gap-3">
          {topic.lines.map((line, index) => (
            <PhraseLineButton key={line.en} topicId={topic.id} index={index} line={line} />
          ))}
        </div>

        <BigButton
          tone="primary"
          className="mt-5 px-10 py-5 text-2xl"
          onClick={() => say(wholeTopicUtterance(topic))}
        >
          全部听一遍
        </BigButton>
      </motion.article>
    </AppShell>
  )
}

interface PhraseLineButtonProps {
  topicId: string
  /** 这句在话题里排第几，拼片段 key 用 */
  index: number
  line: PhraseLine
}

/**
 * 一句短语。**按住会慢一档**——跟读要磨的就是某一句。
 *
 * 单独成组件是因为 hook 不能写在 `map` 里，而每一句都要有自己的长按状态。
 */
function PhraseLineButton({ topicId, index, line }: PhraseLineButtonProps) {
  const utteranceOf = () => phraseLineUtterance(topicId, index, line)
  const { holdProps, consumeHold } = useHoldToSlow(utteranceOf)

  return (
    <button
      type="button"
      // 读屏念中文：家长开读屏时要知道这句是什么意思，英文原文他自己看得见
      aria-label={`${line.en}，${line.zh}`}
      {...holdProps}
      onClick={() => {
        if (consumeHold()) return
        say(utteranceOf())
      }}
      // 触控区做满一整行：她点的是「这一句」，不是某个词
      className={`flex flex-col items-center gap-1 rounded-blob px-3 py-3 active:bg-surface/70 ${HOLDABLE}`}
    >
      {/* 英文比中文大一号：这一页要她看的是英文，中文是拐杖 */}
      <span className="text-2xl font-bold leading-snug">{line.en}</span>
      <span className="text-base text-ink/55">{line.zh}</span>
    </button>
  )
}
