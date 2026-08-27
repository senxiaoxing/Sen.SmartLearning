/**
 * @file 位置生成器 —— M2.1 上下 · M2.2 前后 · M2.3 左右
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/01-知识点图谱.md §M2 位置与方向
 * @see src/items/StemFigure.tsx  SpatialPair 用布局本身表达关系
 *
 * ## 选项是文字，但孩子不识字——靠点读
 *
 * 「上面/下面」这类方位词没有能一眼看懂的图形表示
 * （⬆️ 表示的是方向不是位置，容易和「往上走」混）。
 * 所以选项用大字，每个都挂 `ttsText` 供点击朗读——
 * 与英语题的 emoji + 中文释义是同一套无障碍策略。
 *
 * 而且「上下左右」这几个字本身就在一年级识字表里，见得多了自然认得。
 *
 * ## ⭐ 左右题必须掺镜像干扰项
 *
 * `lr_mirror` 是 M2.3 唯一要诊断的误区：孩子按图中人物的视角判断左右，
 * 而不是自己的视角。因此左右题的干扰项固定包含**反方向**那个。
 */

import { readEnum } from '@/domain/generators/params'
import { SPATIAL_PAIRS } from '@/domain/generators/countables'
import { randomPick, shuffle } from '@/domain/generators/rng'
import type { Generator, ItemOption, MisconceptionTag } from '@/domain/types'

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const

type Axis = 'updown' | 'frontback' | 'leftright'

/** 每根轴上的一对方位词（含语音片段 key），以及说反了对应的诊断标签 */
const AXES: Record<
  Axis,
  {
    relations: [string, string]
    labels: [string, string]
    clips: [string, string]
    tag: MisconceptionTag
  }
> = {
  updown: {
    relations: ['above', 'below'],
    labels: ['上面', '下面'],
    clips: ['word.above', 'word.below'],
    tag: 'lr_mirror',
  },
  frontback: {
    relations: ['front', 'behind'],
    labels: ['前面', '后面'],
    clips: ['word.front', 'word.behind'],
    tag: 'lr_mirror',
  },
  leftright: {
    relations: ['left', 'right'],
    labels: ['左边', '右边'],
    clips: ['word.left', 'word.right'],
    tag: 'lr_mirror',
  },
}

/**
 * 每根轴的补充干扰项**固定**取哪根轴。
 *
 * ⭐ **绝不能随机抽**（原来就是随机的，真机上抓到了）：前后关系在屏幕上
 * 只能靠遮挡表达，而遮挡必然让两个物体一左一右——于是「小狗在小汽车前面」
 * 那道题里，小狗**同时**真的在小汽车右边。一旦「右边」被抽进选项，
 * 这道题就有了两个说得通的答案，孩子答「右边」被判错却完全不知道错在哪。
 *
 * design/08 §10「画图形这批的三条经验」第 ③ 条：
 * **画图类的题尤其要问一句，会不会有第二个说得通的答案。**
 *
 * 所以配对规则是「取视觉上正交、绝不可能同时成立的那根轴」：
 *
 * | 本轴 | 干扰轴 | 为什么安全 |
 * |---|---|---|
 * | 上下 | 左右 | 垂直排列的两个物体谈不上左右 |
 * | 左右 | 上下 | 水平排列的两个物体谈不上上下 |
 * | 前后 | **上下** | ⛔ 绝不能用左右，理由见上 |
 */
const DISTRACTOR_AXIS: Record<Axis, Axis> = {
  updown: 'leftright',
  leftright: 'updown',
  frontback: 'updown',
}

/**
 * 生成一道位置题。
 *
 * @param ctx.params.axis - `'updown'`（M2.1）| `'frontback'`（M2.2）| `'leftright'`（M2.3）
 * @param ctx.params.withDistractorAxis - 是否掺入另一根轴的方位词做干扰（难度 2 起）
 *
 * @example
 * position({ kpId: 'M2.3', difficulty: 2, params: { axis: 'leftright' }, rng })
 * // 小鸟画在大树左边时：
 * //   左边 → 正确
 * //   右边 → lr_mirror  按图中视角判断，或单纯左右不分
 */
export const position: Generator = ({ kpId, difficulty, params, rng }) => {
  const axis = readEnum(
    params,
    'axis',
    ['updown', 'frontback', 'leftright'] as const,
    'updown',
  )
  const spec = AXES[axis]
  const pair = randomPick(rng, SPATIAL_PAIRS)

  const which = rng() < 0.5 ? 0 : 1
  const relation = spec.relations[which] as
    | 'above'
    | 'below'
    | 'left'
    | 'right'
    | 'front'
    | 'behind'
  const correctLabel = spec.labels[which] ?? '上面'
  const correctClip = spec.clips[which] ?? 'word.above'
  const oppositeLabel = spec.labels[1 - which] ?? '下面'
  const oppositeClip = spec.clips[1 - which] ?? 'word.below'

  // 另一根轴的两个词作为补充干扰项：答错它们说明连问的是哪个方向都没听清
  const extra = DISTRACTOR_AXIS[axis]

  const candidates: { text: string; clip: string; isCorrect: boolean; tag?: MisconceptionTag }[] = [
    { text: correctLabel, clip: correctClip, isCorrect: true },
    // ⭐ 反方向必须在选项里，否则 lr_mirror 无从诊断
    { text: oppositeLabel, clip: oppositeClip, isCorrect: false, tag: spec.tag },
    ...AXES[extra].labels.map((t, i) => ({
      text: t,
      clip: AXES[extra].clips[i] ?? 'word.above',
      isCorrect: false,
      tag: spec.tag,
    })),
  ]

  const options: ItemOption[] = shuffle(rng, candidates)
    .slice(0, 4)
    .map((c, i) => ({
      id: OPTION_IDS[i] ?? `x${i}`,
      text: c.text,
      // 孩子不识字，选项必须能点读（错题本与试听走片段，不落 TTS）
      ttsText: c.text,
      ttsParts: [c.clip],
      isCorrect: c.isCorrect,
      ...(c.tag !== undefined && { misconceptionTag: c.tag }),
    }))

  /**
   * ⭐ 前后题靠前的那个画在哪一侧，必须随机。
   *
   * 固定在同一侧的话「前面」就退化成「在右边」，孩子看位置就能作答——
   * 既考不到空间关系，还会把前后和左右在她脑子里焊死。
   * 见 `ItemVisual.frontOnRight`。
   *
   * ⚠️ 在 `return` 之前算好而不是写进对象字面量：rng 的调用顺序决定了
   * 同种子能否复现，摆在明处才不会被后来的改动挤乱。
   */
  const frontOnRight = rng() < 0.5

  return {
    signature: `${kpId}-position#${axis}:${relation}:${pair.targetName}`,
    kpId,
    type: 'choice_image',
    difficulty,
    stem: {
      text: `${pair.targetName}在${pair.anchorName}的什么位置？`,
      ttsText: `${pair.targetName}在${pair.anchorName}的什么位置`,
      ttsParts: [pair.targetClip, 'phrase.at', pair.anchorClip, 'phrase.whatPosition'],
    },
    options,
    answer: correctLabel,
    visual: {
      kind: 'spatialPair',
      anchor: pair.anchor,
      target: pair.target,
      relation,
      frontOnRight,
    },
  }
}
