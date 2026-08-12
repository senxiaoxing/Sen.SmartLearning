/**
 * @file 图形分类生成器 —— M7.2 立体图形分类
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/shapeKinds.ts  共享的图形清单与选项构造
 *
 * 原设计用 `drag_match`（把图形拖进两个筐），改成选择题是因为
 * 分类能力的核心判断——**这个有没有厚度**——用一次选择就能考到，
 * 而拖拽会额外引入手指精度的干扰
 * （design/05-孩子反馈与响应.md「拖不准是手的问题不是脑子的问题」）。
 *
 * 题干给一个立体就问哪个也是立体，选项里 1 个同类 + 3 个异类，
 * 于是每个错误选项都精确指向 `solid_plane_confusion`。
 */

import { shuffle } from '@/domain/generators/rng'
import {
  OPTION_COUNT,
  PLANES,
  SHAPE_NAMES,
  SOLIDS,
  toShapeOptions,
  type RawShapeOption,
} from '@/domain/generators/shapeKinds'
import type { Generator } from '@/domain/types'

/**
 * 生成一道图形分类题。
 *
 * @returns `type: 'choice_image'`，题干是一个图形，选项是四个图形
 *
 * @example
 * classifyShape({ kpId: 'M7.2', difficulty: 2, params: {}, rng })
 * // 题干给圆柱时：
 * //   正方体 → 正确（也是立体图形）
 * //   正方形 / 三角形 / 圆 → solid_plane_confusion
 */
export const classifyShape: Generator = ({ kpId, difficulty, rng }) => {
  const askSolid = rng() < 0.5
  const sameFamily: readonly string[] = askSolid ? SOLIDS : PLANES
  const otherFamily: readonly string[] = askSolid ? PLANES : SOLIDS
  const prefix = askSolid ? 'solid' : 'plane'
  const otherPrefix = askSolid ? 'plane' : 'solid'

  // 题干的图形与正确选项必须是**不同的**两个，否则就成了「找一模一样的」
  const [sample = 'cube', twin = 'cuboid'] = shuffle(rng, sameFamily)
  const others = shuffle(rng, otherFamily).slice(0, OPTION_COUNT - 1)

  const raw: RawShapeOption[] = [
    { key: `${prefix}:${twin}`, label: SHAPE_NAMES[twin] ?? '', isCorrect: true },
    ...others.map((o) => ({
      key: `${otherPrefix}:${o}`,
      label: SHAPE_NAMES[o] ?? '',
      isCorrect: false,
      tag: 'solid_plane_confusion' as const,
    })),
  ]

  const kindWord = askSolid ? '立体图形' : '平面图形'

  return {
    signature: `${kpId}-classify#${prefix}:${sample}:${twin}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `哪个和它一样，也是${kindWord}？`,
      ttsText: `哪个和它一样，也是${kindWord}`,
      ttsParts: [askSolid ? 'phrase.sameKindSolid' : 'phrase.sameKindPlane'],
    },
    options: toShapeOptions(shuffle(rng, raw)),
    answer: SHAPE_NAMES[twin] ?? '',
    visual: { kind: 'figure', imageKey: `${prefix}:${sample}` },
  }
}
