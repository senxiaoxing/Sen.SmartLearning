/**
 * @file 首页问候语 —— 「小恩宝，今天想学点什么？」，点一下会念出来
 * @layer features
 * @see src/domain/encourage/greetingLine.ts  文案与语音怎么拼出来
 *
 * ⭐ 为什么这行字必须能点：
 * 一年级孩子不识字，屏幕上写着她的名字她也看不见，**只有念出来才算数**。
 * 而首屏在「开始学习」之前是没有音频权限的（iOS 要求用户手势），
 * 所以这一下点击同时承担了「我想听」和「解锁音频」两件事——
 * 解锁由 `onSpeak` 的实现方负责，见 HomePage 的 `unlockAllAudio`。
 */

import type { SpokenLine } from '@/domain/encourage/addressed'

interface HomeGreetingProps {
  /** 问候语，来自 `greetingLine(nickname, when)` 或生日当天的 `birthdayLine(nickname)` */
  line: SpokenLine
  /** 点击时朗读。⚠️ 实现方必须先在这个同步栈里解锁 iOS 音频 */
  onSpeak: () => void
  /** 生日当天：句尾用「！」而不是「？」，因为它不是在提问 */
  celebrating?: boolean
}

/**
 * 首页大标题。
 *
 * @example
 * <HomeGreeting line={greetingLine(nickname, 'morning')} onSpeak={() => say(line.utterance)} />
 */
export function HomeGreeting({ line, onSpeak, celebrating = false }: HomeGreetingProps) {
  const mark = celebrating ? '！' : '？'

  return (
    <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
      <button
        type="button"
        // 读屏软件不该把「点一下听一听」念成标题的一部分，但它得知道这里能点
        aria-label={`${line.text}${mark}点一下听一听`}
        onClick={onSpeak}
        className="min-h-touch rounded-blob px-4 py-1"
      >
        {line.text}
        {mark}
      </button>
    </h1>
  )
}
