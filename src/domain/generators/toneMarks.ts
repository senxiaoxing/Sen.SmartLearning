/**
 * @file 声调符号的标注 —— 标在哪个字母上、怎么标
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/pinyinRule.ts  P3.4 用它出题
 *
 * 从生成器里拆出来单独成文件：这是**纯粹的字符处理**，
 * 与「怎么组装成一道题」是两回事，而且标调规则本身
 * （有 a 找 a，没 a 找 o e，i u 并列标在后）是可以独立验证的知识。
 */

import type { Tone } from '@/domain/pinyin'

/** 带调元音表，索引即声调 - 1 */
const TONE_MARKS: Record<string, readonly string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** 这个字符是不是能标调的元音 */
export function isTonable(char: string): boolean {
  return TONE_MARKS[char] !== undefined
}

/**
 * 标调规则：**有 a 找 a，没 a 找 o e，i u 并列标在后**。
 *
 * 这是人教版的原话口诀，一年级要背的就是它。
 *
 * @param base - 不带调音节，如 `'hao'`
 * @returns 该标调的那个元音在 `base` 里的下标；没有元音时返回 -1
 *
 * @example
 * tonePosition('hao')   // 1 —— 有 a 找 a
 * tonePosition('gui')   // 2 —— i u 并列标在后，标 i
 * tonePosition('liu')   // 2 —— 同上，标 u
 */
export function tonePosition(base: string): number {
  const ai = base.indexOf('a')
  if (ai >= 0) return ai
  const oi = base.indexOf('o')
  if (oi >= 0) return oi
  const ei = base.indexOf('e')
  if (ei >= 0) return ei

  // iu / ui 并列时标在后一个
  const iu = base.indexOf('iu')
  if (iu >= 0) return iu + 1
  const ui = base.indexOf('ui')
  if (ui >= 0) return ui + 1

  return base.search(/[iuü]/)
}

/**
 * 把声调标在 `base` 的第 `pos` 个字符上。
 *
 * @returns 标好调的音节；该位置不是元音时原样返回
 *
 * @example
 * applyTone('hao', 3, 1)   // 'hǎo'
 * applyTone('hao', 3, 2)   // 'haǒ' —— 标错位置，正是 P3.4 的干扰项
 */
export function applyTone(base: string, tone: Tone, pos: number): string {
  const vowel = base[pos]
  const marks = vowel === undefined ? undefined : TONE_MARKS[vowel]
  if (marks === undefined) return base
  return base.slice(0, pos) + (marks[tone - 1] ?? vowel) + base.slice(pos + 1)
}
