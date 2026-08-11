/**
 * @file 墨墨的配饰 —— 翅膀、尖角、眼镜，按图层分三次调用
 * @layer components  纯渲染
 * @see src/components/pet/DragonArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 成长线借「小火龙 → 喷火龙」的进化叙事：Lv7 戴眼镜、Lv9 长小翅膀、
 * Lv11 换大翅膀加尖角。**形体本身在变**，比只往身上堆挂件的成长感强得多。
 *
 * 这里不用共用的 `PetGearProps`：龙的三样东西落在三个不同图层，
 * 两层的 `under | over` 表达不了——角必须压在头下面，眼镜必须盖在头上面。
 */

/**
 * 图层。顺序即绘制顺序：
 * `wings` 在身体之后 → `horns` 在头之前（根部被头压住）→ `glasses` 在脸之后。
 */
export type DragonGearLayer = 'wings' | 'horns' | 'glasses'

interface DragonGearProps {
  layer: DragonGearLayer
  accessories: ReadonlySet<string>
  animated: boolean
}

/**
 * 渲染小飞龙的某一层配饰。
 *
 * `horns` 层始终有输出：没戴尖角时画幼态的两个小凸起，
 * 那是形体的一部分而非配饰。
 *
 * @example
 * <DragonGear layer="wings" accessories={new Set(['wings-big'])} animated />
 */
export function DragonGear({ layer, accessories, animated }: DragonGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'horns') {
    return has('horns') ? (
      <g fill="#F7F2DE" stroke="#DED5A2" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M78,36 L60,8 L86,28 Z" />
        <path d="M114,36 L132,8 L106,28 Z" />
      </g>
    ) : (
      <g fill="#F7F2DE">
        <path d="M80,34 L75,21 L88,30 Z" />
        <path d="M112,34 L117,21 L104,30 Z" />
      </g>
    )
  }

  if (layer === 'glasses') {
    if (!has('glasses')) return null
    return (
      <g fill="none" stroke="#5C4A2E" strokeWidth="3">
        <circle cx="74" cy="68" r="16" />
        <circle cx="118" cy="68" r="16" />
        <path d="M90,66 C94,63 98,63 102,66" />
        <path className="d-mid" d="M58,64 C52,62 48,64 46,68" />
        <path className="d-mid" d="M134,64 C140,62 144,64 146,68" />
      </g>
    )
  }

  if (has('wings-big')) {
    return (
      <g>
        <g className={anim('drag-wing-l')}>
          <path
            d="M64,114 C42,94 14,94 4,110 C18,114 28,126 33,142 C42,130 54,120 64,118 Z"
            fill="#74CC84"
            stroke="#3B8437"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            className="d-mid"
            d="M34,140 C38,128 48,119 62,116 M18,110 C26,120 30,130 33,141"
            stroke="#3B8437"
            strokeWidth="1.8"
            fill="none"
            opacity=".45"
          />
        </g>
        <g className={anim('drag-wing-r')}>
          <path
            d="M128,114 C150,94 178,94 188,110 C174,114 164,126 159,142 C150,130 138,120 128,118 Z"
            fill="#74CC84"
            stroke="#3B8437"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            className="d-mid"
            d="M158,140 C154,128 144,119 130,116 M174,110 C166,120 162,130 159,141"
            stroke="#3B8437"
            strokeWidth="1.8"
            fill="none"
            opacity=".45"
          />
        </g>
      </g>
    )
  }

  if (has('wings-small')) {
    return (
      <g>
        <g className={anim('drag-wing-l')}>
          <path
            d="M64,116 C48,104 30,104 22,114 C32,118 39,126 42,136 C48,128 56,120 64,120 Z"
            fill="#74CC84"
            stroke="#3B8437"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        <g className={anim('drag-wing-r')}>
          <path
            d="M128,116 C144,104 162,104 170,114 C160,118 153,126 150,136 C144,128 136,120 128,120 Z"
            fill="#74CC84"
            stroke="#3B8437"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      </g>
    )
  }

  return null
}
