/**
 * @file 数学知识点 seed 数据 —— 人教版一年级上册全量 + 一年级下册前段，共 48 个
 * @layer data  静态内容，随 App 版本内置，备份时不导出
 * @see design/01-知识点图谱.md §3 数学（Math）
 *
 * ⭐ 关键节点 M3.3「10 的分与合」是全局唯一的双关键节点：
 * 凑十法（M5.1）与破十法（M6.1）都建立在它之上。调度器规则见 design/03-技术方案.md §4.1。
 *
 * 📖 教材版本：人教版 2024 修订版（已核对，无后续修订）。
 * 下面的 M1~M9 是**按知识主题聚类**，不是教材目录单元号——
 * 教材把「数的认识」和「加减法」编在同一单元里，而调度器需要它们各自成链。
 * 与教材对齐的是内容有无和 `grade` 标记，不是分组方式。
 */

import { buildKnowledgePoints, type KpSpec } from '@/data/seed/kpBuilder'
import type { KnowledgePoint } from '@/domain/types'

const UNIT_NAMES: Record<string, string> = {
  M1: '数感与计数',
  M2: '位置与方向',
  M3: '分与合',
  M4: '10以内加减法',
  M5: '20以内进位加法',
  M6: '20以内退位减法',
  M7: '图形认识',
  M8: '认识钟表',
  M9: '解决问题',
}

const SPECS: KpSpec[] = [
  // ── M1 数感与计数 ────────────────────────────────────────────────
  { id: 'M1.1', name: '数一数 1~10', types: ['tap_count', 'choice_image'], mis: ['count_skip'] },
  { id: 'M1.2', name: '认识 0', pre: ['M1.1'], types: ['choice_image'] },
  { id: 'M1.3', name: '数的顺序 1~10', pre: ['M1.1'], types: ['drag_order'], mis: ['count_skip'] },
  { id: 'M1.4', name: '基数与序数（第几个）', pre: ['M1.3'], types: ['choice_image'], diff: 2,
    mis: ['ordinal_cardinal_confusion'] },
  { id: 'M1.5', name: '比多少', pre: ['M1.1'], types: ['choice_image'], mis: ['off_by_one'] },
  { id: 'M1.6', name: '比大小 > < =', pre: ['M1.3', 'M1.5'], types: ['choice_text'], diff: 2,
    mis: ['symbol_reversed'] },
  { id: 'M1.7', name: '数一数 11~20', pre: ['M1.1'], types: ['tap_count'], diff: 2,
    mis: ['count_skip'] },
  { id: 'M1.8', name: '20以内数的顺序与比大小', pre: ['M1.6', 'M1.7'],
    types: ['drag_order', 'choice_text'], diff: 2, mis: ['symbol_reversed'] },
  { id: 'M1.9', name: '数的组成（十几 = 10 + 几）', pre: ['M1.7'], diff: 2, key: true },
  { id: 'M1.10', name: '数位初步（个位·十位）', pre: ['M1.9'], types: ['input_number'], diff: 3,
    mis: ['place_value_swap'] },
  // ⭐ 凑十法的另一条腿：`9 + 5` 拆完还要算 `10 + 4`。
  //    前置只挂 M1.9（知道 13 = 10 + 3 就能算 10 + 3），不挂 M1.10——
  //    「十位读作几」是数位的**命名**，不是算 10 加几的必要条件，
  //    挂上去会让这道桥无谓地晚开。
  { id: 'M1.11', name: '10 加几和相应的减法', pre: ['M1.9'], diff: 2,
    mis: ['place_value_swap', 'op_confusion', 'whole_part_confusion'] },

  // ── M2 位置与方向（一年级下册） ──────────────────────────────────
  // 2024 修订版把「位置」整单元移到了一下，一上不再有此内容
  { id: 'M2.1', name: '上·下', types: ['choice_image'], grade: '1B' },
  { id: 'M2.2', name: '前·后', types: ['choice_image'], grade: '1B' },
  { id: 'M2.3', name: '左·右', pre: ['M2.1', 'M2.2'], types: ['choice_image'], diff: 2,
    grade: '1B', mis: ['lr_mirror'] },

  // ── M3 分与合 ────────────────────────────────────────────────────
  { id: 'M3.1', name: '2~5 的分与合', pre: ['M1.3'], types: ['input_number', 'drag_match'],
    mis: ['whole_part_confusion'] },
  { id: 'M3.2', name: '6~10 的分与合', pre: ['M3.1'], diff: 2,
    mis: ['whole_part_confusion', 'op_confusion'] },
  // ⭐⭐ 全局最关键节点：凑十法与破十法的共同地基，必须练到条件反射
  { id: 'M3.3', name: '10 的分与合', pre: ['M3.2'], diff: 2, key: true,
    mis: ['whole_part_confusion', 'op_confusion'] },

  // ── M4 10以内加减法 ──────────────────────────────────────────────
  { id: 'M4.1', name: '加法的意义（合并）', pre: ['M1.1'], types: ['choice_image'] },
  { id: 'M4.2', name: '5以内加法', pre: ['M4.1', 'M3.1'], mis: ['op_confusion', 'off_by_one'] },
  { id: 'M4.3', name: '减法的意义（去掉）', pre: ['M1.1'], types: ['choice_image'] },
  { id: 'M4.4', name: '5以内减法', pre: ['M4.3', 'M3.1'], mis: ['op_confusion', 'off_by_one'] },
  { id: 'M4.5', name: '6~10 的加法', pre: ['M4.2', 'M3.2'], diff: 2,
    mis: ['op_confusion', 'off_by_one'] },
  { id: 'M4.6', name: '6~10 的减法', pre: ['M4.4', 'M3.2'], diff: 2,
    mis: ['op_confusion', 'off_by_one'] },
  { id: 'M4.7', name: '0 的加减法', pre: ['M1.2', 'M4.5'], diff: 2, mis: ['zero_rule'] },
  { id: 'M4.8', name: '连加连减', pre: ['M4.5', 'M4.6'], diff: 3, mis: ['op_confusion'] },
  { id: 'M4.9', name: '加减混合', pre: ['M4.8'], diff: 3, mis: ['op_confusion'] },
  { id: 'M4.10', name: '一图四式（加减关系）', pre: ['M4.5', 'M4.6'], types: ['drag_match'],
    diff: 3 },

  // ── M5 20以内进位加法 ────────────────────────────────────────────
  // ⭐ 干扰项必须按 misconceptions 生成，见 design/03-技术方案.md §4.2 干扰项铁律
  // 前置里的 M1.11 已传递依赖 M1.9，不再重复列出。
  // 挂 M1.11 而非 M1.9 是有意的：拆成「10 和几」只是第一步，
  // 还得把 `10 + 4` 算出来才算会凑十——少了这一步，孩子会拆却答不出。
  { id: 'M5.1', name: '凑十法原理', pre: ['M3.3', 'M1.11'], types: ['drag_combine'], diff: 2,
    key: true, mis: ['carry_lost'] },
  { id: 'M5.2', name: '9 加几', pre: ['M5.1'], diff: 2,
    mis: ['no_carry', 'carry_lost', 'sub_instead', 'digit_concat'] },
  { id: 'M5.3', name: '8、7、6 加几', pre: ['M5.2'], diff: 3,
    mis: ['no_carry', 'carry_lost', 'sub_instead'] },
  { id: 'M5.4', name: '5、4、3、2 加几', pre: ['M5.3'], diff: 3,
    mis: ['no_carry', 'carry_lost', 'sub_instead'] },
  { id: 'M5.5', name: '20以内进位加法综合', pre: ['M5.4'], diff: 3,
    mis: ['no_carry', 'carry_lost', 'sub_instead', 'digit_concat'] },

  // ── M6 20以内退位减法（一年级下册） ──────────────────────────────
  { id: 'M6.1', name: '破十法原理', pre: ['M3.3', 'M1.9', 'M4.6'], types: ['drag_combine'],
    diff: 2, key: true, grade: '1B', mis: ['borrow_lost'] },
  { id: 'M6.2', name: '十几减 9', pre: ['M6.1'], diff: 2, grade: '1B',
    mis: ['no_borrow', 'borrow_lost', 'add_instead'] },
  { id: 'M6.3', name: '十几减 8、7、6', pre: ['M6.2'], diff: 3, grade: '1B',
    mis: ['no_borrow', 'borrow_lost', 'add_instead'] },
  { id: 'M6.4', name: '十几减 5、4、3、2', pre: ['M6.3'], diff: 3, grade: '1B',
    mis: ['no_borrow', 'borrow_lost'] },
  { id: 'M6.5', name: '20以内退位减法综合', pre: ['M6.4', 'M5.5'], diff: 3, grade: '1B',
    mis: ['no_borrow', 'borrow_lost', 'add_instead'] },

  // ── M7 图形认识 ──────────────────────────────────────────────────
  // 两种题型轮换：认图形（4 种问法）+ 数积木（几十种），后者是题量主力
  { id: 'M7.1', name: '立体图形识别（正方体·长方体·圆柱·球）', types: ['choice_image'],
    mis: ['solid_plane_confusion', 'count_skip'] },
  { id: 'M7.2', name: '立体图形分类', pre: ['M7.1'], types: ['drag_match'], diff: 2,
    mis: ['solid_plane_confusion'] },
  // 平面图形在人教版一年级下册「认识图形（二）」
  { id: 'M7.3', name: '平面图形识别（长方形·正方形·三角形·圆）', pre: ['M7.1'],
    types: ['choice_image'], diff: 2, grade: '1B', mis: ['solid_plane_confusion'] },
  // 拼组的考法是「一堆图形混在一起，数其中某一种有几个」
  { id: 'M7.4', name: '平面图形拼组', pre: ['M7.3'], types: ['choice_image'], diff: 3,
    grade: '1B', mis: ['count_skip'] },

  // ── M8 认识钟表（一年级下册） ────────────────────────────────────
  // 2024 修订版把「认识钟表」从一上移到了一下，且整时与半时同在这一单元
  { id: 'M8.1', name: '认识钟面（时针·分针）', types: ['choice_image'], grade: '1B',
    mis: ['hand_swap'] },
  { id: 'M8.2', name: '认识整时', pre: ['M8.1', 'M1.3'], types: ['choice_image'], diff: 2,
    grade: '1B', mis: ['hand_swap'] },
  { id: 'M8.3', name: '认识半时', pre: ['M8.2'], types: ['choice_image'], diff: 3,
    grade: '1B', mis: ['hand_swap'] },

  // ── M9 解决问题 ──────────────────────────────────────────────────
  { id: 'M9.1', name: '求总数（加法应用）', pre: ['M4.5'], types: ['choice_image'], diff: 2,
    mis: ['wrong_operation'] },
  { id: 'M9.2', name: '求剩余（减法应用）', pre: ['M4.6'], types: ['choice_image'], diff: 2,
    mis: ['wrong_operation'] },
  { id: 'M9.3', name: '求相差数', pre: ['M9.2', 'M1.5'], types: ['choice_image'], diff: 3,
    mis: ['wrong_operation'] },
  { id: 'M9.4', name: '大括号 + 问号问题', pre: ['M9.1', 'M9.2'], types: ['choice_image'],
    diff: 3, mis: ['wrong_operation'] },
]

/** 数学知识点，共 48 个。`order` 占用 1~48。 */
export const mathKnowledgePoints: KnowledgePoint[] = buildKnowledgePoints(
  'math',
  UNIT_NAMES,
  SPECS,
  1,
)
