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
        {/* ⭐ 毛笔。三段各有各的必需特征，少一段就不是毛笔：
              竹杆   浅褐 ＋ 两道竹节 ＋ 杆尾的挂绳环
              笔箍   一圈金铜，是「杆」与「毛」的分界
              笔头   **肚子鼓、尖出锋**的一撮毛，占全长约三分之一

            第一版是细长的黑色尖三角——那是一把匕首。
            第二版把锥形改饱满了，但整支太小、笔头只占一小截，真机上仍看不出来。
            现在整支放大约 1.3 倍，笔头单独加长，并且**杆比笔头细**——
            毛笔与铅笔的差别就在这个粗细反差上。 */}
        {has('brush') && (
          <g>
            <path d="M70,214 L30,120" stroke="#D2A972" strokeWidth="11" strokeLinecap="round" />
            {/* 竹节：两道深色环。没有它，杆就是一根塑料棍 */}
            <path
              className="d-mid"
              d="M58,188 L47,192 M47,162 L36,166"
              stroke="#9C7442"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {/* 挂绳环：毛笔特有的那个小圈，挂在杆尾 */}
            <circle
              className="d-fine"
              cx="73"
              cy="219"
              r="4.5"
              fill="none"
              stroke="#D2A972"
              strokeWidth="2.4"
            />
            {/* 笔箍。比杆粗，「毛从这里长出来」才立得住 */}
            <path d="M32,124 L24,105" stroke="#E0B357" strokeWidth="15" strokeLinecap="butt" />
            <path
              className="d-fine"
              d="M28,116 L21,99"
              stroke="#F4D89A"
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".85"
            />
            {/* 笔头：出笔箍口先鼓一下，再收成一个尖锋 */}
            <path
              d="M17,108 C4,92 1,72 7,54 C19,66 29,86 32,101 Z"
              fill="#3F3730"
            />
            <path
              className="d-mid"
              d="M13,95 C9,82 10,70 13,60 M22,99 C19,87 19,77 21,68"
              stroke="#6B5F54"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              opacity=".85"
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
