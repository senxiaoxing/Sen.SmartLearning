/**
 * @file 记忆翻牌的卡片构造与镜像判定
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/memoryPair.ts  出题逻辑
 */

import type { MemoryCard } from '@/domain/types'

/**
 * 镜像易混字母组。同组内互为镜像，配错它们是 `letter_mirror` 而非单纯记不住。
 *
 * 只列**小写**：大写 B/D、P/Q 的差别比小写明显得多，
 * 一年级几乎不会把大写 B 看成 D。真正混的是 b/d、p/q。
 */
const MIRROR_GROUPS: readonly string[][] = [
  ['b', 'd'],
  ['p', 'q'],
]

/**
 * 一次错配是不是镜像混淆。
 *
 * 组件在孩子翻错时调用，用来决定最终该报哪个 `misconceptionTag`。
 *
 * @example
 * isMirrorMistake('D', 'b')   // true —— 把 b 当成了 D 的小写
 * isMirrorMistake('A', 'c')   // false
 * isMirrorMistake('B', 'b')   // false —— 同一个字母，本来就是一对
 */
export function isMirrorMistake(faceA: string, faceB: string): boolean {
  const a = faceA.toLowerCase()
  const b = faceB.toLowerCase()
  if (a === b) return false
  return MIRROR_GROUPS.some((group) => group.includes(a) && group.includes(b))
}

/** 取字母的首字母单词。`initial` 模式必需，缺省时降级为大小写配对 */
function readWord(params: Record<string, unknown>, letter: string): [string, string, string] {
  const table = params['words']
  if (typeof table !== 'object' || table === null) return ['', '', '']
  const entry = (table as Record<string, unknown>)[letter]
  if (!Array.isArray(entry)) return ['', '', '']
  const [word, zh, emoji] = entry
  return [
    typeof word === 'string' ? word : '',
    typeof zh === 'string' ? zh : '',
    typeof emoji === 'string' ? emoji : '',
  ]
}

/**
 * 构造一个字母的两张卡。
 *
 * 两张卡都念整句「A is for apple.」而不是孤立的字母名——
 * 孤立的 `A` 有歧义（字母名 /eɪ/ vs 冠词 /ə/），TTS 挑哪个不由我们决定，
 * 而**发音教错比没有声音严重得多**。理由详见 data/seed/englishLetters.ts 文件头。
 *
 * @param letter - 大写字母
 * @param mode - `'case'` 配小写 | `'initial'` 配首字母单词的 emoji
 * @param params - 生成器参数，`initial` 模式从中取 `words` 表
 *
 * @example
 * buildPair('A', 'initial', { words: { A: ['apple', '苹果', '🍎'] } })
 * // → [{ face: 'A', … }, { face: '🍎', caption: '苹果', … }]，两张都念 "A is for apple."
 */
export function buildPair(
  letter: string,
  mode: 'case' | 'initial',
  params: Record<string, unknown>,
): MemoryCard[] {
  const lower = letter.toLowerCase()
  const [word, zh, emoji] = readWord(params, letter)

  const sentence = word === '' ? letter : `${letter} is for ${word}.`
  const spoken = {
    ttsText: sentence,
    ttsLang: 'en-US' as const,
    ttsParts: [`en.letter${letter}`],
  }

  const first: MemoryCard = { id: `${letter}-up`, pairId: letter, face: letter, ...spoken }

  const second: MemoryCard =
    mode === 'case'
      ? { id: `${letter}-low`, pairId: letter, face: lower, ...spoken }
      : {
          id: `${letter}-word`,
          pairId: letter,
          face: emoji === '' ? lower : emoji,
          caption: zh,
          ...spoken,
        }

  return [first, second]
}
