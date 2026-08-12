/**
 * @file 找不同生成器 —— 四个音节里哪个和其他三个不一样
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  音节表与「汉字载体」约束
 *
 * ## ⭐ 为什么加这个题型
 *
 * 拼音原先只有一种考法（听一个音、选那个拼音），于是**题量恰好等于音节数**：
 * P1.1 教 `a o e` 就只有 3 道题，P2.3 教 `g k h` 也只有 3 道。
 * 一轮 10 题里排到三次同一个知识点就必然重复（上机反馈「重复的题目有点多」）。
 *
 * 音节数是**教学分组定死的**，不该硬塞——单韵母本来就只有那几个。
 * 能变的是考法：从 n 个音节里取 4 个组一道题，组合数是 C(n,4) 级别，
 * 同样的音节能出的题一下多出几十倍。
 *
 * ## 教学价值：对比着听，而不是孤立辨认
 *
 * 「听 gē 选 gē」考的是单个音节的辨认；
 * 「gē kē hē jī 里哪个不一样」逼孩子把四个音**放在一起比**——
 * 这正是 P7 易混辨析（b/d、平翘舌、前后鼻音）真正需要的能力。
 *
 * ⚠️ 因此选项必须**可点读**，且走预生成片段（`ItemOption.ttsParts`）：
 * 孩子得能反复听每一个才比得出来，而实时 TTS 念裸拼音会读错声调。
 */

import { readEnum } from '@/domain/generators/params'
import { displayForm, finalOf, initialOf, syllableKey, type Syllable } from '@/domain/pinyin'
import { shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const
/** 一道题几个选项。3 个同类 + 1 个异类 */
const GROUP_SIZE = 3

/** 按哪个维度找不同 */
type Axis = 'initial' | 'final' | 'tone'

/** 取音节在某个维度上的特征值 */
function featureOf(s: Syllable, axis: Axis): string {
  if (axis === 'tone') return String(s.tone)
  return axis === 'initial' ? initialOf(s.base) : finalOf(s.base)
}

/**
 * 生成一道「找不同」题。
 *
 * @param ctx.params.syllables - 候选音节，**必须已用 `usable()` 过滤**
 * @param ctx.params.axis - 按 `'initial'` 声母 / `'final'` 韵母 / `'tone'` 声调找不同
 * @param ctx.params.tag - 答错时记的认知误区
 *
 * @returns `type: 'choice_audio'`，选项是拼音且可点读
 *
 * @example
 * pinyinOddOne({ kpId: 'P2.3', difficulty: 2, params: { syllables, axis: 'initial' }, rng })
 * // gē kē hē + jī 时：jī 的声母与其余三个都不同 → 它是答案
 */
export const pinyinOddOne: Generator = ({ kpId, difficulty, params, rng }) => {
  const pool = readSyllables(params)
  const axis = readEnum(params, 'axis', ['initial', 'final', 'tone'] as const, 'initial')
  const tag = (params['tag'] as MisconceptionTag | undefined) ?? 'flat_curl_confusion'

  const picked = pickGroup(pool, axis, rng)

  const options: ItemOption[] = shuffle(rng, picked.group.concat(picked.odd)).map((s, i) => ({
    id: OPTION_IDS[i] ?? `x${i}`,
    text: displayForm(s),
    // ⭐ 点读走预生成片段，孩子要反复听着比
    ttsParts: [syllableKey(s.base, s.tone)],
    ttsText: displayForm(s),
    isCorrect: s === picked.odd,
    ...(s === picked.odd ? {} : { misconceptionTag: tag }),
  }))

  const axisWord = axis === 'initial' ? '声母' : axis === 'final' ? '韵母' : '声调'
  const stemClip =
    axis === 'initial' ? 'phrase.oddInitial' : axis === 'final' ? 'phrase.oddFinal' : 'phrase.oddTone'

  return {
    signature: `${kpId}-odd#${axis}:${picked.odd.base}${picked.odd.tone}:${picked.group
      .map((s) => `${s.base}${s.tone}`)
      .sort()
      .join('.')}`,
    kpId,
    type: 'choice_audio',
    difficulty,
    stem: {
      text: `点一点听一听，哪个的${axisWord}和其他三个不一样？`,
      ttsText: `点一点听一听，哪个的${axisWord}和其他三个不一样`,
      ttsParts: [stemClip],
    },
    options,
    answer: displayForm(picked.odd),
  }
}

/**
 * 挑出「3 个同特征 + 1 个异特征」的一组。
 *
 * 候选池凑不出这种结构时（比如池里全部音节的声母都不同），
 * 退化为随机取 4 个并指定第一个为答案——⚠️ 这会让题目失去意义，
 * 因此模板必须保证池子在所选维度上确实有同类可凑，
 * 由 `pinyinOddOne.test.ts` 对全部拼音模板做校验。
 */
function pickGroup(
  pool: readonly Syllable[],
  axis: Axis,
  rng: () => number,
): { group: Syllable[]; odd: Syllable } {
  const byFeature = new Map<string, Syllable[]>()
  for (const s of pool) {
    const f = featureOf(s, axis)
    byFeature.set(f, [...(byFeature.get(f) ?? []), s])
  }

  // 能凑够 3 个同特征的组
  const usableGroups = [...byFeature.entries()].filter(([, list]) => list.length >= GROUP_SIZE)

  if (usableGroups.length > 0) {
    const [feature, list] = usableGroups[Math.floor(rng() * usableGroups.length)] ?? usableGroups[0]!
    const group = shuffle(rng, list).slice(0, GROUP_SIZE)
    const outsiders = pool.filter((s) => featureOf(s, axis) !== feature)
    if (outsiders.length > 0) {
      const odd = outsiders[Math.floor(rng() * outsiders.length)] as Syllable
      return { group, odd }
    }
  }

  const fallback = shuffle(rng, [...pool]).slice(0, GROUP_SIZE + 1)
  return { group: fallback.slice(1), odd: fallback[0] as Syllable }
}

function readSyllables(params: Record<string, unknown>): Syllable[] {
  const raw = params['syllables']
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('pinyinOddOne: 缺少 syllables 参数')
  }

  /**
   * ⚠️ 按**显示形式**去重，不是按 base。
   *
   * 韵母 `ing` 和整体认读音节 `ying` 是两个不同的音节，但都写作 `yīng`——
   * 摆进同一道题里孩子看到两个一模一样的选项，点哪个都说不清对错。
   * 教学上的区别在这道题里没有任何视觉体现，只能留一个。
   */
  const seen = new Set<string>()
  return (raw as Syllable[]).filter((s) => {
    const form = displayForm(s)
    if (seen.has(form)) return false
    seen.add(form)
    return true
  })
}
