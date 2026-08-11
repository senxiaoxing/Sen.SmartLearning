/**
 * @file 把昵称拼进一句话 —— 「太棒了」→「小恩宝，太棒了」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/nicknamePresets.ts  哪些昵称有专属语音
 * @see src/platform/speech.ts            片段与 TTS 的降级策略
 *
 * ## 为什么值得单独一层
 *
 * 一年级孩子不识字，屏幕上写「小恩宝，太棒了」她看不见，
 * **只有念出来才算数**。而昵称是家长随时能改的自由文本，
 * 预生成音频只能覆盖有限几个，于是每一句带昵称的话都要处理同一个分支：
 * 有专属片段就全用片段，没有就整句走 TTS。
 *
 * 把这个分支收在这里，调用方（Feedback / SessionSummary / HomePage…）
 * 只管说「我要说这句话，请带上名字」。
 *
 * ## ⭐ 产品判断：昵称只出现在正向语境
 *
 * 问候、答对、小结、宠物想念 —— 都叫名字。
 * **答错时不叫名字**：「小恩宝，再看看」听起来像点名，
 * 而叫名字这件事的收益（亲切）远小于被感知成点名批评的代价。
 * 见 CLAUDE.md 产品红线「答错反馈要温和」。
 */

import { plain, utter, type ClipKey, type Utterance } from '@/domain/speech'

/** 昵称与它的语音片段。片段缺失时整句降级为 TTS，见 {@link addressed} */
export interface Nickname {
  /** 显示与朗读用的昵称。空串表示没设置昵称，所有称呼一律省略 */
  text: string
  /** 专属语音片段 key。不在预设清单里的昵称没有这个字段 */
  clipKey?: ClipKey
}

/** 没设置昵称时的占位。用它而不是到处写 `{ text: '' }` */
export const NO_NICKNAME: Nickname = { text: '' }

/** 一句能同时「显示」和「朗读」的话 */
export interface SpokenLine {
  /** 屏幕上显示的文字 */
  text: string
  /** 交给 `platform/speech.ts` 的 `say()` 播放 */
  utterance: Utterance
}

/** 昵称与后半句之间的分隔。中文顿开一下，语音里对应 80ms 的片段间隔 */
const SEPARATOR = '，'

/**
 * 造一句「叫着名字说的话」。
 *
 * 三条路径，取决于昵称有没有专属语音片段：
 *
 * | 昵称 | 语音 | 效果 |
 * |---|---|---|
 * | 没设置 | `parts` 原样 | 「太棒了」，与加这个功能之前完全一致 |
 * | 有专属片段 | 昵称片段 + `parts` | 「小恩宝，太棒了」全程少女声 ✅ |
 * | 无专属片段 | **整句 TTS** | 「小明，太棒了」机器声，但名字叫得出来 |
 *
 * ⚠️ 第三种刻意**不做**「昵称走 TTS + 后半句用片段」的混播：
 * 一句话里两个音色比全程机器声更难听，理由见 `platform/speech.ts` 的 `say()`。
 * 宁可整句换音色，也要让她听见自己的名字——那是这个功能的全部意义。
 *
 * @param nickname - 当前昵称。用 {@link NO_NICKNAME} 表示没设置
 * @param parts - 后半句的语音片段 key，可嵌套数组（`num()` 返回的就是数组）
 * @param sentence - 后半句的完整文本，同时用作显示文字与 TTS 兜底
 * @returns 显示文字 + 待播语句
 *
 * @example
 * addressed({ text: '小恩宝', clipKey: 'name.xiaoenbao' }, ['phrase.praise1'], '太棒了')
 * // → { text: '小恩宝，太棒了',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.praise1'], fallbackText: '小恩宝，太棒了' } }
 *
 * @example
 * // 昵称没有专属音频：parts 清空，整句交给 TTS
 * addressed({ text: '小明' }, ['phrase.praise1'], '太棒了')
 * // → { text: '小明，太棒了', utterance: { parts: [], fallbackText: '小明，太棒了' } }
 *
 * @example
 * // 没设置昵称：退回原样
 * addressed(NO_NICKNAME, ['phrase.praise1'], '太棒了')
 * // → { text: '太棒了', utterance: { parts: ['phrase.praise1'], fallbackText: '太棒了' } }
 */
export function addressed(
  nickname: Nickname,
  parts: ReadonlyArray<ClipKey | ClipKey[]>,
  sentence: string,
): SpokenLine {
  const name = nickname.text.trim()
  if (name.length === 0) return { text: sentence, utterance: utter(parts, sentence) }

  const text = `${name}${SEPARATOR}${sentence}`

  /**
   * ⚠️ 后半句没有任何片段（宠物台词这类还没纳入清单的内容）→ 整句必须走 TTS。
   *
   * 不能只把昵称片段放进去：`say()` 判断「片段是否齐全」看的是
   * `parts.every(hasClip)`，只有一个昵称片段时它会认为齐全，
   * 于是**只念出一个名字**，后半句连同兜底文本一起消失。
   * 孩子听到的是「小恩宝。」然后没了——比音色不对严重得多。
   */
  if (parts.flat().length === 0) return { text, utterance: plain(text) }

  return {
    text,
    utterance:
      nickname.clipKey === undefined ? plain(text) : utter([nickname.clipKey, ...parts], text),
  }
}
