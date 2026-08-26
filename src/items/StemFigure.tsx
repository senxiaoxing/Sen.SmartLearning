/**
 * @file 题干配图 —— 把 `ItemVisual` 画成孩子看得懂的图
 * @layer items
 * @see src/domain/types.ts        ItemVisual 的各个 kind
 * @see src/items/StoryFigures.tsx 情境类的两种画法
 *
 * ```
 * figure       一个 SVG 图形        M7 图形 · M8 钟表
 * shapeScene   一幅摆好的图形画面    M7 数积木 · 数图形
 * ordinalRow   一排物体指出第几个    M1.4 序数
 * spatialPair  两个物体的位置关系    M2 上下前后左右
 * storyGroups  几堆物体的合并/去掉   M4.1 · M4.3 · M9.1~9.3
 * equalGroups  等分的几组（几个几）  M2-4.1 · M2-4.2 · M2-9.1
 * barChart     条形图              M2-8 数据收集整理
 * braceGroups  大括号 + 问号        M9.4
 * ```
 */

import { MathShape } from '@/components/shape/MathShape'
import { ShapeScene } from '@/components/shape/ShapeScene'
import { BarChart } from '@/items/BarChart'
import { BraceGroups, EqualGroups, StoryGroups } from '@/items/StoryFigures'
import type { ItemVisual } from '@/domain/types'

/**
 * 本组件画得出来的配图种类。
 *
 * ⭐ 存在的理由：`StemFigure` 对不认识的 kind 返回 `null`，而「什么都没画」
 * 和「不该画」在渲染结果上一模一样——调用方无从分辨。
 * 题型组件用它判断「这幅图该不该由我来画」，
 * 剩下的（`tenFrame` / `countable` / `ordering` …）由各题型自己的脚手架负责。
 *
 * ⚠️ 加 `case` 时必须同步这里，否则新配图会静默地画不出来。
 * 由 `data/seed/stemFigureReach.test.ts` 兜底。
 */
const STEM_FIGURE_KINDS: ReadonlySet<ItemVisual['kind']> = new Set([
  'figure',
  'shapeScene',
  'ordinalRow',
  'spatialPair',
  'storyGroups',
  'equalGroups',
  'barChart',
  'braceGroups',
])

/**
 * 这幅配图该不该由 {@link StemFigure} 来画。
 *
 * @param visual - 题目的配图数据，可缺省
 * @returns 是题干配图则为 true；各题型自己的脚手架（十格阵等）返回 false
 *
 * @example
 * isStemFigure({ kind: 'barChart', … })   // true  —— 交给 StemFigure
 * isStemFigure({ kind: 'tenFrame', … })   // false —— InputNumber 自己画
 * isStemFigure(undefined)                 // false
 */
export function isStemFigure(visual: ItemVisual | undefined): visual is ItemVisual {
  return visual !== undefined && STEM_FIGURE_KINDS.has(visual.kind)
}

export function StemFigure({ visual }: { visual: ItemVisual }) {
  switch (visual.kind) {
    case 'figure':
      return <MathShape imageKey={visual.imageKey} size={170} />

    case 'shapeScene':
      return <ShapeScene pieces={visual.pieces} width={visual.width} height={visual.height} />

    case 'ordinalRow':
      return <OrdinalRow visual={visual} />

    case 'spatialPair':
      return <SpatialPair visual={visual} />

    case 'storyGroups':
      return <StoryGroups visual={visual} />

    case 'equalGroups':
      return <EqualGroups visual={visual} />

    case 'barChart':
      return <BarChart visual={visual} />

    case 'braceGroups':
      return <BraceGroups visual={visual} />

    default:
      return null
  }
}

type Of<K extends ItemVisual['kind']> = Extract<ItemVisual, { kind: K }>

/**
 * 一排物体，被问到的那个用箭头指出来。
 *
 * ⚠️ 数数方向由一个明确的起点标记表达（👉 在左 / 👈 在右）。
 * 「第 3 个」从哪头数是一年级要专门学的内容，不能靠默认约定糊过去。
 *
 * 被问的那个**下方画一个向上的箭头**而不是给它加高亮框——
 * 高亮会把它变成「和别人不一样的那个」，孩子可能靠这个特征作答而不去数。
 */
function OrdinalRow({ visual }: { visual: Of<'ordinalRow'> }) {
  const fromRight = visual.fromRight === true
  // targetIndex 按数数方向计，转成数组下标
  const marked = fromRight ? visual.emojis.length - 1 - visual.targetIndex : visual.targetIndex

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-end gap-2">
        {!fromRight && <span className="text-2xl">👉</span>}
        {visual.emojis.map((emoji, i) => (
          <span key={i} className="flex flex-col items-center gap-1">
            <span className="text-4xl leading-none">{emoji}</span>
            <span className="text-xl leading-none">{i === marked ? '⬆️' : ' '}</span>
          </span>
        ))}
        {fromRight && <span className="text-2xl">👈</span>}
      </div>
      <span className="text-base text-ink/40">从{fromRight ? '右' : '左'}边开始数</span>
    </div>
  )
}

/**
 * 两个物体的空间关系。
 *
 * **用布局本身表达关系**：上下就真的摆成上下，左右就真的摆成左右。
 * 画箭头或写文字都要求孩子先学会一层符号约定，而这道题考的是空间感本身。
 *
 * `front` / `behind` 用大小与重叠表达——近大远小是最直观的前后线索。
 */
function SpatialPair({ visual }: { visual: Of<'spatialPair'> }) {
  const { anchor, target, relation } = visual

  if (relation === 'above' || relation === 'below') {
    const top = relation === 'above' ? target : anchor
    const bottom = relation === 'above' ? anchor : target
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl leading-none">{top}</span>
        <span className="text-5xl leading-none">{bottom}</span>
      </div>
    )
  }

  if (relation === 'left' || relation === 'right') {
    const left = relation === 'left' ? target : anchor
    const right = relation === 'left' ? anchor : target
    return (
      <div className="flex items-center gap-6">
        <span className="text-5xl leading-none">{left}</span>
        <span className="text-5xl leading-none">{right}</span>
      </div>
    )
  }

  // 前后：近大远小 + 轻微重叠
  const isFront = relation === 'front'
  return (
    <div className="flex items-end justify-center gap-0">
      <span className={`${isFront ? 'text-3xl opacity-70' : 'text-5xl'} leading-none`}>
        {isFront ? anchor : target}
      </span>
      <span className={`${isFront ? 'text-5xl' : 'text-3xl opacity-70'} -ml-3 leading-none`}>
        {isFront ? target : anchor}
      </span>
    </div>
  )
}
