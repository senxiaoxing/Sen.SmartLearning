/**
 * @file 一轮结束的小结语 —— 「小恩宝，全部答对，太棒了」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/addressed.ts       昵称怎么拼进去
 * @see src/features/learning/SessionSummary.tsx 使用者
 *
 * ⚠️ 只说做对了多少，**不说正确率、不说错了几题**。
 * 百分比会把注意力引到没做对的那些上，而这个阶段要建立的是
 * 「我学了东西」的感觉，不是绩效评估。见 SessionSummary 的文件头。
 */

import { addressed, type Nickname, type SpokenLine } from '@/domain/encourage/addressed'
import { levelUpLine, type LevelUpFacts } from '@/domain/encourage/levelUpLine'
import { num, type ClipKey } from '@/domain/speech'

/** 一轮的成果。字段刻意只有这三个——多给一个 `wrongCount` 就会有人拿去念出来 */
export interface SummaryStats {
  /** 本轮实际作答的题数 */
  answered: number
  /** 其中答对的题数 */
  correct: number
  /** 还没改对的题数。⚠️ 只用来决定说哪一句，绝不出现在文案里 */
  pendingWrong: number
}

/** 小结语与升级播报之间的分隔。两件事，一口气说完 */
const CLAUSE_BREAK = '。'

/**
 * 一轮结束时该说的话。
 *
 * 三种情形，语气递进：
 *
 * | 情形 | 说什么 |
 * |---|---|
 * | 没题可做 | 「今天没有需要练习的内容」 |
 * | 全对 | 「全部答对，太棒了」 |
 * | 有错题 | 「答对了 N 题，我们一起看看错的题目」 |
 *
 * ⭐ 有升级时把播报**接在同一句话里**，而不是让升级横幅自己再念一遍——
 * 两个组件各自朗读会互相打断，实测结果是升级那句从来没被听全过。
 * 见 `levelUpLine.ts` 的文件头。
 *
 * @param nickname - 当前昵称。没设置时退回不带称呼的原文案
 * @param stats - 本轮成果
 * @param levelUp - 本轮的升级结果，没升级传 `undefined`
 * @returns 显示文字与待播语句
 *
 * @example
 * summaryLine(xiaoenbao, { answered: 10, correct: 10, pendingWrong: 0 })
 * // → { text: '小恩宝，全部答对，太棒了',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.allCorrect'], … } }
 *
 * @example
 * summaryLine(xiaoenbao, { answered: 10, correct: 8, pendingWrong: 2 })
 * // → { text: '小恩宝，答对了 8 题，我们一起看看错的题目',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.youGot', 'num.8',
 * //                          'phrase.questions', 'phrase.reviewWrong'], … } }
 *
 * @example
 * summaryLine(xiaoenbao, { answered: 10, correct: 10, pendingWrong: 0 },
 *             { petName: '团团', petNameClipKey: 'pet.tuantuan', toLevel: 6, stageChanged: true })
 * // → { text: '小恩宝，全部答对，太棒了。团团变身啦',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.allCorrect',
 * //                          'pet.tuantuan', 'phrase.transformed'], … } }
 */
export function summaryLine(
  nickname: Nickname,
  stats: SummaryStats,
  levelUp?: LevelUpFacts,
): SpokenLine {
  const base = baseLine(stats)
  if (levelUp === undefined) return addressed(nickname, base.parts, base.text)

  const segment = levelUpLine(levelUp)
  return addressed(
    nickname,
    // ⚠️ 宠物改过名 → 升级那半句没有片段 → 整句都不能用片段。
    //    只传前半截会让 say() 误判「片段齐全」，念完小结就没声了
    segment.parts.length === 0 ? [] : [...base.parts, ...segment.parts],
    `${base.text}${CLAUSE_BREAK}${segment.text}`,
  )
}

/** 不含昵称、不含升级的那半句。三种情形，语气递进 */
function baseLine(stats: SummaryStats): { parts: Array<ClipKey | ClipKey[]>; text: string } {
  if (stats.answered === 0) {
    return { parts: ['phrase.nothingToday'], text: '今天没有需要练习的内容' }
  }

  if (stats.pendingWrong === 0) {
    return { parts: ['phrase.allCorrect'], text: '全部答对，太棒了' }
  }

  return {
    parts: ['phrase.youGot', num(stats.correct), 'phrase.questions', 'phrase.reviewWrong'],
    text: `答对了 ${stats.correct} 题，我们一起看看错的题目`,
  }
}
