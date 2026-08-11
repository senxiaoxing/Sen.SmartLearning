/**
 * @file 汉语拼音知识点 seed 数据 —— 全量 35 个
 * @layer data  静态内容，随 App 版本内置，备份时不导出
 * @see design/01-知识点图谱.md §4 汉语拼音（Pinyin）
 *
 * ⭐ P7 组（易混辨析）不按教学顺序推进，由调度器根据错误统计自动触发：
 * 当 `mastery.misconceptionCounts['bd_confusion'] >= 3` 时插入 P7.1 专项练习。
 * 这是错题诊断驱动的定向补救，也是本图谱最有价值的机制。
 *
 * 📖 教材版本提醒：2024 修订版统编语文教材调整为「先识字、后拼音」，
 * 但拼音单元内部顺序未变，本文件结构无需改动。
 */

import { buildKnowledgePoints, type KpSpec } from '@/data/seed/kpBuilder'
import type { KnowledgePoint } from '@/domain/types'

const UNIT_NAMES: Record<string, string> = {
  P1: '单韵母与声调',
  P2: '声母',
  P3: '拼读规则',
  P4: '复韵母',
  P5: '鼻韵母',
  P6: '整体认读音节',
  P7: '易混辨析',
  P8: '综合应用',
}

const SPECS: KpSpec[] = [
  // ── P1 单韵母与声调 ──────────────────────────────────────────────
  { id: 'P1.1', name: '单韵母 a o e' },
  { id: 'P1.2', name: '单韵母 i u ü', pre: ['P1.1'] },
  { id: 'P1.3', name: '四声调 ā á ǎ à', pre: ['P1.1'], diff: 2, mis: ['tone_wrong_position'] },

  // ── P2 声母 ──────────────────────────────────────────────────────
  { id: 'P2.1', name: '声母 b p m f', pre: ['P1.2'], mis: ['bd_confusion'] },
  { id: 'P2.2', name: '声母 d t n l', pre: ['P2.1'],
    mis: ['bd_confusion', 'nl_confusion', 'ft_confusion'] },
  { id: 'P2.3', name: '声母 g k h', pre: ['P2.2'], diff: 2 },
  { id: 'P2.4', name: '声母 j q x', pre: ['P2.3'], diff: 2, key: true, mis: ['pq_confusion'] },
  { id: 'P2.5', name: '声母 z c s', pre: ['P2.4'], diff: 2 },
  { id: 'P2.6', name: '声母 zh ch sh r', pre: ['P2.5'], diff: 3, key: true,
    mis: ['flat_curl_confusion'] },
  { id: 'P2.7', name: '声母 y w', pre: ['P2.6'], diff: 2 },

  // ── P3 拼读规则（拼音的核心难点全在这） ──────────────────────────
  { id: 'P3.1', name: '两拼音节（声母+韵母）', pre: ['P2.1', 'P1.3'], types: ['drag_combine'],
    diff: 2, key: true },
  { id: 'P3.2', name: '三拼音节（声+介+韵）', pre: ['P3.1'], types: ['drag_combine'], diff: 3,
    key: true, mis: ['three_syllable_missing_medial'] },
  // ⭐ u_umlaut_kept（jü 而不是 ju）是拼音全科最高频错误
  { id: 'P3.3', name: 'j q x 与 ü 相拼去两点', pre: ['P2.4', 'P1.2'], types: ['choice_text'],
    diff: 3, key: true, mis: ['u_umlaut_kept'] },
  // 规则：有 a 找 a，没 a 找 o e，i u 并列标在后
  { id: 'P3.4', name: '声调标注规则', pre: ['P1.3', 'P4.1'], types: ['choice_text'], diff: 3,
    key: true, mis: ['tone_wrong_position'] },

  // ── P4 复韵母 ────────────────────────────────────────────────────
  { id: 'P4.1', name: '复韵母 ai ei ui', pre: ['P3.1'], diff: 2,
    mis: ['ui_iu_swap', 'ei_ie_swap'] },
  { id: 'P4.2', name: '复韵母 ao ou iu', pre: ['P4.1'], diff: 2, mis: ['ui_iu_swap'] },
  { id: 'P4.3', name: '复韵母 ie üe er', pre: ['P4.2'], diff: 3, mis: ['ei_ie_swap'] },
  { id: 'P4.4', name: '单/复韵母辨析', pre: ['P4.3'], diff: 3,
    mis: ['ui_iu_swap', 'ei_ie_swap'] },

  // ── P5 鼻韵母 ────────────────────────────────────────────────────
  { id: 'P5.1', name: '前鼻韵母 an en in un ün', pre: ['P4.3'], diff: 2,
    mis: ['nasal_confusion'] },
  { id: 'P5.2', name: '后鼻韵母 ang eng ing ong', pre: ['P5.1'], diff: 3,
    mis: ['nasal_confusion'] },
  // ⭐⭐ 南方孩子最高频难点
  { id: 'P5.3', name: '前后鼻韵母辨析', pre: ['P5.2'], diff: 3, key: true,
    mis: ['nasal_confusion'] },

  // ── P6 整体认读音节 ──────────────────────────────────────────────
  { id: 'P6.1', name: 'zhi chi shi ri', pre: ['P2.6'], diff: 2, mis: ['spell_integral'] },
  { id: 'P6.2', name: 'zi ci si', pre: ['P2.5'], diff: 2, mis: ['spell_integral'] },
  { id: 'P6.3', name: 'yi wu yu', pre: ['P2.7'], diff: 2, mis: ['spell_integral'] },
  { id: 'P6.4', name: 'ye yue yuan', pre: ['P6.3', 'P4.3'], diff: 3, mis: ['spell_integral'] },
  { id: 'P6.5', name: 'yin yun ying', pre: ['P6.3', 'P5.2'], diff: 3,
    mis: ['spell_integral', 'nasal_confusion'] },

  // ── P7 易混辨析（由错误统计触发，非线性推进） ────────────────────
  { id: 'P7.1', name: 'b / d 辨析', pre: ['P2.2'], types: ['choice_audio', 'choice_image'],
    diff: 2, mis: ['bd_confusion'] },
  { id: 'P7.2', name: 'p / q 辨析', pre: ['P2.4'], types: ['choice_audio', 'choice_image'],
    diff: 2, mis: ['pq_confusion'] },
  { id: 'P7.3', name: 'f / t 辨析', pre: ['P2.2'], diff: 2, mis: ['ft_confusion'] },
  { id: 'P7.4', name: 'n / l 辨析', pre: ['P2.2'], diff: 3, mis: ['nl_confusion'] },
  { id: 'P7.5', name: '平翘舌辨析 z-zh / c-ch / s-sh', pre: ['P2.6'], diff: 3,
    mis: ['flat_curl_confusion'] },
  { id: 'P7.6', name: '前后鼻音辨析', pre: ['P5.3'], diff: 3, mis: ['nasal_confusion'] },

  // ── P8 综合应用 ──────────────────────────────────────────────────
  { id: 'P8.1', name: '听音选拼音', pre: ['P6.5'], diff: 2 },
  // P8.2 与 P8.3 构成完整的音形对应：一个是图→拼音，一个是音→字
  { id: 'P8.2', name: '看图选音节', pre: ['P8.1'], types: ['choice_image'], diff: 2,
    mis: ['pinyin_form_unlinked', 'tone_confusion'] },
  { id: 'P8.3', name: '拼音拼字（音→字）', pre: ['P8.2'], types: ['choice_text'], diff: 3,
    mis: ['tone_confusion'] },
]

/** 拼音知识点，共 35 个。`order` 占用 101~135。 */
export const pinyinKnowledgePoints: KnowledgePoint[] = buildKnowledgePoints(
  'pinyin',
  UNIT_NAMES,
  SPECS,
  101,
)
