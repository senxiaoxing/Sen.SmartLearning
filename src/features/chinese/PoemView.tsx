/**
 * @file 一首诗 —— 整屏诗文，逐句可点，可读整首
 * @layer features
 * @see src/data/seed/poems.ts  全文、拼音与译文
 * @see src/domain/poem.ts  片段 key 规则
 *
 * ## 拼音在上、汉字在下，逐句对齐
 *
 * 这是课本上古诗注音的标准排版。⚠️ 两行必须**逐字对齐**，
 * 孩子是照着上下对着念的，错位一个字她就会把音安到隔壁字上——
 * 由 `poems.test.ts` 校验字数一致。
 *
 * ## ⭐ 一次只说一句话
 *
 * 这一页有三个发声入口（整首、单句、译文），但**任何时刻只有一个在响**：
 * `say()` 本身是打断式的，后一次调用会掐掉前一次。
 * 所以这里绝不能有「进页面自动念标题」之类的 effect ——
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
import { poemById } from '@/data/seed/poems'
import {
  poemLineClipKey,
  poemLineClipKeys,
  poemMeaningClipKey,
  poemTitleClipKey,
  wholePoemUtterance,
} from '@/domain/poem'
import { prefetchClips, say, stopSpeech } from '@/platform/speech'
import { useHoldToSlow } from '@/platform/useHoldToSlow'
import type { PoemLine as PoemLineData } from '@/domain/poem'

/** 长按放慢时，不让 iOS 的系统菜单把这一下抢走 */
const HOLDABLE = 'select-none touch-manipulation [-webkit-touch-callout:none]'

export function PoemView() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const poem = poemById(id)

  // ⚠️ 必须排在下面那个 early return 之前 —— hooks 不能在条件之后调。
  //    取话的函数只在长按真的触发时才求值，那时 early return 早就走过了
  //
  // ⛔ 「读整首」不加长按：四句连着慢放太长，而背诵时要反复磨的本来就是**某一句**
  const meaningHold = useHoldToSlow(() => ({
    parts: [poemMeaningClipKey(id)],
    fallbackText: poemById(id)?.meaning ?? '',
  }))

  /**
   * 进页面把这首诗的全部片段预取好。
   *
   * ⚠️ 「读整首」是一次播 4 条片段，不预取的话第一次点下去要等 4 次
   * fetch + 解码 —— 那一下就是「按了没反应」。
   * `poem` 可能是 undefined（乱输 hash），此时不取。
   */
  useEffect(() => {
    if (poem === undefined) return
    prefetchClips([
      poemTitleClipKey(poem.id),
      ...poemLineClipKeys(poem),
      poemMeaningClipKey(poem.id),
    ])
  }, [poem])

  // 乱输的 hash（如 #/poems/abc）直接回诗单，不显示错误页——
  // 孩子看不懂错误页，而「回到能选诗的地方」永远是对的
  if (poem === undefined) return <Navigate to="/poems" replace />

  // ⭐ 从「静夜思。唐，李白。」报起——报诗名本来就是背诗的一部分，见 domain/poem.ts
  const wholePoem = () => say(wholePoemUtterance(poem))

  return (
    <AppShell width="narrow" layout="stack">
      <PageHeader
        onBack={() => {
          // ⚠️ 必须停掉朗读再走：不停的话这首诗会一直念到下一页去
          stopSpeech()
          navigate('/poems')
        }}
        backLabel="返回"
      />

      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="flex flex-col items-center gap-1 pb-6"
      >
        <h1 className="text-3xl font-bold text-primary">{poem.title}</h1>
        <p className="text-base text-ink/45">
          【{poem.dynasty}】{poem.author}
        </p>

        <div className="mt-5 flex w-full flex-col gap-3">
          {poem.lines.map((line, index) => (
            <PoemLineButton key={line.text} line={line} clipKey={poemLineClipKey(poem.id, index)} />
          ))}
        </div>

        <BigButton tone="primary" className="mt-5 px-10 py-5 text-2xl" onClick={wholePoem}>
          读整首
        </BigButton>

        {/* 译文排在最后：她要的是先听诗、听懂了再问「说的是什么」。
            点一下才念——不点的话它就只是安静地待在那儿 */}
        <button
          type="button"
          aria-label={`译文：${poem.meaning}`}
          {...meaningHold.holdProps}
          onClick={() => {
            if (meaningHold.consumeHold()) return
            say({ parts: [poemMeaningClipKey(poem.id)], fallbackText: poem.meaning })
          }}
          className={`mt-6 w-full rounded-blob bg-surface/70 p-4 text-left active:bg-surface ${HOLDABLE}`}
        >
          <span className="flex items-center gap-2 pb-2 text-lg font-bold text-info">
            <span aria-hidden="true">🌸</span>
            <span>说的是什么</span>
          </span>
          <span className="block text-lg leading-relaxed text-ink/75">{poem.meaning}</span>
        </button>
      </motion.article>
    </AppShell>
  )
}

/**
 * 一句诗。**按住会慢一档**——背诗要反复磨的就是某一句。
 *
 * 单独成组件是因为 hook 不能写在 `map` 里，而每一句都要有自己的长按状态。
 */
function PoemLineButton({ line, clipKey }: { line: PoemLineData; clipKey: string }) {
  const utteranceOf = () => ({ parts: [clipKey], fallbackText: line.spoken ?? line.text })
  const { holdProps, consumeHold } = useHoldToSlow(utteranceOf)

  return (
    <button
      type="button"
      aria-label={line.text}
      {...holdProps}
      onClick={() => {
        if (consumeHold()) return
        say(utteranceOf())
      }}
      // 单句触控区做满一整行：孩子点的是「这一句」，不是某个字
      className={`flex flex-col items-center gap-1 rounded-blob px-3 py-3 active:bg-surface/70 ${HOLDABLE}`}
    >
      <span className="text-base tracking-wide text-ink/45">{line.pinyin}</span>
      <span className="text-3xl font-bold leading-snug tracking-wide">{line.text}</span>
    </button>
  )
}
