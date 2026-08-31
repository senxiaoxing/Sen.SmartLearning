/**
 * @file 听音辨声母生成器 —— P2 声母各组
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  音节表
 *
 * ## ⭐ 换一个提问对象，题量就不再等于音节数
 *
 * 「听 gē 选 gē」的题量恰好等于呼读音的个数——P2.3 教 g k h 就只有 3 道。
 * 但**声母 g 可以用任何含 g 的音节来考**：gē（哥）、gǔ（鼓）、gǒu（狗）……
 * 提问从「这是哪个音节」换成「这个音的声母是什么」，
 * 题量立刻变成「含这几个声母的音节总数」。
 *
 * 教学上也更好：孩子在真实音节里听声母，比听孤立的呼读音更接近实际用法
 * （课本教 b 时念「玻」，但她真正要会的是在「爸」「白」里听出 b）。
 *
 * ## ⚠️ 选项不可点读
 *
 * 选项是声母字母，念出来就等于直接报答案——这道题考的正是听。
 * 与 `pinyinListen` 同一条规矩。
 */

import { initialOf, syllableKey, type Syllable } from '@/domain/pinyin'
import { pinyinCallName } from '@/domain/pinyinCallName'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const OPTION_COUNT = 4

/**
 * 生成一道听音辨声母题。
 *
 * @param ctx.params.syllables - 候选音节，**必须已用 `usable()` 过滤**
 * @param ctx.params.initials - 本知识点教的声母，如 `['g', 'k', 'h']`。选项从这里出
 * @param ctx.params.tag - 答错时记的认知误区
 *
 * @returns `type: 'choice_audio'`，题干是喇叭、选项是声母字母
 *
 * @example
 * pinyinInitial({ kpId: 'P2.3', difficulty: 2, params: { syllables, initials: ['g','k','h'] }, rng })
 * // 播「鼓」gǔ 时：
 * //   g → 正确
 * //   k / h / j → 声母听混了
 */
export const pinyinInitial: Generator = ({ kpId, difficulty, params, rng }) => {
  const taught = readInitials(params)
  const pool = readSyllables(params, taught)
  const tag = (params['tag'] as MisconceptionTag | undefined) ?? 'flat_curl_confusion'

  const target = pool[Math.floor(rng() * pool.length)] as Syllable
  const answer = initialOf(target.base)
  const callClip = pinyinCallName(answer)

  // 干扰项优先用本组教的其他声母——那才是这个知识点要区分的对象
  const sameGroup = taught.filter((i) => i !== answer)
  const distractors = shuffle(rng, sameGroup).slice(0, OPTION_COUNT - 1)

  const options: ItemOption[] = shuffle(rng, [answer, ...distractors]).map((initial, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: initial,
    isCorrect: initial === answer,
    ...(initial === answer ? {} : { misconceptionTag: tag }),
  }))

  return {
    signature: `${kpId}-initial#${target.base}${target.tone}`,
    kpId,
    type: 'choice_audio',
    difficulty,
    stem: {
      text: '听一听，它的声母是哪个？',
      ttsText: target.pinyin,
      // 题干播的就是那个音节，走预生成片段保证声调正确
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options,
    answer,
    /**
     * 「答案是 g」念的是**呼读音**「哥」，和老师带读的一样——
     * 直接把字母 g 喂给 TTS 会读成英文字母名，那是另一个音。
     * 没有干净载体的（见 `pinyinCallName`）宁可不念，也不教一个可能是错的读音。
     */
    answerSpeech: { parts: callClip === undefined ? [] : [callClip], text: answer },
  }
}

/** 本知识点教的声母。缺省时抛错——没有它就出不了选项 */
function readInitials(params: Record<string, unknown>): string[] {
  const raw = params['initials']
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('pinyinInitial: initials 至少要两个，否则选项凑不出来')
  }
  return raw as string[]
}

/**
 * 候选音节：只留声母确实在本组内的。
 *
 * ⚠️ 过滤是必需的：模板往往直接把一大批音节丢进来，
 * 若混进声母不在 `initials` 里的（如 P2.3 的池子里混了 `bā`），
 * 正确答案 `b` 根本不在选项里，孩子怎么选都是错的。
 */
function readSyllables(params: Record<string, unknown>, taught: readonly string[]): Syllable[] {
  const raw = params['syllables']
  if (!Array.isArray(raw)) throw new Error('pinyinInitial: 缺少 syllables 参数')

  const list = (raw as Syllable[]).filter((s) => taught.includes(initialOf(s.base)))
  if (list.length === 0) {
    throw new Error(`pinyinInitial: 没有任何音节的声母落在 ${taught.join('/')} 里`)
  }
  return list
}
