/**
 * @file 答对时的鼓励语 —— 「小恩宝，真厉害」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/addressed.ts   昵称怎么拼进去、什么时候降级
 * @see src/data/seed/voiceManifest.ts      `PRAISE_POOL` 鼓励语池
 * @see CLAUDE.md 产品红线「答错反馈要温和」
 *
 * 鼓励语轮换而不是固定一句：连着听十遍「太棒了」，第十遍就不是鼓励而是背景噪音了。
 *
 * ⚠️ 只管**答对**。答错的反馈不叫名字，理由见 `addressed.ts` 的文件头。
 */

import { addressed, type Nickname, type SpokenLine } from '@/domain/encourage/addressed'

/** 一句鼓励语：片段 key 与它念的文本。与 `data/seed/voiceManifest.ts` 的 `PraiseClip` 对应 */
export interface PraiseOption {
  clipKey: string
  text: string
}

/** 鼓励语池取不到时的兜底文本。走 TTS，但绝不静音 */
const FALLBACK_PRAISE = '答对啦'

/**
 * 挑一句带昵称的鼓励语。
 *
 * @param nickname - 当前昵称。用 `NO_NICKNAME` 表示没设置，届时退回纯鼓励语
 * @param pool - 鼓励语池，传 `data/seed/voiceManifest.ts` 的 `PRAISE_POOL`。
 *               ⚠️ 作为参数传入而不是在这里 import——`domain/` 不依赖 `data/`
 * @param seed - 随机源，取 `[0, 1)`。⭐ 必须由调用方注入，
 *               在这里直接 `Math.random()` 会让本函数无法测试
 * @returns 显示文字与待播语句。`text` **不带感叹号**，
 *          由展示方按自己的版式决定要不要加
 *
 * @example
 * praiseLine({ text: '小恩宝', clipKey: 'name.xiaoenbao' }, PRAISE_POOL, 0.5)
 * // → { text: '小恩宝，真厉害',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.praise3'], … } }
 *
 * @example
 * // 池为空（理论上不该发生）时退回一句兜底，绝不返回空字符串——
 * // 孩子答对了却听不到任何回应，比音色不对严重得多
 * praiseLine(NO_NICKNAME, [], 0)   // → { text: '答对啦', … }
 */
export function praiseLine(
  nickname: Nickname,
  pool: readonly PraiseOption[],
  seed: number,
): SpokenLine {
  const chosen = pool[Math.floor(Math.abs(seed) * pool.length) % pool.length]
  if (chosen === undefined) return addressed(nickname, [], FALLBACK_PRAISE)

  return addressed(nickname, [chosen.clipKey], chosen.text)
}
