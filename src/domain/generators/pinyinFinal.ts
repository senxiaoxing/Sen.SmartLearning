/**
 * @file 听音辨韵母生成器 —— P4 复韵母 · P5 鼻韵母各组
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/pinyinInitial.ts  声母版，同一个思路
 *
 * ## ⭐ 与声母版对称：换提问对象，题量不再等于音节数
 *
 * 「听 āi 选 ai」只能用零声母那一个音节出题，P4.1 教 ai/ei/ui 就只有几道。
 * 但**韵母 ai 可以用任何含 ai 的音节来考**：hǎi（海）· bái（白）· cài（菜）· huài（坏）。
 *
 * 教学上同样更好：孩子真正要会的是在「海」「白」里听出 ai，
 * 而不是只认得孤立的那个 āi。
 *
 * ## ⚠️ 韵母取 `rhymeOf` 而不是 `finalOf`
 *
 * 三拼音节 `xiǎo` 去掉声母是 `iao`，但教学上它的韵母是 `ao`（`i` 是介母）。
 * 用 `finalOf` 会让全部三拼音节匹配不上任何韵母组，白白浪费掉。
 */

import { rhymeOf, syllableKey, type Syllable } from '@/domain/pinyin'
import { pinyinCallName } from '@/domain/pinyinCallName'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const OPTION_COUNT = 4

/**
 * 生成一道听音辨韵母题。
 *
 * @param ctx.params.syllables - 候选音节，**必须已用 `usable()` 过滤**
 * @param ctx.params.finals - 本知识点教的韵母，如 `['ai', 'ei', 'ui']`。选项从这里出
 * @param ctx.params.tag - 答错时记的认知误区
 *
 * @returns `type: 'choice_audio'`，题干是喇叭、选项是韵母
 *
 * @example
 * pinyinFinal({ kpId: 'P4.1', difficulty: 2, params: { syllables, finals: ['ai','ei','ui'] }, rng })
 * // 播「海」hǎi 时：
 * //   ai → 正确
 * //   ei / ui → ei_ie_swap 之类，看模板给的 tag
 */
export const pinyinFinal: Generator = ({ kpId, difficulty, params, rng }) => {
  const taught = readFinals(params)
  const pool = readSyllables(params, taught)
  const tag = (params['tag'] as MisconceptionTag | undefined) ?? 'nasal_confusion'

  const target = pool[Math.floor(rng() * pool.length)] as Syllable
  const answer = rhymeOf(target)
  const callClip = pinyinCallName(answer)

  // 干扰项优先用本组教的其他韵母——那才是这个知识点要区分的对象。
  // ⚠️ 没有可用音节的韵母（如 ei 缺载体）照样能当选项：选项是文字，不播音
  const distractors = shuffle(rng, taught.filter((f) => f !== answer)).slice(0, OPTION_COUNT - 1)

  const options: ItemOption[] = shuffle(rng, [answer, ...distractors]).map((final, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: final,
    isCorrect: final === answer,
    ...(final === answer ? {} : { misconceptionTag: tag }),
  }))

  return {
    signature: `${kpId}-final#${target.base}${target.tone}`,
    kpId,
    type: 'choice_audio',
    difficulty,
    stem: {
      text: '听一听，它的韵母是哪个？',
      ttsText: target.pinyin,
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options,
    answer,
    /**
     * 「答案是 ai」念的是**呼读音**「哀」，与老师带读一致。
     * ⚠️ `ong` 没有汉字载体（见 `pinyinCallName`），那一档宁可不念——
     * 念一个靠 TTS 猜出来的声调，比不念糟。
     */
    answerSpeech: { parts: callClip === undefined ? [] : [callClip], text: answer },
  }
}

/** 本知识点教的韵母。至少两个，否则选项凑不出来 */
function readFinals(params: Record<string, unknown>): string[] {
  const raw = params['finals']
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('pinyinFinal: finals 至少要两个，否则选项凑不出来')
  }
  return raw as string[]
}

/**
 * 候选音节：只留韵母确实在本组内的。
 *
 * ⚠️ 不过滤的话会出现「正确答案不在选项里」——模板往往把整张表丢进来，
 * 抽到 `bā`（韵母 a）而选项只有 ai/ei/ui，孩子怎么选都是错的。
 */
function readSyllables(params: Record<string, unknown>, taught: readonly string[]): Syllable[] {
  const raw = params['syllables']
  if (!Array.isArray(raw)) throw new Error('pinyinFinal: 缺少 syllables 参数')

  const list = (raw as Syllable[]).filter((s) => taught.includes(rhymeOf(s)))
  if (list.length === 0) {
    throw new Error(`pinyinFinal: 没有任何音节的韵母落在 ${taught.join('/')} 里`)
  }
  return list
}
