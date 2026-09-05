/**
 * @file 一篇短文 —— 整屏课文，逐字可点，⛔ 但整篇不朗读
 * @layer features
 * @see src/data/seed/hanziStories.ts  全文与用字规矩
 * @see design/09-竞品借鉴.md §2.1  为什么不带朗读
 *
 * ## ⛔ 这一页**没有**「读整篇」按钮，也没有整句朗读
 *
 * 这不是还没做，是这一块的立身之本：短文的目的就是**让她自己读出来**。
 * 加上朗读它会变成拼音依赖的加强版——她听得懂、跟得上，
 * 但从来没有独立读过一句。
 *
 * ⚠️ 谁要是觉得「加个喇叭更方便」，请先读 design/09 §2.1 那两条理由，
 * 第二条更硬：TTS 念古诗时会主动往古音上靠（「鬓毛衰」念成 cuī），
 * 而错的读音会跟着她很久。不做成强依赖，就没有这一整类风险。
 *
 * ## 唯一会响的是单个字
 *
 * 点一个字念那个字，用的是识字墙早就有的片段（`hanziClipKey`），零新增语音。
 * 她卡住时的退路是**一个字**，不是一整句——退路太舒服就没人走原路了。
 *
 * ## ⭐ 一次只说一句话
 *
 * 这一页只有一个发声入口（点字），所以不会撞车。
 * ⚠️ 但**别加**「进页面自动念标题」之类的 effect：它会和她随手点的那个字撞上，
 * 而 React 的 effect 顺序保证撞车时自动播报赢、她点的那个输。
 * 见 CLAUDE.md「一次只说一句话」。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { PageHeader } from '@/components/PageHeader'
import { RubyText } from '@/components/RubyText'
import { KNOWN_HANZI, storyById } from '@/data/seed/hanziStories'
import { hanziClipKey, hanziSpokenText } from '@/domain/hanzi'
import { ALL_HANZI_CARDS } from '@/data/seed/hanziCards'
import { storyLineChars } from '@/domain/story'
import { playSfx } from '@/platform/audio'
import { prefetchClips, say, stopSpeech } from '@/platform/speech'

/** 按字查它的识字卡，点读时要用卡上的组词拼出「天。蓝天的天。」 */
const CARD_BY_CHAR = new Map(ALL_HANZI_CARDS.map((card) => [card.char, card]))

export function StoryView() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const story = storyById(id)

  /**
   * 拼音开关，**默认开**。
   *
   * ⭐ 关掉它试着自己读，这个动作本身就是「我长大了」的表达——
   * 一直挂着拼音她会只读拼音不看字，这是这类模块最常见的失败方式。
   *
   * ⚠️ 刻意**不持久化**：每篇重新打开都回到「开」，让「关掉」始终是她
   * 主动做的一个动作。记住选择反而会把那个动作变成一次性的设置，
   * 而它的价值恰恰在于每次都由她按下去。（与诗单不记住选了哪一辑同理。）
   */
  const [showPinyin, setShowPinyin] = useState(true)

  /** 这篇里出现的表内字，进页面就预取——点下去才解码那一下就是「按了没反应」 */
  const clips = useMemo(() => {
    if (story === undefined) return []
    const chars = new Set(
      story.lines.flatMap((line) => [...line.text].filter((c) => KNOWN_HANZI.has(c))),
    )
    return [...chars].map(hanziClipKey)
  }, [story])

  useEffect(() => {
    prefetchClips(clips)
  }, [clips])

  // 乱输的 hash 直接回短文单，不显示错误页——孩子看不懂错误页
  if (story === undefined) return <Navigate to="/stories" replace />

  /**
   * 点一个字。
   *
   * ⭐ 屏幕上所有字长得一样（见 `RubyText`），但**能不能念得对不一样**：
   * 识字 300 里的字有现成片段；「的」「了」这些粘合虚词没有，
   * 而它们**全是轻声字**——喂给 TTS 会念成本调（的 dì、了 liǎo），那是教错音。
   *
   * ⛔ 所以虚词绝不走 TTS，改给一声轻响：她知道「按到了」，
   * 但不会把那一声误当成这个字的读音。这也正是这个模块
   * 「不做成语音强依赖，就没有整类读音风险」的同一条理由（design/09 §2.1）。
   */
  const tapChar = (char: string) => {
    const card = CARD_BY_CHAR.get(char)
    if (card === undefined) {
      playSfx('tap')
      return
    }
    // 与识字墙念的是同一句「天。蓝天的天。」——两处听起来必须一样，
    // 否则同一个字在两个地方是两个声音
    say({ parts: [hanziClipKey(char)], fallbackText: hanziSpokenText(card) })
  }

  return (
    <AppShell width="narrow" layout="stack">
      <PageHeader
        onBack={() => {
          // ⚠️ 必须停掉朗读再走：不停的话这个字会一直念到下一页去
          stopSpeech()
          navigate('/stories')
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

        <div className="mt-5 flex w-full flex-col gap-5">
          {story.lines.map((line) => (
            <RubyText
              key={line.text}
              chars={storyLineChars(line)}
              showPinyin={showPinyin}
              onTapChar={tapChar}
            />
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
          ariaLabel={showPinyin ? '把拼音藏起来，自己读读看' : '把拼音显示出来'}
          onClick={() => setShowPinyin((on) => !on)}
        >
          {showPinyin ? '藏起拼音，我自己读' : '把拼音显示出来'}
        </BigButton>
      </motion.article>
    </AppShell>
  )
}
