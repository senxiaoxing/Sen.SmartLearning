/**
 * @file 看图选音节生成器 —— P8.2
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  SYLLABLE_PICTURES 图形面
 *
 * ## 拼音学到最后要落到的另一半
 *
 * P8.3 是「听音 → 选字」，这里是「看图 → 选拼音」——
 * 合起来才构成完整的音形对应。孩子看到 🐱，心里念出 māo，
 * 然后要能从几串拼音里挑出 `māo`。
 *
 * ## ⚠️ 这道题不播音
 *
 * 播了就等于报答案。图形面已经给出全部信息，
 * 孩子要做的是**在心里把词念出来再匹配写法**——那正是这个知识点要练的。
 *
 * ## ⭐ 干扰项优先同音不同调
 *
 * `yú`（鱼）与 `yǔ`（雨）这种最小对立组最能说明问题：选错说明声调没听准。
 * 池子里没有同音字时才退到音近的（同声母或同韵母）。
 */

import { displayForm, initialOf, rhymeOf, type Syllable } from '@/domain/pinyin'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
const OPTION_COUNT = 4

/**
 * 生成一道看图选音节题。
 *
 * @param ctx.params.syllables - 候选音节，**必须已用 `usable()` 过滤**
 * @param ctx.params.pictures - `${base}${tone}` → emoji 的映射
 *
 * @returns `type: 'choice_image'`，题干是 emoji、选项是拼音
 *
 * @example
 * pinyinPicture({ kpId: 'P8.2', difficulty: 2, params: { syllables, pictures }, rng })
 * // 图为 🐟（鱼 yú）时：
 * //   yú → 正确
 * //   yǔ → tone_confusion       同音不同调
 * //   其他 → pinyin_form_unlinked  音形对应没建立
 */
export const pinyinPicture: Generator = ({ kpId, difficulty, params, rng }) => {
  const pictures = readPictures(params)
  const pool = readSyllables(params, pictures)

  const target = pool[Math.floor(rng() * pool.length)] as Syllable
  const targetForm = displayForm(target)

  // 同音不同调最能说明问题，排在最前
  const sameSound = pool.filter((s) => s !== target && s.base === target.base)
  // 其次是音近的：声母或韵母之一相同
  const nearby = pool.filter(
    (s) =>
      s !== target &&
      s.base !== target.base &&
      (initialOf(s.base) === initialOf(target.base) || rhymeOf(s) === rhymeOf(target)),
  )
  const rest = pool.filter(
    (s) => s !== target && !sameSound.includes(s) && !nearby.includes(s),
  )

  const seen = new Set<string>([targetForm])
  const distractors: Syllable[] = []
  for (const s of [...shuffle(rng, sameSound), ...shuffle(rng, nearby), ...shuffle(rng, rest)]) {
    if (distractors.length >= OPTION_COUNT - 1) break
    const form = displayForm(s)
    if (seen.has(form)) continue
    seen.add(form)
    distractors.push(s)
  }

  const options: ItemOption[] = shuffle(rng, [target, ...distractors]).map((s, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: displayForm(s),
    isCorrect: s === target,
    ...(s === target
      ? {}
      : {
          misconceptionTag:
            s.base === target.base ? ('tone_confusion' as const) : ('pinyin_form_unlinked' as const),
        }),
  }))

  return {
    signature: `${kpId}-pic#${target.base}${target.tone}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: '这是什么？选出它的拼音',
      ttsText: '这是什么，选出它的拼音',
    },
    options,
    answer: targetForm,
    visual: {
      kind: 'figure',
      // 图形面直接用 emoji，不走 SVG —— MathShape 认不出它，
      // 但 StemFigure 的 figure 分支会原样渲染文本
      imageKey: `emoji:${pictures[`${target.base}${target.tone}`] ?? '❓'}`,
    },
  }
}

function readPictures(params: Record<string, unknown>): Record<string, string> {
  const raw = params['pictures']
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('pinyinPicture: 缺少 pictures 参数')
  }
  return raw as Record<string, string>
}

/** 只留有图形面的音节 —— 没有图这道题就无从问起 */
function readSyllables(
  params: Record<string, unknown>,
  pictures: Record<string, string>,
): Syllable[] {
  const raw = params['syllables']
  if (!Array.isArray(raw)) throw new Error('pinyinPicture: 缺少 syllables 参数')

  const list = (raw as Syllable[]).filter((s) => `${s.base}${s.tone}` in pictures)
  if (list.length < OPTION_COUNT) {
    throw new Error(`pinyinPicture: 有图形面的音节不足 ${OPTION_COUNT} 个，凑不出四选一`)
  }
  return list
}
