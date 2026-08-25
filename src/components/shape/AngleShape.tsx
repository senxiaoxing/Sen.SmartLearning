/**
 * @file 角 —— M2-3.2 认识直角 · M2-3.3 锐角与钝角
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/angleGeometry.ts  坐标在那里算，这里只负责画
 * @see src/domain/generators/angles.ts  度数与边长从哪来
 *
 * ## ⭐ 边长必须真实可比，所以 viewBox 固定不缩放
 *
 * 这个单元唯一要诊断的是 `angle_side_length`（边画得长就以为角大），
 * 考法是把「开口相同、边长不同」的两个角摆在一起。
 * 若让 SVG 按内容自动缩放，两个角会被拉成一样大，那道题就问不出东西了。
 *
 * ## 为什么画那道弧
 *
 * 弧的半径固定，**不随边长变**——它正是「角的大小」的可视化：
 * 边推长推短，弧一点不变。这恰好是要教的那件事。
 *
 * ⛔ 直角**不画**那个小方块标记：认直角的题里画了它，
 * 孩子就成了「找有小方块的那个」，而不是在看开口。
 */

import { ANGLE_CANVAS, angleGeometry, arcPath, armsPath } from '@/domain/angleGeometry'

const FILL = '#FFB84D'
const LINE = '#A8681A'

interface AngleShapeProps {
  /** 开口度数，0~180 */
  degrees: number
  /** 边长。⭐ 同一道题里几个角的这个值可以不同，那正是考点 */
  arm?: number
  /** 整体旋转，让角不总是同一个朝向 */
  rotate?: number
  size?: number
}

/**
 * 一个角。
 *
 * @example
 * <AngleShape degrees={90} arm={40} rotate={0} />   // 一个直角，边长 40
 * <AngleShape degrees={90} arm={22} rotate={15} />  // 同样是直角，但边短得多
 */
export function AngleShape({ degrees, arm = 38, rotate = 0, size = 96 }: AngleShapeProps) {
  const g = angleGeometry(degrees, arm, rotate)

  return (
    <svg
      viewBox={`0 0 ${ANGLE_CANVAS} ${ANGLE_CANVAS}`}
      width={size}
      height={size}
      role="img"
      aria-label="一个角"
    >
      <path d={arcPath(g)} fill="none" stroke={FILL} strokeWidth={5} strokeLinecap="round" />
      <path
        d={armsPath(g)}
        fill="none"
        stroke={LINE}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 顶点画实心点：「角有一个顶点两条边」是这个单元的第一句话 */}
      <circle cx={g.vertex.x} cy={g.vertex.y} r={4} fill={LINE} />
    </svg>
  )
}
