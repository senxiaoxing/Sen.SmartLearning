/**
 * @file 英语易混对照表 —— 「听到 X 最容易错选成什么」
 * @layer domain  纯数据 + 纯函数
 * @see design/01-知识点图谱.md §5 英语 misconceptions
 * @see src/domain/generators/englishListen.ts  唯一使用者
 *
 * 与 `confusablePinyin.ts` 同一个角色：这是**教学经验的编码**，
 * 改它是在调整「什么容易混」，与出题逻辑的改动是两种性质的事。
 *
 * ⚠️ 干扰项按这张表生成，不能随机抽。
 * 听到 `fourteen` 时把 `4` 摆进选项才有诊断价值——她选了 4 就说明
 * 词尾的 `-teen` 根本没听见，补救方向是练 teen 词尾而不是重学数字。
 * 摆 `🦓` 那种毫不相干的，孩子闭着眼也能排除，这道题就白出了。
 *
 * ⚠️ 表里的 id 只是**候选**：目标词条得先出现在该题的候选池里才用得上。
 * 所以这里可以放心写反向条目（`three → thirteen`），
 * E5.1「1~10」的候选池里没有 teen 词，那一条自然不会生效。
 * 候选池由模板控制，见 `data/seed/englishTemplates.ts`。
 */

import type { MisconceptionTag } from '@/domain/types'

/** 一条易混指向：混成了哪个词、算哪种误区 */
export interface ConfusableRef {
  /** 易混词条的 id，见 `data/seed/englishWords.ts` */
  id: string
  /** ⭐ 这决定了补救往哪个方向走，见 `domain/scheduler/remedial.ts` */
  tag: MisconceptionTag
}

/** 音近词。英语启蒙最普遍的错误，也是兜底标签 */
const near = (...ids: string[]): ConfusableRef[] =>
  ids.map((id) => ({ id, tag: 'similar_sound' as const }))

/** teen 词尾没听见（听 `fourteen` 选 `4`）。⭐ 数字单元的核心考点 */
const teen = (...ids: string[]): ConfusableRef[] =>
  ids.map((id) => ({ id, tag: 'number_teen_ty' as const }))

/** 字母镜像（b/d、p/q）。形状对称，一年级最典型的字母错误 */
const mirror = (...ids: string[]): ConfusableRef[] =>
  ids.map((id) => ({ id, tag: 'letter_mirror' as const }))

/**
 * 易混对照表。键是词条 id，值按易混程度排序（越靠前越优先做干扰项）。
 *
 * 没有登记的词条不是遗漏——大多数词（`watermelon` `zebra`）本来就没有
 * 特别容易混的对象，它们的干扰项走同族/同组兜底，统一标 `similar_sound`。
 */
export const CONFUSABLE_ENGLISH: Readonly<Record<string, readonly ConfusableRef[]>> = {
  // ── 数字：teen 与个位数 ⭐⭐ 英语启蒙第一大坑 ──────────────────────
  // 13~19 与 3~9 只差一个轻读词尾，孩子听 teen 选个位数是常态。
  // 这一组干扰项是 E5.2 唯一真正在考的东西，缺了它这个知识点等于没测。
  thirteen: teen('three'),
  fourteen: teen('four'),
  fifteen: teen('five'),
  sixteen: teen('six'),
  seventeen: teen('seven'),
  eighteen: teen('eight'),
  nineteen: teen('nine'),
  twelve: [...teen('twenty'), ...near('two')],
  twenty: [...teen('twelve'), ...near('two')],
  eleven: near('seven'),
  // 反向：只在候选池同时含 teen 词时才生效
  three: teen('thirteen'),
  four: [...teen('fourteen'), ...near('five')],
  five: [...teen('fifteen'), ...near('four', 'fish')],
  six: [...teen('sixteen'), ...near('sister')],
  seven: [...teen('seventeen'), ...near('eleven')],
  eight: teen('eighteen'),
  nine: [...teen('nineteen'), ...near('nose')],
  two: near('twelve', 'twenty'),
  ten: near('pen'),

  // ── 字母 ────────────────────────────────────────────────────────
  // b/d、p/q 是形状镜像；其余是字母名押韵（/biː/ /diː/ /piː/ 全都押 -ee）
  letterB: [...mirror('letterD'), ...near('letterP', 'letterV')],
  letterD: [...mirror('letterB'), ...near('letterT', 'letterE')],
  letterP: [...mirror('letterQ'), ...near('letterB', 'letterT')],
  letterQ: [...mirror('letterP'), ...near('letterG')],
  letterM: near('letterN'),
  letterN: near('letterM'),
  letterA: near('letterE', 'letterK'),
  letterE: near('letterI', 'letterA'),
  letterI: near('letterE', 'letterY'),
  letterG: near('letterJ'),
  letterJ: near('letterG'),
  letterC: near('letterZ', 'letterS'),
  letterS: near('letterF', 'letterC'),
  letterT: near('letterD', 'letterP'),
  letterV: near('letterB'),
  letterK: near('letterA'),

  // ── 词汇 ────────────────────────────────────────────────────────
  // 只收**真的容易混**的：首音相同或整体押韵。
  // 凑数的条目会稀释诊断信号——标签统计里混进大量假阳性，
  // 补救就会指向孩子其实没问题的地方。
  cat: near('cake', 'cow'),
  cake: near('cat'),
  cow: near('cat'),
  dog: near('duck'),
  duck: near('dog', 'dad'),
  dad: near('duck'),
  bear: near('pear'),
  pear: near('bear', 'pen'),
  pen: near('pencil', 'ten', 'pig'),
  pencil: near('pen'),
  pig: near('pen', 'pink'),
  pink: near('pig'),
  red: near('bread'),
  bread: near('red'),
  green: near('grape'),
  grape: near('green'),
  blue: near('black', 'brown'),
  black: near('blue', 'brown'),
  brown: near('black', 'blue'),
  white: near('water'),
  water: near('white'),
  eye: near('ear'),
  ear: near('eye'),
  head: near('hand'),
  hand: near('head'),
  mom: near('monkey'),
  monkey: near('mom', 'milk'),
  milk: near('monkey'),
  sister: near('six'),
  book: near('bag'),
  bag: near('book'),
  fish: near('five', 'face'),
  face: near('fish'),
  rice: near('rabbit', 'ruler'),
  rabbit: near('rice'),
  ruler: near('rice'),
  chair: near('chicken'),
  chicken: near('chair'),
  lion: near('leg'),
  leg: near('lion'),
  nose: near('nine'),
}

/** 这个词条有没有登记易混对照。供测试与出题逻辑判断 */
export function hasConfusable(id: string): boolean {
  return id in CONFUSABLE_ENGLISH
}
