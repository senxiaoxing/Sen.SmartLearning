/**
 * @file 选项按钮 —— 各题型组件共用的答案卡片
 * @layer items
 *
 * 答错反馈刻意做得温和：轻微摇动 + 柔和描边，**不用红叉、不用刺耳音效**。
 * 见 CLAUDE.md「产品红线」——挫败感是这个年龄段孩子放弃学习的首要原因。
 *
 * ## ⭐ 点击选项**不朗读**
 *
 * 曾经点一下既选中、又念一遍选项内容（无障碍考虑）。实测下来是错的：
 * 这一下点击是**提交答案**，不是试听——紧接着就会响起反馈的鼓励语，
 * 于是「苹果」的机器音和「小恩宝，太棒了」的少女音叠在一起，
 * 而 iOS 上 `speechSynthesis.cancel()` 又拦不干净，两个声音会一起说完。
 *
 * 何况孩子既然点得下去，就说明她已经看懂了这个选项——
 * 真正需要听的是**题干**，那一句仍然自动朗读、并且可以反复重听。
 */

import { motion } from 'framer-motion'
import { MathShape } from '@/components/shape/MathShape'
import type { ItemOption } from '@/domain/types'

export type OptionVisualState = 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct'

interface OptionButtonProps {
  option: ItemOption
  state: OptionVisualState
  disabled: boolean
  onSelect: (id: string) => void
}

/**
 * 图形面字号的两级降档。
 *
 * 英语的数量题会出现 `🍎🍎🍎🍎🍎` 这种长图形面（一个 emoji 占 2 个 UTF-16 码元），
 * 五个挤在 `text-5xl` 下会溢出卡片。按长度降档比给容器加 `overflow` 好：
 * 后者会把最后一个苹果切掉一半，而**数量正是这道题要考的东西**。
 */
function faceSize(text: string): string {
  if (text.length > 8) return 'text-3xl'
  if (text.length > 6) return 'text-4xl'
  return 'text-5xl'
}

const STATE_CLASS: Record<OptionVisualState, string> = {
  idle: 'bg-surface text-ink shadow-drop-surface',
  'selected-correct': 'bg-correct text-on-correct shadow-drop-correct',
  'selected-wrong': 'bg-surface text-alert ring-4 ring-alert/50 shadow-drop-surface',
  'reveal-correct': 'bg-correct/20 text-correct ring-4 ring-correct shadow-drop-surface',
}

/**
 * 单个选项卡片。
 *
 * 动效只用 `scale`/`x`（GPU 合成属性），答错时的摇动幅度控制在 ±6px——
 * 足以传达「不对哦」，又不至于让孩子觉得被责备。
 */
export function OptionButton({ option, state, disabled, onSelect }: OptionButtonProps) {
  const label = option.text ?? ''

  return (
    <motion.button
      type="button"
      disabled={disabled}
      // ⚠️ 只选中、不发声 —— 理由见文件头。紧接着的反馈语才是这一刻该听到的
      onClick={() => onSelect(option.id)}
      whileTap={disabled ? undefined : { scale: 0.95, y: 4 }}
      animate={state === 'selected-wrong' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={[
        // 图形选项要给钟面留出位置，见 MathShape 的 DEFAULT_SIZE
        option.imageKey === undefined ? 'min-h-[110px]' : 'min-h-[140px]',
        'rounded-blob px-4 py-6',
        'flex flex-col items-center justify-center gap-1',
        'font-bold tabular-nums',
        STATE_CLASS[state],
      ].join(' ')}
    >
      {/* 图形题的选项是 SVG（正方体、钟面…），其余题型走文字/emoji。
          ⚠️ 图形选项**没有文字标签**——写上「正方体」三个字这道题就成了认字题 */}
      {option.imageKey === undefined ? (
        <span className={`${faceSize(label)} leading-none`}>{label}</span>
      ) : (
        <MathShape imageKey={option.imageKey} />
      )}
      {/* 中文小字不泄题：孩子得先听懂 apple 指的是苹果才选得对，
          这行字只是帮她确认这个 emoji 表示什么 */}
      {option.caption !== undefined && (
        <span className="text-base font-normal opacity-60">{option.caption}</span>
      )}
    </motion.button>
  )
}
