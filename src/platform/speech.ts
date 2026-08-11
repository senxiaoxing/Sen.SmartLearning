/**
 * @file 语音播放 —— 预生成片段优先，实时 TTS 兜底
 * @layer platform  浏览器 API 封装
 * @see design/07-音频方案.md
 * @see src/domain/speech.ts           语句怎么表示
 * @see src/platform/speechClips.ts    片段的解码与裁静音
 * @see src/data/seed/voiceManifest.ts 有哪些片段
 *
 * ⭐ **兜底策略是这个模块最重要的部分。**
 *
 * 孩子不识字，题干读不出来 = 这道题她做不了。所以任何一条路径都不能通向静音：
 * ```
 * 片段齐全 → 按顺序播放预生成音频     ← 目标状态，音色稳定、离线、零延迟
 * 缺片段   → 整句走实时 TTS           ← 音色不一致，但听得见
 * 无 TTS   → 静默失败，但不抛错        ← 页面不能崩
 * ```
 * 宁可某一句音色不一致，也绝不能让她盯着一道读不出来的题。
 *
 * ⚠️ 播放走 Web Audio 而不是 Howler：
 * 片段需要**裁掉尾部约 1.2 秒的静音**（否则一句话要念 7 秒），
 * 而且要能在音频时钟上精确排期。这两件事 Howler 都不擅长。
 * 音效仍然用 Howler（见 platform/audio.ts）——那边是即发即忘，正合适。
 */

import { hasClip } from '@/data/seed/voiceManifest'
import { loadClip } from '@/platform/speechClips'
import { speak as speakTts, stopSpeaking as stopTts } from '@/platform/tts'
import type { ClipKey, Utterance } from '@/domain/speech'

/**
 * 片段之间的间隔（秒）。
 *
 * 裁掉静音后片段是紧挨着的，完全不留缝会让「9」「加」「5」黏成一团听不清词界。
 * 80ms 接近中文自然语流里的词间停顿。
 */
const GAP = 0.08

let ctx: AudioContext | null = null
/** 当前序列已排期的音源，打断时要逐个停掉 */
let playing: AudioBufferSourceNode[] = []
/** 序列身份标记，用于识别「我这一轮是不是已经被打断了」 */
let token = 0

function audioContext(): AudioContext | null {
  if (ctx !== null) return ctx
  try {
    ctx = new AudioContext()
    return ctx
  } catch {
    return null
  }
}

/**
 * 在用户手势里解锁语音播放，并预热常用片段。
 *
 * ⚠️ 必须在手势的同步调用栈里调用（iOS 硬限制）。
 *
 * 预热的意义：原来片段是「用到时才加载」，而新的朗读会打断加载中的片段，
 * 结果**低频片段（如「15」）经常整个被吞掉**——孩子实测反馈「有的数字没读出来」。
 * 预热之后播放时一定是就绪状态。
 *
 * @param warmup - 要预热的片段 key。传数字与常用运算词即可，其余按需加载
 */
export function unlockSpeechPlayback(warmup: readonly ClipKey[] = []): void {
  const audio = audioContext()
  if (audio === null) return
  void audio.resume()

  // 播一个无声帧完成 iOS 解锁
  const silent = audio.createBufferSource()
  silent.buffer = audio.createBuffer(1, 1, audio.sampleRate)
  silent.connect(audio.destination)
  silent.start()

  prefetchClips(warmup)
}

/**
 * 预取并解码一批片段，**不做 iOS 解锁**（那必须在用户手势里）。
 *
 * ⭐ 给「一进页面就会连着点很多下」的场景用，字母乐园是典型：
 * 26 张卡全靠按需加载时，每一次首点都要现 fetch + 解码，
 * 孩子连着翻就会排队，听起来就是「后面的字母有延迟」。
 * 这与当初「有的数字没读出来」是同一个根因，
 * 那次的解法也是预热（见 voiceManifest.ts 的 WARMUP_CLIPS）。
 *
 * 已在缓存里的片段会被 `loadClip` 直接跳过，重复调用无代价。
 *
 * @param keys - 要预取的片段 key，不在清单里的自动忽略
 *
 * @example
 * useEffect(() => prefetchClips(LETTER_CARDS.map((c) => c.clipKey)), [])
 */
export function prefetchClips(keys: readonly ClipKey[]): void {
  const audio = audioContext()
  if (audio === null) return

  for (const key of keys) {
    if (hasClip(key)) void loadClip(audio, key)
  }
}

/**
 * 朗读一句话。会打断当前正在播放的内容。
 *
 * 打断而非排队：孩子连点两次喇叭按钮时应该重新读一遍，
 * 而不是听完第一遍再听第二遍。
 *
 * @param utterance - 待朗读语句。片段缺失时自动整句降级为 TTS
 *
 * @example
 * say(utter([num(9), 'op.plus', num(5), 'phrase.equalsWhat'], '9 加 5 等于几'))
 */
export function say(utterance: Utterance): void {
  stopSpeech()

  // ⚠️ 只要有**任意一个**片段缺失就整句走 TTS，而不是「有的片段有的 TTS」。
  // 混着播会得到「9 加（真人声）…（机器声）等于几」这种精神分裂的效果，
  // 比全程机器声更难听。
  const usable =
    utterance.parts.length > 0 && utterance.parts.every((key) => hasClip(key))

  const audio = audioContext()
  if (!usable || audio === null) {
    speakTts(utterance.fallbackText, utterance.lang)
    return
  }

  void playSequence(audio, utterance)
}

/**
 * 解码全部片段后**一次性排期**。
 *
 * 先全部解码再排期，而不是边放边解码：后者会在片段之间插进不确定的加载延迟，
 * 听感上就是「一顿一顿的」。全部就绪后按音频时钟排期，节奏是恒定的。
 */
async function playSequence(audio: AudioContext, utterance: Utterance): Promise<void> {
  token += 1
  const mine = token

  const buffers = await Promise.all(utterance.parts.map((key) => loadClip(audio, key)))
  if (mine !== token) return // 解码期间被新的朗读打断了

  // 有片段取不到（文件缺失/解码失败）→ 整句降级，绝不放半句
  if (buffers.some((b) => b === null)) {
    speakTts(utterance.fallbackText, utterance.lang)
    return
  }

  let at = audio.currentTime + 0.02
  for (const buffer of buffers) {
    const source = audio.createBufferSource()
    source.buffer = buffer
    source.connect(audio.destination)
    source.start(at)
    playing.push(source)
    at += buffer!.duration + GAP
  }
}

/** 立即停止朗读。切页或进入下一题时调用，避免上一题的语音串到下一题 */
export function stopSpeech(): void {
  token += 1
  for (const source of playing) {
    try {
      source.stop()
    } catch {
      // 尚未开始或已结束的音源 stop() 会抛错，忽略即可
    }
  }
  playing = []
  stopTts()
}
