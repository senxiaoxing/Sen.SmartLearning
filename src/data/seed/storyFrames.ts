/**
 * @file 情境题的句式表 —— 同一道算式换着说法问
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/storyFrame.ts  骨架的类型与展开规则
 * @see design/08-年级分区与内容扩展.md §4.2
 *
 * ## 为什么句式要成表
 *
 * 孩子的原话是「**重复的题目有点多**」（design/05 第 4 条）。
 * 情境题的数字和物品本来就随机，写死的是**句法**——
 * 一轮里排到三道加法，她听到的都是「左边有…右边有…一共有几个」。
 * 换数字骗不过她，换说法才行。
 *
 * ## ⚠️ 加句式的两条约束
 *
 * **① 每个新连接词都是一条 mp3。** 数字与物品的片段是现成的、换多少次都免费，
 * 但「又来了」「吃掉了」各自都要生成语音。加完必须同步改 `voiceManifest.ts`
 * 并跑 `npm run voices`，否则那一句整句降级成机器音。
 *
 * 因此最划算的加法是**保持骨架、只换那个动词**：复用已有的
 * 「原来有」「个」「还剩几个」，只新增一个动词片段，就多出一种说法。
 *
 * **② 动词挑物品。** 「吃掉了 3 颗星星」不成话。带特定动词的句式必须写
 * `thingKinds`，生成器只会从那几类里挑物品。见 `domain/generators/countables.ts`
 * 的 `ThingKind`。
 *
 * ## 干扰项不在这里
 *
 * 句式只管「怎么问」。选项与认知误区一律由 `storyProblem.ts` 按运算产出——
 * ⛔ 绝不能让某个句式自带一套选项，那等于把题库塞进骨架表，
 * 而干扰项的诊断性正是本项目最不能丢的东西（CLAUDE.md「干扰项必须有诊断性」）。
 */

import type { StoryFrame } from '@/domain/storyFrame'

export const STORY_FRAMES: readonly StoryFrame[] = [
  // ── 合并 · 直白提问（M4.1）────────────────────────────────────────
  // 条件全在图里，题干只问结果
  {
    op: 'add',
    story: false,
    text: '一共有几个{thing}？',
    parts: ['phrase.altogetherHowMany', '{thing}'],
  },
  // ⛔ 这里**不放**独立的「合起来是几？」。
  // 试出来的：M4 的题干是孤零零一句话，「合起来是几」没有主语——
  // 她看着两堆苹果听到这句，得先自己补出「什么合起来」。
  // 「一共有几个苹果」把话说全了，这正是 M4 与 M9 的分工：
  // M4 的题干只有一句，那一句就必须自足。
  // 同一句话放进 M9 就成立（下面那条），因为前面已经说了左边右边。

  // ── 合并 · 带情境（M9.1）──────────────────────────────────────────
  {
    op: 'add',
    story: true,
    text: '左边有 {a} 个{thing}，右边有 {b} 个，一共有几个？',
    parts: [
      'phrase.leftHas',
      '{a}',
      'phrase.unitGe',
      '{thing}',
      'phrase.rightHas',
      '{b}',
      'phrase.unitGe',
      'phrase.altogetherHowMany',
    ],
  },
  {
    // 同一幅图、同一个算式，只把末句换成「合起来是几」
    op: 'add',
    story: true,
    text: '左边有 {a} 个{thing}，右边有 {b} 个，合起来是几？',
    parts: [
      'phrase.leftHas',
      '{a}',
      'phrase.unitGe',
      '{thing}',
      'phrase.rightHas',
      '{b}',
      'phrase.unitGe',
      'phrase.togetherIsWhat',
    ],
  },
  {
    // 「又来了」对三类物品都通（东西来了、动物来了），不限 thingKinds
    //
    // ⚠️ 配图仍是「两堆并排」的静态画面，没画出「来」这个动作。
    // 权衡过：孩子看图是左边 2 个、右边 4 个，听题是原来 2 个、又来 4 个，
    // 两边对得上，只是少一个箭头。人教版这类题的插图也常常就是两堆。
    // 真要画出动作得给 storyGroups 加一种 `arrive` 画法，
    // 那时再把这条句式绑到那个画法上。
    op: 'add',
    story: true,
    text: '原来有 {a} 个{thing}，又来了 {b} 个，一共有几个？',
    parts: [
      'phrase.originallyHas',
      '{a}',
      'phrase.unitGe',
      '{thing}',
      'phrase.thenCame',
      '{b}',
      'phrase.unitGe',
      'phrase.altogetherHowMany',
    ],
  },

  // ── 去掉 · 直白提问（M4.3）────────────────────────────────────────
  {
    op: 'remove',
    story: false,
    text: '还剩几个{thing}？',
    parts: ['phrase.howManyLeft', '{thing}'],
  },

  // ── 去掉 · 带情境（M9.2）──────────────────────────────────────────
  {
    op: 'remove',
    story: true,
    text: '原来有 {a} 个{thing}，拿走了 {b} 个，还剩几个？',
    parts: [
      'phrase.originallyHas',
      '{a}',
      'phrase.unitGe',
      '{thing}',
      'phrase.tookAway',
      '{b}',
      'phrase.unitGe',
      'phrase.howManyLeft',
    ],
  },
  {
    // ⚠️ 只配能吃的东西 —— 「吃掉了 3 颗星星」不成话
    op: 'remove',
    story: true,
    text: '原来有 {a} 个{thing}，吃掉了 {b} 个，还剩几个？',
    thingKinds: ['edible'],
    parts: [
      'phrase.originallyHas',
      '{a}',
      'phrase.unitGe',
      '{thing}',
      'phrase.ateUp',
      '{b}',
      'phrase.unitGe',
      'phrase.howManyLeft',
    ],
  },

  // ── 比多少（M9.3）─────────────────────────────────────────────────
  //
  // ⚠️ 刻意**没有**「下面比上面少几个」的反问版：那要求孩子先转换视角，
  // 是另一种思维负担，而现有干扰项是按「多几个」设计的。
  // 要加得连着干扰项策略一起想，不是换句话那么简单。
  {
    op: 'compare',
    story: false,
    text: '上面比下面多几个{thing}？',
    parts: ['phrase.topMoreHowMany', '{thing}'],
  },
]
