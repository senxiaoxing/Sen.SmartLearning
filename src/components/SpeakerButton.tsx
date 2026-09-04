/**
 * @file 朗读按钮 —— 每道题必备组件
 * @layer components
 * @see design/03-技术方案.md §5.1 全语音化
 *
 * ⚠️ 一年级上学期孩子**不识字**，题干靠听不靠读。
 * 这个按钮不是无障碍加分项，是让 App 能被使用的前提。
 */

import { motion } from 'framer-motion'
import { say } from '@/platform/speech'
import { useHoldToSlow } from '@/platform/useHoldToSlow'
import type { Utterance } from '@/domain/speech'

interface SpeakerButtonProps {
  /** 朗读文本。应传 `ttsText` 而非显示文本（算式 `9 + 5` 要读作「9 加 5 等于几」） */
  text: string
  /**
   * 预生成语音片段（`item.stem.ttsParts`）。
   * 省略或片段缺失时整句降级为实时 TTS —— 绝不会静音。
   */
  parts?: string[]
  /** 兜底 TTS 的语言。英语题必须传 `'en-US'`，否则会用中文引擎念英文 */
  lang?: 'zh-CN' | 'en-US'
  /** 重听回调，用于统计 `ttsReplayCount` */
  onReplay?: () => void
  /**
   * 朗读**之前**同步跑一下，留给「这一屏还没解锁过 iOS 音频」的场合
   * （首页问候、升年级过场——它们都可能是 App 打开后的第一次点击）。
   *
   * ⚠️ 必须是同步函数：iOS 只认用户手势那一瞬间的调用栈，
   * 在这里 `await` 任何东西都会让解锁失效。不能改用 `onReplay`——
   * 那个跑在 `say()` 之后，那时已经晚了。
   */
  onBeforeSpeak?: () => void
  size?: 'md' | 'lg'
}

/**
 * 点击后朗读指定内容的圆形按钮。
 *
 * **按住 600ms 会慢一档**（`platform/useHoldToSlow.ts`）。慢速走 `<audio>` 的
 * `preservesPitch`，变速**不变调**——变调会把 `má` 听成另一个音，
 * 见 `platform/slowSpeech.ts` 文件头。
 *
 * ⚠️ 触发方式只有长按，**没有「连点两次就放慢」**：那会把「再听一遍」
 * 这个最常用的动作绑上第二种结果，她想重听正常速度时反而得不到。
 *
 * ⚠️ 慢速只属于**题干**。选项的朗读不走这个组件（见 `items/OptionButton.tsx`），
 * 同一道题里的选项必须同一档语速，否则「更慢的那个」会变成猜答案的线索。
 *
 * @example
 * <SpeakerButton text={item.stem.ttsText} parts={item.stem.ttsParts} onReplay={countReplay} />
 */
export function SpeakerButton({
  text,
  parts,
  lang,
  onReplay,
  onBeforeSpeak,
  size = 'lg',
}: SpeakerButtonProps) {
  const dimension = size === 'lg' ? 'h-[88px] w-[88px]' : 'h-[64px] w-[64px]'
  const utteranceOf = (): Utterance => ({ parts: parts ?? [], fallbackText: text, lang })
  const { holdProps, consumeHold, slowed } = useHoldToSlow(utteranceOf, {
    onBeforeSpeak,
    onSpoke: onReplay,
  })

  return (
    <motion.button
      type="button"
      aria-label="再听一遍，按住可以放慢"
      {...holdProps}
      onClick={() => {
        if (consumeHold()) return
        // 幂等，重复调用无代价；留着是为了键盘/读屏激活（那条路没有 pointerdown）
        onBeforeSpeak?.()
        say(utteranceOf())
        onReplay?.()
      }}
      whileTap={{ scale: 0.9 }}
      animate={slowed ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`${dimension} shrink-0 rounded-full flex items-center justify-center
        select-none touch-manipulation [-webkit-touch-callout:none]
        ${slowed ? 'bg-accent/25 text-accent' : 'bg-info/15 text-info'}`}
    >
      <SpeakerIcon />
    </motion.button>
  )
}

/** 内联 SVG 喇叭图标。不引外部图标库——CSP 禁止外部资源，且一个图标不值得加依赖 */
function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2" aria-hidden="true">
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        fill="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        stroke="currentColor"
      />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
