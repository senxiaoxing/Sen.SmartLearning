/**
 * @file 一篇英语短文 —— 整屏课文，逐词可点，⛔ 但整篇不朗读
 * @layer features
 * @see src/data/seed/englishStories.ts  全文与用词规矩
 * @see src/features/chinese/StoryView.tsx  语文短文，这一页处处对标它
 *
 * ## ⛔ 这一页**没有**「读整篇」按钮，也没有整句朗读
 *
 * 这不是还没做，是这一块的立身之本：短文的目的就是**让她自己读出来**。
 * 加上朗读它会变成中文翻译的加强版——她听得懂、跟得上，
 * 但从来没有独立读过一句英文。
 *
 * ⚠️ 谁要是觉得「英语更该有声音」，请先想清楚这一页与短句页的分工：
 * 要听整句，短句页那十八组每一句都念给她听，还能长按放慢。
 * 这一页存在的全部理由，就是那一页给不了的「她自己读」。
 *
 * ## 唯一会响的是单个词
 *
 * 点一个词念那个词，用的是英语词表早就有的片段（`en.*`），零新增语音。
 * 她卡住时的退路是**一个词**，不是一整句——退路太舒服就没人走原路了。
 *
 * ## ⭐ 一次只说一句话
 *
 * 这一页只有一个发声入口（点词），所以不会撞车。
 * ⚠️ 但**别加**「进页面自动念标题」之类的 effect：它会和她随手点的那个词撞上，
 * 而 React 的 effect 顺序保证撞车时自动播报赢、她点的那个输。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { PageHeader } from '@/components/PageHeader'
import { englishStoryById, storyWordClipKey } from '@/data/seed/englishStories'
import { storyLineWords } from '@/domain/englishStory'
import { playSfx } from '@/platform/audio'
import { prefetchClips, say, stopSpeech } from '@/platform/speech'
import { EnglishLine } from '@/features/english/EnglishLine'

export function EnglishStoryView() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const story = englishStoryById(id)

  /**
   * 中文意思开关，**默认开**。
   *
   * ⭐ 关掉它试着自己读，这个动作本身就是「我长大了」的表达——
   * 一直挂着中文她会只读中文不看英文，这是这类模块最常见的失败方式。
   * 位置与语文短文的拼音开关完全对应。
   *
   * ⚠️ 刻意**不持久化**：每篇重新打开都回到「开」，让「关掉」始终是她
   * 主动做的一个动作。记住选择反而会把那个动作变成一次性的设置，
   * 而它的价值恰恰在于每次都由她按下去。
   */
  const [showZh, setShowZh] = useState(true)

  /** 这篇里有片段的词，进页面就预取——点下去才解码那一下就是「按了没反应」 */
  const clips = useMemo(() => {
    if (story === undefined) return []
    const keys = new Set(
      story.lines
        .flatMap((line) => storyLineWords(line))
        .map((token) => storyWordClipKey(token.word))
        .filter((key): key is string => key !== undefined),
    )
    return [...keys]
  }, [story])

  useEffect(() => {
    prefetchClips(clips)
  }, [clips])

  // 乱输的 hash 直接回短文单，不显示错误页——孩子看不懂错误页
  if (story === undefined) return <Navigate to="/enstories" replace />

  /**
   * 点一个词。
   *
   * ⭐ 屏幕上所有词长得一样（见 `EnglishLine`），但**能不能念得出不一样**：
   * 词表里的实词（cat / red / apple）有现成片段；
   * `the` `is` `and` 这些高频虚词没有，复数形式（`cats`）也刻意不还原。
   *
   * ⛔ 查不到的词绝不走 TTS：一来会把这一页变成「点哪儿都念」，
   * 二来 iOS 的系统英语音色与预生成的儿童音色是两个声音，
   * 同一段文字里冒出另一个人说话比没有声音更奇怪。
   * 改给一声轻响：她知道「按到了」，但不会把那一声误当成这个词的读音。
   * 这与语文短文处理虚词是同一条（见 `features/chinese/StoryView.tsx`）。
   */
  const tapWord = (word: string) => {
    const clipKey = storyWordClipKey(word)
    if (clipKey === undefined) {
      playSfx('tap')
      return
    }
    // ⚠️ 标 en-US：万一片段缺失，兜底也必须走英语引擎，中文引擎念 cat 是教错音
    say({ parts: [clipKey], fallbackText: word, lang: 'en-US' })
  }

  return (
    <AppShell width="narrow" layout="stack">
      <PageHeader
        onBack={() => {
          // ⚠️ 必须停掉朗读再走：不停的话这个词会一直念到下一页去
          stopSpeech()
          navigate('/enstories')
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
          {story.emoji}
        </span>
        <h1 className="pt-2 text-3xl font-bold text-primary">{story.title}</h1>
        <p className="text-base text-ink/45">{story.titleZh}</p>

        <div className="mt-5 flex w-full flex-col gap-5">
          {story.lines.map((line) => (
            <EnglishLine key={line.en} line={line} showZh={showZh} onTapWord={tapWord} />
          ))}
        </div>

        {/*
          ⭐ 开关放在**正文下面**，不在顶部。
          她的主线是从上往下把这篇读完；开关是读完（或读不动）之后才用得上的东西，
          摆在顶部会变成进页面第一眼看到的按钮，反倒像是必须先做的选择。
        */}
        <BigButton
          tone="neutral"
          className="mt-8 px-8 py-4 text-xl"
          ariaLabel={showZh ? '把中文藏起来，自己读读看' : '把中文显示出来'}
          onClick={() => setShowZh((on) => !on)}
        >
          {showZh ? '藏起中文，我自己读' : '把中文显示出来'}
        </BigButton>
      </motion.article>
    </AppShell>
  )
}
