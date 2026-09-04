/**
 * @file 慢速重听 —— 长按喇叭时的变速播放，变速不变调
 * @layer platform  浏览器 API 封装
 * @see src/platform/speech.ts       正常速度的播放（Web Audio），以及两条路的分发
 * @see src/platform/speechClips.ts  片段字节与人声区间
 * @see design/09-竞品借鉴.md §3.1   为什么加这个功能（学自每日英语听力的 8 档语速）
 *
 * ## ⭐⭐ 为什么慢速要另开一条播放路径
 *
 * 正常播放走 Web Audio 的 `AudioBufferSourceNode`，而它的 `playbackRate`
 * 是**重采样**——放慢等同于放慢磁带，音高跟着一起降。0.7 倍速降约 6 个半音，
 * 元音的共振峰整体下移，`má` 听起来会像另一个音。
 *
 * 而慢速重听最该服务的恰恰是**声调与 n/l 这类辨析**（design/05 第 14 条：
 * 孩子的原话是「n 和 l 听不出来」「má 和 mǎ 很容易搞混」）。
 * 为了让她听清楚而把音教错，比让她听不清严重得多。
 *
 * `<audio>` 元素的 `preservesPitch` 是浏览器原生的时间拉伸，变速不变调，
 * 所以慢速单独走它。
 *
 * ⛔ **正常速度不要改用这条路**：`<audio>` 没有音频时钟，排不出稳定节奏，
 * 而且拿的是未裁剪的原始 mp3——Edge TTS 每条片段尾部都拖着约 1.2 秒静音，
 * 靠 `setTimeout` 掐比 Web Audio 的精确排期粗得多。
 * 那条路已经调好了，见 `speech.ts` 的文件头。
 *
 * ## ⚠️ iOS：长按已经不在用户手势里了
 *
 * 长按是「pointerdown 之后 500ms」，那时早已离开手势的同步调用栈，
 * 而 iOS 要求 `<audio>` 的首次 `play()` 发生在手势中。
 * 所以 {@link unlockSlowSpeech} 必须在首屏那次点击里调用一次
 * （已挂在 `unlockAllAudio` 上），之后这个元素才允许被程序化播放。
 */

import { loadClipMedia, type ClipMedia } from '@/platform/speechClips'
import { speak as speakTts } from '@/platform/tts'
import type { Utterance } from '@/domain/speech'

/**
 * 慢速倍率。
 *
 * 0.7 比拼音那次的全局 -40% 更慢一档（那是生成期的语速，与这里不叠加），
 * 但仍在原生时间拉伸能保持自然的范围内——再低会开始出现颗粒感，
 * 而听起来「坏了」的音频，孩子不会再去按第二次。
 */
const SLOW_RATE = 0.7

/**
 * 慢速时片段之间的间隔（秒）。
 *
 * 比正常的 80ms 大得多：慢速的使用场景就是「刚才那句没听清」，
 * 此时把词界拉开和把词本身放慢一样重要。
 */
const SLOW_GAP = 0.3

/** 兜底 TTS 的慢速语速。正常是 0.85（见 tts.ts）。`speech.ts` 的降级分支也用它 */
export const SLOW_TTS_RATE = 0.6

/**
 * 一段 0.025 秒的 8bit 静音 WAV。
 *
 * 只用来在用户手势里把 `<audio>` 元素解锁掉 —— iOS 不接受空 `src` 的 `play()`，
 * 必须真的喂一段可解码的音频。用 data URI 而不是文件：解锁发生在首屏点击那一瞬间，
 * 那时任何一次网络往返都可能让它错过手势窗口。
 */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcgAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='

let el: HTMLAudioElement | null = null
/** 序列身份标记，用于识别「我这一轮是不是已经被打断了」。与 speech.ts 各管各的 */
let token = 0
/** 这条通道已经被证明用不了（play 被拒），此后一律走正常速度 */
let broken = false

/**
 * 慢速通道能不能用。
 *
 * ⚠️ **调用方必须先问这一句**：慢速只在首页那次点击里解锁
 * （`unlockAllAudio`），而孩子可以整页刷新后直接停在拼音墙上——
 * 那时元素根本没建过。不检查就会走进一条播不出声的分支，
 * 而表现是「点第二下没声音」，比慢速不生效严重得多。
 *
 * 见 `speech.ts` 的 `say()`：为 false 时退回正常速度，**绝不静音**。
 */
export function isSlowReady(): boolean {
  return el !== null && !broken
}

/**
 * 在用户手势里解锁慢速播放通道。
 *
 * ⚠️ 必须在手势的同步调用栈里调用（iOS 硬限制），且**必须调用**——
 * 不调的话长按在 iPad 上就是一次静默失败：按住了，什么也没发生。
 *
 * @example
 * <button onClick={() => { unlockSlowSpeech(); startSession() }}>开始学习</button>
 */
export function unlockSlowSpeech(): void {
  if (el !== null) return
  try {
    const audio = new Audio(SILENT_WAV)
    audio.muted = true
    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.muted = false
      })
      .catch(() => {
        // 解锁失败不影响正常速度那条路，长按会降级为静默——不抛错
        audio.muted = false
      })
    el = audio
  } catch {
    el = null
  }
}

/**
 * 慢速朗读一句话。会打断当前的慢速播放。
 *
 * 片段任意一条缺失就整句降级为慢速 TTS —— 与正常速度同一条规矩
 * （见 `speech.ts`）：宁可音色不一致，也绝不让孩子按了没声音。
 *
 * @param ctx - 用于解码片段（人声区间是解码时算出来的）
 * @param utterance - 待朗读语句
 * @returns `false` 表示这条通道没能出声（浏览器拒了 play），
 *          调用方应当立刻用正常速度补一遍 —— 绝不能让她按了没声音。
 *          被打断算 `true`：那是有人主动掐掉的，不需要补
 *
 * @example
 * const ok = await playSlowUtterance(ctx, utter([...], '9 加 5 等于几'))
 */
export async function playSlowUtterance(
  ctx: AudioContext,
  utterance: Utterance,
): Promise<boolean> {
  token += 1
  const mine = token

  const media = await Promise.all(utterance.parts.map((key) => loadClipMedia(ctx, key)))
  if (mine !== token) return true

  if (media.length === 0 || media.some((m) => m === null)) {
    speakTts(utterance.fallbackText, utterance.lang, SLOW_TTS_RATE)
    return true
  }

  // ⚠️ 逐条 await 而不是一次排期：`<audio>` 只有一个元素、没有音频时钟，
  //    排期这件事只能靠「上一条播完了再播下一条」。
  const gap = Math.max(SLOW_GAP, utterance.gap ?? 0)
  for (let i = 0; i < media.length; i += 1) {
    if (mine !== token) return true
    const ok = await playOne(media[i]!, mine)
    // 第一条就播不出来 = 这条通道用不了（多半是 iOS 拒了没解锁过的 play）。
    // 就此封掉并让调用方补播，而不是继续把剩下几条也静默地播空
    if (!ok && i === 0) {
      broken = true
      return false
    }
    if (mine !== token) return true
    if (i < media.length - 1) await delay(gap)
  }
  return true
}

/** 立即停止慢速播放 */
export function stopSlowSpeech(): void {
  token += 1
  if (el === null) return
  try {
    el.pause()
  } catch {
    // 尚未开始播放的元素 pause() 可能抛错，忽略
  }
}

/**
 * 播一个片段的人声区间。
 *
 * 结束判定用 `setTimeout` 而不是 `timeupdate`：后者约 4Hz 触发，
 * 而片段的人声只有 0.24~0.64 秒，等它报到时尾巴上那 1.2 秒静音已经开始播了。
 * 时长是已知的（区间 ÷ 倍率），算出来更准。`ended` / `error` 只作兜底。
 */
function playOne(media: ClipMedia, mine: number): Promise<boolean> {
  const audio = el
  if (audio === null) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    let started = false
    let timer = 0

    const finish = (): void => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', finish)
      audio.removeEventListener('error', finish)
      try {
        audio.pause()
      } catch {
        // 同 stopSlowSpeech：未开始播放时 pause() 可能抛错
      }
      resolve(started)
    }

    function onMeta(): void {
      begin()
    }

    function begin(): void {
      if (mine !== token) {
        // 被打断不算「播不出来」：报 started 让调用方别去补播
        started = true
        finish()
        return
      }
      audio!.currentTime = media.start
      audio!.playbackRate = SLOW_RATE
      // 标准属性；Safari 15.4 之前叫 webkitPreservesPitch，两个都设一遍
      audio!.preservesPitch = true
      ;(audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true

      void audio!
        .play()
        .then(() => {
          started = true
        })
        .catch(finish)
      timer = window.setTimeout(finish, ((media.end - media.start) / SLOW_RATE) * 1000)
    }

    audio.addEventListener('ended', finish)
    audio.addEventListener('error', finish)

    // 同一个片段连着慢放两次时 src 没变，不会再触发 loadedmetadata
    if (audio.src === media.url && audio.readyState >= 1) {
      begin()
      return
    }
    audio.addEventListener('loadedmetadata', onMeta)
    if (audio.src !== media.url) audio.src = media.url
  })
}

const delay = (seconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, seconds * 1000))
