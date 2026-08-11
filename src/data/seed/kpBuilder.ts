/**
 * @file 知识点构造器 —— 把紧凑的 `KpSpec` 声明展开为完整的 `KnowledgePoint`
 * @layer data  纯函数，供 seed 数据文件使用
 * @see design/01-知识点图谱.md §1.3 知识点数据结构
 *
 * 为什么要这层构造器：112 个知识点若逐字段手写，每条 14 行、总计 1500+ 行，
 * 差异被大量重复的默认值淹没，人和 AI 都读不动。用构造器后每条 1~3 行，
 * 「这个知识点和别的有什么不同」一眼可见。
 */

import type {
  Difficulty,
  Grade,
  ItemType,
  KnowledgePoint,
  MisconceptionTag,
  Subject,
} from '@/domain/types'

/** 普通知识点的目标掌握度 */
const DEFAULT_TARGET_MASTERY = 0.85

/**
 * 关键节点的目标掌握度。
 * 关键节点（如 M3.3「10 的分与合」）会阻塞大量后续内容，
 * 必须练到条件反射级别，因此阈值显著高于普通知识点。
 */
const KEY_NODE_TARGET_MASTERY = 0.95

/** 关键节点达到掌握所需题量。远高于普通知识点，因为要练到自动化。 */
const KEY_NODE_ITEMS = 60

/** 普通知识点按难度档估算的题量 */
const ITEMS_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 20, 2: 30, 3: 40 }

/** 各科目的默认题型。绝大多数知识点用默认值即可，特殊的在 spec 里显式覆盖。 */
const DEFAULT_ITEM_TYPES: Record<Subject, ItemType[]> = {
  math: ['input_number'],
  pinyin: ['choice_audio'],
  english: ['choice_audio', 'choice_image'],
}

/**
 * 知识点的紧凑声明。只写与默认值不同的部分。
 *
 * 字段名刻意取短（`pre` / `mis` / `diff`），因为它们在 seed 文件里会重复上百次，
 * 短名能让一条知识点压缩到 1~3 行，整体结构一目了然。
 */
export interface KpSpec {
  /** 语义 ID，如 `'M5.2'`。`unit` 会从这里自动推导为 `'M5'` */
  id: string
  /** 知识点名 */
  name: string
  /** 前置知识点 ID，默认无前置 */
  pre?: string[]
  /** 题型，默认按科目取 {@link DEFAULT_ITEM_TYPES} */
  types?: ItemType[]
  /** 难度档，默认 1 */
  diff?: Difficulty
  /** 是否关键节点。为 true 时自动套用更高的掌握阈值与题量 */
  key?: boolean
  /** 典型认知误区，生成器据此构造诊断性干扰项 */
  mis?: MisconceptionTag[]
  /** 覆盖默认题量估算 */
  items?: number
  /** 学期，默认 `'1A'` */
  grade?: Grade
  /** 覆盖默认掌握阈值 */
  mastery?: number
}

/**
 * 把一组 `KpSpec` 展开为完整的 `KnowledgePoint[]`。
 *
 * 自动推导的字段：
 * - `unit` ← 从 `id` 取小数点前的部分（`'M5.2'` → `'M5'`）
 * - `unitName` ← 查 `unitNames` 表
 * - `order` ← 数组顺序，从 `startOrder` 起递增（教学顺序即声明顺序）
 * - `targetMastery` / `estimatedItems` ← 按是否关键节点和难度档取默认值
 * - `collectionCardId` ← `'card-' + id`（每掌握一个知识点解锁一张图鉴卡）
 *
 * @param subject - 科目，决定默认题型
 * @param unitNames - 单元 ID 到单元名的映射，如 `{ M5: '20以内进位加法' }`
 * @param specs - 知识点声明，**数组顺序即教学顺序**
 * @param startOrder - 全局 order 起始值，用于让三个科目的 order 不重叠
 * @returns 完整知识点数组
 * @throws 当 spec 的 unit 在 `unitNames` 中缺失时抛错（防止漏配单元名）
 *
 * @example
 * buildKnowledgePoints('math', { M3: '分与合' }, [
 *   { id: 'M3.1', name: '2~5 的分与合', pre: ['M1.3'] },
 *   { id: 'M3.3', name: '10 的分与合', pre: ['M3.2'], diff: 2, key: true },
 * ], 1)
 * // M3.3 自动获得 targetMastery: 0.95、estimatedItems: 60、collectionCardId: 'card-M3.3'
 */
export function buildKnowledgePoints(
  subject: Subject,
  unitNames: Record<string, string>,
  specs: KpSpec[],
  startOrder: number,
): KnowledgePoint[] {
  return specs.map((spec, index) => {
    const unit = spec.id.split('.')[0] ?? spec.id
    const unitName = unitNames[unit]
    if (unitName === undefined) {
      throw new Error(`知识点 ${spec.id} 的单元 ${unit} 缺少 unitName 配置`)
    }

    const difficulty = spec.diff ?? 1
    const isKeyNode = spec.key ?? false

    return {
      id: spec.id,
      subject,
      unit,
      unitName,
      name: spec.name,
      grade: spec.grade ?? '1A',
      order: startOrder + index,
      prerequisites: spec.pre ?? [],
      itemTypes: spec.types ?? DEFAULT_ITEM_TYPES[subject],
      difficulty,
      isKeyNode,
      targetMastery:
        spec.mastery ?? (isKeyNode ? KEY_NODE_TARGET_MASTERY : DEFAULT_TARGET_MASTERY),
      estimatedItems:
        spec.items ?? (isKeyNode ? KEY_NODE_ITEMS : ITEMS_BY_DIFFICULTY[difficulty]),
      misconceptions: spec.mis ?? [],
      collectionCardId: `card-${spec.id}`,
    }
  })
}
