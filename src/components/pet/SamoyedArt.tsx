/**
 * @file 小白 · 二年级语文萨摩耶的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/SamoyedGear.tsx 配饰层
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 三处不能动的特征：**颈毛的那圈蓬松**、**卷到背上的尾巴**、**咧开的笑嘴加粉舌头**。
 * 前两样撑起剪影（波波是一个光滑的球，小白是「球 ＋ 一圈毛 ＋ 一个卷」），
 * 最后一样是萨摩耶在所有狗里最被人记住的东西，也是整只身上唯一的暖色。
 *
 * ⚠️ 白毛偏**冷**（#E6E9F2），波波的白偏暖（#E7E4DA）。
 * 两只并排出现时，冷暖是唯一能把两片白分开的东西；
 * 而 cream 底本身是暖的，暖白贴上去会直接消失，必须描边。
 */

import { SamoyedGear } from '@/components/pet/SamoyedGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 左右眼的横向定位。瞳孔比眼白偏内 1px，两只眼因此微微朝中间看，显得更专注 */
const EYES = [
  { eye: 77, shine: 74, spark: 81, lid: 66 },
  { eye: 123, shine: 120, spark: 127, lid: 112 },
] as const

/** 颈毛下沿的一串弧。一条锯齿线就够说明「这是毛不是布」，不必真去画每一撮 */
const RUFF_EDGE = 'M42,142 q10,17 22,3 q10,17 22,3 q10,15 22,-1 q10,14 22,-5 q9,11 20,-11'

/**
 * 渲染萨摩耶。
 *
 * 尾巴摆得比另外几只都快（1.3 秒一个来回）——狗摇尾巴是它最强的身份线索，
 * 慢下来就成了别的动物在晃尾巴。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 * @param asleep - 睡眠态：闭眼、不戴配饰、呼吸放慢。⚠️ 不做灰度
 *
 * @example
 * <SamoyedArt stageIndex={4} accessories={new Set(['kerchief', 'brush'])} lod={3} animated asleep={false} />
 */
export function SamoyedArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
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
        <linearGradient id="samoFur" x1="60" y1="50" x2="120" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E1E5F0" />
        </linearGradient>
        <linearGradient id="samoHat" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0%" stopColor="#E0362A" />
          <stop offset="100%" stopColor="#A81C13" />
        </linearGradient>
        <radialGradient id="samoGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#D9C6FF" stopOpacity=".9" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="229" rx="60" ry="8" fill="#000" opacity=".09" />

      {gear.has('scholar-hat') && (
        <circle className={anim('petart-glow')} cx="100" cy="126" r="106" fill="url(#samoGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('samo-breathe')}>
        {isEgg ? (
          <g>
            <path
              d="M100,44 C67,44 51,82 51,124 C51,166 73,198 100,198 C127,198 149,166 149,124 C149,82 133,44 100,44 Z"
              fill="#FAFBFF"
              stroke="#CFD5E4"
              strokeWidth="2"
            />
            {/* 壳上先冒出一撮白毛，破壳那一下才不是从零开始 */}
            <path
              className="d-mid"
              d="M78,86 q9,-14 18,-2 q9,-13 17,0"
              stroke="#CFD5E4"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="82" cy="76" rx="15" ry="9" fill="#FFFFFF" opacity=".75" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 118) scale(.62) translate(-100 -112)' : undefined}>
              {/* 翘起来的大尾巴。粗描边在下、白在上，蓬松的层次全靠这两笔。
                  ⚠️ **路径不能绕回起点附近**：第一版让末端卷回了尾根，
                  两段粗描边一合拢就围出一个洞，整条尾巴读成了挂在身后的甜甜圈。
                  末端停在向内收的半途，「正在卷」比「卷完了」更像尾巴。 */}
              <g className={anim('samo-tail')}>
                <path
                  d="M150,168 C174,164 184,140 179,116 C175,100 164,92 152,96"
                  stroke="#CFD5E4"
                  strokeWidth="26"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M150,168 C174,164 184,140 179,116 C175,100 164,92 152,96"
                  stroke="url(#samoFur)"
                  strokeWidth="22"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* 两道毛纹。尾巴和身体是同一种白，光靠外轮廓线分不开——
                    没有它，这一卷会被看成从背后鼓出来的第二个身子 */}
                <path
                  className="d-mid"
                  d="M164,163 C170,152 172,140 170,128 M176,150 C179,140 179,130 177,122"
                  stroke="#CFD5E4"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>

              <SamoyedGear layer="under" accessories={gear} animated={live} />

              <ellipse cx="46" cy="212" rx="16" ry="13" fill="#E1E5F0" />
              <ellipse cx="154" cy="212" rx="16" ry="13" fill="#E1E5F0" />

              <path
                d="M100,130 C66,130 40,150 40,180 C40,208 64,224 100,224
                   C136,224 160,208 160,180 C160,150 134,130 100,130 Z"
                fill="url(#samoFur)"
                stroke="#CFD5E4"
                strokeWidth="1.8"
              />
              <ellipse cx="74" cy="220" rx="19" ry="11" fill="#FFFFFF" stroke="#CFD5E4" strokeWidth="1.6" />
              <ellipse cx="126" cy="220" rx="19" ry="11" fill="#FFFFFF" stroke="#CFD5E4" strokeWidth="1.6" />

              {/* 颈毛：一块实心 + 一串下沿弧。萨摩耶的招牌就在这一圈 */}
              <ellipse cx="100" cy="138" rx="60" ry="26" fill="url(#samoFur)" stroke="#CFD5E4" strokeWidth="1.6" />
              <path
                className="d-mid"
                d={RUFF_EDGE}
                stroke="#CFD5E4"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />

              {/* 脸颊两撮毛画在头之前，只露外侧半圈 */}
              <circle cx="50" cy="112" r="17" fill="#FFFFFF" stroke="#CFD5E4" strokeWidth="1.6" />
              <circle cx="150" cy="112" r="17" fill="#FFFFFF" stroke="#CFD5E4" strokeWidth="1.6" />

              <path d="M58,74 C50,52 48,32 55,28 C63,24 82,40 90,52 Z" fill="#F2F4FA" stroke="#CFD5E4" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M142,74 C150,52 152,32 145,28 C137,24 118,40 110,52 Z" fill="#F2F4FA" stroke="#CFD5E4" strokeWidth="1.6" strokeLinejoin="round" />
              <path className="d-mid" d="M64,68 C58,52 58,40 62,38 C68,38 79,48 84,56 Z" fill="#F0B7B0" />
              <path className="d-mid" d="M136,68 C142,52 142,40 138,38 C132,38 121,48 116,56 Z" fill="#F0B7B0" />

              <path
                d="M100,44 C70,44 50,64 50,92 C50,120 70,140 100,140
                   C130,140 150,120 150,92 C150,64 130,44 100,44 Z"
                fill="url(#samoFur)"
                stroke="#CFD5E4"
                strokeWidth="1.8"
              />

              {/* 两只眼睛结构相同，只差横向位置。眼睑分开写——合并的话
                  transform-origin 会取两者的整体中心，闭眼就成了从中间往两边收 */}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <ellipse cx={e.eye} cy="92" rx="9" ry="10.5" fill="#23262E" />
                  <circle className="d-mid" cx={e.shine} cy="87" r="3.2" fill="#FFF" />
                  <circle className="d-fine" cx={e.spark} cy="96" r="1.7" fill="#FFF" opacity=".7" />
                  {/* ⭐ 眼睑必须填**脸自己的**那份渐变，不能拿个近似的纯色顶替：
                      合上时它就是一块贴在脸上的方形，颜色差一点点都会露出边。
                      samoFur 是 userSpaceOnUse，这里和脸取的是同一段色。 */}
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="78"
                    width="22"
                    height="24"
                    fill="url(#samoFur)"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <path
                d="M88,106 C88,101 112,101 112,106 C112,114 106,120 100,120 C94,120 88,114 88,106 Z"
                fill="#23262E"
              />
              {/* 咧开的笑嘴：两端收得比中间高，「笑」全在这个高低差上 */}
              <path
                d="M100,120 L100,127 M100,127 C94,138 82,135 76,124 M100,127 C106,138 118,135 124,124"
                stroke="#23262E"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
              />
              <g className={anim('samo-tongue')}>
                <path
                  d="M91,130 C91,126 109,126 109,130 C109,141 105,148 100,148 C95,148 91,141 91,130 Z"
                  fill="#F58A9B"
                />
                <path className="d-fine" d="M100,133 L100,144" stroke="#DB6A7C" strokeWidth="1.8" strokeLinecap="round" />
              </g>

              <SamoyedGear layer="over" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M51,130 C51,170 73,200 100,200 C127,200 149,170 149,130 L136,143 L124,126
                   L112,141 L100,122 L88,141 L76,126 L64,143 Z"
                fill="#FAFBFF"
                stroke="#CFD5E4"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="154" y="56" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="154" y="56" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="154" y="56" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
