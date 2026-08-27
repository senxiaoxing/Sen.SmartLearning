/**
 * @file 图形画面 —— 把一组图形按坐标摆出来，供「数一数有几个」
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/generators/countShapes.ts  摆法从哪来
 *
 * 只负责画，**不参与任何布局决策**：每块的坐标由生成器算好并写进
 * `ItemVisual`，因为摆放位置本身就是题目内容，必须能被固定种子复现。
 */

import { IsoCube } from '@/components/shape/IsoCube'
import { PlaneShape } from '@/components/shape/PlaneShape'
import { SolidShape } from '@/components/shape/SolidShape'
import type { PlaneShapeKind, ScenePiece, SolidShapeKind } from '@/domain/types'

const SOLIDS = new Set(['cube', 'cuboid', 'cylinder', 'sphere', 'cone'])

interface ShapeSceneProps {
  pieces: readonly ScenePiece[]
  width: number
  height: number
  /** 渲染像素宽度 */
  displayWidth?: number
}

/**
 * 一幅图形画面。
 *
 * ⚠️ 后面的块先画、前面的后画（数组顺序即层叠顺序），
 * 积木堆的遮挡关系全靠这个顺序，生成器必须按由远及近排好。
 *
 * @example
 * <ShapeScene pieces={[{ shape: 'cube', x: 0, y: 20 }]} width={200} height={120} />
 */
export function ShapeScene({ pieces, width, height, displayWidth = 300 }: ShapeSceneProps) {
  const scale = displayWidth / width

  return (
    <div
      className="relative"
      style={{ width: displayWidth, height: height * scale }}
      role="img"
      aria-label="数一数图里有几个"
    >
      {pieces.map((p, i) => {
        const size = p.size ?? 24
        return (
          <div
            key={i}
            className="absolute"
            style={{ left: p.x * scale, top: p.y * scale }}
          >
            {/* 积木堆专用的等轴测正方体：一块紧挨一块，不留缝、不带各自的投影。
                ⚠️ 与 SolidShape 的 'cube' 是两种东西，不能互相替代 */}
            {p.shape === 'isoCube' ? (
              <IsoCube size={size * scale} />
            ) : SOLIDS.has(p.shape) ? (
              <SolidShape kind={p.shape as SolidShapeKind} size={size * scale} />
            ) : (
              <PlaneShape kind={p.shape as PlaneShapeKind} size={size * scale} />
            )}
          </div>
        )
      })}
    </div>
  )
}
