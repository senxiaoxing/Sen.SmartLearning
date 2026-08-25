/**
 * @file 图形面分发 —— 把 `imageKey` 字符串解析成具体的 SVG
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/types.ts  SolidShapeKind / PlaneShapeKind 与 key 格式
 *
 * 生成器是 domain 层的纯函数，产不出 React 元素，只能产出一个字符串 key；
 * 这里负责把 key 变成图。**替换美术只需改这一层与三个 Art 组件**，
 * 与 `PetAvatar` 对宠物形象的关系完全一样。
 */

import { AngleShape } from '@/components/shape/AngleShape'
import { ClockFace } from '@/components/shape/ClockFace'
import { PlaneShape } from '@/components/shape/PlaneShape'
import { RulerShape, SegmentShape } from '@/components/shape/RulerShape'
import { SolidShape } from '@/components/shape/SolidShape'
import type { PlaneShapeKind, SolidShapeKind } from '@/domain/types'

const SOLIDS = new Set<string>(['cube', 'cuboid', 'cylinder', 'sphere', 'cone'])
const PLANES = new Set<string>(['square', 'rect', 'triangle', 'circle'])

/**
 * 各族图形的默认显示尺寸。
 *
 * ⭐ 钟面比几何图形大一圈：它上面有 12 个数字和两根指针，
 * 缩到和正方体一样大时**指针长短分不出来、数字挤成一团**，
 * 孩子会读错时间——上机验收时这一条被明确指出过。
 */
const DEFAULT_SIZE: Record<string, number> = {
  solid: 82,
  plane: 82,
  clock: 118,
  // 角比几何图形略大：边长本身是题目内容（见 AngleShape 文件头），
  // 缩小会把「长边」和「短边」的差别压没
  angle: 100,
  // 尺子要能看清刻度数字，给足宽度
  ruler: 300,
  segment: 150,
}

interface MathShapeProps {
  /** 形如 `'solid:cube'` / `'plane:triangle'` / `'clock:3:30'` / `'angle:90:38:0'` */
  imageKey: string
  /** 省略时按族取 {@link DEFAULT_SIZE} */
  size?: number
}

/** 这个 key 该用多大。供选项卡片预留高度 */
export function shapeSize(imageKey: string, override?: number): number {
  if (override !== undefined) return override
  return DEFAULT_SIZE[imageKey.split(':')[0] ?? ''] ?? 82
}

/**
 * 按 key 渲染图形。
 *
 * 无法识别的 key 渲染为 `null` 而不是抛错——一道题里混进坏 key
 * 应该表现为「少了一张图」，而不是整个答题页白屏。
 * 真正的防线是 `mathShapes.test.ts` 校验全部生成器产出的 key 都能解析。
 *
 * @example
 * <MathShape imageKey="clock:9:30" size={120} />
 */
export function MathShape({ imageKey, size }: MathShapeProps) {
  const [family, a, b, c] = imageKey.split(':')
  const px = shapeSize(imageKey, size)

  // 拼音的看图选音节直接用 emoji 而非 SVG（🐱 比任何自绘图标都好认）
  if (family === 'emoji' && a !== undefined) {
    return (
      <span style={{ fontSize: px, lineHeight: 1 }} role="img">
        {a}
      </span>
    )
  }

  if (family === 'solid' && a !== undefined && SOLIDS.has(a)) {
    return <SolidShape kind={a as SolidShapeKind} size={px} />
  }

  if (family === 'plane' && a !== undefined && PLANES.has(a)) {
    return <PlaneShape kind={a as PlaneShapeKind} size={px} />
  }

  if (family === 'clock') {
    const hour = Number(a)
    const minute = Number(b)
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return <ClockFace hour={hour} minute={minute} size={px} />
    }
  }

  // `angle:<度数>:<边长>:<朝向>` —— ⭐ 边长是题目内容的一部分，不是样式
  if (family === 'angle') {
    const degrees = Number(a)
    const arm = Number(b)
    const rotate = Number(c)
    if (Number.isFinite(degrees) && Number.isFinite(arm) && Number.isFinite(rotate)) {
      return <AngleShape degrees={degrees} arm={arm} rotate={rotate} size={px} />
    }
  }

  // `ruler:<总刻度>:<起点>:<终点>` —— ⭐ 起点不一定是 0，那正是考点
  if (family === 'ruler') {
    const maxTick = Number(a)
    const start = Number(b)
    const end = Number(c)
    if ([maxTick, start, end].every(Number.isFinite)) {
      return <RulerShape maxTick={maxTick} start={start} end={end} size={px} />
    }
  }

  // `segment:<厘米>` —— 一条不配尺子的线段，用于「哪条长 5 厘米」
  if (family === 'segment') {
    const cm = Number(a)
    if (Number.isFinite(cm) && cm > 0) return <SegmentShape lengthCm={cm} size={px} />
  }

  return null
}

/** 这个 key 能不能被解析。供 seed 与生成器的契约测试使用 */
export function isRenderableShapeKey(imageKey: string): boolean {
  const [family, a, b, c] = imageKey.split(':')
  if (family === 'emoji') return a !== undefined && a.length > 0
  if (family === 'solid') return a !== undefined && SOLIDS.has(a)
  if (family === 'plane') return a !== undefined && PLANES.has(a)
  if (family === 'clock') return Number.isFinite(Number(a)) && Number.isFinite(Number(b))
  if (family === 'angle' || family === 'ruler') {
    return [a, b, c].every((v) => v !== undefined && Number.isFinite(Number(v)))
  }
  if (family === 'segment') return a !== undefined && Number(a) > 0
  return false
}
