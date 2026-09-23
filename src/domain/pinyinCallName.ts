/**
 * @file 声母韵母的**本音**片段 —— 「答案是 g」就念声母 g 本身
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/data/seed/pinyinSyllables.ts  INITIALS / SINGLE_FINALS / COMPOUND_FINALS
 * @see design/11-拼音真人录音方案.md §3.2
 *
 * 听音辨声母/辨韵母题的答案是一个**字母**（`g`、`ai`），
 * 而字母是念不出来的：喂 `g` 给中文 TTS 得到的是英文字母名「jee」，
 * 喂 `ai` 得到的是拼音串靠猜的读音——两者都不是课堂上的那个音。
 *
 * ⭐ **2026-09 起改念本音**：从前这里指向呼读音（b 念「玻」、g 念「哥」），
 * 那是拿汉字凑出来的，念出来是个**完整音节**；而人教版要求声母
 * 「读得轻短些」。先是走 `pinyinbare.*`（cmguo 真人录音），
 * **2026-09-23 起改走 `pinyinv3.*`**——教材点读的权威音源，与拼音墙同一套。
 *
 * ⛔ 跟着拼音墙换，是为了让「墙上听到的 g」和「答案说的 g」是同一条录音。
 * 从前两边就分过一次家（墙念本音、答案念呼读音），孩子听出来的是「这两个不一样」。
 *
 * ⚠️ 表在 domain、音节数据在 data —— 分层铁律不允许反向 import，
 * 所以两边的一致性由测试守（同一个 `authenticKey()` 算出来的 key 必须逐条相等）。
 */

import { authenticKey } from '@/domain/pinyin'
import type { ClipKey } from '@/domain/speech'

/**
 * 字母 → 本音片段。
 *
 * 声母与韵母合成一张表：两个集合没有交集（声母 b~w，韵母 a~ong），
 * 拆成两张只会让调用方先判断「这是声母还是韵母」，而它们都只是「屏幕上那个字母」。
 *
 * ⚠️ **`ong` 刻意缺席**：这张表服务于**答案语音**，而 `ong` 目前按「不念」处理
 * （`pinyinFinal` 遇到 `sōng` 这类音节时，韵母就是 `ong`——答错只说安慰语）。
 *
 * ⭐ 它从前缺席是因为「没有干净载体、TTS 念不准」；现在 `pinyinv3.ong`
 * 有干净录音了（拼音墙上在用），那个理由已经不成立。
 * 但**要不要把它接进答案语音是独立决定**，不混在这次改动里。
 */
const CALL_NAME_CLIPS: Readonly<Record<string, ClipKey>> = {
  // —— 声母。⭐ 念的是**本音**（轻短、无调），不是呼读音「玻 bō」——
  //    人教版要求声母「读得轻短些」，而「哥」那样念出来是个完整音节。
  //    ⚠️ 塞音（b d g p t k）发不出独立的本音，录的是它们的轻短版
  b: authenticKey('b'),
  p: authenticKey('p'),
  m: authenticKey('m'),
  f: authenticKey('f'),
  d: authenticKey('d'),
  t: authenticKey('t'),
  n: authenticKey('n'),
  l: authenticKey('l'),
  g: authenticKey('g'),
  k: authenticKey('k'),
  h: authenticKey('h'),
  j: authenticKey('j'),
  q: authenticKey('q'),
  x: authenticKey('x'),
  zh: authenticKey('zh'),
  ch: authenticKey('ch'),
  sh: authenticKey('sh'),
  r: authenticKey('r'),
  z: authenticKey('z'),
  c: authenticKey('c'),
  s: authenticKey('s'),
  y: authenticKey('y'),
  w: authenticKey('w'),

  // —— 单韵母
  a: authenticKey('a'),
  o: authenticKey('o'),
  e: authenticKey('e'),
  i: authenticKey('i'),
  u: authenticKey('u'),
  ü: authenticKey('ü'),

  // —— 复韵母与鼻韵母。ui / iu / un 单独不成音节，用独立形式 wei / you / wen 发音，
  //    这也正是课本教「ui 读作 wei」的道理
  ai: authenticKey('ai'),
  ei: authenticKey('ei'),
  ui: authenticKey('ui'),
  ao: authenticKey('ao'),
  ou: authenticKey('ou'),
  iu: authenticKey('iu'),
  ie: authenticKey('ie'),
  üe: authenticKey('üe'),
  er: authenticKey('er'),
  an: authenticKey('an'),
  en: authenticKey('en'),
  in: authenticKey('in'),
  un: authenticKey('un'),
  ün: authenticKey('ün'),
  ang: authenticKey('ang'),
  eng: authenticKey('eng'),
  ing: authenticKey('ing'),
}

/**
 * 这个声母/韵母的本音片段。
 *
 * @param letter - 屏幕上显示的那个字母，如 `'g'` `'ai'` `'ü'`
 * @returns 片段 key；`ong` 返回 `undefined`，由调用方声明「不念」
 *
 * @example
 * pinyinCallName('g')     // 'pinyinv3.g'   声母 g 本身（轻短、无调）
 * pinyinCallName('ai')    // 'pinyinv3.ai'  韵母 ai 本身
 * pinyinCallName('ong')   // undefined        刻意不进表，见上
 */
export function pinyinCallName(letter: string): ClipKey | undefined {
  return CALL_NAME_CLIPS[letter]
}
