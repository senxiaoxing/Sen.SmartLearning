/**
 * @file 墨墨 · 语文小飞龙的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/DragonEgg.tsx 蛋（壳顶冒烟）
 * @see src/components/pet/DragonFlame.tsx 尾焰（核心符号）
 * @see src/components/pet/DragonGear.tsx 翅膀 / 尖角 / 眼镜
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 造型参考小火龙 / 喷火龙。核心符号是尾焰，蛋阶段先从壳顶裂缝冒一缕烟作预告——
 * 一条从烟到火的完整线索。
 *
 * 眼睛用大眼白 + 圆瞳，与团团的小黑点刻意相反：三只在主页并排出现，
 * 认错科目比不好看严重得多。
 *
 * ⚠️ 形象走绿，但 `themeColor` 是紫。绿色 `#5FD3A6` 是波波的主题色，
 * 进度条要是也变绿两只就撞了。形象色与 UI 主题色刻意分离。
 */

import { DragonEgg } from '@/components/pet/DragonEgg'
import { DragonFlame } from '@/components/pet/DragonFlame'
import { DragonGear } from '@/components/pet/DragonGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 左右眼的横向定位。瞳孔比眼白偏内 2px，两只眼因此微微朝中间看，显得更专注 */
const EYES = [
  { white: 74, iris: 76, shine: 73, lid: 59 },
  { white: 118, iris: 116, shine: 113, lid: 103 },
] as const

/**
 * 渲染小飞龙。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体，同时决定尾焰大小
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 *
 * @example
 * <DragonArt stageIndex={5} accessories={new Set(['glasses', 'wings-big', 'horns'])} lod={3} animated asleep={false} />
 */
export function DragonArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
  const isEgg = stageIndex === 0
  const isHatch = stageIndex === 1
  const gear = asleep ? new Set<string>() : accessories
  const live = animated && !asleep
  /** 清醒时才播的动画 */
  const anim = (cls: string): string | undefined => (live ? cls : undefined)
  /** 睡着也要播的（慢呼吸、飘 z），只受 animated 控制 */
  const on = (cls: string): string | undefined => (animated ? cls : undefined)

  return (
    <svg
      viewBox="0 0 200 240"
      className={`petart-anim lod${lod}`}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="dragHead" x1="60" y1="30" x2="88" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#83D871" />
          <stop offset="100%" stopColor="#5BB94E" />
        </linearGradient>
        <linearGradient id="dragBody" x1="56" y1="104" x2="84" y2="206" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5BB94E" />
          <stop offset="100%" stopColor="#3B8437" />
        </linearGradient>
        <linearGradient id="dragBelly" x1="0" y1="118" x2="0" y2="182" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F2EDCC" />
          <stop offset="100%" stopColor="#DED5A2" />
        </linearGradient>
        <linearGradient id="dragFlameO" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#FF9A2E" />
        </linearGradient>
        <linearGradient id="dragFlameM" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFA523" />
          <stop offset="100%" stopColor="#FFD457" />
        </linearGradient>
        <radialGradient id="dragGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#B6F0A0" stopOpacity=".9" />
          <stop offset="100%" stopColor="#5BB94E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 阴影留在地上并反向收窄。跟着一起浮的话「浮起来」就只是整体放大 */}
      <ellipse className={anim('drag-shadow')} cx="96" cy="224" rx="52" ry="8" fill="#000" opacity=".1" />

      {gear.has('horns') && (
        <circle className={anim('petart-glow')} cx="96" cy="120" r="104" fill="url(#dragGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('drag-float')}>
        {isEgg ? (
          <DragonEgg animated={live} />
        ) : (
          <>
            <g transform={isHatch ? 'translate(96 112) scale(.64) translate(-96 -100)' : undefined}>
              <DragonGear layer="wings" accessories={gear} animated={live} />

              {/* 尾巴：根粗尖细，向右上翘，末端接火焰 */}
              <path
                d="M122,146 C144,144 162,132 170,114 C174,104 177,96 176,90 L164,93
                   C165,100 163,108 157,118 C148,134 134,148 124,170 Z"
                fill="url(#dragBody)"
              />

              <DragonFlame stageIndex={stageIndex} animated={live} />

              {/* 左右腿合成一个 path 的两段子路径——它们是同一块材质，拆成两个元素没有意义 */}
              <path
                d="M78,176 C67,178 59,188 59,196 C59,203 68,207 80,206 C91,205 96,199 94,191 C90,181 86,175 78,176 Z
                   M114,176 C125,178 133,188 133,196 C133,203 124,207 112,206 C101,205 96,199 98,191 C102,181 106,175 114,176 Z"
                fill="url(#dragBody)"
              />
              <path
                className="d-mid"
                d="M65,205 L64,197 M77,207 L77,198 M127,205 L128,197 M115,207 L115,198"
                stroke="#F7F2DE"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              <path
                d="M64,126 C54,130 47,140 48,149 C49,155 57,156 61,150 C59,141 62,132 64,126 Z
                   M128,126 C138,130 145,140 144,149 C143,155 135,156 131,150 C133,141 130,132 128,126 Z"
                fill="url(#dragBody)"
              />
              <path
                className="d-fine"
                d="M47,150 L42,156 M52,154 L49,161 M57,156 L56,163
                   M145,150 L150,156 M140,154 L143,161 M135,156 L136,163"
                stroke="#F7F2DE"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              <path
                d="M96,104 C74,104 58,122 56,146 C54,170 68,188 96,188 C124,188 138,170 136,146 C134,122 118,104 96,104 Z"
                fill="url(#dragBody)"
              />
              <path
                d="M96,118 C82,118 72,132 71,150 C70,168 80,182 96,182 C112,182 122,168 121,150 C120,132 110,118 96,118 Z"
                fill="url(#dragBelly)"
              />
              <path
                className="d-fine"
                d="M77,138 C84,142 108,142 115,138 M74,152 C82,157 110,157 118,152 M76,166 C84,171 108,171 116,166"
                stroke="#DED5A2"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />

              <DragonGear layer="horns" accessories={gear} animated={live} />

              <path
                d="M96,30 C72,30 52,47 50,72 C48,95 68,114 96,114 C124,114 144,95 142,72 C140,47 120,30 96,30 Z"
                fill="url(#dragHead)"
              />

              {/* 向前突出的钝吻，浅色 */}
              <ellipse cx="96" cy="94" rx="27" ry="17" fill="url(#dragBelly)" />
              <g className="d-mid" fill="#3B8437" opacity=".55">
                <ellipse cx="88" cy="87" rx="2.6" ry="3.2" />
                <ellipse cx="104" cy="87" rx="2.6" ry="3.2" />
              </g>
              <path
                className="d-mid"
                d="M84,99 C90,105 102,105 108,99"
                stroke="#3B8437"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
                opacity=".6"
              />

              {/* 两只眼睛结构相同，只差横向位置。眼睑要各自成元素——
                  合并的话 transform-origin 会取整体中心，闭眼变成从中间往两边收 */}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <ellipse cx={e.white} cy="68" rx="14" ry="15" fill="#FFFFFF" />
                  <ellipse cx={e.iris} cy="69" rx="7.5" ry="9" fill="#26361F" />
                  <circle className="d-mid" cx={e.shine} cy="64.5" r="3.4" fill="#FFF" />
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="51"
                    width="30"
                    height="34"
                    fill="url(#dragHead)"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <DragonGear layer="glasses" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M48,130 C48,170 70,200 96,200 C122,200 144,170 144,130 L132,143 L120,126
                   L108,141 L96,122 L84,141 L72,126 L60,143 Z"
                fill="#EAF0C8"
                stroke="#CFDCA2"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="146" y="60" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="146" y="60" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="146" y="60" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
