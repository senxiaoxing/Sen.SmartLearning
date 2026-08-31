/**
 * @file 答错反馈的「答案是 X」那半句 —— 决定它念什么、还是干脆不念
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/types.ts  {@link AnswerSpeech} 为什么不能复用 ItemOption.ttsParts
 * @see src/features/learning/Feedback.tsx       整句怎么拼
 * @see src/features/learning/WrongItemCard.tsx  错题回顾点读走同一套规则
 *
 * ⭐ 抽成纯函数是为了**让「答错那句会不会变成机器音」可以被测试**。
 *
 * 反馈句「（伙伴安慰），答案是 X」里，安慰语和「答案是」都是预生成片段，
 * 唯独答案那半截要看题目给不给得出片段——给不出就整句降级为实时 TTS，
 * 而降级是**静默发生**的：屏幕上一切正常，只有耳朵听得出音色忽然变了。
 * 曾经全库 4878 道题里有 1926 道（86 个知识点）都走在这条路上。
 * 判定逻辑散在 store 和组件里就没法回归，放这里由
 * `voiceManifest.test.ts` 逐条模板校验。
 */

import { answerParts } from '@/domain/speech'
import type { GeneratedItem } from '@/domain/types'

/** 一道题的答案该怎么念 */
export interface ResolvedAnswerSpeech {
  /**
   * 片段序列。三种取值对应三种播法：
   * - 非空 → 整句拼片段，全程预生成音色
   * - `[]` → 这道题的答案念不出来，反馈**只说安慰语**
   * - `undefined` → 拿不到片段，整句降级为实时 TTS（绝不半句片段半句机器音）
   */
  parts?: string[]
  /** 朗读用的答案文本。⚠️ 与屏幕上显示的可能不同（选项是 emoji 或图案时） */
  text: string
}

/**
 * 推导一道题的答案语音。
 *
 * 优先级：
 * 1. 生成器显式声明的 `item.answerSpeech` —— 唯一能表达「不念」的一档
 * 2. 正确选项自带的 `ttsParts` —— 点读与答案读法恰好一致时的现成品（如比大小的符号名）
 * 3. `answerParts()` 解析数字答案 —— 数学题的绝大多数
 *
 * @param item - 已生成的题目
 * @returns 片段与兜底文本，见 {@link ResolvedAnswerSpeech}
 *
 * @example
 * resolveAnswerSpeech(addItem)      // { parts: ['num.1','num.4'], text: '14' }
 * resolveAnswerSpeech(englishItem)  // { parts: ['en.apple'], text: '苹果' }
 * resolveAnswerSpeech(gridItem)     // { parts: [], text: '' }  —— 只说安慰语
 */
export function resolveAnswerSpeech(item: GeneratedItem): ResolvedAnswerSpeech {
  if (item.answerSpeech !== undefined) {
    return { parts: item.answerSpeech.parts, text: item.answerSpeech.text }
  }

  const correctOption = item.options.find((o) => o.isCorrect)
  const text = correctOption?.text ?? item.answer
  const parts = correctOption?.ttsParts ?? answerParts(text)

  return parts === undefined ? { text } : { parts, text }
}
