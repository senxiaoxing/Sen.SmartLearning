/**
 * @file 听音选字生成器 —— P8.3 拼音拼字（音 → 字）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  每个可用音节都挂着一个汉字载体
 *
 * ## 零新内容的一种新考法
 *
 * 音节表里每个可用音节本来就挂着一个**非多音字的常用汉字**
 * （那是为了让 TTS 读对音而存在的）。把它翻过来用，就是一道
 * 「听 bā，选『八』」的题——不需要任何新数据。
 *
 * 这也正是拼音学到最后要落到的地方：拼音是**认字的工具**，
 * P8 综合应用考的就是能不能从音找到字。
 *
 * ## ⭐ 干扰项优先用同音不同调的字
 *
 * 「妈麻马骂」这类最小对立组是最好的干扰项：孩子选错说明她
 * **听不出声调**（`tone_confusion`），而不是不认识这个字。
 * 池子里没有同音字时才退到音近字。
 */

import { readEnum } from '@/domain/generators/params'
import { isCharUsable, syllableKey, type Syllable } from '@/domain/pinyin'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const OPTION_COUNT = 4

/**
 * 生成一道听音选字题。
 *
 * @param ctx.params.syllables - 候选音节，**必须已用 `usable()` 过滤**（否则没有 `char`）
 * @param ctx.params.tag - 音近干扰项对应的误区，默认 `tone_confusion`
 *
 * @returns `type: 'choice_text'`，题干是喇叭、选项是汉字
 *
 * @example
 * pinyinToChar({ kpId: 'P8.3', difficulty: 3, params: { syllables }, rng })
 * // 播 mā 时：
 * //   妈 → 正确
 * //   马 / 麻 / 骂 → tone_confusion  听不出是第几声
 */
export const pinyinToChar: Generator = ({ kpId, difficulty, params, rng }) => {
  const pool = readSyllables(params)
  const tag = readEnum(
    params,
    'tag',
    ['tone_confusion', 'nl_confusion', 'flat_curl_confusion', 'nasal_confusion'] as const,
    'tone_confusion',
  ) as MisconceptionTag

  const target = pool[Math.floor(rng() * pool.length)] as Syllable

  // ⭐ 同音不同调优先——那是最能说明问题的错法
  const sameSound = pool.filter((s) => s !== target && s.base === target.base)
  const others = pool.filter((s) => s !== target && s.base !== target.base)

  const distractors = [...shuffle(rng, sameSound), ...shuffle(rng, others)]
    // 汉字重复的剔除：两个选项写着同一个字，孩子点哪个都说不清对错
    .filter((s, i, arr) => arr.findIndex((x) => x.char === s.char) === i)
    .filter((s) => s.char !== target.char)
    .slice(0, OPTION_COUNT - 1)

  const options: ItemOption[] = shuffle(rng, [target, ...distractors]).map((s, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: s.char ?? s.pinyin,
    // ⚠️ 选项**不可点读**：念出来就等于直接报答案，这道题考的正是听
    isCorrect: s === target,
    ...(s === target ? {} : { misconceptionTag: tag }),
  }))

  return {
    signature: `${kpId}-tochar#${target.base}${target.tone}`,
    kpId,
    type: 'choice_text',
    difficulty,
    stem: {
      text: '听一听，是哪个字？',
      ttsText: target.pinyin,
      // 题干播的就是那个音节本身，走预生成片段保证声调正确
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options,
    answer: target.char ?? target.pinyin,
  }
}

function readSyllables(params: Record<string, unknown>): Syllable[] {
  const raw = params['syllables']
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('pinyinToChar: 缺少 syllables 参数')
  }
  /**
   * 两道过滤（见 `isCharUsable`）：
   * - 没有 `char` 的进不来——连音频都没有，更谈不上选字
   * - ⭐ `soundOnly` 的也进不来：呼读音的载体（的 讷 乐 诶 韵 鞥 呲）
   *   只负责发声。把「鞥」摆进选项，考的就成了辨认生僻字，
   *   而这道题要考的是「从音找到**她认识的**字」
   */
  const list = (raw as Syllable[]).filter(isCharUsable)
  if (list.length === 0) throw new Error('pinyinToChar: 候选音节都没有可用于认字的汉字载体')
  return list
}
