/**
 * @file 图形识别生成器 —— M7.1 立体图形 · M7.3 平面图形
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/shapeKinds.ts    共享的图形清单与选项构造
 * @see src/domain/generators/classifyShape.ts M7.2 分类
 * @see src/components/shape/SolidShape.tsx    图形怎么画
 *
 * ## ⭐ 干扰项就是「另一个图形」，天然带诊断性
 *
 * 图形题不需要构造数值误区——选错哪个图形本身就说明了问题：
 *
 * ```
 * 问「正方体」选了正方形  → solid_plane_confusion  立体/平面没分开
 * 问「正方体」选了长方体  → 形状特征没抓准（同族混淆）
 * ```
 *
 * 因此**立体题的干扰项必须掺进平面图形**，否则 `solid_plane_confusion`
 * 这个 M7 的主要误区压根没机会发生，诊断等于没做。
 */

import { shuffle } from '@/domain/generators/rng'
import {
  CORNERED_PLANES,
  OPTION_COUNT,
  PLANES,
  PLANE_NAMES,
  SOLIDS,
  SOLID_NAMES,
  SOLID_TO_PLANE,
  toShapeOptions,
  type RawShapeOption,
} from '@/domain/generators/shapeKinds'
import type { Generator, PlaneShapeKind, SolidShapeKind } from '@/domain/types'

/**
 * 生成一道图形识别题。
 *
 * @param ctx.params.family - `'solid'` 立体（M7.1）| `'plane'` 平面（M7.3）
 * @param ctx.params.corneredOnly - 正确答案只从**有角的**平面图形里抽（排除圆）。
 *                                  给 M2-3.1「认识角」用，见 {@link CORNERED_PLANES}。
 *                                  ⚠️ 只影响正确答案，圆仍然会作为干扰项出现
 *
 * @returns `type: 'choice_image'`，选项是图形，界面上不显示文字标签
 *
 * @example
 * shapes({ kpId: 'M7.1', difficulty: 1, params: { family: 'solid' }, rng })
 * // 抽到正方体时：
 * //   solid:cube     → 正确
 * //   plane:square   → solid_plane_confusion  把正方体认成正方形
 * //   solid:cylinder → 同族混淆
 *
 * @example
 * // 认识角：绝不会问出「哪个是圆」——圆没有角，答对它说明不了任何事
 * shapes({ kpId: 'M2-3.1', difficulty: 2, params: { family: 'plane', corneredOnly: true }, rng })
 */
export const shapes: Generator = ({ kpId, difficulty, params, rng }) => {
  const isPlane = params['family'] === 'plane'
  const planePool = params['corneredOnly'] === true ? CORNERED_PLANES : PLANES
  const answer = pick(rng, isPlane ? planePool : SOLIDS)
  const name = (isPlane ? PLANE_NAMES : SOLID_NAMES)[answer] ?? ''

  const raw: RawShapeOption[] = isPlane
    ? planeOptions(answer as PlaneShapeKind, name, rng)
    : solidOptions(answer as SolidShapeKind, name, rng)

  return {
    signature: `${kpId}-shape#${isPlane ? 'plane' : 'solid'}:${answer}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `哪个是${name}？`,
      ttsText: `哪个是${name}`,
      // 图形名片段的 key 与 kind 同名（word.cube / word.square…），见 voiceManifest WORDS 段
      ttsParts: ['phrase.whichIs', `word.${answer}`],
    },
    options: toShapeOptions(shuffle(rng, raw)),
    answer: name,
  }
}

/** 立体题：正确项 + 1 个名字最像的平面图形 + 其余立体 */
function solidOptions(
  answer: SolidShapeKind,
  name: string,
  rng: () => number,
): RawShapeOption[] {
  const twin = SOLID_TO_PLANE[answer]
  const others = shuffle(rng, SOLIDS.filter((s) => s !== answer)).slice(0, OPTION_COUNT - 2)

  return [
    { key: `solid:${answer}`, label: name, isCorrect: true },
    {
      key: `plane:${twin}`,
      label: PLANE_NAMES[twin] ?? '',
      isCorrect: false,
      tag: 'solid_plane_confusion',
    },
    ...others.map((s) => ({
      key: `solid:${s}`,
      label: SOLID_NAMES[s] ?? '',
      isCorrect: false,
      tag: 'solid_plane_confusion' as const,
    })),
  ]
}

/** 平面题：反向也要掺立体——问平面图形时选了立体，同样是 solid_plane_confusion */
function planeOptions(
  answer: PlaneShapeKind,
  name: string,
  rng: () => number,
): RawShapeOption[] {
  const solidTwin = (Object.keys(SOLID_TO_PLANE) as SolidShapeKind[]).find(
    (s) => SOLID_TO_PLANE[s] === answer,
  )
  const others = shuffle(rng, PLANES.filter((p) => p !== answer)).slice(0, OPTION_COUNT - 2)

  return [
    { key: `plane:${answer}`, label: name, isCorrect: true },
    ...(solidTwin === undefined
      ? []
      : [
          {
            key: `solid:${solidTwin}`,
            label: SOLID_NAMES[solidTwin] ?? '',
            isCorrect: false,
            tag: 'solid_plane_confusion' as const,
          },
        ]),
    ...others.map((p) => ({
      key: `plane:${p}`,
      label: PLANE_NAMES[p] ?? '',
      isCorrect: false,
      tag: 'solid_plane_confusion' as const,
    })),
  ]
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] ?? (items[0] as T)
}
