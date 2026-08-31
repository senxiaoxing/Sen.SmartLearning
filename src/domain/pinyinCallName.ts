/**
 * @file 声母韵母的**呼读音**片段 —— 「答案是 g」要念成「哥」
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  INITIALS / SINGLE_FINALS / COMPOUND_FINALS
 * @see src/domain/pinyinCallName.test.ts  防漂移：这里的每条都要与音节表对得上
 *
 * 听音辨声母/辨韵母题的答案是一个**字母**（`g`、`ai`），
 * 而字母是念不出来的：喂 `g` 给中文 TTS 得到的是英文字母名「jee」，
 * 喂 `ai` 得到的是拼音串靠猜的读音——两者都不是课堂上的那个音。
 *
 * 课堂上的读法叫**呼读音**：b 念「玻」、g 念「哥」、ai 念「哀」。
 * 音节表里这些呼读音本来就各挂着一个汉字载体（那是为了让 TTS 读对而存在的），
 * 于是这张表只做一件事：把字母映射到那条现成片段上，**零新增音频**。
 *
 * ⚠️ 表在 domain、音节数据在 data —— 分层铁律不允许反向 import，
 * 所以两边的一致性由测试守（同一个 `syllableKey()` 算出来的 key 必须逐条相等）。
 */

import { syllableKey } from '@/domain/pinyin'
import type { ClipKey } from '@/domain/speech'

/**
 * 字母 → 呼读音片段。
 *
 * 声母与韵母合成一张表：两个集合没有交集（声母 b~w，韵母 a~ong），
 * 拆成两张只会让调用方先判断「这是声母还是韵母」，而它们都只是「屏幕上那个字母」。
 *
 * ⚠️ **`ong` 刻意缺席**：汉语里它不能独立成音节，音节表里也没有汉字载体，
 * 那条片段念的是拼音串本身、声调靠 TTS 猜（见 `pinyinSyllables.ts` 的说明）。
 * 宁可那道题的答案不念，也不能把一个可能是错的读音教给她。
 */
const CALL_NAME_CLIPS: Readonly<Record<string, ClipKey>> = {
  // —— 声母（呼读音，与老师带读的一致：b 玻 · p 坡 · m 摸 · f 佛…）
  b: syllableKey('bo', 1),
  p: syllableKey('po', 1),
  m: syllableKey('mo', 1),
  f: syllableKey('fo', 2),
  d: syllableKey('de', 1),
  t: syllableKey('te', 4),
  n: syllableKey('ne', 4),
  l: syllableKey('le', 4),
  g: syllableKey('ge', 1),
  k: syllableKey('ke', 1),
  h: syllableKey('he', 1),
  j: syllableKey('ji', 1),
  q: syllableKey('qi', 1),
  x: syllableKey('xi', 1),
  zh: syllableKey('zhi', 1),
  ch: syllableKey('chi', 1),
  sh: syllableKey('shi', 1),
  r: syllableKey('ri', 4),
  z: syllableKey('zi', 1),
  c: syllableKey('ci', 1),
  s: syllableKey('si', 1),
  y: syllableKey('yi', 1),
  w: syllableKey('wu', 1),

  // —— 单韵母
  a: syllableKey('a', 1),
  o: syllableKey('o', 1),
  e: syllableKey('e', 2),
  i: syllableKey('i', 1),
  u: syllableKey('u', 1),
  ü: syllableKey('ü', 2),

  // —— 复韵母与鼻韵母。ui / iu / un 单独不成音节，用独立形式 wei / you / wen 发音，
  //    这也正是课本教「ui 读作 wei」的道理
  ai: syllableKey('ai', 1),
  ei: syllableKey('ei', 1),
  ui: syllableKey('ui', 1),
  ao: syllableKey('ao', 1),
  ou: syllableKey('ou', 1),
  iu: syllableKey('iu', 1),
  ie: syllableKey('ie', 1),
  üe: syllableKey('üe', 1),
  er: syllableKey('er', 2),
  an: syllableKey('an', 1),
  en: syllableKey('en', 1),
  in: syllableKey('in', 1),
  un: syllableKey('un', 1),
  ün: syllableKey('ün', 4),
  ang: syllableKey('ang', 1),
  eng: syllableKey('eng', 1),
  ing: syllableKey('ing', 1),
}

/**
 * 这个声母/韵母的呼读音片段。
 *
 * @param letter - 屏幕上显示的那个字母，如 `'g'` `'ai'` `'ü'`
 * @returns 片段 key；没有干净载体的（`ong`）返回 `undefined`，由调用方声明「不念」
 *
 * @example
 * pinyinCallName('g')     // 'pinyin.ge1'   念「哥」
 * pinyinCallName('ai')    // 'pinyin.ai1'   念「哀」
 * pinyinCallName('ong')   // undefined      没有载体字，不念
 */
export function pinyinCallName(letter: string): ClipKey | undefined {
  return CALL_NAME_CLIPS[letter]
}
