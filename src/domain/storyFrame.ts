/**
 * @file 情境题句式骨架 —— 同一道算式，换着说法问
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/storyFrames.ts  具体的句式表
 * @see design/08-年级分区与内容扩展.md §4.2  为什么是骨架而不是题库
 *
 * ## 为什么要把句式变成数据
 *
 * 孩子的原话是「**重复的题目有点多**」（design/05 第 4 条）。
 * 情境题的数字和物品本来就是随机的，但**句法只有一种**——
 * 一轮里排到三道加法，她听到的都是「左边有…右边有…一共有几个」。
 * 换掉数字骗不过她，换掉说法才行。
 *
 * ## ⭐ 抄结构，不抄题
 *
 * 骨架可以照着教辅和试卷抄——数学应用题的句式结构是公有知识，
 * 而具体的数值、物品、干扰项仍然由生成器按认知误区产出。
 * 这样既拿到了「像真题」的语感，又不丢掉本项目最值钱的诊断性
 * （见 CLAUDE.md「干扰项必须有诊断性」）。
 *
 * ## ⚠️ 加句式是有成本的：每个新句法都要新的语音片段
 *
 * 数字（`num()`）和物品（`Countable.clipKey`）的片段是现成的，**换多少次都免费**；
 * 但「又飞来了」「吃掉了」这些连接词各自都是一条 mp3。
 * 因此加句式要同步改 `voiceManifest.ts` 并跑 `npm run voices`，
 * 否则那一句会整句降级到实时 TTS。
 */

import type { ThingKind } from '@/domain/generators/countables'
import { num } from '@/domain/speech'

/**
 * 一个句式。
 *
 * `text` 与 `parts` 里的槽位一一对应：
 * - `{a}` / `{b}` —— 两个数量，展开成数字语音片段
 * - `{thing}` —— 物品名，展开成它的 `clipKey`
 *
 * @example
 * {
 *   op: 'remove', story: true,
 *   text: '原来有 {a} 个{thing}，拿走了 {b} 个，还剩几个？',
 *   parts: ['phrase.originallyHas', '{a}', 'phrase.unitGe', '{thing}',
 *           'phrase.tookAway', '{b}', 'phrase.unitGe', 'phrase.howManyLeft'],
 * }
 */
/**
 * 句式在说哪种运算。
 *
 * 前三种是一年级的**看图列式**（`storyProblem.ts`，配 emoji 分组图）；
 * 后六种是二年级的**文字应用题**（`wordProblem.ts`，不配图）。
 *
 * ⚠️ 二年级那几种为什么不配图：数值大到画不出来——
 * 「22 个小朋友坐船」摆 22 个 emoji 在 iPad 上是一片糊，
 * 而教材里这类题本来就是纯文字。题干靠朗读，这也正是二年级还有语音的意义。
 */
export type StoryOp =
  | 'add'
  | 'remove'
  | 'compare'
  /** 平均分：12 个分给 3 人，每人几个 */
  | 'share'
  /** 包含除：12 个，每 3 个装一盒，能装几盒 */
  | 'group'
  /** 求比一个数多几的数 */
  | 'moreThan'
  /** 求比一个数少几的数 */
  | 'lessThan'
  /**
   * 两步计算，先乘后减：`a` 盒每盒 `b` 个，去掉 `c` 个。
   *
   * ⚠️ 与 `twoStepMore` 分成两个 op 而不是共用一个：句式看着只差一个动词
   * （吃掉了 / 又来了），但第二步的运算不同、答案也不同——
   * 共用一个 op 会让生成器按加法算、题干却在说减法。
   */
  | 'twoStepLess'
  /** 两步计算，先乘后加 */
  | 'twoStepMore'
  /** 有余数的应用：至少要几条船（商要进一） */
  | 'atLeast'

export interface StoryFrame {
  /** 这个句式在说哪种运算。必须与生成器算出的答案一致，否则题干与答案对不上 */
  op: StoryOp
  /**
   * 是否把已知条件说进题干。
   *
   * `false` —— M4.1/M4.3，条件全在图里，题干只问结果（「一共有几个苹果？」）
   * `true` —— M9，题干自带一句话情境。这是 M9 与 M4 的**全部**区别
   */
  story: boolean
  /** 显示文本，含槽位 */
  text: string
  /** 朗读片段序列，含槽位。缺片段时整句由 `ttsText` 兜底 */
  parts: string[]
  /**
   * ⭐ 这个句式只能配哪几类物品。省略表示都行。
   *
   * 「吃掉了 3 颗星星」「送走了 2 朵向日葵」都不成话。句式一旦成了数据，
   * 动词就会和物品自由组合，撞出这类句子——这个字段是那道闸门。
   * 见 {@link ThingKind}。
   */
  thingKinds?: readonly ThingKind[]
}

/** 填进句式的具体内容 */
export interface StoryValues {
  /** 第一个数量。`compare` 时是多的那排 */
  a: number
  /** 第二个数量。`compare` 时是少的那排 */
  b: number
  /** 第三个数量。只有两步计算（`twoStep`）用得上 */
  c?: number
  /** 物品。`name` 进文本，`clipKey` 进语音 */
  thing: { name: string; clipKey: string }
}

/** 展开后的题干，可直接放进 `GeneratedItem.stem` */
export interface FilledStem {
  text: string
  ttsText: string
  ttsParts: string[]
}

/**
 * 把句式展开成具体题干。
 *
 * `ttsText` 由 `text` 去掉末尾问号得到——问号念出来是一声突兀的升调，
 * 而题干本身的疑问语气已经在措辞里了。
 *
 * @param frame - 句式骨架
 * @param values - 填进去的数量与物品
 * @returns 显示文本、朗读文本、朗读片段
 *
 * @example
 * fillFrame(
 *   { op: 'add', story: true,
 *     text: '左边有 {a} 个{thing}，右边有 {b} 个，一共有几个？',
 *     parts: ['phrase.leftHas', '{a}', 'phrase.unitGe', '{thing}',
 *             'phrase.rightHas', '{b}', 'phrase.unitGe', 'phrase.altogetherHowMany'] },
 *   { a: 3, b: 4, thing: { name: '苹果', clipKey: 'thing.apple' } },
 * )
 * // text:     '左边有 3 个苹果，右边有 4 个，一共有几个？'
 * // ttsText:  '左边有 3 个苹果，右边有 4 个，一共有几个'
 * // ttsParts: ['phrase.leftHas','num.3','phrase.unitGe','thing.apple',
 * //            'phrase.rightHas','num.4','phrase.unitGe','phrase.altogetherHowMany']
 */
export function fillFrame(frame: StoryFrame, values: StoryValues): FilledStem {
  let text = frame.text
    .replaceAll('{a}', String(values.a))
    .replaceAll('{b}', String(values.b))
    .replaceAll('{thing}', values.thing.name)
  if (values.c !== undefined) text = text.replaceAll('{c}', String(values.c))

  const ttsParts = frame.parts.flatMap((part) => {
    if (part === '{a}') return num(values.a)
    if (part === '{b}') return num(values.b)
    if (part === '{c}') return values.c === undefined ? [] : num(values.c)
    if (part === '{thing}') return [values.thing.clipKey]
    return [part]
  })

  return { text, ttsText: text.replace(/[？?]$/, ''), ttsParts }
}

/**
 * 挑出适用于某个模式的句式。
 *
 * @throws 一个都没有时抛错——那是 seed 配错了，静默回落会让题干变成空字符串，
 *         而孩子看到的是一道**没有题目的题**，比直接失败糟糕得多
 *
 * @example
 * framesFor(STORY_FRAMES, 'remove', true)   // M9.2 的几种说法
 */
export function framesFor(
  frames: readonly StoryFrame[],
  op: StoryOp,
  story: boolean,
): StoryFrame[] {
  const matched = frames.filter((f) => f.op === op && f.story === story)
  if (matched.length === 0) {
    throw new Error(`没有 op=${op} story=${story} 的情境句式，检查 data/seed/storyFrames.ts`)
  }
  return matched
}
