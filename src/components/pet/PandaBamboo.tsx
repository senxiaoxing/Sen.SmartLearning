/**
 * @file 波波的竹子 —— 随等级长大，轻轻摇晃
 * @layer components  纯渲染
 * @see src/components/pet/PandaArt.tsx 主体
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 这是小熊猫的**核心符号**，独立成文件与配饰区分开：
 * 它不占配饰槽位（`neck` 因此空着），是本体的一部分，
 * 随等级从 0.7 倍长到 1.25 倍——跟墨墨的尾焰同一个待遇。
 */

/** 竹子倍率，索引对应 stageIndex。蛋与破壳阶段还拿不动竹子 */
const BAMBOO_SCALE = [0, 0, 0.7, 0.85, 1, 1.25]

interface PandaBambooProps {
  stageIndex: number
  animated: boolean
}

/**
 * 渲染手里的竹枝。前两个形态不渲染任何东西。
 *
 * 摇晃周期 2.4s，与身体的 2.8s 错开——同步的话整只会像一块硬板在晃。
 *
 * @param stageIndex - 形态序号，决定竹子倍率
 *
 * @example
 * <PandaBamboo stageIndex={5} animated />  // 1.25 倍的满级竹枝
 */
export function PandaBamboo({ stageIndex, animated }: PandaBambooProps) {
  const scale = BAMBOO_SCALE[stageIndex] ?? 0
  if (scale === 0) return null

  return (
    <g transform={`translate(163 192) scale(${scale}) translate(-163 -192)`}>
      <g className={animated ? 'pand-bamboo' : undefined}>
        <path
          d="M163,192 C168,160 172,128 174,98"
          stroke="url(#pandBamboo)"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        <path
          className="d-mid"
          d="M166,168 L171,167 M169,140 L174,139 M171,116 L176,115"
          stroke="#5E8F4C"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity=".7"
        />
        <path d="M174,98 C167,88 165,74 172,64 C179,74 181,88 174,98 Z" fill="#7FB069" />
        <path d="M174,100 C183,92 192,88 196,93 C190,101 182,105 174,100 Z" fill="#5E8F4C" />
        <path d="M174,102 C165,97 156,96 152,101 C159,107 168,108 174,102 Z" fill="#7FB069" />
      </g>
    </g>
  )
}
