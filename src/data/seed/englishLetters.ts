/**
 * @file 英语字母表 —— E1 单元的 26 个字母，每个配一个首字母单词
 * @layer data  静态内容，随 App 版本内置
 * @see design/01-知识点图谱.md §5 E1 字母
 * @see src/data/seed/englishWords.ts  词汇与句型（E2~E10）
 * @see src/features/english/LetterWall.tsx  字母卡收集墙
 *
 * 字母与词汇分成两个文件，因为它们是**两类不同的内容**：
 * 词汇考「听到声音想起东西」，字母考「听到字母名认出字形」，
 * 误区清单（`letter_mirror`）与图形面（字形而非 emoji）都不一样。
 *
 * ## ⭐ 朗读文本是整句「A is for apple.」，不是孤立的 A
 *
 * 孤立的单个字母**有歧义**：`A` 既是字母名 /eɪ/ 也是冠词 /ə/，
 * TTS 挑哪个不由我们决定，而**发音教错比没有声音严重得多**
 * （拼音那边已经付过一次学费，见 design/07-音频方案.md §3.3）。
 *
 * 放进整句后歧义消失——`A is for apple` 里的 A 只可能是字母名。
 * 而且这句话本身就是字母教学的标准句式：字母与首字母单词一次带出，
 * 孩子听一遍就同时得到「这个字母叫什么」和「它开头的词长什么样」。
 *
 * ⚠️ 代价：「听音辨字母」（E1.8）因此变成了**听整句选字母**，
 * 孩子既能靠字母名也能靠单词认出来。这不是损失——
 * 它正好把原先单列的 E1.9「首字母对应单词」的考法吸收了进来，
 * 两个知识点的差别改由候选池宽度体现（E1.8 是整张字母表）。
 *
 * ## 挑首字母单词的三条规矩
 *
 * 1. **孩子得认识那个东西** —— `xylophone`（木琴）是字母表教学的传统选择，
 *    但一年级孩子没见过，认不出的图会把「学字母」变成「猜谜」。
 *    X 改用 `x-ray`：中文「X 光」里就带着这个字母，反而最好记。
 * 2. **优先用词表里已有的词** —— apple / bird / cat / dog… 后面的单元还会再学一遍，
 *    在字母卡里先见一面，到时候就是「见过的老朋友」而不是新词。
 * 3. **emoji 必须一眼认得出** —— 认不出就换词，见规矩 1。
 */

import type { EnglishWord } from '@/domain/english'

/** 一张字母卡的完整内容。UI 用它，题库只用从它派生的 {@link LETTERS} */
export interface LetterCard {
  /** 大写字母 */
  upper: string
  /** 图形面「Aa」——大小写并列，一年级要认的正是「这两个形状是同一个字母」 */
  face: string
  /** 首字母单词 */
  word: string
  /** 单词的中文 */
  wordZh: string
  /** 单词的 emoji，卡片背面显示 */
  emoji: string
  /** 所属知识点，卡片据此判断点没点亮 */
  kpId: string
  /** 语音片段 key */
  clipKey: string
  /** 朗读文本「A is for apple.」 */
  sentence: string
}

/** 字母 → 首字母单词。`[单词, 中文, emoji]` */
const WORDS: Readonly<Record<string, readonly [string, string, string]>> = {
  A: ['apple', '苹果', '🍎'],
  B: ['bird', '小鸟', '🐦'],
  C: ['cat', '猫', '🐱'],
  D: ['dog', '狗', '🐶'],
  E: ['egg', '鸡蛋', '🥚'],
  F: ['fish', '鱼', '🐟'],
  G: ['grape', '葡萄', '🍇'],
  H: ['horse', '马', '🐴'],
  I: ['ice cream', '冰淇淋', '🍦'],
  J: ['juice', '果汁', '🧃'],
  K: ['kite', '风筝', '🪁'],
  L: ['lion', '狮子', '🦁'],
  M: ['milk', '牛奶', '🥛'],
  N: ['nose', '鼻子', '👃'],
  O: ['orange', '橘子', '🍊'],
  P: ['pig', '猪', '🐷'],
  Q: ['queen', '女王', '👑'],
  R: ['rabbit', '兔子', '🐰'],
  S: ['sun', '太阳', '☀️'],
  T: ['tiger', '老虎', '🐯'],
  U: ['umbrella', '雨伞', '☂️'],
  // violin 而不是 van：面包车的 emoji（🚐）和普通汽车太像，认不出就没意义
  V: ['violin', '小提琴', '🎻'],
  W: ['water', '水', '💧'],
  // ⚠️ 传统选 xylophone（木琴），但一年级孩子没见过。
  //    「X 光」在中文里就带着这个字母，是她唯一可能有印象的 X 开头的东西
  X: ['x-ray', 'X 光片', '🩻'],
  Y: ['yellow', '黄色', '🟨'],
  Z: ['zebra', '斑马', '🦓'],
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** 每组几个字母。五个一组，学完一组就有一次「完成」 */
const GROUP_SIZE = 5
/** 分组数。最后一组是 U~Z 六个——26 除不尽，多出来的那个并进末组 */
const GROUP_COUNT = 5

/**
 * 这个字母属于哪个知识点。
 *
 * A~E → E1.1，F~J → E1.2，K~O → E1.3，P~T → E1.4，U~Z → E1.5
 */
function kpIdOf(index: number): string {
  return `E1.${Math.min(Math.floor(index / GROUP_SIZE) + 1, GROUP_COUNT)}`
}

/** 26 张字母卡，按字母表顺序 */
export const LETTER_CARDS: readonly LetterCard[] = [...ALPHABET].map((upper, index) => {
  const [word, wordZh, emoji] = WORDS[upper] ?? ['', '', '']
  return {
    upper,
    face: `${upper}${upper.toLowerCase()}`,
    word,
    wordZh,
    emoji,
    kpId: kpIdOf(index),
    clipKey: `en.letter${upper}`,
    sentence: `${upper} is for ${word}.`,
  }
})

/**
 * 字母的词条形式，供题库使用。
 *
 * `speak` 挂整句而 `en` 保留字母本身：前者是**实际念出来的内容**，
 * 后者是这个词条「是什么」的声明，测试与调试都靠它读。
 */
export const LETTERS: readonly EnglishWord[] = LETTER_CARDS.map((card) => ({
  id: `letter${card.upper}`,
  en: card.upper,
  zh: `字母 ${card.upper}`,
  face: card.face,
  family: 'letter',
  speak: card.sentence,
}))

const BY_UPPER = new Map(LETTERS.map((letter) => [letter.en, letter]))

/**
 * 取一段连续字母，如 `lettersFrom('A', 'E')` → A B C D E。
 *
 * @throws 端点不在字母表内时抛错——这属于配置写错，必须显式失败
 */
export function lettersFrom(from: string, to: string): EnglishWord[] {
  const start = LETTERS.findIndex((l) => l.en === from)
  const end = LETTERS.findIndex((l) => l.en === to)
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`字母区间无效: ${from}~${to}`)
  }
  return LETTERS.slice(start, end + 1)
}

/** 按大写字母查词条 */
export function letterOf(upper: string): EnglishWord | undefined {
  return BY_UPPER.get(upper)
}
