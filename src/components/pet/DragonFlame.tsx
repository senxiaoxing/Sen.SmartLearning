/**
 * @file 墨墨的尾焰 —— 三层错相跳动，随等级变大
 * @layer components  纯渲染
 * @see src/components/pet/DragonArt.tsx 主体
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 这是小飞龙的**核心符号**，独立成文件与配饰区分开：
 * 它不占配饰槽位，是身体的一部分，随等级从 0.6 倍长到 1.35 倍。
 */

/** 尾焰倍率，索引对应 stageIndex。蛋阶段没有火，只有壳顶那缕烟 */
const FLAME_SCALE = [0, 0.6, 0.78, 0.92, 1.12, 1.35]

interface DragonFlameProps {
  stageIndex: number
  animated: boolean
}

/**
 * 渲染尾焰。stageIndex 为 0 时不渲染任何东西。
 *
 * 三层的动画周期取 1.15 / 0.88 / 0.68 秒，互不整除，
 * 叠加出来的跳动永不重复——同步的火看着像在闪灯。
 * 每层的 scaleX 与 scaleY 反相（窜高时收窄），这是真火的形变特征，
 * 等比缩放会像个在呼吸的气球。
 *
 * @param stageIndex - 形态序号，决定火焰倍率
 *
 * @example
 * <DragonFlame stageIndex={5} animated />  // 1.35 倍的满级火焰
 */
export function DragonFlame({ stageIndex, animated }: DragonFlameProps) {
  const scale = FLAME_SCALE[stageIndex] ?? 0
  if (scale === 0) return null

  const anim = (cls: string): string | undefined => (animated ? cls : undefined)

  return (
    <g transform={`translate(172 96) scale(${scale}) translate(-172 -96)`}>
      <g className={anim('drag-flame-o')}>
        <path
          d="M170,98 C160,90 159,74 168,62 C169,70 173,72 175,68
             C174,56 180,46 188,40 C185,52 191,60 192,72 C193,86 184,98 170,98 Z"
          fill="url(#dragFlameO)"
        />
      </g>
      <g className={anim('drag-flame-m')}>
        <path
          d="M171,94 C165,88 165,76 171,67 C172,73 175,74 177,71
             C176,62 180,54 185,49 C183,59 187,65 188,74 C188,85 181,94 171,94 Z"
          fill="url(#dragFlameM)"
        />
      </g>
      <g className={`d-mid ${anim('drag-flame-c') ?? ''}`}>
        <path
          d="M172,89 C168,84 169,75 173,69 C174,74 176,74 178,71
             C178,65 180,59 183,55 C182,63 184,67 184,74 C184,82 179,89 172,89 Z"
          fill="#FFEFA8"
        />
      </g>
      <circle className={`d-fine ${anim('drag-ember') ?? ''}`} cx="180" cy="58" r="2.4" fill="#FFC93C" />
      <circle className={`d-fine ${anim('drag-ember-2') ?? ''}`} cx="169" cy="50" r="1.7" fill="#FF9A2E" />
    </g>
  )
}
