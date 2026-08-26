/**
 * @file 小白的配饰 —— 红领巾、背着的毛笔、状元帽，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/SamoyedArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 毛笔像背剑一样斜挎在左肩，笔杆下段画在身体**之前**（under）由身体盖住，
 * 只留肩上那一截和笔头露在外面。整支都画出来就成了贴在身上的一根棍子。
 *
 * 这三件里毛笔是辨识度最高的一件：领巾和帽子谁都能戴，
 * 「背着一支笔」只有它——升到那一级时孩子不用比对细节就知道多了什么。
 */

import type { PetGearProps } from '@/components/pet/petArtProps'

/**
 * 渲染萨摩耶的配饰层。
 *
 * @param layer - `under` 出毛笔与领巾后圈，`over` 出领巾前圈与垂角、状元帽
 *
 * @example
 * <SamoyedGear layer="under" accessories={new Set(['kerchief', 'brush'])} animated />
 */
export function SamoyedGear({ layer, accessories, animated }: PetGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'under') {
    return (
      <>
        {has('brush') && (
          <g>
            <path
              d="M62,208 L22,110"
              stroke="#C89B6A"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              className="d-mid"
              d="M52,184 L44,187 M42,160 L34,163"
              stroke="#9C7442"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* 笔箍：竹杆与笔头之间那圈铜，少了它两截会读成一根棍子 */}
            <path d="M29,124 L14,130" stroke="#E0B357" strokeWidth="8" strokeLinecap="round" />
            {/* 笔头：⚠️ 得是**饱满的锥**，不能是细长的尖三角——
                后者加上黑色就是一把匕首，第一版正是那个样子。
                肚子鼓、尖头钝、颜色偏褐，才读得出是一撮毛 */}
            <path
              d="M25,127 C12,120 3,102 8,86 C11,77 18,76 20,84 C23,97 30,114 34,121 Z"
              fill="#4A4038"
            />
            <path
              className="d-mid"
              d="M14,110 C12,100 12,92 15,86 M21,116 C19,105 19,96 21,90"
              stroke="#6E6157"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              opacity=".8"
            />
          </g>
        )}

        {/* 领巾后半圈：整个椭圆画出来，颈毛与头会盖掉中段，只在轮廓两侧留月牙 */}
        {has('kerchief') && <ellipse cx="100" cy="138" rx="54" ry="12" fill="#B33223" />}
      </>
    )
  }

  return (
    <>
      {has('kerchief') && (
        <g>
          <path
            d="M48,140 C62,158 138,158 152,140 L152,152 C138,170 62,170 48,152 Z"
            fill="#E0362A"
          />
          {/* 垂在胸前的三角。⚠️ 别画大：第一版垂到肚子正中，
              整只狗先被看成一块红布，脸反而成了配角 */}
          <path
            d="M80,158 L120,158 L100,192 Z"
            fill="#CC4030"
            strokeLinejoin="round"
          />
          <path
            className="d-mid"
            d="M88,170 C94,175 106,175 112,170"
            stroke="#FF8A7A"
            strokeWidth="2.2"
            fill="none"
            opacity=".55"
          />
        </g>
      )}

      {has('scholar-hat') && (
        <g>
          {/* 两侧的帽翅是「状元」二字的全部视觉来源。
              ⚠️ 短了只是顶红礼帽，紧贴帽身又会连成一圈宽帽檐——
              必须**离开帽身平伸出去**，中间那道缝是「翅」不是「檐」的关键 */}
          <ellipse cx="34" cy="52" rx="22" ry="5" fill="#8E1810" />
          <ellipse cx="166" cy="52" rx="22" ry="5" fill="#8E1810" />
          <path
            d="M66,50 C66,26 78,12 100,12 C122,12 134,26 134,50 Z"
            fill="url(#samoHat)"
            stroke="#8E1810"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <rect x="61" y="44" width="78" height="11" rx="5.5" fill="#8E1810" />
          <circle className={anim('samo-badge')} cx="100" cy="31" r="8.5" fill="#FFD25E" stroke="#E8952A" strokeWidth="1.6" />
        </g>
      )}
    </>
  )
}
