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

import { MathShape, shapeSize } from '@/components/shape/MathShape'
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

/**
 * 题干里的图至少要有多大。
 *
 * `MathShape` 的族默认尺寸是按**选项卡片**定的（正方体 82、角 100），
 * 摆到题干上太小，所以这里兜一个下限。
 */
const MIN_STEM_SIZE = 170

/**
 * 题干配图该画多大。
 *
 * ⭐ **取族默认值与 {@link MIN_STEM_SIZE} 里大的那个**，不能一律写死 170。
 * 原先写死的后果是尺子被压到 170——而尺子的画布宽 340，
 * 缩一半之后刻度数字只有 7px，真机上根本看不清。
 * 「尺子太小」这条真机反馈的根因就在这一行，不在尺子本身的画法上。
 *
 * @param imageKey - 图形 key，形如 `ruler:12:1:6`
 * @returns 渲染像素宽度
 *
 * @example
 * stemSizeOf('ruler:12:1:6')      // 420 —— 族默认更大，用它
 * stemSizeOf('plane:triangle')    // 170 —— 族默认只有 82，抬到下限
 */
function stemSizeOf(imageKey: string): number {
  return Math.max(shapeSize(imageKey), MIN_STEM_SIZE)
}

export function StemFigure({ visual }: { visual: ItemVisual }) {
  switch (visual.kind) {
    case 'figure':
      return <MathShape imageKey={visual.imageKey} size={stemSizeOf(visual.imageKey)} />

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

  // 前后：⭐ 只靠遮挡，见 FrontBackPair
  const isFront = relation === 'front'
  return (
    <FrontBackPair
      front={isFront ? target : anchor}
      back={isFront ? anchor : target}
      frontOnRight={visual.frontOnRight !== false}
    />
  )
}

/**
 * 前后关系 —— ⭐ **只靠遮挡表达，不动大小**。
 *
 * ## 为什么放弃「近大远小」
 *
 * 那是原来的做法，真机上被打回两次：
 *
 * 1. **它和物体的固有大小打架。**「小鸟在大树前面」会把小鸟画得比树还大，
 *    孩子看到的是一只巨鸟，而不是一只离得近的鸟
 * 2. **12px 的重叠在 emoji 上产生不了遮挡感。** emoji 背景透明，
 *    两个不同字号的字符挨在一起，看起来就是并排——图上根本读不出前后
 *
 * 遮挡（occlusion）是最强也最早发育的深度线索，幼儿就懂，
 * 而且**不受物体固有大小影响**：谁挡住谁，谁就在前面。
 *
 * ## 怎么让 emoji 真的挡住 emoji
 *
 * emoji 是字符，`z-index` 叠上去也只是"后画的盖住先画的"，
 * 而透明背景意味着重叠处只是两个图案糊在一起。
 * 所以给前面那个描一圈**画布底色**的边（`textShadow` 同色多层），
 * 相当于在后面那个身上擦掉一圈——这才形成真实的轮廓遮挡。
 *
 * ⚠️ 底色必须取 `--canvas`（页面底色），不能写死白色：
 * 换主题（星际）时页面是深蓝底，白色描边会变成一圈刺眼的白光。
 *
 * ⚠️ 重叠量要足够大（约一半），小重叠会被读成「并排」——
 * 那正是被打回的那一版。
 *
 * ## ⭐ 靠前的那个不能总在同一边
 *
 * 遮挡必然把两个物体摆成一左一右。若靠前的永远在右，「前面」就退化成
 * 「在右边」，孩子看位置就能作答——既考不到空间关系，
 * 还会把前后和左右在她脑子里焊死。左右由生成器随机（`frontOnRight`）。
 *
 * ⛔ **不做垂直错位**（「近的画低一点」那种透视）：前后题的干扰项正是
 * 上面 / 下面，一旦把靠前的画低，「下面」也讲得通，又成了两个答案。
 */
function FrontBackPair({
  front,
  back,
  frontOnRight,
}: {
  front: string
  back: string
  frontOnRight: boolean
}) {
  /** 描一圈画布底色，把后面那个的轮廓擦出缺口 —— 这就是「挡住」。
   *  ⚠️ token 存的是 RGB 分量（`--c-canvas: 255 243 226`），必须套 rgb()。
   *  投影让靠前的那个真的「浮」在另一个上方，是遮挡之外的第二条深度线索 */
  const cut = 'rgb(var(--c-canvas))'
  const frontStyle = {
    textShadow: `0 0 5px ${cut}, 0 0 5px ${cut}, 0 0 5px ${cut}, 0 0 9px ${cut}`,
    filter: 'drop-shadow(0 3px 2px rgb(0 0 0 / 0.28))',
  }

  const frontEl = (
    <span
      key="front"
      className={`${frontOnRight ? '-ml-7' : '-mr-7'} relative z-10 text-5xl leading-none`}
      style={frontStyle}
    >
      {front}
    </span>
  )
  const backEl = (
    <span key="back" className="text-5xl leading-none">
      {back}
    </span>
  )

  return (
    <div className="flex items-center justify-center">
      {frontOnRight ? [backEl, frontEl] : [frontEl, backEl]}
    </div>
  )
}
