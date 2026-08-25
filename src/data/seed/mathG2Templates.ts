/**
 * @file 二年级数学题目模板 —— 把二年级知识点映射到生成器与三档难度参数
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/itemTemplates.ts  总注册表（本文件的产出在那里展开）
 * @see src/data/seed/mathG2KnowledgePoints.ts  对应的知识点
 * @see design/08-年级分区与内容扩展.md §8.4  题型多样是硬规则
 *
 * 单独成文件的理由与 `englishTemplates.ts` 一样：`itemTemplates.ts` 已经
 * 装着一年级数学与拼音两科五百多行，再塞一个年级进去就成了「万能文件」。
 *
 * ## ⭐ 每个知识点必须挂 ≥2 条、且**题型不同**的模板
 *
 * 这是 CLAUDE.md 的红线，由 `itemTemplates.test.ts` 强制。孩子的原话是
 * 「答题界面单一，都是题目 + 4 个选项」——注意要的是**变化本身**，
 * 不是把某个知识点从填空换成选择。
 *
 * 纯计算题的两条模板目前多是「自己算出来（`input_number`）」与
 * 「从四个里挑（`choice_text`）」轮换，靠生成器的 `as` 参数切换。
 * 这两者对孩子是能感觉到的两种题（敲键盘 vs 点选项，后者还能用排除法），
 * 但**比不上真正的拖拽/配对**——那需要新的 `visual` 类型和配套 UI 组件，
 * 见本文件末尾 `PENDING_G2_KP_IDS` 的说明。
 *
 * ## 难度三档
 *
 * 与一年级同一个原则：难度不是「换个更大的数」，而是**换一种更难的思维方式**。
 * 乘法口诀的三档是 求积 → 求积 → 求因数（口诀逆用），
 * 而不是把因数从 5 换成 9。
 */

import { STORY_FRAMES } from '@/data/seed/storyFrames'
import { altTpl, tpl } from '@/data/seed/templateBuilder'
import type { ItemTemplate } from '@/domain/types'

/**
 * 文字应用题的两条模板：同一种运算，主模板填空、备选四选一。
 *
 * ⚠️ `frames: STORY_FRAMES` 是**句式表注入**，每一档都要带上——
 * 生成器不自己 import 它（domain 不依赖 data 是分层铁律）。
 * 漏传会在出题时立刻抛错，不会静默出一道空题。
 */
function wordPair(kpId: string, modes: [string, string, string]): ItemTemplate[] {
  return [
    tpl(kpId, 'wordProblem', {
      1: { mode: modes[0], frames: STORY_FRAMES, factorRange: [2, 5], quotientRange: [2, 5] },
      2: { mode: modes[1], frames: STORY_FRAMES },
      3: { mode: modes[2], frames: STORY_FRAMES },
    }),
    altTpl(
      kpId,
      'pick',
      'wordProblem',
      {
        1: {
          mode: modes[1],
          frames: STORY_FRAMES,
          factorRange: [2, 5],
          quotientRange: [2, 5],
          as: 'choice_text',
        },
        2: { mode: modes[2], frames: STORY_FRAMES, as: 'choice_text' },
        3: { mode: modes[0], frames: STORY_FRAMES, as: 'choice_text' },
      },
      'choice_text',
    ),
  ]
}

/** 表内乘法：一句口诀一条模板，三档为 求积 → 求积 → 求因数 */
function mulPair(kpId: string, factors: number[]): ItemTemplate[] {
  return [
    tpl(kpId, 'mulTable', {
      1: { factors },
      2: { factors },
      // ⭐ 第三档换成口诀逆用（3 × ? = 12），为 M2-9 的除法铺路
      3: { factors, mode: 'missingFactor' },
    }),
    altTpl(
      kpId,
      'pick',
      'mulTable',
      {
        1: { factors, as: 'choice_text' },
        2: { factors, mode: 'missingFactor', as: 'choice_text' },
        3: { factors, mode: 'missingFactor', as: 'choice_text' },
      },
      'choice_text',
    ),
  ]
}

/** 表内除法：三档为 求商 → 求商 → 求除数 */
function divPair(kpId: string, divisors: number[]): ItemTemplate[] {
  return [
    tpl(kpId, 'divTable', {
      1: { divisors },
      2: { divisors },
      3: { divisors, mode: 'divisor' },
    }),
    altTpl(
      kpId,
      'pick',
      'divTable',
      {
        1: { divisors, as: 'choice_text' },
        2: { divisors, mode: 'divisor', as: 'choice_text' },
        3: { divisors, mode: 'divisor', as: 'choice_text' },
      },
      'choice_text',
    ),
  ]
}

/** 笔算：三档为 加一位数 → 加两位数 → 加两位数。`bDigits: 1` 那档才有 column_misaligned */
function columnPair(
  kpId: string,
  op: 'add' | 'sub',
  carry: 'require' | 'forbid',
): ItemTemplate[] {
  return [
    tpl(kpId, 'columnArithmetic', {
      1: { op, carry, bDigits: 1 },
      2: { op, carry, bDigits: 2 },
      3: { op, carry, bDigits: 2 },
    }),
    altTpl(
      kpId,
      'pick',
      'columnArithmetic',
      {
        1: { op, carry, bDigits: 1, as: 'choice_text' },
        2: { op, carry, bDigits: 2, as: 'choice_text' },
        3: { op, carry, bDigits: 2, as: 'choice_text' },
      },
      'choice_text',
    ),
  ]
}

/** 混合运算：主模板填空，备选四选一 */
function mixedPair(kpId: string, mode: string, maxFactor = 9): ItemTemplate[] {
  return [
    tpl(kpId, 'mixedOps', {
      1: { mode, maxFactor: Math.min(maxFactor, 5) },
      2: { mode, maxFactor },
      3: { mode, maxFactor },
    }),
    altTpl(
      kpId,
      'pick',
      'mixedOps',
      {
        1: { mode, maxFactor: Math.min(maxFactor, 5), as: 'choice_text' },
        2: { mode, maxFactor, as: 'choice_text' },
        3: { mode, maxFactor, as: 'choice_text' },
      },
      'choice_text',
    ),
  ]
}

export const MATH_G2_TEMPLATES: ItemTemplate[] = [
  // ── M2-1 长度单位 ────────────────────────────────────────────────
  // 换算与量感互为表里：会算进率不等于知道一米有多长，反过来也一样
  tpl('M2-1.3', 'unitConvert', {
    1: { quantity: 'length', direction: 'down' },
    2: { quantity: 'length', direction: 'down' },
    3: { quantity: 'length', direction: 'both' },
  }),
  altTpl('M2-1.3', 'sense', 'unitConvert', {
    1: { quantity: 'length', mode: 'chooseUnit' },
    2: { quantity: 'length', mode: 'chooseUnit' },
    3: { quantity: 'length', mode: 'chooseUnit' },
  }, 'choice_image'),

  tpl('M2-1.4', 'unitConvert', {
    1: { quantity: 'length', mode: 'chooseUnit' },
    2: { quantity: 'length', mode: 'chooseUnit' },
    3: { quantity: 'length', mode: 'chooseUnit' },
  }, 'choice_image'),
  altTpl('M2-1.4', 'convert', 'unitConvert', {
    1: { quantity: 'length', direction: 'down', as: 'choice_text' },
    2: { quantity: 'length', direction: 'both', as: 'choice_text' },
    3: { quantity: 'length', direction: 'up', as: 'choice_text' },
  }, 'choice_text'),

  // ── M2-2 100以内加减法笔算 ───────────────────────────────────────
  ...columnPair('M2-2.1', 'add', 'forbid'),
  ...columnPair('M2-2.2', 'add', 'require'),
  ...columnPair('M2-2.3', 'sub', 'forbid'),
  ...columnPair('M2-2.4', 'sub', 'require'),

  // 连加连减：一年级的 arithmetic 扩到 100 就够，误区还是 op_confusion
  tpl('M2-2.5', 'arithmetic', {
    1: { terms: 3, op: 'add', maxSum: 50 },
    2: { terms: 3, op: 'mixed', maxSum: 100 },
    3: { terms: 3, op: 'mixed', maxSum: 100 },
  }),
  altTpl('M2-2.5', 'order', 'mixedOps', {
    1: { mode: 'sameLevel', as: 'choice_text' },
    2: { mode: 'sameLevel', as: 'choice_text' },
    3: { mode: 'sameLevel', as: 'choice_text' },
  }, 'choice_text'),

  // 求比一个数多几·少几：三档在「多」与「少」之间交替，
  // 她得每道题都听清是哪一个——这本身就是这个知识点要练的
  ...wordPair('M2-2.6', ['moreThan', 'lessThan', 'moreThan']),

  // ── M2-3 角的初步认识 ────────────────────────────────────────────
  // ⭐ 认角与数角用一年级就有的平面图形，只有比较角的大小（3.2 / 3.3）
  // 才把角单独拎出来画——教材里「认识角」也是从图形中找角开始的
  tpl('M2-3.1', 'cornerCount', {
    1: { mode: 'single' },
    2: { mode: 'single' },
    3: { mode: 'total', countRange: [2, 2] },
  }),
  // 认角先得认得出图形：借一年级 M7.3 的认图形题作轮换，零新增
  altTpl('M2-3.1', 'shape', 'shapes', {
    1: { family: 'plane' },
    2: { family: 'plane' },
    3: { family: 'plane' },
  }, 'choice_image'),

  tpl('M2-3.2', 'angles', {
    1: { mode: 'right' },
    2: { mode: 'right' },
    3: { mode: 'right' },
  }, 'choice_image'),
  altTpl('M2-3.2', 'corners', 'cornerCount', {
    1: { mode: 'single' },
    2: { mode: 'total', countRange: [2, 2] },
    3: { mode: 'total', countRange: [2, 3] },
  }, 'input_number'),

  tpl('M2-3.3', 'angles', {
    1: { mode: 'kind' },
    2: { mode: 'kind' },
    3: { mode: 'kind' },
  }, 'choice_image'),
  altTpl('M2-3.3', 'corners', 'cornerCount', {
    1: { mode: 'single' },
    2: { mode: 'total', countRange: [2, 3] },
    3: { mode: 'total', countRange: [3, 3] },
  }, 'input_number'),

  tpl('M2-3.4', 'cornerCount', {
    1: { mode: 'total', countRange: [2, 2] },
    2: { mode: 'total', countRange: [2, 3] },
    3: { mode: 'total', countRange: [3, 3] },
  }),
  altTpl('M2-3.4', 'angle', 'angles', {
    1: { mode: 'right' },
    2: { mode: 'kind' },
    3: { mode: 'kind' },
  }, 'choice_image'),

  // ── M2-4 表内乘法 ────────────────────────────────────────────────
  // ⭐ 乘法的意义与乘加互换共用同一幅「几个几」图，只是问的东西不同：
  // 一个问「一共几个」（要算），一个问「哪个算式说的是这幅图」（要读懂图）。
  // 两条模板互为对方的备选，题型正好一个填空一个选择
  tpl('M2-4.1', 'equalGroups', {
    1: { mode: 'times', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'times', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'times', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }),
  altTpl('M2-4.1', 'eq', 'equalGroups', {
    1: { mode: 'equation', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'equation', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'equation', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }, 'choice_text'),

  tpl('M2-4.2', 'equalGroups', {
    1: { mode: 'equation', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'equation', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'equation', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }, 'choice_text'),
  altTpl('M2-4.2', 'times', 'equalGroups', {
    1: { mode: 'times', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'times', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'times', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }, 'input_number'),

  ...mulPair('M2-4.3', [5]),
  ...mulPair('M2-4.4', [2, 3, 4]),
  ...mulPair('M2-4.5', [6]),
  ...mixedPair('M2-4.6', 'mixed', 6),
  ...mulPair('M2-4.7', [7]),
  ...mulPair('M2-4.8', [8]),
  ...mulPair('M2-4.9', [9]),
  ...mulPair('M2-4.10', [2, 3, 4, 5, 6, 7, 8, 9]),

  // ── M2-6 认识时间 ────────────────────────────────────────────────
  // 读钟面与「分针指着几」互为表里，正好凑成两种题型
  tpl('M2-6.1', 'clockMinutes', {
    1: { mode: 'read' },
    2: { mode: 'read' },
    3: { mode: 'read', step: 1 },
  }, 'choice_image'),
  altTpl('M2-6.1', 'mark', 'clockMinutes', {
    1: { mode: 'minuteFromMark' },
    2: { mode: 'minuteFromMark' },
    3: { mode: 'minuteFromMark' },
  }, 'input_number'),

  tpl('M2-6.2', 'clockMinutes', {
    1: { mode: 'minuteFromMark' },
    2: { mode: 'minuteFromMark' },
    3: { mode: 'minuteFromMark' },
  }),
  altTpl('M2-6.2', 'read', 'clockMinutes', {
    1: { mode: 'read' },
    2: { mode: 'read' },
    3: { mode: 'read' },
  }, 'choice_image'),

  tpl('M2-6.3', 'unitConvert', {
    1: { quantity: 'time', direction: 'down' },
    2: { quantity: 'time', direction: 'down' },
    3: { quantity: 'time', direction: 'both' },
  }),
  altTpl('M2-6.3', 'pick', 'unitConvert', {
    1: { quantity: 'time', direction: 'down', as: 'choice_text' },
    2: { quantity: 'time', direction: 'both', as: 'choice_text' },
    3: { quantity: 'time', direction: 'up', as: 'choice_text' },
  }, 'choice_text'),

  tpl('M2-6.4', 'clockMinutes', {
    1: { mode: 'elapsed' },
    2: { mode: 'elapsed' },
    3: { mode: 'elapsed' },
  }, 'choice_image'),
  // 备选取时分换算：跨整点算不对，多半是 1 时 = 60 分没记牢
  altTpl('M2-6.4', 'unit', 'unitConvert', {
    1: { quantity: 'time', direction: 'down' },
    2: { quantity: 'time', direction: 'both' },
    3: { quantity: 'time', direction: 'up' },
  }, 'input_number'),

  // ── M2-7 数学广角·搭配 ───────────────────────────────────────────
  tpl('M2-7.1', 'combination', {
    1: { mode: 'outfit', countRange: [2, 3] },
    2: { mode: 'outfit', countRange: [2, 4] },
    3: { mode: 'outfit', countRange: [3, 5] },
  }),
  altTpl('M2-7.1', 'pick', 'combination', {
    1: { mode: 'outfit', countRange: [2, 3], as: 'choice_text' },
    2: { mode: 'outfit', countRange: [2, 4], as: 'choice_text' },
    3: { mode: 'outfit', countRange: [3, 5], as: 'choice_text' },
  }, 'choice_text'),

  tpl('M2-7.2', 'combination', {
    1: { mode: 'digits' },
    2: { mode: 'digits' },
    3: { mode: 'digits' },
  }),
  altTpl('M2-7.2', 'pick', 'combination', {
    1: { mode: 'digits', as: 'choice_text' },
    2: { mode: 'digits', as: 'choice_text' },
    3: { mode: 'digits', as: 'choice_text' },
  }, 'choice_text'),

  // ── M2-9 表内除法 ────────────────────────────────────────────────
  // ⭐ 平均分的意义用的是和乘法**同一幅图**：看着 3 组每组 4 个，
  // 问「一共几个」是乘法、问「每份几个」是除法。图一样正好帮她建立这个联系，
  // 而不是让除法在两个月后作为一件全新的事情出现
  tpl('M2-9.1', 'equalGroups', {
    1: { mode: 'share', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'share', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'groupCount', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }),
  altTpl('M2-9.1', 'pick', 'equalGroups', {
    1: { mode: 'groupCount', groupsRange: [2, 3], perGroupRange: [2, 4], as: 'choice_text' },
    2: { mode: 'share', groupsRange: [2, 4], perGroupRange: [2, 5], as: 'choice_text' },
    3: { mode: 'groupCount', groupsRange: [3, 5], perGroupRange: [3, 5], as: 'choice_text' },
  }, 'choice_text'),

  ...divPair('M2-9.2', [2, 3, 4, 5]),
  ...divPair('M2-9.3', [2, 3, 4, 5, 6]),
  ...divPair('M2-9.4', [7, 8, 9]),

  // ⭐ 乘除法的关系：一幅「几个几」图对应四个算式，
  // 「想乘法算除法」这句口诀的底子就在这里。
  // 备选那条用同一幅图问「每份几个 / 能分几组」——从认得算式到真算出来
  tpl('M2-9.5', 'mulDivFacts', {
    1: { groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { groupsRange: [3, 5], perGroupRange: [3, 5] },
  }, 'choice_image'),
  altTpl('M2-9.5', 'compute', 'equalGroups', {
    1: { mode: 'share', groupsRange: [2, 3], perGroupRange: [2, 4] },
    2: { mode: 'groupCount', groupsRange: [2, 4], perGroupRange: [2, 5] },
    3: { mode: 'share', groupsRange: [3, 5], perGroupRange: [3, 5] },
  }, 'input_number'),

  // ⭐ 平均分与包含除是**两种除法**：一个问「每份几个」，一个问「能分几份」。
  // 算式一样、想的东西不一样，所以三档在两者之间来回换
  ...wordPair('M2-9.6', ['share', 'group', 'share']),

  // ── M2-11 混合运算 ───────────────────────────────────────────────
  ...mixedPair('M2-11.1', 'sameLevel'),
  ...mixedPair('M2-11.2', 'mixed'),
  ...mixedPair('M2-11.3', 'paren'),

  // 两步计算：先乘后减 / 先乘后加交替。同一个句法只换动词，
  // 但第二步的运算变了——她不能靠记句式蒙
  ...wordPair('M2-11.4', ['twoStepLess', 'twoStepMore', 'twoStepLess']),

  // ── M2-12 有余数的除法 ───────────────────────────────────────────
  // 主模板连商带余数一起答，备选只填余数——后者把「还够不够再分一轮」单独拎出来练
  tpl('M2-12.1', 'remainderDiv', {
    1: { divisorRange: [2, 4], quotientRange: [2, 5] },
    2: { divisorRange: [2, 6], quotientRange: [2, 7] },
    3: { divisorRange: [2, 9], quotientRange: [2, 9] },
  }, 'choice_text'),
  altTpl('M2-12.1', 'only', 'remainderDiv', {
    1: { mode: 'remainderOnly', divisorRange: [2, 4] },
    2: { mode: 'remainderOnly', divisorRange: [2, 6] },
    3: { mode: 'remainderOnly', divisorRange: [2, 9] },
  }, 'input_number'),

  tpl('M2-12.2', 'remainderDiv', {
    1: { mode: 'remainderOnly', divisorRange: [3, 5] },
    2: { mode: 'remainderOnly', divisorRange: [4, 7] },
    3: { mode: 'remainderOnly', divisorRange: [5, 9] },
  }),
  altTpl('M2-12.2', 'full', 'remainderDiv', {
    1: { divisorRange: [3, 5] },
    2: { divisorRange: [4, 7] },
    3: { divisorRange: [5, 9] },
  }, 'choice_text'),

  tpl('M2-12.3', 'remainderDiv', {
    1: { divisorRange: [2, 5], quotientRange: [2, 6] },
    2: { divisorRange: [2, 7], quotientRange: [2, 8] },
    3: { divisorRange: [2, 9], quotientRange: [2, 9] },
  }, 'choice_text'),
  altTpl('M2-12.3', 'only', 'remainderDiv', {
    1: { mode: 'remainderOnly', divisorRange: [2, 5] },
    2: { mode: 'remainderOnly', divisorRange: [2, 7] },
    3: { mode: 'remainderOnly', divisorRange: [2, 9] },
  }, 'input_number'),

  // ⭐ 「至少要几条船」的答案是商 + 1。这是余数唯一真正有用武之地的地方——
  // 剩下的 2 个人也得有船坐
  ...wordPair('M2-12.4', ['atLeast', 'atLeast', 'atLeast']),

  // ── M2-13 万以内数的认识 ─────────────────────────────────────────
  // 数的顺序：三档不是「换更大的数」，而是 连续 → 有间隔 → 从大到小，
  // 与一年级 M1.3 同一套难度设计，只把 range 抬到千位
  tpl('M2-13.1', 'orderSequence', {
    1: { range: [100, 999], mode: 'consecutive' },
    2: { range: [100, 999], mode: 'gapped' },
    3: { range: [1000, 9999], mode: 'descending' },
  }, 'drag_order'),
  altTpl('M2-13.1', 'compare', 'comparison', {
    1: { range: [100, 999], mode: 'which' },
    2: { range: [100, 999] },
    3: { range: [1000, 9999] },
  }, 'choice_text'),

  // 写数与读数互为逆向，正好是两种题型
  tpl('M2-13.2', 'numberComposition', {
    1: { mode: 'write', digits: 3 },
    2: { mode: 'write', digits: 3 },
    3: { mode: 'compose', digits: 3 },
  }),
  altTpl('M2-13.2', 'read', 'numberComposition', {
    1: { mode: 'read', digits: 3 },
    2: { mode: 'read', digits: 3 },
    3: { mode: 'read', digits: 3 },
  }, 'choice_text'),

  tpl('M2-13.3', 'numberComposition', {
    1: { mode: 'read', digits: 4 },
    2: { mode: 'read', digits: 4 },
    3: { mode: 'read', digits: 4 },
  }, 'choice_text'),
  altTpl('M2-13.3', 'compose', 'numberComposition', {
    1: { mode: 'compose', digits: 4 },
    2: { mode: 'write', digits: 4 },
    3: { mode: 'compose', digits: 4 },
  }, 'input_number'),

  // 大小比较：符号题与择大题分离，正是为了区分「不知道谁大」和「知道但符号写反」
  tpl('M2-13.4', 'comparison', {
    1: { range: [100, 999] },
    2: { range: [1000, 9999] },
    3: { range: [1000, 9999] },
  }, 'choice_text'),
  altTpl('M2-13.4', 'order', 'orderSequence', {
    1: { range: [100, 999], mode: 'gapped' },
    2: { range: [1000, 9999], mode: 'gapped' },
    3: { range: [1000, 9999], mode: 'descending' },
  }, 'drag_order'),

  // 近似数：先约到百，再约到千
  tpl('M2-13.5', 'roundNumber', {
    1: { unit: 100 },
    2: { unit: 100 },
    3: { unit: 1000 },
  }),
  altTpl('M2-13.5', 'pick', 'roundNumber', {
    1: { unit: 100, as: 'choice_text' },
    2: { unit: 1000, as: 'choice_text' },
    3: { unit: 1000, as: 'choice_text' },
  }, 'choice_text'),

  // 整百整千加减：本质是「几个百」相加，误区还是数位那一套
  tpl('M2-13.6', 'columnArithmetic', {
    1: { op: 'add', unit: 100 },
    2: { op: 'mixed', unit: 100 },
    3: { op: 'mixed', unit: 1000 },
  }),
  altTpl('M2-13.6', 'pick', 'columnArithmetic', {
    1: { op: 'mixed', unit: 100, as: 'choice_text' },
    2: { op: 'mixed', unit: 1000, as: 'choice_text' },
    3: { op: 'mixed', unit: 1000, as: 'choice_text' },
  }, 'choice_text'),

  // ── M2-14 克和千克 ───────────────────────────────────────────────
  tpl('M2-14.1', 'unitConvert', {
    1: { quantity: 'mass', mode: 'chooseUnit' },
    2: { quantity: 'mass', mode: 'chooseUnit' },
    3: { quantity: 'mass', mode: 'chooseUnit' },
  }, 'choice_image'),
  altTpl('M2-14.1', 'convert', 'unitConvert', {
    1: { quantity: 'mass', direction: 'down', as: 'choice_text' },
    2: { quantity: 'mass', direction: 'down', as: 'choice_text' },
    3: { quantity: 'mass', direction: 'both', as: 'choice_text' },
  }, 'choice_text'),

  tpl('M2-14.2', 'unitConvert', {
    1: { quantity: 'mass', direction: 'down' },
    2: { quantity: 'mass', direction: 'down' },
    3: { quantity: 'mass', direction: 'both' },
  }),
  altTpl('M2-14.2', 'sense', 'unitConvert', {
    1: { quantity: 'mass', mode: 'chooseUnit' },
    2: { quantity: 'mass', mode: 'chooseUnit' },
    3: { quantity: 'mass', mode: 'chooseUnit' },
  }, 'choice_image'),

  tpl('M2-14.3', 'unitConvert', {
    1: { quantity: 'mass', mode: 'chooseUnit' },
    2: { quantity: 'mass', mode: 'chooseUnit' },
    3: { quantity: 'mass', mode: 'chooseUnit' },
  }, 'choice_image'),
  altTpl('M2-14.3', 'convert', 'unitConvert', {
    1: { quantity: 'mass', direction: 'up' },
    2: { quantity: 'mass', direction: 'both' },
    3: { quantity: 'mass', direction: 'up' },
  }, 'input_number'),

  // ── M2-15 数学广角·推理 ──────────────────────────────────────────
  // 同一道推理正着问和反着问：「谁排第一」点动物，「小猫排第几」点名次。
  // 反问那条更难——她得先找出那只动物，再说出它的位置
  tpl('M2-15.1', 'logicReasoning', {
    1: { animals: 3 },
    2: { animals: 3 },
    3: { animals: 4 },
  }, 'choice_image'),
  altTpl('M2-15.1', 'rank', 'logicReasoning', {
    1: { mode: 'rank', animals: 3 },
    2: { mode: 'rank', animals: 3 },
    3: { mode: 'rank', animals: 4 },
  }, 'choice_text'),

  tpl('M2-15.2', 'logicReasoning', {
    1: { mode: 'rank', animals: 3 },
    2: { mode: 'rank', animals: 4 },
    3: { mode: 'rank', animals: 4 },
  }, 'choice_text'),
  altTpl('M2-15.2', 'who', 'logicReasoning', {
    1: { animals: 4 },
    2: { animals: 4 },
    3: { animals: 4 },
  }, 'choice_image'),
]

/**
 * ⭐ 还没有模板的二年级知识点 —— **这份清单只能减，不能增**。
 *
 * 现在剩下的**全部**卡在同一件事上：需要新的 SVG 图形组件。
 * 图谱里已经有这些知识点、误区标签也备齐了、生成器的逻辑也不难写，
 * 缺的只是「怎么把题画出来」——尺子上的刻度、角的两条边、三视图、
 * 轴对称的折痕、条形图的柱子，每一样都要画。
 *
 * ⚠️ 在清单清空之前，`isOpened('math', 'G2')` 必须保持 `false`——
 * 图谱有了但题出不全时不该让孩子进去，见 design/08 §8.8 的提醒。
 *
 * `itemTemplates.test.ts` 拿这份清单与实际情况**双向比对**：
 * 挂了模板却忘了从清单里划掉会红，清单里漏写一个也会红。
 */
export const PENDING_G2_KP_IDS: readonly string[] = [
  // 需要尺子 / 线段 SVG
  'M2-1.1', 'M2-1.2', 'M2-1.5',
  // 需要三视图 SVG
  'M2-5.1', 'M2-5.2',
  // 需要统计表 / 条形图 SVG
  'M2-8.1', 'M2-8.2',
  // 需要轴对称 / 平移 / 旋转 SVG
  'M2-10.1', 'M2-10.2', 'M2-10.3', 'M2-10.4',
]
