/**
 * @file 拼音易混对照表 —— 「听到 X 最容易错选成什么」
 * @layer domain  纯数据 + 纯函数
 * @see design/01-知识点图谱.md §P7 易混辨析
 * @see src/domain/generators/pinyinListen.ts  唯一使用者
 *
 * 从 `pinyinListen.ts` 拆出来是因为那个文件超了 150 行上限（CLAUDE.md 文件规模规范）。
 * 这张表本身也确实是独立的一件事：它是**拼音教学经验的编码**，
 * 改它是在调整「教学上认为什么容易混」，与出题逻辑的改动是两种性质。
 *
 * ⚠️ 干扰项按这张表生成，**不能随机抽**。
 * 听到 `bā` 时把 `dà` 摆在一起才有诊断价值；摆 `xīng` 那种毫不相干的，
 * 孩子闭着眼也能排除，这道题就白出了。
 */

import type { MisconceptionTag } from '@/domain/types'

export interface ConfusableEntry {
  /** 最容易被听混的音节 `base`，按易混程度排序 */
  with: readonly string[]
  /** 混了算哪种误区。⭐ 这决定了补救往哪个方向走 */
  tag: MisconceptionTag
}

/**
 * 易混对照表。
 *
 * ⚠️ **键必须是音节的 `base`**，即声母的呼读音形式（`'bo'` `'zi'`），
 * 不是裸声母（`'b'` `'z'`）。早先按裸声母写，结果所有声母题一次都没命中，
 * P7.5 平翘舌辨析全部退化成无诊断的兜底标签——
 * 不报错、不崩溃，只是诊断能力静默消失了。
 */
export const CONFUSABLE_PINYIN: Readonly<Record<string, ConfusableEntry>> = {
  // —— 形近/音近声母（呼读音形式）
  bo: { with: ['de', 'po'], tag: 'bd_confusion' },
  de: { with: ['bo', 'te'], tag: 'bd_confusion' },
  po: { with: ['qi', 'bo'], tag: 'pq_confusion' },
  qi: { with: ['po', 'ji'], tag: 'pq_confusion' },
  fo: { with: ['te', 'he'], tag: 'ft_confusion' },
  te: { with: ['fo', 'de'], tag: 'ft_confusion' },
  ne: { with: ['le', 'mo'], tag: 'nl_confusion' },
  le: { with: ['ne', 'ri'], tag: 'nl_confusion' },

  // —— 平翘舌。呼读音同时也是整体认读音节，
  //    一套键覆盖 P2.5 / P2.6 / P6.1 / P6.2 / P7.5
  zi: { with: ['zhi', 'ci'], tag: 'flat_curl_confusion' },
  zhi: { with: ['zi', 'chi'], tag: 'flat_curl_confusion' },
  ci: { with: ['chi', 'zi'], tag: 'flat_curl_confusion' },
  chi: { with: ['ci', 'shi'], tag: 'flat_curl_confusion' },
  si: { with: ['shi', 'ci'], tag: 'flat_curl_confusion' },
  shi: { with: ['si', 'chi'], tag: 'flat_curl_confusion' },

  // —— 两拼音节形式。⚠️ d/n/l 的呼读音没有干净的汉字载体（会读错声调），
  //    所以 P2.2 / P7.1 / P7.4 的辨析改用真实音节：八大 笔弟 你里
  ba: { with: ['da', 'bi'], tag: 'bd_confusion' },
  da: { with: ['ba', 'di'], tag: 'bd_confusion' },
  bi: { with: ['di', 'ba'], tag: 'bd_confusion' },
  di: { with: ['bi', 'da'], tag: 'bd_confusion' },
  ni: { with: ['li', 'mi'], tag: 'nl_confusion' },
  li: { with: ['ni', 'lu'], tag: 'nl_confusion' },
  lu: { with: ['li', 'ni'], tag: 'nl_confusion' },
  tu: { with: ['du', 'te'], tag: 'ft_confusion' },

  // —— 前后鼻韵母。⭐⭐ 南方孩子最高频的错误
  an: { with: ['ang', 'en'], tag: 'nasal_confusion' },
  ang: { with: ['an', 'eng'], tag: 'nasal_confusion' },
  en: { with: ['eng', 'an'], tag: 'nasal_confusion' },
  eng: { with: ['en', 'ang'], tag: 'nasal_confusion' },
  in: { with: ['ing', 'en'], tag: 'nasal_confusion' },
  ing: { with: ['in', 'eng'], tag: 'nasal_confusion' },
  yin: { with: ['ying', 'yun'], tag: 'nasal_confusion' },
  ying: { with: ['yin', 'yun'], tag: 'nasal_confusion' },

  // —— 易混复韵母
  ui: { with: ['iu', 'ei'], tag: 'ui_iu_swap' },
  iu: { with: ['ui', 'ou'], tag: 'ui_iu_swap' },
  ei: { with: ['ie', 'ai'], tag: 'ei_ie_swap' },
  ie: { with: ['ei', 'ye'], tag: 'ei_ie_swap' },
}

/** 这个音节有没有登记易混对照。供测试与出题逻辑判断 */
export function hasConfusable(base: string): boolean {
  return base in CONFUSABLE_PINYIN
}
