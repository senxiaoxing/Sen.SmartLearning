/**
 * @file 拼读生成器 —— P3.1 两拼音节（drag_combine）
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §P3 拼读规则（拼音的核心难点全在这）
 * @see src/domain/generators/splitTen.ts  同为 drag_combine，交互一致
 *
 * ⭐ 拼读是拼音的**核心技能**：认得声母、认得韵母，不等于会拼。
 * `b` + `ā` → `bā` 这一步是从「认字母」到「读出字」的关键跨越。
 *
 * 交互与凑十法拆分题**完全一致**（拖/点两个卡片进两个槽），
 * 孩子不用学新操作——她在数学那边已经会了。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { randomPick, shuffle } from '@/domain/generators/rng'
import { syllableKey, type BlendSyllable } from '@/domain/pinyin'
import type { ArrangementDistractor } from '@/domain/generators/arrangements'
import type { Generator } from '@/domain/types'

/** 卡片数量。声母韵母各给几个候选，太多会让六岁孩子扫不过来 */
const INITIAL_CHOICES = 4
const FINAL_CHOICES = 4

/**
 * 生成一道拼读题：给声母卡和韵母卡，拼出听到的音节。
 *
 * 题干是**音频**（听到 `bā`），孩子要拖一个声母 + 一个韵母拼出来。
 * 这比「看着 bā 抄一遍」难得多，也才是真的在练拼读。
 *
 * 干扰排列对照表（以听到 `bā` 为例，正确是 `b` + `a`）：
 *
 * | 摆法 | 标签 | 说明 |
 * |---|---|---|
 * | `b+a` | — | 正确 |
 * | `d+a` / `p+a` | `bd_confusion` / `pq_confusion` | 声母听混或形近混淆 |
 * | `b+e` 等 | `spell_integral` | 韵母听错 |
 * | 其他 | `spell_integral` | 拼读关系还没建立 |
 *
 * @param ctx - 生成上下文。`ctx.params.blends` 由模板注入可用的两拼音节
 * @returns `drag_combine` 题目，`visual` 为 `splitting` 形态（复用同一套组件）
 *
 * @example
 * // 听到「bā」→ 声母卡 [b d p m]，韵母卡 [a e i u]
 * //   摆 b+a → 正确；摆 d+a → bd_confusion
 */
export const pinyinBlend: Generator = ({ kpId, difficulty, params, rng }) => {
  const pool = readBlends(params)
  const target = randomPick(rng, pool)

  const initials = pickCards(rng, pool.map((b) => b.initial), target.initial, INITIAL_CHOICES)
  const finals = pickCards(rng, pool.map((b) => b.final), target.final, FINAL_CHOICES)

  const correctKey = `${target.initial}+${target.final}`

  const options = buildArrangementOptions(
    { key: correctKey, text: `${target.initial} + ${target.final} → ${target.pinyin}` },
    buildDistractors(target, initials, finals),
    // 拼不出来 —— 声母韵母的对应关系还没建立
    { tag: 'spell_integral', text: `要拼成 ${target.pinyin}` },
  )

  return {
    signature: `${kpId}-blend#${target.base}${target.tone}`,
    kpId,
    type: 'drag_combine',
    difficulty,
    stem: {
      // ⚠️ 不显示答案拼音，否则变成照抄
      text: '听一听，拼出这个音节',
      ttsText: target.pinyin,
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options,
    answer: `${target.initial} + ${target.final} → ${target.pinyin}`,
    // 屏幕上的答案是「p + i → pí」这样的算式，念出来只要那个音节本身——
    // 把「加号箭头」念进去，她听到的就不是一个能记住的音了
    answerSpeech: { parts: [syllableKey(target.base, target.tone)], text: target.pinyin },
    visual: {
      kind: 'blending',
      initials,
      finals,
      slotLabels: ['声母', '韵母'],
    },
  }
}

/**
 * 构造诊断性错误拼法。
 *
 * 只列**声母错**的情形：韵母错的组合太多，全枚举没有意义，
 * 由兜底项统一归到 `spell_integral`。而声母混淆是有明确补救路径的
 * （b/d 去做 P7.1 专项），值得单独标出来。
 */
function buildDistractors(
  target: BlendSyllable,
  initials: readonly string[],
  finals: readonly string[],
): ArrangementDistractor[] {
  const CONFUSION: Readonly<Record<string, ArrangementDistractor['tag']>> = {
    b: 'bd_confusion', d: 'bd_confusion',
    p: 'pq_confusion', q: 'pq_confusion',
    f: 'ft_confusion', t: 'ft_confusion',
    n: 'nl_confusion', l: 'nl_confusion',
    z: 'flat_curl_confusion', zh: 'flat_curl_confusion',
    c: 'flat_curl_confusion', ch: 'flat_curl_confusion',
    s: 'flat_curl_confusion', sh: 'flat_curl_confusion',
  }

  return initials
    .filter((i) => i !== target.initial && finals.includes(target.final))
    .map((wrongInitial) => ({
      key: `${wrongInitial}+${target.final}`,
      tag: CONFUSION[wrongInitial] ?? 'spell_integral',
      text: `${wrongInitial} + ${target.final}：声母听错了`,
    }))
    .slice(0, 2)
}

/**
 * 挑卡片：必含正确答案，其余从池子里随机补，最后打乱。
 *
 * 必含正确答案是硬要求——少了它这道题**无解**，
 * 孩子会一直试到放弃，而且掌握度还会记一笔答错。
 */
function pickCards(
  rng: () => number,
  pool: readonly string[],
  required: string,
  count: number,
): string[] {
  const others = [...new Set(pool)].filter((v) => v !== required)
  const picked = shuffle(rng, others).slice(0, Math.max(0, count - 1))
  return shuffle(rng, [required, ...picked])
}

function readBlends(params: Record<string, unknown>): readonly BlendSyllable[] {
  const raw = params.blends
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('pinyinBlend 需要非空的 blends 参数')
  }
  return raw as BlendSyllable[]
}
