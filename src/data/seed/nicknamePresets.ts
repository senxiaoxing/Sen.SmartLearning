/**
 * @file 昵称预设 —— 有专属预生成语音的昵称清单
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/voiceManifest.ts   这里的片段会并入总清单
 * @see src/domain/encourage/addressed.ts 昵称怎么拼进一句话
 * @see scripts/generate-voices.mjs       按本清单生成 name.*.mp3
 *
 * ## 为什么昵称需要一份「预设清单」
 *
 * 家长可以把昵称改成**任意文字**，而预生成音频是构建期的事——
 * 运行时不可能凭空造出「小恩宝」这三个字的真人音色片段。
 *
 * 于是分两条路（`platform/speech.ts` 的降级策略天然支持，不需要改播放器）：
 *
 * ```
 * 昵称在本清单里 → 整句都是预生成片段          「小恩宝，太棒了」全程少女声 ✅
 * 昵称不在清单里 → 整句降级为实时 TTS          音色不如片段，但名字照样叫得出来
 * ```
 *
 * ⚠️ **绝不做「片段 + TTS 混播」**：那会得到「（机器声）小明，（真人声）太棒了」
 * 这种精神分裂的效果，比全程机器声更难听。理由见 `platform/speech.ts` 的 `say()`。
 *
 * ## 加一个新昵称
 *
 * 1. 往 {@link NICKNAME_PRESETS} 里加一条，`clipKey` 用 `name.` + 无声调拼音
 * 2. 跑 `npm run voices`（只会补这一条，不动其余三百多个片段）
 */

import { NO_NICKNAME, type Nickname } from '@/domain/encourage/addressed'
import type { ClipKey } from '@/domain/speech'

/** 一个有专属语音的昵称 */
export interface NicknamePreset {
  /** 语音片段 key。`name.` + 无声调拼音，如 `name.xiaoenbao` */
  clipKey: ClipKey
  /** 显示与朗读的文字 */
  text: string
}

/**
 * 预设昵称。
 *
 * 刻意保持很短：每条都要占一个 mp3（约 11KB），没人用的昵称就是白占的包体积。
 * 前四条是这个孩子的几种叫法，家长可以随心情换；
 * 末两条是通用称呼，换个孩子用也不至于立刻掉到 TTS。
 */
export const NICKNAME_PRESETS: readonly NicknamePreset[] = [
  { clipKey: 'name.xiaoenbao', text: '小恩宝' },
  { clipKey: 'name.enbao', text: '恩宝' },
  { clipKey: 'name.xiaoenen', text: '小恩恩' },
  { clipKey: 'name.yangxien', text: '杨希恩' },
  { clipKey: 'name.baobei', text: '宝贝' },
  { clipKey: 'name.xiaopengyou', text: '小朋友' },
]

/**
 * 这个昵称有没有专属语音片段。
 *
 * @param text - 昵称文字，前后空白会被忽略
 * @returns 片段 key；没有预设时返回 `undefined`，调用方应整句走 TTS
 *
 * @example
 * nicknameClipKey('小恩宝')   // 'name.xiaoenbao'
 * nicknameClipKey('小明')     // undefined —— 会降级为实时 TTS
 */
export function nicknameClipKey(text: string): ClipKey | undefined {
  const trimmed = text.trim()
  return NICKNAME_PRESETS.find((preset) => preset.text === trimmed)?.clipKey
}

/**
 * 把一段文字变成可用于文案的昵称，顺便查出它有没有专属语音。
 *
 * 存下来的昵称（`data/repositories/profileRepo.ts`）和家长正在输入的草稿
 * （家长区试听）走的是同一条路径——两边如果各写各的，
 * 会出现「试听时有专属音色、存进去却没有」这种谁也想不通的现象。
 *
 * @param text - 昵称文字，前后空白会被去掉
 * @returns 昵称。空白输入返回 `NO_NICKNAME`，届时所有文案退回不带称呼的原样
 *
 * @example
 * toNickname(' 小恩宝 ')   // { text: '小恩宝', clipKey: 'name.xiaoenbao' }
 * toNickname('小明')       // { text: '小明' }              整句降级为 TTS
 * toNickname('  ')         // NO_NICKNAME                   不称呼
 */
export function toNickname(text: string): Nickname {
  const trimmed = text.trim()
  if (trimmed.length === 0) return NO_NICKNAME

  const clipKey = nicknameClipKey(trimmed)
  return clipKey === undefined ? { text: trimmed } : { text: trimmed, clipKey }
}
