/**
 * @file 升级播报 —— 「团团变身啦」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/summaryLine.ts  它把这一段拼在小结语后面
 * @see design/06-宠物系统.md  6 个形态、每 2 级一变
 *
 * ## ⭐ 为什么它不自己成句、必须由小结语来拼
 *
 * 升级横幅和小结语都在小结页挂载时朗读，而 `say()` 是**打断式**的：
 * React 先跑子组件的 effect、再跑父组件的，于是横幅刚念出「团团变身啦」
 * 就被小结语掐掉——升级播报实际上从来没被听全过。
 *
 * 排队播放不是好解法（孩子连点两下喇叭时应该重念，不是排队），
 * 所以改成**一句话说完**：小结语负责开头（叫名字 + 成果），
 * 这里只提供后半段的片段与文本。
 *
 * 形态名（「数数小能手」）刻意**不进语音**：一句话已经接近 5 秒，
 * 再加一段就超出一年级孩子的听觉注意力了。它显示在横幅上，
 * 而真正传达「变身了」的是屏幕上那只宠物的样子变了。
 */

import { num, type ClipKey } from '@/domain/speech'

/** 升级播报所需的事实。与 `stores/petStore.ts` 的 `LevelUpNotice` 对应 */
export interface LevelUpFacts {
  /** 宠物当前的名字，孩子可能改过 */
  petName: string
  /** 宠物名的专属片段。改过名就没有，此时整句降级为 TTS */
  petNameClipKey?: ClipKey
  toLevel: number
  /** 形态是否发生变化（破壳、进化）。变身比普通升级更值得说 */
  stageChanged: boolean
}

/** 升级播报的后半段 */
export interface LevelUpSegment {
  /**
   * 语音片段。
   * ⚠️ 宠物名没有专属片段时返回**空数组**，调用方据此让整句走 TTS——
   * 只放后半截片段会让 `say()` 误判「片段齐全」而念出半句话。
   */
  parts: ClipKey[]
  /** 完整文本，用作 TTS 兜底与屏幕显示 */
  text: string
}

/**
 * 造升级播报的后半段。
 *
 * @param facts - 升级事实
 * @returns 片段与文本。⚠️ `parts` 为空表示这一段没有片段可用
 *
 * @example
 * levelUpLine({ petName: '团团', petNameClipKey: 'pet.tuantuan', toLevel: 6, stageChanged: true })
 * // → { parts: ['pet.tuantuan', 'phrase.transformed'], text: '团团变身啦' }
 *
 * @example
 * levelUpLine({ petName: '团团', petNameClipKey: 'pet.tuantuan', toLevel: 5, stageChanged: false })
 * // → { parts: ['pet.tuantuan', 'phrase.leveledTo', 'num.5', 'phrase.levelUnit'],
 * //     text: '团团升到 5 级啦' }
 *
 * @example
 * // 孩子给宠物改过名 → 没有片段，整句会降级为 TTS
 * levelUpLine({ petName: '毛毛', toLevel: 5, stageChanged: false })
 * // → { parts: [], text: '毛毛升到 5 级啦' }
 */
export function levelUpLine(facts: LevelUpFacts): LevelUpSegment {
  const text = facts.stageChanged
    ? `${facts.petName}变身啦`
    : `${facts.petName}升到 ${facts.toLevel} 级啦`

  if (facts.petNameClipKey === undefined) return { parts: [], text }

  const parts = facts.stageChanged
    ? [facts.petNameClipKey, 'phrase.transformed']
    : [facts.petNameClipKey, 'phrase.leveledTo', ...num(facts.toLevel), 'phrase.levelUnit']

  return { parts, text }
}
