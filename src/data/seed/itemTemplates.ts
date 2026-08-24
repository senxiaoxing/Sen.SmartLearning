/**
 * @file 数学题目生成器配置 —— 把知识点映射到生成器与三档难度参数
 * @layer data  静态内容，随 App 版本内置
 * @see design/02-数据库Schema.md §3.6 ItemTemplate
 * @see src/domain/generators/index.ts 生成器注册表
 *
 * 覆盖数学全部 48 个知识点（M1~M9），题量无限、内容成本为零。
 * 需要「图」的那些（序数、位置、图形、钟表、应用题）用手绘 SVG 渲染
 * （components/shape/），因此同样是程序生成，不依赖美术素材。
 *
 * 难度档设计原则：难度不是「换个更大的数」，而是**换一种更难的思维方式**。
 * 例如 M1.3 的三档是 后继 → 前驱 → 中间数，而不是把数字范围从 10 扩到 20。
 */

import { ENGLISH_TEMPLATES } from '@/data/seed/englishTemplates'
import { MATH_G2_TEMPLATES } from '@/data/seed/mathG2Templates'
import { STORY_FRAMES } from '@/data/seed/storyFrames'
import {
  ALL_SYLLABLES,
  BLEND_SYLLABLES,
  INITIALS,
  INTEGRAL_SYLLABLES,
  SYLLABLE_PICTURES,
  TONE_SET,
  TRIPLE_SYLLABLES,
  usable,
  USABLE_SYLLABLES,
} from '@/data/seed/pinyinSyllables'
import { altTpl, tpl } from '@/data/seed/templateBuilder'
import type { Syllable } from '@/domain/pinyin'
import type { ItemTemplate } from '@/domain/types'

export const ITEM_TEMPLATES: ItemTemplate[] = [
  ...MATH_G2_TEMPLATES,
  // ── M1.4 序数 ────────────────────────────────────────────────────
  // 难度递进：只从左数 → 可能从右数 → 队伍更长
  tpl('M1.4', 'ordinal', {
    1: { countRange: [4, 5] },
    2: { countRange: [5, 6], allowFromRight: true },
    3: { countRange: [6, 8], allowFromRight: true },
  }, 'choice_image'),

  // ── M2 位置与方向 ────────────────────────────────────────────────
  tpl('M2.1', 'position', {
    1: { axis: 'updown' },
    2: { axis: 'updown' },
    3: { axis: 'updown' },
  }, 'choice_image'),
  tpl('M2.2', 'position', {
    1: { axis: 'frontback' },
    2: { axis: 'frontback' },
    3: { axis: 'frontback' },
  }, 'choice_image'),
  tpl('M2.3', 'position', {
    1: { axis: 'leftright' },
    2: { axis: 'leftright' },
    3: { axis: 'leftright' },
  }, 'choice_image'),

  // ── M4.1 / M4.3 加减法的意义 ─────────────────────────────────────
  // 看图列式：题干直白提问，图里两堆/一堆划掉，为后面的应用题打底
  //
  // ⚠️ `frames: STORY_FRAMES` 是**句式表注入**，五条模板都要带上——
  // 生成器不自己 import 它（domain 不依赖 data 是分层铁律，
  // 同 pinyinTemplates 注入音节表）。漏传会在出题时立刻抛错，不会静默出一道空题。
  tpl('M4.1', 'storyProblem', {
    1: { mode: 'add', totalRange: [3, 5], frames: STORY_FRAMES },
    2: { mode: 'add', totalRange: [4, 8], frames: STORY_FRAMES },
    3: { mode: 'add', totalRange: [5, 10], frames: STORY_FRAMES },
  }, 'choice_image'),
  tpl('M4.3', 'storyProblem', {
    1: { mode: 'remove', totalRange: [3, 5], frames: STORY_FRAMES },
    2: { mode: 'remove', totalRange: [4, 8], frames: STORY_FRAMES },
    3: { mode: 'remove', totalRange: [5, 10], frames: STORY_FRAMES },
  }, 'choice_image'),

  // ── M9 解决问题 ──────────────────────────────────────────────────
  // 与 M4.1/M4.3 同一个生成器，区别是 story: true —— 题干变成一句话情境
  tpl('M9.1', 'storyProblem', {
    1: { mode: 'add', story: true, totalRange: [3, 6], frames: STORY_FRAMES },
    2: { mode: 'add', story: true, totalRange: [4, 9], frames: STORY_FRAMES },
    3: { mode: 'add', story: true, totalRange: [5, 10], frames: STORY_FRAMES },
  }, 'choice_image'),
  tpl('M9.2', 'storyProblem', {
    1: { mode: 'remove', story: true, totalRange: [3, 6], frames: STORY_FRAMES },
    2: { mode: 'remove', story: true, totalRange: [4, 9], frames: STORY_FRAMES },
    3: { mode: 'remove', story: true, totalRange: [5, 10], frames: STORY_FRAMES },
  }, 'choice_image'),
  tpl('M9.3', 'storyProblem', {
    1: { mode: 'compare', totalRange: [3, 6], frames: STORY_FRAMES },
    2: { mode: 'compare', totalRange: [4, 9], frames: STORY_FRAMES },
    3: { mode: 'compare', totalRange: [5, 10], frames: STORY_FRAMES },
  }, 'choice_image'),
  // 难度递进：先只求总数（加法），再混入求部分（减法）——
  // 「问号在哪决定用加还是减」是这个知识点的全部难点
  tpl('M9.4', 'braceProblem', {
    1: { totalRange: [3, 6] },
    2: { totalRange: [4, 9], askPart: true },
    3: { totalRange: [5, 10], askPart: true },
  }, 'choice_image'),

  // ── M4.10 一图四式 ───────────────────────────────────────────────
  tpl('M4.10', 'fourFacts', {
    1: { totalRange: [3, 5] },
    2: { totalRange: [4, 8] },
    3: { totalRange: [5, 10] },
  }, 'choice_image'),

  // ── M1.10 数位初步 ───────────────────────────────────────────────
  // 难度 1 给十格阵脚手架，2、3 撤掉
  tpl('M1.10', 'placeValue', {
    1: { ask: 'tens', range: [11, 15] },
    2: { ask: 'both', range: [11, 19] },
    3: { ask: 'both', range: [11, 20] },
  }),

  // ── M7 图形认识 ──────────────────────────────────────────────────
  // ⭐ 图形是手绘 SVG（components/shape/），不是位图也不是 emoji：
  //    emoji 的 ⬜ 是平面方块，画不出正方体的立体感，
  //    而 M7 的主要误区恰恰就是 solid_plane_confusion
  tpl('M7.1', 'shapes', {
    1: { family: 'solid' },
    2: { family: 'solid' },
    3: { family: 'solid' },
  }, 'choice_image'),
  // ⭐ 数积木：与「认图形」轮换出题。认图形只有 4 种问法，
  //    一轮里排到三次就必然重复（上机反馈「重复的题目有点多」）；
  //    数积木的「块数 × 摆法」是几十种，同时练的还是立体图形
  altTpl('M7.1', 'count', 'countShapes', {
    1: { mode: 'blocks', countRange: [3, 5] },
    2: { mode: 'blocks', countRange: [4, 8] },
    3: { mode: 'blocks', countRange: [6, 10] },
  }, 'choice_image'),

  // M7.2 分类：给一个图形，问哪个和它同类（立体 ↔ 平面）
  tpl('M7.2', 'classifyShape', { 1: {}, 2: {}, 3: {} }, 'choice_image'),

  tpl('M7.3', 'shapes', {
    1: { family: 'plane' },
    2: { family: 'plane' },
    3: { family: 'plane' },
  }, 'choice_image'),

  // M7.4 平面图形拼组：一堆图形混在一起，数其中某一种
  tpl('M7.4', 'countShapes', {
    1: { mode: 'mixed', countRange: [4, 6] },
    2: { mode: 'mixed', countRange: [5, 8] },
    3: { mode: 'mixed', countRange: [6, 10] },
  }, 'choice_image'),

  // ── M8 认识钟表 ──────────────────────────────────────────────────
  // 难度递进：认指针 → 读整时 → 读半时
  tpl('M8.1', 'clock', {
    1: { mode: 'parts' },
    2: { mode: 'parts' },
    3: { mode: 'parts' },
  }, 'choice_image'),
  tpl('M8.2', 'clock', {
    1: { mode: 'oclock' },
    2: { mode: 'oclock' },
    3: { mode: 'oclock' },
  }, 'choice_image'),
  tpl('M8.3', 'clock', {
    1: { mode: 'half' },
    2: { mode: 'half' },
    3: { mode: 'half' },
  }, 'choice_image'),

  // ── M1 数感与计数 ────────────────────────────────────────────────
  // 难度递进：数量少 → 数量多 → 接近上限（数得越多越容易跳数）
  tpl('M1.1', 'counting', {
    1: { range: [1, 5] },
    2: { range: [1, 10] },
    3: { range: [6, 10] },
  }),
  // 「0 个」必须能被问出来，因此区间下限含 0
  tpl('M1.2', 'counting', {
    1: { range: [0, 3] },
    2: { range: [0, 5] },
    3: { range: [0, 10] },
  }),
  // 难度递进：后继 → 前驱 → 中间数（思维方向逐步变难，而非扩大数值范围）
  tpl('M1.3', 'counting', {
    1: { range: [1, 10], mode: 'next' },
    2: { range: [1, 10], mode: 'prev' },
    3: { range: [1, 10], mode: 'between' },
  }),
  tpl('M1.5', 'comparison', {
    1: { range: [1, 5], mode: 'which' },
    2: { range: [1, 10], mode: 'which' },
    3: { range: [1, 20], mode: 'which' },
  }, 'choice_text'),
  tpl('M1.6', 'comparison', {
    1: { range: [1, 5] },
    2: { range: [1, 10] },
    3: { range: [1, 10] },
  }, 'choice_text'),
  tpl('M1.7', 'counting', {
    1: { range: [11, 15] },
    2: { range: [11, 20] },
    3: { range: [15, 20] },
  }),
  tpl('M1.8', 'comparison', {
    1: { range: [1, 15] },
    2: { range: [1, 20] },
    3: { range: [10, 20] },
  }, 'choice_text'),
  // 数的组成用 decomposition 的 teen 模式：13 = 1 个十 + 3 个一
  tpl('M1.9', 'decomposition', {
    1: { mode: 'teen', totalRange: [11, 15] },
    2: { mode: 'teen', totalRange: [11, 19] },
    3: { mode: 'teen', totalRange: [11, 19] },
  }),
  // ── M1.11 10 加几和相应的减法 ────────────────────────────────────
  // ⭐ 凑十法的最后一步。难度递进是换思维方向而非换更大的数：
  //    正向组合 → 反向拆回 → 十位不动只动个位
  tpl('M1.11', 'teenArithmetic', {
    1: { mode: 'tenPlus' },
    2: { mode: 'tenMinus' },
    3: { mode: 'noRegroup' },
  }),

  // ── M3 分与合 ────────────────────────────────────────────────────
  // 难度递进：分解 → 分解 → 合成（反向思维更难）
  tpl('M3.1', 'decomposition', {
    1: { totalRange: [2, 4] },
    2: { totalRange: [2, 5] },
    3: { totalRange: [2, 5], mode: 'combine' },
  }),
  tpl('M3.2', 'decomposition', {
    1: { totalRange: [6, 8] },
    2: { totalRange: [6, 10] },
    3: { totalRange: [6, 10], mode: 'combine' },
  }),
  // ⭐⭐ 全局最关键节点，凑十法与破十法的共同地基，必须练到条件反射
  tpl('M3.3', 'decomposition', {
    1: { totalRange: [10, 10] },
    2: { totalRange: [10, 10] },
    3: { totalRange: [10, 10], mode: 'combine' },
  }),

  // ── M4 10以内加减法 ──────────────────────────────────────────────
  tpl('M4.2', 'arithmetic', {
    1: { op: 'add', maxSum: 3 },
    2: { op: 'add', maxSum: 5 },
    3: { op: 'add', maxSum: 5 },
  }),
  tpl('M4.4', 'arithmetic', {
    1: { op: 'sub', maxSum: 3 },
    2: { op: 'sub', maxSum: 5 },
    3: { op: 'sub', maxSum: 5 },
  }),
  tpl('M4.5', 'arithmetic', {
    1: { op: 'add', maxSum: 8 },
    2: { op: 'add', maxSum: 10 },
    3: { op: 'add', maxSum: 10 },
  }),
  tpl('M4.6', 'arithmetic', {
    1: { op: 'sub', maxSum: 8 },
    2: { op: 'sub', maxSum: 10 },
    3: { op: 'sub', maxSum: 10 },
  }),
  // 0 的加减法：allowZero 打开后生成器会加入 zero_rule 干扰项（5+0=0 的误解）
  tpl('M4.7', 'arithmetic', {
    1: { op: 'add', maxSum: 10, allowZero: true },
    2: { op: 'sub', maxSum: 10, allowZero: true },
    3: { op: 'mixed', maxSum: 10, allowZero: true },
  }),
  tpl('M4.8', 'arithmetic', {
    1: { terms: 3, op: 'add', maxSum: 8 },
    2: { terms: 3, op: 'add', maxSum: 10 },
    3: { terms: 3, op: 'add', maxSum: 10 },
  }),
  tpl('M4.9', 'arithmetic', {
    1: { terms: 3, op: 'mixed', maxSum: 8 },
    2: { terms: 3, op: 'mixed', maxSum: 10 },
    3: { terms: 3, op: 'mixed', maxSum: 10 },
  }),

  // ── M5 20以内进位加法 ────────────────────────────────────────────
  // M5.1 只考凑十拆分这一步，不考完整算式——先建立心理模型再算
  tpl('M5.1', 'addWithCarry', {
    1: { makeTen: true, addends: [9] },
    2: { makeTen: true, addends: [9, 8] },
    3: { makeTen: true, addends: [9, 8, 7] },
  }),
  tpl('M5.2', 'addWithCarry', {
    1: { addends: [9] },
    2: { addends: [9] },
    3: { addends: [9] },
  }),
  tpl('M5.3', 'addWithCarry', {
    1: { addends: [8] },
    2: { addends: [8, 7] },
    3: { addends: [8, 7, 6] },
  }),
  tpl('M5.4', 'addWithCarry', {
    1: { addends: [5] },
    2: { addends: [5, 4] },
    3: { addends: [5, 4, 3, 2] },
  }),
  tpl('M5.5', 'addWithCarry', {
    1: { addends: [9, 8, 7] },
    2: { addends: [9, 8, 7, 6, 5] },
    3: { addends: [9, 8, 7, 6, 5, 4, 3, 2] },
  }),

  // ── M6 20以内退位减法 ────────────────────────────────────────────
  // M6.1 只考破十这一步（13-9 先算 10-9），与 M5.1 对称
  tpl('M6.1', 'subWithBorrow', {
    1: { breakTen: true, subtrahends: [9] },
    2: { breakTen: true, subtrahends: [9, 8] },
    3: { breakTen: true, subtrahends: [9, 8, 7] },
  }),
  tpl('M6.2', 'subWithBorrow', {
    1: { subtrahends: [9] },
    2: { subtrahends: [9] },
    3: { subtrahends: [9] },
  }),
  tpl('M6.3', 'subWithBorrow', {
    1: { subtrahends: [8] },
    2: { subtrahends: [8, 7] },
    3: { subtrahends: [8, 7, 6] },
  }),
  tpl('M6.4', 'subWithBorrow', {
    1: { subtrahends: [5] },
    2: { subtrahends: [5, 4] },
    3: { subtrahends: [5, 4, 3, 2] },
  }),
  tpl('M6.5', 'subWithBorrow', {
    1: { subtrahends: [9, 8, 7] },
    2: { subtrahends: [9, 8, 7, 6, 5] },
    3: { subtrahends: [9, 8, 7, 6, 5, 4, 3, 2] },
  }),

  // ── 拖拽题型（与上面的填空/选择版并存，出题时随机轮换）─────────────
  // 知识点与题型的对应关系来自 design/01-知识点图谱.md 的「题型」列。

  // M1.3 / M1.8 数的顺序：排序要求脑子里同时持有整个数列，
  // 而「6 的后面是几」只需要局部判断——选择题测不到这一层
  altTpl('M1.3', 'order', 'orderSequence', {
    1: { range: [1, 10], mode: 'consecutive' },
    2: { range: [1, 10], mode: 'gapped' },
    3: { range: [1, 10], mode: 'descending' },
  }, 'drag_order'),
  altTpl('M1.8', 'order', 'orderSequence', {
    1: { range: [10, 20], mode: 'consecutive' },
    2: { range: [1, 20], mode: 'gapped' },
    3: { range: [10, 20], mode: 'descending' },
  }, 'drag_order'),

  // M3.1 / M3.2 分与合：填空一次只问一种分法，
  // 配对把同一个数的全部分法摆在一起，建立的是整体结构感
  altTpl('M3.1', 'match', 'matchPairs', {
    1: { totalRange: [4, 5] },
    2: { totalRange: [4, 5] },
    3: { totalRange: [5, 5] },
  }, 'drag_match'),
  altTpl('M3.2', 'match', 'matchPairs', {
    1: { totalRange: [6, 8] },
    2: { totalRange: [6, 10] },
    3: { totalRange: [8, 10] },
  }, 'drag_match'),

  // ⭐⭐ M5.1 / M6.1 是设计文档指定 drag_combine 的两个关键节点。
  // 填空版让她「说出」拆法，拖拽版让她「做出来」，
  // 后者还能诊断出 ten_split_wrong —— 直指 M3.3 没打牢
  altTpl('M5.1', 'combine', 'splitTen', {
    1: { addends: [9] },
    2: { addends: [9, 8] },
    3: { addends: [9, 8, 7] },
  }, 'drag_combine'),
  altTpl('M6.1', 'combine', 'splitTen', {
    1: { breakTen: true, subtrahends: [9] },
    2: { breakTen: true, subtrahends: [9, 8] },
    3: { breakTen: true, subtrahends: [9, 8, 7] },
  }, 'drag_combine'),

  // ── 拼音（阶段 ⑧）────────────────────────────────────────────────
  // ⚠️ 音节集合由这里注入，不是生成器自己去 import ——
  // domain 不依赖 data 是分层铁律（同 selectNextItems 注入 knowledgePoints）。
  ...pinyinTemplates(),

  // ── 英语（阶段 ⑨）────────────────────────────────────────────────
  // 明细在独立文件里：这里再塞一科就成了「万能文件」，
  // 而英语的难度设计（候选池由窄到宽）需要成段的说明才讲得清。
  ...ENGLISH_TEMPLATES,
]

/**
 * 拼音模板。
 *
 * `choice_audio` 是拼音的主力题型：一年级不识字，
 * 「听一个音、从几个拼音里挑出来」是唯一零阅读门槛的考法。
 *
 * 难度三档统一是「候选池由窄到宽」：
 * 难度 1 只在本知识点的音节里选，难度 3 混入易混组，
 * 逼她真的听清而不是靠排除法。
 */
function pinyinTemplates(): ItemTemplate[] {
  /**
   * ⭐ 一律用 `usable()` 过滤：没有汉字载体的音节只能念拼音串，
   * 实测会**读错声调**（`á` 读成 `ā`、`ē` 读成 `è`……）。
   * 发音教错比没有内容严重得多——错的读音孩子以后很难改。
   * 那些音节等真人录音补上再启用，见 SYLLABLES_NEEDING_RECORDING。
   */
  const listen = (kpId: string, syllables: readonly Syllable[]): ItemTemplate =>
    altTpl(kpId, 'listen', 'pinyinListen', {
      1: { syllables: usable(syllables) },
      2: { syllables: usable(syllables) },
      3: { syllables: usable(syllables) },
    }, 'choice_audio')

  const byBase = (bases: readonly string[]) =>
    usable(ALL_SYLLABLES.filter((s) => bases.includes(s.base)))

  /**
   * 「找不同」模板。作为该知识点的**备选**与听音题轮换，
   * 而不是替换——孩子要的是变化本身（design/05 第 4 条）。
   */
  const odd = (
    kpId: string,
    syllables: readonly Syllable[],
    axis: 'initial' | 'final' | 'tone',
    tag: string,
  ): ItemTemplate =>
    altTpl(kpId, 'odd', 'pinyinOddOne', {
      1: { syllables, axis, tag },
      2: { syllables, axis, tag },
      3: { syllables, axis, tag },
    }, 'choice_audio')

  /**
   * 「听音辨声母」模板。候选音节取**全表**里声母落在本组的那些，
   * 而不是只用呼读音——那正是这个题型能把题量翻几倍的原因。
   */
  const byInitial = (kpId: string, initials: readonly string[], tag: string): ItemTemplate =>
    altTpl(kpId, 'initial', 'pinyinInitial', {
      1: { syllables: USABLE_SYLLABLES, initials, tag },
      2: { syllables: USABLE_SYLLABLES, initials, tag },
      3: { syllables: USABLE_SYLLABLES, initials, tag },
    }, 'choice_audio')

  /** 「听音辨韵母」模板。与 byInitial 对称，同样取全表 */
  const byFinal = (kpId: string, finals: readonly string[], tag: string): ItemTemplate =>
    altTpl(kpId, 'final', 'pinyinFinal', {
      1: { syllables: USABLE_SYLLABLES, finals, tag },
      2: { syllables: USABLE_SYLLABLES, finals, tag },
      3: { syllables: USABLE_SYLLABLES, finals, tag },
    }, 'choice_audio')

  /**
   * 「哪个是整体认读音节」模板。
   *
   * ⚠️ 干扰池用**两拼音节**（BLEND_SYLLABLES），不能用整体认读表——
   * 那样会出现两个正确答案。生成器里还有一道过滤兜底。
   */
  const integral = (kpId: string, bases: readonly string[]): ItemTemplate =>
    altTpl(kpId, 'integral', 'pinyinIntegral', {
      1: { integrals: byBase(bases), others: usable(BLEND_SYLLABLES) },
      2: { integrals: byBase(bases), others: usable(BLEND_SYLLABLES) },
      3: { integrals: byBase(bases), others: usable(BLEND_SYLLABLES) },
    }, 'choice_text')

  return [
    // P1.1 / P1.2 单韵母 —— ⚠️ 这一组**不教声调**，选项显示不带调的 `a o e`。
    // 见 pinyinSyllables.ts 里 SINGLE_FINALS 的说明。
    listen('P1.1', byBase(['a', 'o', 'e'])),
    listen('P1.2', byBase(['i', 'u', 'ü'])),
    // ⭐⭐ P1.3 四声调用「妈麻马骂」而不是裸元音 ā á ǎ à。
    //
    // 裸拼音没有汉字载体，TTS 只能猜怎么读，实测大面积读错声调——
    // 而这里恰恰是**唯一真正在教声调**的知识点，读错等于直接教错。
    // 「妈麻马骂」是汉语教学里教四声的标准范例，四个字都是常用单音字，
    // TTS 必然读对，孩子还认识，比裸元音更有意义。
    //
    // `mode: 'tone'` 让干扰项变成同一个音的另外三个声调；
    // 不加这个参数就会退化成「听出这是哪个韵母」，声调根本练不到。
    altTpl('P1.3', 'listen', 'pinyinListen', {
      1: { syllables: usable(TONE_SET), mode: 'tone' },
      2: { syllables: usable(TONE_SET), mode: 'tone' },
      3: { syllables: usable(TONE_SET), mode: 'tone' },
    }, 'choice_audio'),

    // P2 声母（呼读音）
    listen('P2.1', INITIALS.filter((s) => ['bo', 'po', 'mo', 'fo'].includes(s.base))),
    // ⚠️ d n l 的呼读音（dē nè lè）没有汉字载体、会读错声调，已从题库剔除。
    // 改用真实音节「弟 土 你 里」——同样在考 d/t/n/l，读音却有保证。
    listen('P2.2', byBase(['di', 'tu', 'ni', 'li'])),
    listen('P2.3', INITIALS.filter((s) => ['ge', 'ke', 'he'].includes(s.base))),
    listen('P2.4', INITIALS.filter((s) => ['ji', 'qi', 'xi'].includes(s.base))),
    listen('P2.5', INITIALS.filter((s) => ['zi', 'ci', 'si'].includes(s.base))),
    listen('P2.6', INITIALS.filter((s) => ['zhi', 'chi', 'shi', 'ri'].includes(s.base))),
    // y w 只有两个，补进整体认读的 yu/yi/wu 才凑得出四选一
    listen('P2.7', byBase(['yi', 'wu', 'yu', 'ye'])),

    // P3.1 两拼音节 —— ⭐ 拼音的核心技能，设计文档指定 drag_combine
    altTpl('P3.1', 'blend', 'pinyinBlend', {
      1: { blends: BLEND_SYLLABLES.filter((b) => b.final.length === 1) },
      2: { blends: BLEND_SYLLABLES },
      3: { blends: BLEND_SYLLABLES },
    }, 'drag_combine'),

    // P3.2 三拼音节 —— 与 P3.1 同为 drag_combine，但多一个「介母」槽。
    // ⭐ 介母是拼音里最容易被漏掉的部件，也是这个知识点唯一要诊断的东西
    altTpl('P3.2', 'triple', 'pinyinTriple', {
      // 难度递进：介母只有 i → 加入 u → 全部（含 ü 系韵母的长音节）
      1: { triples: usable(TRIPLE_SYLLABLES).filter((s) => s.medial === 'i' && s.final.length <= 2) },
      2: { triples: usable(TRIPLE_SYLLABLES).filter((s) => s.final.length <= 2) },
      3: { triples: usable(TRIPLE_SYLLABLES) },
    }, 'drag_combine'),

    // P4 复韵母 / P5 鼻韵母
    // ⚠️ ei / eng / ong / ün 无汉字载体已剔除，各组用同类韵母补足到 4 个，
    //    否则会出现两选一的送分题
    listen('P4.1', byBase(['ai', 'ui', 'ao', 'ou'])),
    listen('P4.2', byBase(['ao', 'ou', 'iu', 'ai'])),
    listen('P4.3', byBase(['ie', 'üe', 'er', 'ai'])),
    listen('P5.1', byBase(['an', 'en', 'in', 'un'])),
    // 后鼻韵母只剩 ang / ing，配上对应的前鼻 an / in ——
    // 这恰好就是前后鼻对立，教学上比凑同类更好
    listen('P5.2', byBase(['ang', 'ing', 'an', 'in'])),
    listen('P5.3', byBase(['an', 'ang', 'in', 'ing', 'en'])),

    // P6 整体认读音节
    listen('P6.1', INTEGRAL_SYLLABLES.filter((s) => ['zhi', 'chi', 'shi', 'ri'].includes(s.base))),
    listen('P6.2', INTEGRAL_SYLLABLES.filter((s) => ['zi', 'ci', 'si'].includes(s.base))),
    listen('P6.3', INTEGRAL_SYLLABLES.filter((s) => ['yi', 'wu', 'yu'].includes(s.base))),
    listen('P6.4', INTEGRAL_SYLLABLES.filter((s) => ['ye', 'yue', 'yuan'].includes(s.base))),
    listen('P6.5', INTEGRAL_SYLLABLES.filter((s) => ['yin', 'yun', 'ying'].includes(s.base))),

    // P7 易混辨析 —— ⚠️ 不按教学顺序推进，由调度器按误区计数触发
    //
    // ⚠️ 每组都必须凑够 3 个以上音节。只放一对（b/d 两个）会产出两选一的题，
    // 蒙对概率 50%，掌握度直接被猜出来的分污染，而这几个知识点恰恰是
    // 定向补救的落点，数据被污染等于补救失准。由 pinyinListen.test.ts 强制校验。
    // ⚠️ 每组的**全部成员**都要能产出该组的诊断标签，否则抽到没标签的那个
    //    就成了无诊断的题。P7.1 四个全是 b/d 音节，P7.4 全是 n/l 音节。
    listen('P7.1', byBase(['ba', 'da', 'bi', 'di'])),
    listen('P7.2', byBase(['po', 'qi', 'pi', 'ji'])),
    listen('P7.3', byBase(['fo', 'te', 'tu', 'feng'])),
    listen('P7.4', byBase(['ni', 'li', 'lu', 'mi'])),
    listen('P7.5', byBase(['zi', 'zhi', 'ci', 'chi', 'si', 'shi'])),
    listen('P7.6', byBase(['an', 'ang', 'in', 'ing', 'en'])),

    // ── ⭐ 找不同：拼音题量的主要来源 ──────────────────────────────
    //
    // 「听一个音选那个拼音」的题量恰好等于音节数（P2.3 只教 g k h，就只有 3 道）。
    // 音节数是教学分组定死的，不该硬塞；能变的是考法——
    // 从 n 个音节里取 4 个组一道题，组合数是 C(n,4) 级别。
    //
    // 放在 P7 这几个辨析知识点上最合适：它们本来考的就是「对比着听」。
    // ⚠️ 每个池子都必须凑得出「3 个同特征 + 1 个异特征」，
    //    否则生成器会退化成随机取 4 个，那道题**没有正确答案可言**。
    //    由 pinyinOddOne.test.ts 对每条模板逐一校验。
    odd('P7.1', byBase(['ba', 'bi', 'bai', 'bo', 'da', 'di']), 'initial', 'bd_confusion'),
    odd('P7.4', byBase(['ni', 'niu', 'nan', 'nü', 'li', 'lu', 'lan', 'lao']), 'initial', 'nl_confusion'),
    odd(
      'P7.5',
      byBase(['zi', 'zao', 'zou', 'zhi', 'zhao', 'zhu', 'ci', 'cai', 'cao', 'chi', 'che', 'chang']),
      'initial',
      'flat_curl_confusion',
    ),
    odd(
      'P7.6',
      byBase(['an', 'nan', 'lan', 'san', 'shan', 'ang', 'mang', 'chang', 'bang']),
      'final',
      'nasal_confusion',
    ),
    odd(
      'P5.3',
      byBase(['in', 'xin', 'jin', 'yin', 'ing', 'xing', 'qing', 'ying']),
      'final',
      'nasal_confusion',
    ),

    // ── P8 综合应用 ────────────────────────────────────────────────
    // P8.1 候选池是**全部可用音节**，难度全部来自「几十选一」——
    // 与英语 E1.8「听音辨字母」同一个思路
    listen('P8.1', USABLE_SYLLABLES),
    // ⭐ P8.3 听音选字：音节表里每个音节本来就挂着汉字载体，翻过来用即可，
    //    零新内容。拼音学到最后要落到的正是「从音找到字」
    altTpl('P8.3', 'tochar', 'pinyinToChar', {
      1: { syllables: usable(TONE_SET), tag: 'tone_confusion' },
      2: { syllables: usable([...TONE_SET, ...BLEND_SYLLABLES]), tag: 'tone_confusion' },
      3: { syllables: USABLE_SYLLABLES, tag: 'tone_confusion' },
    }, 'choice_text'),

    // P4.4 单/复韵母辨析：把单韵母和复韵母混在一起听
    listen('P4.4', byBase(['a', 'ai', 'o', 'ou', 'e', 'er', 'i', 'ie'])),

    // ⭐ P8.2 看图选音节 —— 与 P8.3「听音选字」构成完整的音形对应：
    //    那边是音 → 字，这边是图（心里的音）→ 拼音写法。
    //    ⚠️ 这道题不播音，播了等于报答案
    altTpl('P8.2', 'pic', 'pinyinPicture', {
      1: { syllables: USABLE_SYLLABLES, pictures: SYLLABLE_PICTURES },
      2: { syllables: USABLE_SYLLABLES, pictures: SYLLABLE_PICTURES },
      3: { syllables: USABLE_SYLLABLES, pictures: SYLLABLE_PICTURES },
    }, 'choice_image'),

    // ── ⭐ 听音辨声母：P2 题量的主要来源 ────────────────────────────
    //
    // 「听 gē 选 gē」的题量恰好等于呼读音个数（P2.3 只有 g k h 三个）。
    // 换成「这个音的声母是什么」，声母 g 就能用任何含 g 的音节来考
    // （gē 哥 · gǔ 鼓 · gǒu 狗），题量变成「含这几个声母的音节总数」。
    // 教学上也更好：孩子真正要会的是在「爸」「白」里听出 b，而不是听孤立的呼读音。
    byInitial('P2.1', ['b', 'p', 'm', 'f'], 'bd_confusion'),
    byInitial('P2.2', ['d', 't', 'n', 'l'], 'nl_confusion'),
    byInitial('P2.3', ['g', 'k', 'h'], 'flat_curl_confusion'),
    byInitial('P2.4', ['j', 'q', 'x'], 'pq_confusion'),
    byInitial('P2.5', ['z', 'c', 's'], 'flat_curl_confusion'),
    byInitial('P2.6', ['zh', 'ch', 'sh', 'r'], 'flat_curl_confusion'),
    byInitial('P2.7', ['y', 'w'], 'flat_curl_confusion'),

    // ── ⭐ 听音辨韵母：P4 / P5 题量的主要来源 ───────────────────────
    //
    // 与听音辨声母对称：韵母 ai 可以用任何含 ai 的音节来考
    // （hǎi 海 · bái 白 · cài 菜 · huài 坏），而不是只有孤立的 āi 一个。
    // ⚠️ 没有可用音节的韵母（ei / eng 等缺载体）照样能当**选项**——
    //    选项是文字不播音，只有题干那个音节需要音频。
    byFinal('P4.1', ['ai', 'ei', 'ui'], 'ei_ie_swap'),
    byFinal('P4.2', ['ao', 'ou', 'iu'], 'ui_iu_swap'),
    byFinal('P4.3', ['ie', 'üe', 'er'], 'ei_ie_swap'),
    byFinal('P4.4', ['a', 'ai', 'o', 'ou', 'e', 'er'], 'ei_ie_swap'),
    byFinal('P5.1', ['an', 'en', 'in', 'un', 'ün'], 'nasal_confusion'),
    byFinal('P5.2', ['ang', 'eng', 'ing', 'ong'], 'nasal_confusion'),
    byFinal('P5.3', ['an', 'ang', 'in', 'ing', 'en', 'eng'], 'nasal_confusion'),

    // ── ⭐ 认整体认读音节：P6 题量的主要来源 ────────────────────────
    //
    // 「听 zī 选 zī」考不到 P6 唯一要防的错误（把 zhi 拆成 zh-i 去拼）——
    // 听音选对了也不代表她知道这个音节不能拆。
    // 换成「哪个是整体认读音节」，考的就是那条规则本身，且题量是组合级的。
    integral('P6.1', ['zhi', 'chi', 'shi', 'ri']),
    integral('P6.2', ['zi', 'ci', 'si']),
    integral('P6.3', ['yi', 'wu', 'yu']),
    integral('P6.4', ['ye', 'yue', 'yuan']),
    integral('P6.5', ['yin', 'yun', 'ying']),

    // ── P3.3 / P3.4 书写规则 ───────────────────────────────────────
    // ⚠️ 全科仅有的两个纯 choice_text：ju 和 jü 读音完全一样，
    //    hǎo 和 haǒ 念出来也没区别——只能靠规则，听不出来
    altTpl('P3.3', 'rule', 'pinyinRule', {
      1: { mode: 'umlaut', finals: ['ü'] },
      2: { mode: 'umlaut', finals: ['ü', 'üe'] },
      3: { mode: 'umlaut', finals: ['ü', 'üe', 'ün'] },
    }, 'choice_text'),
    altTpl('P3.4', 'rule', 'pinyinRule', {
      // 难度递进：单韵母（位置唯一）→ 含 a 的（规则第一条）→ iu/ui 并列（最难）
      1: { mode: 'tonePos', bases: ['ba', 'mi', 'hu', 'ge'] },
      2: { mode: 'tonePos', bases: ['hao', 'jia', 'xie', 'mao', 'gou'] },
      3: { mode: 'tonePos', bases: ['liu', 'gui', 'hao', 'jiao', 'xiu'] },
    }, 'choice_text'),
  ]
}

/**
 * 按知识点 ID 查模板。**一个知识点可能有多条**（填空版 + 拖拽版）。
 *
 * 调度器只用它的 `keys()` 判断「这个知识点出不出得了题」；
 * 具体出哪一条由 `buildSessionItems` 用注入的 rng 轮换。
 */
export const ITEM_TEMPLATE_BY_KP: ReadonlyMap<string, ItemTemplate[]> = ITEM_TEMPLATES.reduce(
  (map, t) => map.set(t.kpId, [...(map.get(t.kpId) ?? []), t]),
  new Map<string, ItemTemplate[]>(),
)

/**
 * 取某知识点的「主模板」——固定是**声明顺序里的第一条**。
 *
 * ⭐ 专供**摸底测评**使用。摸底要在 5 分钟内问完 7 道题定位起点，
 * 考的是「她会不会」而不是「她能不能拖准」。
 * 让摸底出拖拽题会把测评时长拉长一倍，还会把手指不灵活误判成不会做——
 * 那正是这套测评最不能犯的错（见 design/05-孩子反馈与响应.md 第 3 条）。
 *
 * ⚠️ 因此**拖拽版模板一律排在填空/选择版之后**，靠声明顺序保证这里拿到非拖拽的那条。
 * 由 `index.test.ts`「摸底探测点的主模板不能是拖拽题」强制校验。
 * 少数知识点（如 P3.1 两拼音节）本来就只有拖拽一种题型，
 * 它们不在探测点里，不受此约束。
 *
 * @example
 * primaryTemplateOf('M5.1')   // 填空版，不会返回 drag_combine 那条
 */
export function primaryTemplateOf(kpId: string): ItemTemplate | undefined {
  return ITEM_TEMPLATE_BY_KP.get(kpId)?.[0]
}
