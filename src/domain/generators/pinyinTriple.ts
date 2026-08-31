/**
 * @file 三拼音节生成器 —— P3.2（声母 + 介母 + 韵母）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/items/PinyinBlend.tsx  三个槽的拖拽交互
 * @see src/domain/generators/pinyinBlend.ts  两拼版（P3.1），同一个题型
 *
 * ## ⭐ 介母是唯一要诊断的部件
 *
 * 三拼音节的错误几乎只有一种：**漏掉或搞错中间那个介母**
 * （`jiā` 拼成 `jā`、`huā` 拼成 `hā`），即 `three_syllable_missing_medial`。
 * 声母和韵母孩子在 P2/P4 已经练熟了。
 *
 * 所以干扰排列固定包含「介母放错」那一种，且介母候选里
 * 必然有 `i` `u` `ü` 三个中的至少两个——只给一个正确选项等于送分。
 *
 * ## ⚠️ 三个槽都必须填满，「漏掉介母」怎么表达
 *
 * 交互上孩子拖满三个槽，摆不出「只有两段」的结果，
 * 所以「漏掉」在这里表现为**介母槽放了错的介母**。
 * 两者的补救路径相同（回去看三拼音节的三个部件），合用一个标签是合理的。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { shuffle } from '@/domain/generators/rng'
import { syllableKey, type TripleSyllable } from '@/domain/pinyin'
import type { Generator } from '@/domain/types'

/** 介母只有这三个 */
const MEDIALS = ['i', 'u', 'ü'] as const

/** 每类部件给几张卡。太多会让一年级挑花眼 */
const CARD_COUNT = 3

/**
 * 生成一道三拼音节的拼读题。
 *
 * @param ctx.params.triples - 三拼音节候选，**必须已用 `usable()` 过滤**
 *
 * @returns `type: 'drag_combine'`，三个槽：声母 · 介母 · 韵母
 *
 * @example
 * pinyinTriple({ kpId: 'P3.2', difficulty: 3, params: { triples }, rng })
 * // 抽到「家」jiā 时：
 * //   j+i+a → 正确
 * //   j+u+a → three_syllable_missing_medial  介母搞错了
 * //   其他  → 兜底，同样是介母/部件没拼对
 */
export const pinyinTriple: Generator = ({ kpId, difficulty, params, rng }) => {
  const pool = readTriples(params)
  const target = pool[Math.floor(rng() * pool.length)] as TripleSyllable

  const initials = pickCards(rng, pool.map((s) => s.initial), target.initial)
  const finals = pickCards(rng, pool.map((s) => s.final), target.final)
  // 介母只有三个，全给——孩子要在三个里挑对的那个，这才是本题的考点
  const medials = shuffle(rng, [...MEDIALS])

  const correctKey = `${target.initial}+${target.medial}+${target.final}`
  const wrongMedial = MEDIALS.find((m) => m !== target.medial) ?? 'u'

  return {
    signature: `${kpId}-triple#${target.base}${target.tone}`,
    kpId,
    type: 'drag_combine',
    difficulty,
    stem: {
      // ⚠️ 题干不显示拼音，只播音——显示出来就成了照抄
      text: '听一听，拼出这个音节',
      ttsText: target.pinyin,
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options: buildArrangementOptions(
      { key: correctKey, text: target.pinyin },
      [
        {
          key: `${target.initial}+${wrongMedial}+${target.final}`,
          tag: 'three_syllable_missing_medial',
          text: `中间那个音搞错了`,
        },
      ],
      { tag: 'three_syllable_missing_medial', text: '三个部件没拼对' },
    ),
    answer: target.pinyin,
    // 答错时念整个音节（与题干同一条片段）：三个部件分开念反而听不出拼成了什么
    answerSpeech: { parts: [syllableKey(target.base, target.tone)], text: target.pinyin },
    visual: {
      kind: 'blending',
      initials,
      medials,
      finals,
      slotLabels: ['声母', '介母', '韵母'],
    },
  }
}

/**
 * 挑候选卡：必含正确答案，其余从池子里补到 {@link CARD_COUNT} 张。
 *
 * ⚠️ 必须去重——两张一样的卡片，孩子拖哪张都对，
 * 但 `usePlacement` 记的是索引，会让判定看起来随机。
 */
function pickCards(rng: () => number, all: readonly string[], answer: string): string[] {
  const others = shuffle(rng, [...new Set(all)].filter((v) => v !== answer))
  return shuffle(rng, [answer, ...others.slice(0, CARD_COUNT - 1)])
}

function readTriples(params: Record<string, unknown>): TripleSyllable[] {
  const raw = params['triples']
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('pinyinTriple: 缺少 triples 参数')
  }
  return raw as TripleSyllable[]
}
