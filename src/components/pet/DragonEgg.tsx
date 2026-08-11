/**
 * @file 墨墨的蛋 —— 壳顶裂了道缝，一缕烟正飘出来
 * @layer components  纯渲染
 * @see src/components/pet/DragonArt.tsx 主体
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 单独成文件是因为它有另外两只的蛋没有的机制：冒烟。
 * 蛋阶段还没有火焰可看，这缕烟是「里面是只火龙」唯一的预告，
 * 也是「烟 → 破壳点火 → 满级大火」这条线索的起点。
 */

interface DragonEggProps {
  animated: boolean
}

/**
 * 渲染龙蛋。
 *
 * 三团烟错开 0.93s 依次升起，走两条相反的飘散路径——
 * 直线上升看着像水汽，左右摆开才像烟。
 * 壳顶那道裂缝是烟的出口，没有它烟就成了凭空冒的。
 *
 * @example
 * <DragonEgg animated />
 */
export function DragonEgg({ animated }: DragonEggProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)

  return (
    <g>
      <path
        d="M96,44 C64,44 48,82 48,124 C48,166 70,198 96,198 C122,198 144,166 144,124 C144,82 128,44 96,44 Z"
        fill="#EAF0C8"
        stroke="#CFDCA2"
        strokeWidth="2"
      />
      {/* 壳上这两道波浪纹读起来像火焰纹，和顶上的烟是一套暗示 */}
      <path
        className="d-mid"
        d="M74,104 C80,96 86,104 92,96 C98,88 104,96 110,88"
        stroke="#C4D492"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity=".8"
      />
      <ellipse cx="79" cy="78" rx="14" ry="9" fill="#FBFDF0" opacity=".6" />

      {/* ⚠️ 裂缝必须和烟同为 d-mid。裂缝降级成 d-fine 的话，
          小尺寸下会出现「烟还在冒但没有出口」——正是这里最要避免的样子 */}
      <path
        className="d-mid"
        d="M103,50 L107,45 L111,49 L115,44 L119,48"
        stroke="#BCCB86"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g className="d-mid">
        <circle className={anim('drag-puff drag-puff-a')} cx="111" cy="44" r="4.5" fill="#CFC3A6" />
        <circle className={anim('drag-puff drag-puff-b')} cx="111" cy="44" r="4" fill="#D8C9AB" />
        <circle className={anim('drag-puff drag-puff-c')} cx="111" cy="44" r="4.2" fill="#C9BEA2" />
      </g>
    </g>
  )
}
