/**
 * @file 英语短语短句的类型与片段 key 规则
 * @layer domain  纯函数/纯类型，禁止 import React / Dexie / 浏览器 API / data 层
 * @see src/data/seed/englishPhrases.ts  实际的三辑话题（数据在 data 层）
 * @see src/features/english/PhraseView.tsx  点进去看的那一组
 *
 * 与 `domain/poem.ts` 同一个分工，也是同一个形状：
 * **一个话题 ≈ 一首诗**（一组固定的句子，可以逐句听，也可以整组连着听），
 * 所以这里的函数与古诗那边一一对应，只是「句」换成了「短语」。
 *
 * ## ⭐ 为什么不复用 `en.*` 词表里已有的那些句子
 *
 * `englishWords.ts` 里已经有 `Good morning!`、`Thank you!` 的片段，
 * 但短语页**另生成一份**（`en.phrase*`），有两条理由：
 *
 * 1. **语速不同** —— 词表片段是出题用的（常速），短语页是**跟着念**的，
 *    要慢一档（见 `scripts/generate-voices.mjs` 的 `RATE_EN_PHRASE`）。
 *    同一句话在两个地方一快一慢，比多几条 mp3 怪得多。
 * 2. **文本归属不同** —— 词表那些是题库素材，随出题需要随时会改
 *    （换 `face`、调 `family`、拆词条）；短语页是教学内容，改的理由完全不同。
 *    共用一个 key 的话，改题库会静默改掉这一页念的内容。
 *
 * 多出来的那些 mp3 每条约 10KB，与 `orange` 那处已知冗余是同一个判断。
 */

import type { Utterance } from '@/domain/speech'

/** 一条短语或短句 */
export interface PhraseLine {
  /**
   * 英文原文。⭐ 这是「应该念成什么」的权威声明，也是喂给 TTS 的文本。
   *
   * 英语不需要发音载体（拼音那边要挂汉字）：英语音色念英文本来就是母语场景。
   * 见 `domain/english.ts` 的同一段说明。
   */
  en: string
  /**
   * 中文意思。⚠️ 是**说人话的那一句**，不是逐词直译——
   * 「You're welcome.」写「不客气」，不写「你是受欢迎的」。
   */
  zh: string
}

/**
 * 一个话题：一组当场就能用的话。
 *
 * ⭐ 句子**成对排列**（问一句、答一句），这样「全部读一遍」听起来是一段对话，
 * 而不是六条互不相干的清单。祈使句那几组（老师说、在家里）
 * 则按一天里发生的顺序排。
 */
export interface PhraseTopic {
  /**
   * 语义 ID，小驼峰，如 `'greetings'`。
   * ⚠️ 只能是 ASCII 字母数字——它要进语音片段 key，见 {@link phraseLineClipKey}。
   */
  id: string
  /** 中文话题名，卡片上最大的那几个字 */
  title: string
  /** 英文话题名。给家长看，也让她先见一眼这几个词长什么样 */
  titleEn: string
  /** 卡片上的图，给还不识字的她认路用 */
  emoji: string
  lines: readonly PhraseLine[]
}

/**
 * 一辑话题。⚠️ 分辑规矩与识字墙、诗单完全一致：**只往后加辑，不重排、不接长**。
 */
export interface PhraseVolume {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1 2 3，与识字墙、诗单同一套 */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
  topics: readonly PhraseTopic[]
}

/**
 * 第 `index` 句的语音片段 key（从 0 起）。
 *
 * ⭐ **一句一个片段**，理由同古诗（见 `domain/poem.ts`）：
 * 「全部读一遍」是把这些片段按顺序排给播放器，「只听这一句」直接取其中一条，
 * 同一份素材两种用法。
 *
 * @param topicId - 话题 ID，小驼峰 ASCII
 * @param index - 这句在话题里排第几，从 0 起
 * @returns 片段 key
 *
 * @example
 * phraseLineClipKey('greetings', 0)   // 'en.phraseGreetings0'
 */
export function phraseLineClipKey(topicId: string, index: number): string {
  return `en.phrase${topicId.charAt(0).toUpperCase()}${topicId.slice(1)}${index}`
}

/**
 * 这个话题全部句子的片段 key，顺序即朗读顺序。
 *
 * @param topic - 一个话题
 * @returns 逐句片段 key
 *
 * @example
 * phraseLineClipKeys({ id: 'greetings', lines: [l0, l1], ... })
 * // ['en.phraseGreetings0', 'en.phraseGreetings1']
 */
export function phraseLineClipKeys(topic: Pick<PhraseTopic, 'id' | 'lines'>): string[] {
  return topic.lines.map((_line, index) => phraseLineClipKey(topic.id, index))
}

/**
 * 听单独一句。
 *
 * @param topicId - 话题 ID
 * @param index - 这句排第几
 * @param line - 这一句
 * @returns 待朗读语句，直接交给 `say()`
 *
 * @example
 * phraseLineUtterance('greetings', 0, { en: 'Hello!', zh: '你好！' })
 * // { parts: ['en.phraseGreetings0'], fallbackText: 'Hello!', lang: 'en-US' }
 */
export function phraseLineUtterance(topicId: string, index: number, line: PhraseLine): Utterance {
  return {
    parts: [phraseLineClipKey(topicId, index)],
    fallbackText: line.en,
    // ⚠️ 必须标 en-US：片段缺失时兜底走系统 TTS，中文引擎念 Hello 是教错音
    lang: 'en-US',
  }
}

/**
 * 「全部读一遍」句与句之间的停顿（秒）。
 *
 * 比古诗那档（0.4 秒，见 `domain/poem.ts` 的 `POEM_LINE_GAP`）再长一点点：
 * 这一组是**一问一答**，答句前的那一顿本身就是对话的一部分——
 * 「How are you?」紧接着「I'm fine.」听起来像同一个人在自言自语。
 *
 * ⚠️ 别再往上加。过了一秒，六句就散成六段独白，
 * 「这是一段对话」这个感觉就没了。
 */
const PHRASE_LINE_GAP = 0.5

/**
 * 「全部读一遍」要说的话：这个话题的全部句子。
 *
 * ⚠️ 与古诗不同，**不报话题名**。诗题（「静夜思。唐，李白。」）本来就是
 * 背诗的一部分，而话题名（「打招呼 / Greetings」）只是导航标签——
 * 念它等于在教学内容前面先播一句分类名，孩子要学的是后面那六句。
 * 也正因为不念，话题名不占任何语音片段。
 *
 * @param topic - 一个话题
 * @returns 待朗读语句（含句间停顿），直接交给 `say()`
 *
 * @example
 * wholeTopicUtterance(greetings)
 * // { parts: ['en.phraseGreetings0', 'en.phraseGreetings1', …],
 * //   fallbackText: 'Hello! Good morning! …', lang: 'en-US', gap: 0.5 }
 */
export function wholeTopicUtterance(topic: PhraseTopic): Utterance {
  return {
    parts: phraseLineClipKeys(topic),
    fallbackText: topic.lines.map((line) => line.en).join(' '),
    lang: 'en-US',
    gap: PHRASE_LINE_GAP,
  }
}
