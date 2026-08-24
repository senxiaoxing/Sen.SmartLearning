/**
 * @file 二年级数学知识点 seed 数据 —— 人教版二年级上下册全量，共 64 个
 * @layer data  静态内容，随 App 版本内置，备份时不导出
 * @see design/08-年级分区与内容扩展.md §8.1  二年级图谱的范围与命名
 * @see design/01-知识点图谱.md §3 数学（Math）
 *
 * ## ID 为什么带年级前缀
 *
 * 一年级用掉了 `M1`~`M9`（不带年级标记），二年级只能另起：
 * `M2-4.3` 读作「数学 · 二年级 · 第 4 单元 · 第 3 个」。
 *
 * 看着与一年级不对称，但一年级的 ID 是 `mastery` 表的主键——
 * 改它等于让孩子已有的掌握度记录全部失联。不对称远比那个便宜。
 * 三年级起沿用 `M3-x.y`，从此规整。
 *
 * ## 单元是主题聚类，不是教材目录
 *
 * 与一年级同一个做法：教材把表内乘法拆成（一）（二）两个单元、中间隔着
 * 「观察物体」，而调度器需要口诀连成一条链，因此这里合并为 M2-4 一个单元。
 * 与教材对齐的是**内容有无**和 `grade` 标记，不是分组方式。
 *
 * ⚠️ `order` = 声明顺序，调整顺序等于调整教学顺序。
 * 同年级内的前置必须声明在自己**前面**，否则 `prerequisite_order_inverted` 会拦下——
 * 那个错不崩溃、不报警，只是让该知识点永远解不开锁。
 * 跨年级前置（挂一年级的 `M5.5` 之类）永远安全：G1 分区的 order 整体小于 G2。
 *
 * 📖 教材版本：人教版 2024 修订版。
 */

import { buildKnowledgePoints, type KpSpec } from '@/data/seed/kpBuilder'
import type { KnowledgePoint } from '@/domain/types'

const UNIT_NAMES: Record<string, string> = {
  'M2-1': '长度单位',
  'M2-2': '100以内加减法笔算',
  'M2-3': '角的初步认识',
  'M2-4': '表内乘法',
  'M2-5': '观察物体',
  'M2-6': '认识时间',
  'M2-7': '搭配',
  'M2-8': '数据收集整理',
  'M2-9': '表内除法',
  'M2-10': '图形的运动',
  'M2-11': '混合运算',
  'M2-12': '有余数的除法',
  'M2-13': '万以内数的认识',
  'M2-14': '克和千克',
  'M2-15': '推理',
}

const SPECS: KpSpec[] = [
  // ── M2-1 长度单位（二上）─────────────────────────────────────────
  // 一年级没有任何测量内容，因此本单元无一年级前置——它是二年级的入口之一。
  // 每个年级都需要至少一个无前置的入口，否则整个年级都解不开锁。
  { id: 'M2-1.1', name: '认识厘米', types: ['choice_image'], mis: ['unit_sense_weak'] },
  { id: 'M2-1.2', name: '用尺子量长度', pre: ['M2-1.1'], types: ['choice_image'], diff: 2,
    mis: ['ruler_start_wrong', 'off_by_one'] },
  { id: 'M2-1.3', name: '认识米（1 米 = 100 厘米）', pre: ['M2-1.1'], diff: 2,
    mis: ['unit_conversion'] },
  { id: 'M2-1.4', name: '选择合适的长度单位', pre: ['M2-1.3'], types: ['choice_text'], diff: 2,
    mis: ['unit_sense_weak', 'unit_conversion'] },
  { id: 'M2-1.5', name: '认识线段·量画线段', pre: ['M2-1.2'], types: ['choice_image'], diff: 2 },

  // ── M2-2 100以内加减法笔算（二上）────────────────────────────────
  // ⭐ 一年级只做到 20 以内的口算，竖式是二年级的全新动作：
  //    「数位对齐」这一步在口算里根本不存在，因此 column_misaligned 挂满整个单元。
  { id: 'M2-2.1', name: '两位数加两位数（不进位）', pre: ['M5.5'], diff: 2,
    mis: ['column_misaligned', 'op_confusion'] },
  // ⭐ 关键节点：后面的连加连减、整百整千加减、乃至三年级的多位数笔算全压在它上面
  { id: 'M2-2.2', name: '两位数加两位数（进位）', pre: ['M2-2.1'], diff: 2, key: true,
    mis: ['no_carry', 'carry_chain', 'column_misaligned'] },
  { id: 'M2-2.3', name: '两位数减两位数（不退位）', pre: ['M2-2.1'], diff: 2,
    mis: ['column_misaligned', 'op_confusion'] },
  { id: 'M2-2.4', name: '两位数减两位数（退位）', pre: ['M2-2.3', 'M6.5'], diff: 3,
    mis: ['no_borrow', 'borrow_chain', 'column_misaligned'] },
  { id: 'M2-2.5', name: '连加连减与加减混合（100以内）', pre: ['M2-2.2', 'M2-2.4'], diff: 3,
    mis: ['op_confusion', 'carry_chain', 'borrow_chain'] },
  { id: 'M2-2.6', name: '求比一个数多几·少几的数', pre: ['M2-2.2', 'M9.3'],
    types: ['choice_image'], diff: 3, mis: ['wrong_operation', 'add_instead', 'sub_instead'] },

  // ── M2-3 角的初步认识（二上）─────────────────────────────────────
  // ⭐ angle_side_length 是这个单元的全部难点：角的大小只看开口，与边的长短无关
  { id: 'M2-3.1', name: '认识角（顶点与边）', types: ['choice_image'],
    mis: ['angle_side_length'] },
  { id: 'M2-3.2', name: '认识直角', pre: ['M2-3.1'], types: ['choice_image'], diff: 2 },
  { id: 'M2-3.3', name: '锐角和钝角', pre: ['M2-3.2'], types: ['choice_image'], diff: 2,
    mis: ['angle_side_length'] },
  { id: 'M2-3.4', name: '数图形中角的个数', pre: ['M2-3.1'], types: ['choice_image'], diff: 3,
    mis: ['count_skip'] },

  // ── M2-4 表内乘法（二上）─────────────────────────────────────────
  // 教材顺序是 5 → 2、3、4 → 6 →（乘加乘减）→ 7 → 8 → 9，这里照搬：
  // 5 的口诀最好记，先用它建立「口诀真的能算出乘法」的信心。
  // ⭐ M2-4.1 是二年级的 M3.3：乘法、除法、有余数除法、混合运算全部压在它上面
  { id: 'M2-4.1', name: '乘法的意义（几个几相加）', pre: ['M4.8'], types: ['choice_image'],
    diff: 2, key: true, mis: ['mul_as_add'] },
  { id: 'M2-4.2', name: '乘法算式与加法算式互换', pre: ['M2-4.1'], types: ['drag_match'],
    diff: 2, mis: ['mul_as_add'] },
  { id: 'M2-4.3', name: '5 的乘法口诀', pre: ['M2-4.1'], diff: 2,
    mis: ['table_confusion', 'mul_extra_group'] },
  { id: 'M2-4.4', name: '2、3、4 的乘法口诀', pre: ['M2-4.3'], diff: 2,
    mis: ['table_confusion', 'mul_extra_group', 'mul_as_add'] },
  { id: 'M2-4.5', name: '6 的乘法口诀', pre: ['M2-4.4'], diff: 2,
    mis: ['table_confusion', 'mul_extra_group'] },
  { id: 'M2-4.6', name: '乘加乘减', pre: ['M2-4.5'], diff: 3, mis: ['op_order', 'mul_as_add'] },
  { id: 'M2-4.7', name: '7 的乘法口诀', pre: ['M2-4.5'], diff: 3,
    mis: ['table_confusion', 'mul_extra_group'] },
  { id: 'M2-4.8', name: '8 的乘法口诀', pre: ['M2-4.7'], diff: 3,
    mis: ['table_confusion', 'mul_extra_group'] },
  { id: 'M2-4.9', name: '9 的乘法口诀', pre: ['M2-4.8'], diff: 3,
    mis: ['table_confusion', 'mul_extra_group'] },
  { id: 'M2-4.10', name: '表内乘法综合（1~9 口诀）', pre: ['M2-4.9'], diff: 3, key: true,
    mis: ['table_confusion', 'mul_as_add', 'mul_extra_group'] },

  // ── M2-5 观察物体（二上）─────────────────────────────────────────
  { id: 'M2-5.1', name: '从不同位置观察物体', pre: ['M7.2'], types: ['choice_image'], diff: 2,
    mis: ['view_direction_confusion'] },
  { id: 'M2-5.2', name: '辨认从正面·侧面·上面看到的形状', pre: ['M2-5.1'],
    types: ['choice_image'], diff: 3,
    mis: ['view_direction_confusion', 'solid_plane_confusion'] },

  // ── M2-6 认识时间（二上）─────────────────────────────────────────
  // ⭐ minute_misread 是这一单元的头号误区：分针指向 3 是 15 分，不是 3 分
  { id: 'M2-6.1', name: '认识几时几分', pre: ['M8.3'], types: ['choice_image'], diff: 2,
    mis: ['minute_misread', 'hand_swap'] },
  { id: 'M2-6.2', name: '5 分 5 分地数（一大格 = 5 分）', pre: ['M2-6.1'], diff: 2,
    mis: ['minute_misread'] },
  { id: 'M2-6.3', name: '时和分的关系（1 时 = 60 分）', pre: ['M2-6.1'], diff: 2,
    mis: ['unit_conversion'] },
  { id: 'M2-6.4', name: '经过时间的推算', pre: ['M2-6.3'], types: ['choice_image'], diff: 3,
    mis: ['hour_overread', 'unit_conversion'] },

  // ── M2-7 数学广角·搭配（二上）────────────────────────────────────
  { id: 'M2-7.1', name: '简单的搭配（几件配几件）', pre: ['M2-4.1'], diff: 2,
    mis: ['combination_missed', 'mul_as_add'] },
  { id: 'M2-7.2', name: '简单的排列（组成几个两位数）', pre: ['M2-7.1'], diff: 3,
    mis: ['combination_missed'] },

  // ── M2-8 数据收集整理（二下）─────────────────────────────────────
  { id: 'M2-8.1', name: '用画记法收集数据', types: ['choice_image'], grade: '2B',
    mis: ['count_skip'] },
  { id: 'M2-8.2', name: '读简单统计表', pre: ['M2-8.1'], types: ['choice_image'], diff: 2,
    grade: '2B', mis: ['count_skip', 'off_by_one'] },

  // ── M2-9 表内除法（二下）─────────────────────────────────────────
  { id: 'M2-9.1', name: '平均分的意义', pre: ['M2-4.1'], types: ['choice_image'], diff: 2,
    grade: '2B', mis: ['div_as_sub'] },
  { id: 'M2-9.2', name: '除法的意义与算式', pre: ['M2-9.1'], diff: 2, key: true, grade: '2B',
    mis: ['div_as_sub', 'div_as_mul'] },
  { id: 'M2-9.3', name: '用 2~6 的口诀求商', pre: ['M2-9.2', 'M2-4.5'], diff: 2, grade: '2B',
    mis: ['table_confusion', 'div_as_mul'] },
  { id: 'M2-9.4', name: '用 7~9 的口诀求商', pre: ['M2-9.3', 'M2-4.10'], diff: 3, grade: '2B',
    mis: ['table_confusion', 'div_as_mul'] },
  { id: 'M2-9.5', name: '乘除法的关系（一图四式）', pre: ['M2-9.4'], types: ['drag_match'],
    diff: 3, grade: '2B' },
  { id: 'M2-9.6', name: '解决问题：平均分与包含除', pre: ['M2-9.4'], types: ['choice_image'],
    diff: 3, grade: '2B', mis: ['wrong_operation', 'div_as_sub'] },

  // ── M2-10 图形的运动（二下）──────────────────────────────────────
  { id: 'M2-10.1', name: '轴对称图形', pre: ['M7.3'], types: ['choice_image'], diff: 2,
    grade: '2B', mis: ['symmetry_axis_wrong'] },
  { id: 'M2-10.2', name: '找对称轴', pre: ['M2-10.1'], types: ['choice_image'], diff: 3,
    grade: '2B', mis: ['symmetry_axis_wrong'] },
  { id: 'M2-10.3', name: '平移', pre: ['M2-10.1'], types: ['choice_image'], diff: 2,
    grade: '2B', mis: ['off_by_one'] },
  { id: 'M2-10.4', name: '旋转', pre: ['M2-10.1'], types: ['choice_image'], diff: 2,
    grade: '2B' },

  // ── M2-11 混合运算（二下）────────────────────────────────────────
  { id: 'M2-11.1', name: '同级运算（从左往右）', pre: ['M2-2.5'], diff: 2, grade: '2B',
    mis: ['op_order', 'op_confusion'] },
  // ⭐ 关键节点：运算顺序一旦学歪，后面每一道混合运算都会错，且错得毫无规律
  { id: 'M2-11.2', name: '乘除与加减混合（先乘除后加减）', pre: ['M2-11.1', 'M2-9.4'],
    diff: 3, key: true, grade: '2B', mis: ['op_order'] },
  { id: 'M2-11.3', name: '带括号的混合运算', pre: ['M2-11.2'], diff: 3, grade: '2B',
    mis: ['paren_ignored', 'op_order'] },
  { id: 'M2-11.4', name: '两步计算解决问题', pre: ['M2-11.2'], types: ['choice_image'],
    diff: 3, grade: '2B', mis: ['wrong_operation', 'op_order'] },

  // ── M2-12 有余数的除法（二下）────────────────────────────────────
  { id: 'M2-12.1', name: '认识余数', pre: ['M2-9.4'], types: ['choice_image'], diff: 2,
    grade: '2B', mis: ['remainder_ignored'] },
  { id: 'M2-12.2', name: '余数比除数小', pre: ['M2-12.1'], diff: 2, grade: '2B',
    mis: ['remainder_too_big'] },
  { id: 'M2-12.3', name: '有余数除法的计算', pre: ['M2-12.2'], diff: 3, grade: '2B',
    mis: ['quotient_remainder_swap', 'remainder_ignored', 'remainder_too_big'] },
  { id: 'M2-12.4', name: '解决问题：够不够·最多几次', pre: ['M2-12.3'], types: ['choice_image'],
    diff: 3, grade: '2B', mis: ['remainder_ignored', 'wrong_operation'] },

  // ── M2-13 万以内数的认识（二下）──────────────────────────────────
  { id: 'M2-13.1', name: '1000 以内数的数数', pre: ['M1.10'], diff: 2, grade: '2B',
    mis: ['count_skip'] },
  { id: 'M2-13.2', name: '1000 以内数的组成与读写', pre: ['M2-13.1'], diff: 2, grade: '2B',
    mis: ['place_value_swap', 'zero_placeholder_lost'] },
  { id: 'M2-13.3', name: '认识万以内的数', pre: ['M2-13.2'], diff: 3, grade: '2B',
    mis: ['zero_placeholder_lost', 'place_value_swap'] },
  { id: 'M2-13.4', name: '万以内数的大小比较', pre: ['M2-13.3'], types: ['choice_text'],
    diff: 3, grade: '2B', mis: ['symbol_reversed', 'place_value_swap'] },
  { id: 'M2-13.5', name: '近似数', pre: ['M2-13.4'], types: ['choice_text'], diff: 3,
    grade: '2B' },
  { id: 'M2-13.6', name: '整百整千数的加减法', pre: ['M2-13.3', 'M2-2.5'], diff: 3, grade: '2B',
    mis: ['place_value_swap', 'column_misaligned'] },

  // ── M2-14 克和千克（二下）────────────────────────────────────────
  { id: 'M2-14.1', name: '认识克', types: ['choice_image'], grade: '2B',
    mis: ['unit_sense_weak'] },
  { id: 'M2-14.2', name: '认识千克（1 千克 = 1000 克）', pre: ['M2-14.1', 'M2-13.3'], diff: 2,
    grade: '2B', mis: ['unit_conversion'] },
  { id: 'M2-14.3', name: '选择合适的质量单位', pre: ['M2-14.2'], types: ['choice_text'],
    diff: 2, grade: '2B', mis: ['unit_sense_weak', 'unit_conversion'] },

  // ── M2-15 数学广角·推理（二下）───────────────────────────────────
  { id: 'M2-15.1', name: '简单推理（两个条件）', types: ['choice_image'], diff: 2, grade: '2B',
    mis: ['logic_first_only'] },
  { id: 'M2-15.2', name: '稍复杂推理（三个条件）', pre: ['M2-15.1'], types: ['choice_image'],
    diff: 3, grade: '2B', mis: ['logic_first_only'] },
]

/** 二年级数学知识点，共 64 个。`order` 占用 math/G2 分区的 2000~2063。 */
export const mathG2KnowledgePoints: KnowledgePoint[] = buildKnowledgePoints(
  'math',
  'G2',
  UNIT_NAMES,
  SPECS,
)
