/**
 * @file 在用户手势中解锁全部音频通道，并预热高频片段
 * @layer features
 * @see design/03-技术方案.md §4.4「iOS 音频三条铁律」
 * @see src/features/home/HomePage.tsx  唯一调用方（首页的每个出口都要走它）
 *
 * 单独一个文件而不是留在 HomePage 里：首页每个能离开的按钮都要调它，
 * 而它是全 App 最不能出错的一段代码——漏掉一次，孩子进去之后全程无声，
 * 而她不识字，那等于 App 报废。放在这里让它有自己的文件头把规则写清楚。
 */

import { WARMUP_CLIPS } from '@/data/seed/voiceManifest'
import { unlockAudio } from '@/platform/audio'
import { unlockSpeechPlayback } from '@/platform/speech'
import { unlockSpeech } from '@/platform/tts'
import type { Nickname } from '@/domain/encourage/addressed'

/**
 * 解锁语音合成、音效、片段播放三条通道。
 *
 * ⚠️ 三者都必须**同步**调用，不能 await 任何东西之后再调 ——
 * iOS 只认用户手势那一瞬间的调用栈。
 *
 * 顺带预热高频片段：不预热会出现「有的数字没读出来」——
 * 片段按需加载时会被新的朗读打断，低频数字（如 15）经常整个被吞掉。
 * 这是孩子实测反馈过的问题。
 *
 * @param nickname - 当前称呼。它的专属片段一并预热：昵称排在每一句鼓励语最前面，
 *                   是全 App 播放频率最高的单个片段
 *
 * @example
 * <button onClick={() => { unlockAllAudio(nickname); startSession() }}>开始学习</button>
 */
export function unlockAllAudio(nickname: Nickname): void {
  unlockSpeech() // Web Speech，仅作缺片段时的兜底
  unlockAudio() // 音效
  unlockSpeechPlayback(
    nickname.clipKey === undefined ? WARMUP_CLIPS : [...WARMUP_CLIPS, nickname.clipKey],
  )
}
