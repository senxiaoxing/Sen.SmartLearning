/**
 * @file 拼音标注的一行字 —— 拼音在上、汉字在下，逐字对齐、逐字可点
 * @layer components  跨功能复用的 UI 原子，不含任何业务逻辑
 * @see src/domain/story.ts  `StoryChar` 是怎么拆出来的
 * @see src/features/chinese/StoryView.tsx  用它的地方
 *
 * ## 它只管画，不管发声
 *
 * 点了哪个字由 `onTapChar` 交回上层——`components/` 不碰业务逻辑，
 * 「这个字该念什么」是短文那边的事。
 *
 * ## ⚠️ 与 `PoemView` 的两行排版是**两种东西**，没有合并
 *
 * design/09 §2.1 提过「古诗和短文共用同一个朗读器」，但真做下来它们的
 * **交互单位不同**：古诗点的是整句（背诵要磨的是一句），短文点的是一个字
 * （卡住时的退路）。古诗那边拼音与汉字各是一整串 `<span>`，靠字距近似对齐；
 * 逐字可点要求每个字自成一个 DOM 节点。
 *
 * 硬合成一个组件会做出个四不像，而 `PoemView` 是已经上机验过、还接着
 * 长按慢速的页面，为一句设计文档去重构它，风险大于收益。
 * 真正共用的那层在数据形状上（`StoryLine` 与 `PoemLine` 同构），不在渲染上。
 * 等第三种内容（文言文）出现时，如果它也是逐字交互，这个组件已经在这儿了。
 */

import type { StoryChar } from '@/domain/story'

interface RubyTextProps {
  /** 已经拆好的逐字结果，含标点 */
  chars: readonly StoryChar[]
  /** 拼音显不显示。⭐ 关掉是「我能自己读了」的表达，见 StoryView */
  showPinyin: boolean
  /**
   * 点了某个**表内**字。表外字（标点、粘合虚词）不会触发——
   * 它们本来就不可点，见 {@link StoryChar.known}。
   */
  onTapChar?: (char: string) => void
}

/**
 * ⚠️ **触控目标在这里放宽到 44pt，是刻意破例**（CLAUDE.md 要求 88×88pt）。
 *
 * 那条规矩是给**主线交互**定的——答题选项、首页入口，点不中就做不下去。
 * 而短文里点字是**卡住时的退路**，不是必经动作：她的主线是「用眼睛读过去」。
 *
 * 真按 88pt 排，一行只放得下 3~4 个字，一句话要折成三行——
 * 那会毁掉「连成句子读」这件事本身，而那正是这一块存在的全部意义。
 * 44pt 是 Apple 的通用下限，配合字块之间不留空隙，实际可点区域是连续的。
 */
const CHAR_MIN_SIZE = 'min-w-[44px]'

/**
 * 把标点并进**前一个字**那一组，每组内部不许断行。
 *
 * ⭐ 这是折行时唯一要处理的事。中文排版里句号不能落在行首，
 * 而浏览器自带的那条禁则**对行内块无效**——它只管文本字符，
 * 每个字自成一个盒子之后，断行机会就落在盒子之间了。
 * 实测（容器缩到 340px）句号会被甩到下一行、孤零零占一整行，
 * 而她认的是「一句话」这个整体，一个独占一行的「。」在她眼里是个新东西。
 *
 * ⚠️ 只往前并，不往后：开引号那类前置标点这些短文里没有，
 * 真要用到时再加，别提前写一套没验过的规则。
 */
function groupWithPunctuation(chars: readonly StoryChar[]): StoryChar[][] {
  const groups: StoryChar[][] = []
  for (const item of chars) {
    const last = groups[groups.length - 1]
    if (item.punctuation && last !== undefined) last.push(item)
    else groups.push([item])
  }
  return groups
}

export function RubyText({ chars, showPinyin, onTapChar }: RubyTextProps) {
  return (
    <p className="text-center leading-relaxed">
      {groupWithPunctuation(chars).map((group, groupIndex) => (
        <span
          // 同一个字在一句里可能出现多次（「走来走去」），下标才是稳定的 key
          key={`${group[0]?.char ?? ''}-${groupIndex}`}
          className="whitespace-nowrap"
        >
          {group.map((item, index) => (
            <RubyChar
              key={`${item.char}-${index}`}
              item={item}
              showPinyin={showPinyin}
              {...(onTapChar !== undefined && { onTapChar })}
            />
          ))}
        </span>
      ))}
    </p>
  )
}

interface RubyCharProps {
  item: StoryChar
  showPinyin: boolean
  onTapChar?: (char: string) => void
}

/**
 * 一个字连同它头上的拼音。
 *
 * ⚠️ 拼音关掉时**位置留着**（`invisible` 而不是不渲染）：整行的高度和
 * 字的位置都不变，开关按下去只是那排小字淡出。若直接抽掉这一行，
 * 满屏的字会整体往上跳一截——她会以为自己弄坏了什么。
 */
function RubyChar({ item, showPinyin, onTapChar }: RubyCharProps) {
  const pinyin = (
    <span
      aria-hidden="true"
      className={[
        'text-sm leading-tight text-ink/45',
        showPinyin ? '' : 'invisible',
      ].join(' ')}
    >
      {item.pinyin ?? ''}
    </span>
  )

  // 标点与粘合虚词：只是排版的一部分，不给点。
  // ⛔ 点了没反应比没得点更糟（design/09 §2.1），所以它连按钮都不是
  if (!item.known) {
    return (
      <span className={`inline-flex flex-col items-center align-bottom ${CHAR_MIN_SIZE}`}>
        {pinyin}
        <span className="text-3xl leading-snug text-ink/70">{item.char}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={item.char}
      onClick={() => onTapChar?.(item.char)}
      // ⭐ 表内字用主色：标色、可点、有音是同一件事——
      // 颜色在这里的含义是「**这个字你学过**」，不是装饰
      className={[
        'inline-flex flex-col items-center align-bottom rounded-lg',
        CHAR_MIN_SIZE,
        'text-primary active:bg-primary/10',
        // iOS 长按会弹系统菜单，把这一下整个抢走
        'select-none touch-manipulation [-webkit-touch-callout:none]',
      ].join(' ')}
    >
      {pinyin}
      <span className="text-3xl font-bold leading-snug">{item.char}</span>
    </button>
  )
}
