/**
 * @file 记忆翻牌生成器 —— 大小写配对（E1.6）与首字母对应（E1.9）
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/memoryCards.ts   卡片构造与镜像判定
 * @see src/domain/generators/arrangements.ts  「多步交互 → 单一 option」的通用通路
 *
 * ## ⭐ 为什么记忆翻牌只用在字母上
 *
 * 翻牌本质考的是**记忆力**，不是学科能力。拿它去考词汇（听 apple 选 🍎）
 * 只会把一道听力题变成记忆游戏，诊断数据也跟着失真。
 *
 * 字母是例外：`A` 与 `a` 是**同一个字母的两个形状**，
 * 「把它们认成一对」本身就是 E1.6 要学的东西，翻牌的配对机制刚好同构。
 * E1.9 的「A → apple」同理。
 *
 * ## ⚠️ 翻错是机制，不是失败
 *
 * 记忆游戏本来就靠试错。若「错一次即判错」，孩子第一次玩必然被判不会，
 * 而她其实什么都没做错。因此给一个错误配额，超了才算没掌握——
 * 见 `ItemVisual` 的 `mistakeBudget`。
 */

import { buildArrangementOptions } from '@/domain/generators/arrangements'
import { buildPair } from '@/domain/generators/memoryCards'
import { readEnum, readNumber } from '@/domain/generators/params'
import { shuffle } from '@/domain/generators/rng'
import type { Generator } from '@/domain/types'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** 一次翻牌的对数上限。8 对 = 16 张，一年级的记忆负荷装不下 */
const MAX_PAIRS = 5

/** 排列键：一次没配错 / 错配里出现了镜像字母 */
export const KEY_CLEAN = 'clean'
export const KEY_MIRROR = 'mirror'

/**
 * 生成一局记忆翻牌。
 *
 * @param ctx.params.mode - `'case'`（A↔a，E1.6）| `'initial'`（A↔🍎，E1.9）
 * @param ctx.params.pairCount - 几对，上限 {@link MAX_PAIRS}
 * @param ctx.params.mistakeBudget - 允许错几次仍算掌握
 * @param ctx.params.letters - 候选字母，默认整张字母表
 * @param ctx.params.words - `initial` 模式下 字母 → `[单词, 中文, emoji]`
 *
 * @returns `type: 'memory_pair'`，卡片在 `visual.cards`
 *
 * @example
 * memoryPair({ kpId: 'E1.6', difficulty: 2, params: { pairCount: 3, mode: 'case' }, rng })
 * // 抽到 A/B/D 时卡片为 A a B b D d（已打乱），判定：
 * //   一次没错        → 正确
 * //   把 b 配给 D     → letter_mirror        看反了方向
 * //   其他超配额错误  → letter_pairing_weak  大小写没连起来
 */
export const memoryPair: Generator = ({ kpId, difficulty, params, rng }) => {
  const mode = readEnum(params, 'mode', ['case', 'initial'] as const, 'case')
  const pairCount = Math.min(MAX_PAIRS, Math.max(2, readNumber(params, 'pairCount', 3)))
  const mistakeBudget = Math.max(0, readNumber(params, 'mistakeBudget', 2))

  const picked = shuffle(rng, readLetters(params)).slice(0, pairCount).sort()
  const cards = shuffle(rng, picked.flatMap((letter) => buildPair(letter, mode, params)))

  const isCase = mode === 'case'
  const modeText = isCase ? '把大写和小写配成一对' : '把字母和它开头的东西配成一对'

  return {
    signature: `${kpId}-memory#${mode}:${picked.join('')}`,
    kpId,
    type: 'memory_pair',
    difficulty,
    stem: {
      text: modeText,
      ttsText: modeText,
      // 题干是中文，走预生成片段；⚠️ 卡片才是英语，各自带 ttsLang
      ttsParts: [isCase ? 'phrase.matchUpperLower' : 'phrase.matchLetterWord'],
    },
    options: buildArrangementOptions(
      { key: KEY_CLEAN, text: '全部配对成功' },
      [{ key: KEY_MIRROR, tag: 'letter_mirror', text: '把方向相反的字母配错了' }],
      { tag: 'letter_pairing_weak', text: '配对时试了很多次' },
    ),
    answer: '全部配对成功',
    // ⭐ 答案**不朗读**：翻牌题的「答错」是试错超了配额，
    //    这时说一句「答案是全部配对成功」既不是答案也不是安慰，只是句废话。
    //    伙伴的那句安慰才是这一刻该听到的。
    answerSpeech: { parts: [], text: '全部配对成功' },
    visual: { kind: 'memoryPairs', cards, mistakeBudget },
  }
}

/** 候选字母池。参数缺省时用整张字母表 */
function readLetters(params: Record<string, unknown>): string[] {
  const raw = params['letters']
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  return [...ALPHABET]
}
