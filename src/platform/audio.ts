/**
 * @file 音效播放 —— Howler 封装，含 iOS 音频解锁
 * @layer platform  浏览器 API 封装，不含业务逻辑
 * @see design/03-技术方案.md §4.4 音频系统（PWA 最容易踩坑的地方）
 * @see design/07-音频方案.md  整体音频架构
 * @see scripts/generate-sfx.mjs  音效文件怎么来的
 *
 * ⚠️ **iOS 铁律**：首次播放必须发生在用户手势的调用栈里，
 * 否则之后所有音频静默失败。首屏「开始学习」按钮负责调 {@link unlockAudio}。
 *
 * ⚠️ 本模块的所有函数都**绝不抛错**。音效是锦上添花，
 * 任何一个音放不出来都不该让答题流程中断——孩子正在做题，
 * 一个 Promise rejection 把页面搞崩比没声音严重得多。
 */

import { Howl, Howler } from 'howler'
import { assetUrl } from '@/platform/assetUrl'

/**
 * 音效清单。键名与 `public/audio/sfx/*.wav` 一一对应。
 *
 * 新增音效：在 `scripts/generate-sfx.mjs` 里加一条，重跑脚本，再往这里加一行。
 */
export type SfxKey = 'tap' | 'correct' | 'wrong' | 'levelUp' | 'complete' | 'place'

const SFX_KEYS: readonly SfxKey[] = ['tap', 'correct', 'wrong', 'levelUp', 'complete', 'place']

/**
 * 各音效的相对音量。
 *
 * ⭐ `wrong` 刻意比 `correct` 轻：答错的反馈不该比答对更响亮，
 * 那是在放大挫败感。见 CLAUDE.md「答错反馈要温和」。
 */
const SFX_VOLUME: Record<SfxKey, number> = {
  tap: 0.5,
  correct: 0.9,
  wrong: 0.55,
  levelUp: 1,
  complete: 0.9,
  place: 0.6,
}

const sounds = new Map<SfxKey, Howl>()
let unlocked = false
let enabled = true

/**
 * 音效文件 URL。
 *
 * ⚠️ 必须走 `assetUrl` 而不是写死 `/audio/sfx/…`：站点部署在
 * `/Sen.SmartLearning/` 子路径下，根绝对路径指向的是域名根，一律 404——
 * 表现为**线上一个音效都没有**，而本地怎么测都正常。见 platform/assetUrl.ts。
 */
function sfxUrl(key: SfxKey): string {
  return assetUrl(`audio/sfx/${key}.wav`)
}

/**
 * 解锁音频并预载全部音效。
 *
 * **必须在用户手势的同步调用栈里调用**（按钮 onClick 内），
 * 这是 iOS 的硬限制，绕不过去。
 *
 * 顺便在这里预载：音效总共约 100KB，一次性载完之后播放零延迟。
 * 若等到第一次答对时才去加载，那一声「叮」会迟到几百毫秒，
 * 反馈动画都演完了声音才响，比不响更怪。
 *
 * @example
 * <button onClick={() => { unlockAudio(); startSession() }}>开始学习</button>
 */
export function unlockAudio(): void {
  if (unlocked) return
  unlocked = true

  try {
    // Howler 自己会处理 AudioContext 的 resume，这里补一次以防万一
    void Howler.ctx?.resume?.()

    for (const key of SFX_KEYS) {
      sounds.set(
        key,
        new Howl({
          src: [sfxUrl(key)],
          volume: SFX_VOLUME[key],
          preload: true,
          // 每个音效都是独立短音，允许重叠播放
          // （连续答对时上一声还没落下一声就该起来）
          html5: false,
        }),
      )
    }
  } catch {
    // 音频初始化失败不影响答题，静默降级为无声
    unlocked = false
  }
}

/**
 * 播放一个音效。未解锁或加载失败时静默跳过。
 *
 * @example
 * playSfx('correct')
 */
export function playSfx(key: SfxKey): void {
  if (!enabled || !unlocked) return
  try {
    sounds.get(key)?.play()
  } catch {
    // 同上：音效失败绝不打断学习流程
  }
}

/**
 * 全局开关。家长区的「音效」设置项接到这里。
 *
 * 关掉时不卸载已加载的音效——重新打开要能立刻有声，
 * 而且它们只占约 100KB 内存。
 */
export function setSfxEnabled(value: boolean): void {
  enabled = value
}

export function isSfxEnabled(): boolean {
  return enabled
}

/** 音频是否已解锁。用于自检提示「听不到声音」的排查 */
export function isAudioUnlocked(): boolean {
  return unlocked
}
