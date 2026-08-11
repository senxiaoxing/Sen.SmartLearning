/**
 * @file 波波的配饰 —— 薄荷斗篷、墨镜、学士帽，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/PandaArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 墨镜与熊猫天生的黑眼圈是一对——戴上真墨镜等于把天生特征升了一级。
 * 斗篷用 mint，正是波波的 `themeColor`：本体黑白，全靠这件把主题色带上身。
 */

import type { PetGearProps } from '@/components/pet/petArtProps'

/**
 * 渲染小熊猫的配饰层。
 *
 * @param layer - `under` 出斗篷（在身体之后），`over` 出墨镜与学士帽
 *
 * @example
 * <PandaGear layer="over" accessories={new Set(['sunglasses', 'cap'])} animated />
 */
export function PandaGear({ layer, accessories, animated }: PetGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'under') {
    if (!has('cloak')) return null
    return (
      <g className={anim('pand-cloak')}>
        {/* 垂在背后的兜帽。不扣头上——会盖住耳朵，还跟学士帽抢 head 槽位 */}
        <ellipse cx="100" cy="118" rx="94" ry="58" fill="url(#pandCloak)" />
        <path
          d="M42,124 C22,152 10,192 8,218 Q32,226 62,219 Q100,228 138,219 Q168,226 192,218
             C190,192 178,152 158,124 Z"
          fill="url(#pandCloak)"
        />
        <path
          className="d-mid"
          d="M20,196 C22,178 28,158 38,142 M180,196 C178,178 172,158 162,142"
          stroke="#2F8F6A"
          strokeWidth="2"
          fill="none"
          opacity=".4"
        />
      </g>
    )
  }

  return (
    <>
      {/* 墨镜刻意下滑，眼睛从上沿露出来——眨眼保得住，还多了偷看的憨态。
          镜片比眼斑亮一档，否则两块黑会糊成一团 */}
      {has('sunglasses') && (
        <g>
          <ellipse cx="70" cy="122" rx="23" ry="13.5" fill="#303D4C" />
          <ellipse cx="130" cy="122" rx="23" ry="13.5" fill="#303D4C" />
          <path
            className="d-mid"
            d="M54,116 C60,111 68,110 74,112 L64,124 C58,124 54,121 54,116 Z"
            fill="#FFF"
            opacity=".3"
          />
          <path
            className="d-mid"
            d="M114,116 C120,111 128,110 134,112 L124,124 C118,124 114,121 114,116 Z"
            fill="#FFF"
            opacity=".3"
          />
          <g fill="none" stroke="#D4A94A" strokeWidth="2.6">
            <path d="M93,120 C96,117 104,117 107,120" />
            <path className="d-mid" d="M47,120 C42,118 38,120 36,124" />
            <path className="d-mid" d="M153,120 C158,118 162,120 164,124" />
          </g>
        </g>
      )}

      {/* 学士帽抬高一点，让圆耳朵还能从两侧露出来——耳朵是关键识别 */}
      {has('cap') && (
        <g>
          <path d="M78,46 C78,38 122,38 122,46 L122,58 C122,64 78,64 78,58 Z" fill="#2E3440" />
          <path
            d="M100,28 L160,45 L100,62 L40,45 Z"
            fill="#3A4150"
            stroke="#232833"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            className="d-mid"
            d="M158,46 L162,72"
            stroke="#D4A94A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle className="d-mid" cx="163" cy="76" r="4.5" fill="#D4A94A" />
        </g>
      )}
    </>
  )
}
