/**
 * @file 波波 · 英语小熊猫的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/PandaBamboo.tsx 竹子（核心符号）
 * @see src/components/pet/PandaGear.tsx 斗篷 / 墨镜 / 学士帽
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 体型是**一个球**（宽 156 × 高 136，比高还宽），头身完全不分——
 * 与团团的倒梯形、墨墨的头身两球构成三种剪影。
 *
 * 眼睛的主角不是眼睛，是那两块斜黑斑：前两只已经用掉小黑点和大眼白，
 * 熊猫自己给出了第三种方案。
 *
 * ⚠️ 本体黑白，主题色 mint 只从斗篷和竹子上身。
 */

import { PandaBamboo } from '@/components/pet/PandaBamboo'
import { PandaGear } from '@/components/pet/PandaGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 左右眼的横向定位。瞳孔比眼白偏内 1px，两只眼因此微微朝中间看，显得更专注 */
const EYES = [
  { white: 75, iris: 76, shine: 73.5, lid: 65 },
  { white: 125, iris: 124, shine: 121.5, lid: 115 },
] as const

/**
 * 渲染小熊猫。
 *
 * 待机是左右轻摇 + 咀嚼，不用呼吸也不用浮动：圆的东西的物理直觉是不稳，
 * 摇摆这个动作本身就在说「我是圆的」。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体，同时决定竹子大小
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 *
 * @example
 * <PandaArt stageIndex={4} accessories={new Set(['sunglasses', 'cloak'])} lod={3} animated asleep={false} />
 */
export function PandaArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
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
        {/* 白毛偏冷一档。cream 底是暖的，暖白贴上去会直接消失 */}
        <linearGradient id="pandFur" x1="60" y1="72" x2="110" y2="208" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E7E4DA" />
        </linearGradient>
        <linearGradient id="pandBlack" x1="0" y1="90" x2="30" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#26282D" />
          <stop offset="100%" stopColor="#16181C" />
        </linearGradient>
        <linearGradient id="pandCloak" x1="0" y1="110" x2="30" y2="216" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5FD3A6" />
          <stop offset="100%" stopColor="#3FAE83" />
        </linearGradient>
        <linearGradient id="pandBamboo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7FB069" />
          <stop offset="100%" stopColor="#5E8F4C" />
        </linearGradient>
        <radialGradient id="pandGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#A8F0D0" stopOpacity=".9" />
          <stop offset="100%" stopColor="#5FD3A6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 重心左右挪，阴影跟着走一点点 */}
      <ellipse className={anim('pand-shadow')} cx="100" cy="226" rx="58" ry="8" fill="#000" opacity=".1" />

      {gear.has('cap') && (
        <circle className={anim('petart-glow')} cx="100" cy="140" r="106" fill="url(#pandGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('pand-sway')}>
        {isEgg ? (
          <g>
            <path
              d="M100,48 C68,48 52,86 52,128 C52,170 74,202 100,202 C126,202 148,170 148,128 C148,86 132,48 100,48 Z"
              fill="#F1EFE7"
              stroke="#C9C3B4"
              strokeWidth="2"
            />
            {/* 这块斜黑斑就是熊猫的眼斑。不动不响，认得出的人会心一笑 */}
            <ellipse
              cx="80"
              cy="120"
              rx="17"
              ry="13"
              fill="#26282D"
              opacity=".88"
              transform="rotate(-24 80 120)"
            />
            <ellipse cx="84" cy="80" rx="14" ry="9" fill="#FFFFFF" opacity=".7" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 120) scale(.62) translate(-100 -110)' : undefined}>
              <PandaGear layer="under" accessories={gear} animated={live} />

              {/* 耳朵画在身体之前，只露头顶两侧的上半圆 */}
              <circle cx="50" cy="76" r="23" fill="url(#pandBlack)" />
              <circle cx="150" cy="76" r="23" fill="url(#pandBlack)" />

              <PandaBamboo stageIndex={stageIndex} animated={live} />

              {/* 身体：一个球，宽 156 × 高 136。
                  描边是必需的——白毛在 cream 底上没有轮廓就糊成一团 */}
              <path
                d="M100,72 C60,72 24,98 22,140 C20,178 46,208 100,208 C154,208 180,178 178,140
                   C176,98 140,72 100,72 Z"
                fill="url(#pandFur)"
                stroke="#D6D0C1"
                strokeWidth="1.6"
              />

              <ellipse cx="66" cy="208" rx="25" ry="14" fill="url(#pandBlack)" />
              <ellipse cx="134" cy="208" rx="25" ry="14" fill="url(#pandBlack)" />
              <path
                className="d-fine"
                d="M56,214 L56,206 M68,216 L68,207 M144,214 L144,206 M132,216 L132,207"
                stroke="#4A4D55"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity=".55"
              />

              {/* 肩带与双臂是一整片黑：熊猫的前肢和肩膀本来就连成一条，
                  拆成三块画反而不像 */}
              <path
                d="M28,176 C34,164 56,156 100,156 C144,156 166,164 172,176
                   C176,190 175,204 170,212 C164,220 146,220 141,211
                   C138,200 138,188 139,180 C124,175 112,174 100,174
                   C88,174 76,175 61,180 C62,188 62,200 59,211
                   C54,220 36,220 30,212 C25,204 24,190 28,176 Z"
                fill="url(#pandBlack)"
              />

              {/* 黑眼圈：斜的，外角向下。整只熊猫最好认的东西 */}
              <ellipse cx="70" cy="110" rx="26" ry="21" fill="url(#pandBlack)" transform="rotate(-21 70 110)" />
              <ellipse cx="130" cy="110" rx="26" ry="21" fill="url(#pandBlack)" transform="rotate(21 130 110)" />

              {/* 两只眼睛结构相同，只差横向位置。眼睑要分开写——
                  合并成一个元素的话 transform-origin 会取两者的整体中心，
                  闭眼就变成从中间往两边收，而不是从上往下盖 */}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <ellipse cx={e.white} cy="104" rx="8.5" ry="9.5" fill="#FFFFFF" />
                  <ellipse cx={e.iris} cy="105" rx="5.2" ry="6.2" fill="#1D1F23" />
                  <circle className="d-mid" cx={e.shine} cy="101" r="2.3" fill="#FFF" />
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="93"
                    width="20"
                    height="22"
                    fill="#26282D"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <path
                d="M100,138 C92,138 86,142 86,146 C86,151 93,155 100,155 C107,155 114,151 114,146 C114,142 108,138 100,138 Z"
                fill="#1D1F23"
              />

              <g className={`d-mid ${anim('pand-chew') ?? ''}`}>
                <path d="M100,155 L100,163" stroke="#1D1F23" strokeWidth="2.4" strokeLinecap="round" />
                <path
                  d="M100,163 C94,171 84,171 79,165"
                  stroke="#1D1F23"
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M100,163 C106,171 116,171 121,165"
                  stroke="#1D1F23"
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>

              <PandaGear layer="over" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M52,134 C52,174 74,204 100,204 C126,204 148,174 148,134 L136,147 L124,130
                   L112,145 L100,126 L88,145 L76,130 L64,147 Z"
                fill="#F1EFE7"
                stroke="#C9C3B4"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="152" y="62" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="152" y="62" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="152" y="62" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
