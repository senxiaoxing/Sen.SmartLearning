/**
 * @file 英语短文的一行 —— 英文逐词可点，中文意思在下方可藏
 * @layer features
 * @see src/domain/englishStory.ts  `EnglishWordToken` 是怎么拆出来的
 * @see src/features/english/EnglishStoryView.tsx  用它的地方
 * @see src/components/RubyText.tsx  语文短文那一行，这里处处对标它
 *
 * ## 它只管画，不管发声
 *
 * 点了哪个词由 `onTapWord` 交回上层——「这个词该念什么」是短文那边的事。
 * ⛔ 别在这里按「这个词有没有音」分出两种样式：语文短文上机第一次就被推翻了，
 * 孩子问的是「为什么那些字没有高亮」，而颜色编码的那个信息她根本不需要知道。
 *
 * ## ⚠️ 为什么不放在 `components/`
 *
 * 它只有英语短文一个用处，而且**中文行是它的一部分**（要跟着开关一起藏）——
 * 那是这一块特有的交互，不是通用原子。语文短文的 `RubyText` 进 `components/`
 * 是因为当时预期会有第三种逐字内容（文言文）复用它。
 * 等英语这边也出现第二个使用者再搬，别提前抽象。
 */

import { storyLineWords } from '@/domain/englishStory'
import type { EnglishStoryLine } from '@/domain/englishStory'

/**
 * ⚠️ **触控目标在这里放宽到 44pt，是刻意破例**（CLAUDE.md 要求 88×88pt），
 * 与语文短文 `RubyText` 完全同一条理由。
 *
 * 那条规矩是给**主线交互**定的——答题选项、首页入口，点不中就做不下去。
 * 而短文里点词是**卡住时的退路**，不是必经动作：她的主线是「用眼睛读过去」。
 * 真按 88pt 排，一行放不下几个词，一句话要折成三行——
 * 那会毁掉「连成句子读」这件事本身，而那正是这一块存在的全部意义。
 */
const WORD_MIN_HEIGHT = 'min-h-[44px]'

interface EnglishLineProps {
  line: EnglishStoryLine
  /**
   * 中文意思显不显示。
   * ⭐ 关掉是「我能自己读了」的表达，见 `EnglishStoryView`。
   */
  showZh: boolean
  /**
   * 点了某个词。**每个词都会触发**，由上层决定响什么——
   * 词表里有的念出来，没有的给一声轻响。
   *
   * @param word - 已规范化的小写词（`'cat.'` → `'cat'`）
   */
  onTapWord?: (word: string) => void
}

export function EnglishLine({ line, showZh, onTapWord }: EnglishLineProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/*
        ⚠️ 词距是**按钮内边距 `px-1` ＋ `gap-x-0.5`**，加起来约 10px，
        刚好是 24px 字号下英文空格的宽度。

        每个词是独立的按钮盒子，盒子之间没有天然空白，所以间距得自己给。
        但**别给多**：第一版用 `gap-x-2`（合计 16px），渲染出来一句话是散开的
        一串词，而这一页要她读的恰恰是「一句话」这个整体。
        内边距不能省——那是点击区域，收进 gap 里会让每个词的可点范围缩水。
      */}
      <p className="flex flex-wrap items-end justify-center gap-x-0.5 leading-relaxed">
        {storyLineWords(line).map((token, index) => (
          <button
            key={`${token.text}-${index}`}
            type="button"
            aria-label={token.word}
            onClick={() => onTapWord?.(token.word)}
            // ⭐ **每个词都一样**：同一个主色、同一个字重、同样可点。
            // ⛔ 不要按「这个词属于哪张表」的理由把它们分开，理由见文件头
            className={[
              'inline-flex items-center rounded-lg px-1',
              WORD_MIN_HEIGHT,
              'text-2xl font-bold text-primary active:bg-primary/10',
              // iOS 长按会弹系统菜单，把这一下整个抢走
              'select-none touch-manipulation [-webkit-touch-callout:none]',
            ].join(' ')}
          >
            {token.text}
          </button>
        ))}
      </p>

      {/* ⚠️ 藏起来时**位置留着**（`invisible` 而不是不渲染）：整段的高度不变，
          开关按下去只是那行小字淡出。直接抽掉的话满屏的句子会整体往上跳一截，
          她会以为自己弄坏了什么。与 RubyText 藏拼音同一个处理 */}
      <span
        aria-hidden={!showZh}
        className={`text-base text-ink/55 ${showZh ? '' : 'invisible'}`}
      >
        {line.zh}
      </span>
    </div>
  )
}
