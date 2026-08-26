/**
 * @file 咩咩 · 二年级英语小绵羊的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/SheepGear.tsx 配饰层
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 剪影是**一团带凸起的云**，不是圆也不是梯形——这是四只之外的第五种轮廓。
 * 羊毛由九个圆叠成：先画一遍放大 3px 的深色，再原样画一遍浅色，
 * 两层叠出来就是一条跟着每个凸起走的外轮廓线。
 * 手写一条带十几个弧的闭合路径也能做到，但改一个凸起就要重算前后两段控制点。
 *
 * ⚠️ 羊毛的渐变必须 `gradientUnits="userSpaceOnUse"`：
 * 默认的 objectBoundingBox 会让每个圆各自算一遍渐变，
 * 九个圆的接缝处就会出现九道深浅不一的边。
 *
 * ⭐ 全 App 第三只白色伙伴（波波暖白、小白冷白）。
 * 把它分出来的不是白，是**那张棕色的脸**——先看到脸再看到毛。
 */

import { SheepGear } from '@/components/pet/SheepGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 羊毛的九个圆：外圈八个撑轮廓，中心一个填满。改凸起只改这里 */
const WOOL = [
  { cx: 100, cy: 110, r: 26 },
  { cx: 67, cy: 123, r: 25 },
  { cx: 133, cy: 123, r: 25 },
  { cx: 54, cy: 156, r: 26 },
  { cx: 146, cy: 156, r: 26 },
  { cx: 67, cy: 189, r: 25 },
  { cx: 133, cy: 189, r: 25 },
  { cx: 100, cy: 156, r: 46 },
] as const

/** 额前的三撮刘海。压在脸上方，是「毛从头顶盖下来」的全部来源 */
const BANGS = [
  { cx: 84, cy: 122, r: 15 },
  { cx: 100, cy: 114, r: 16 },
  { cx: 116, cy: 122, r: 15 },
] as const

/** 左右眼的横向定位。瞳孔比眼白偏内 1px，两只眼因此微微朝中间看，显得更专注 */
const EYES = [
  { eye: 84, shine: 81, lid: 74 },
  { eye: 116, shine: 113, lid: 106 },
] as const

/**
 * 渲染小绵羊。
 *
 * 待机是整体上下轻浮 + 左右磨嘴：磨嘴是反刍，与波波上下咬的 `pand-chew`
 * 是两个方向，同屏也不会看成同一个动作。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 * @param asleep - 睡眠态：闭眼、不戴配饰、呼吸放慢。⚠️ 不做灰度
 *
 * @example
 * <SheepArt stageIndex={5} accessories={new Set(['specs', 'cloud-cape', 'flower-crown'])} lod={3} animated asleep={false} />
 */
export function SheepArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
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
        <linearGradient id="sheepWool" x1="54" y1="84" x2="130" y2="214" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="100%" stopColor="#EDE3CE" />
        </linearGradient>
        <linearGradient id="sheepFace" x1="70" y1="115" x2="120" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C69C77" />
          <stop offset="100%" stopColor="#96724F" />
        </linearGradient>
        <linearGradient id="sheepCape" x1="20" y1="150" x2="60" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5FD3A6" />
          <stop offset="100%" stopColor="#3FAE83" />
        </linearGradient>
        <radialGradient id="sheepGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#A8F0D0" stopOpacity=".9" />
          <stop offset="100%" stopColor="#5FD3A6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="230" rx="58" ry="8" fill="#000" opacity=".09" />

      {gear.has('flower-crown') && (
        <circle className={anim('petart-glow')} cx="100" cy="150" r="108" fill="url(#sheepGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('sheep-bob')}>
        {isEgg ? (
          <g>
            <path
              d="M100,44 C67,44 51,82 51,124 C51,166 73,198 100,198 C127,198 149,166 149,124 C149,82 133,44 100,44 Z"
              fill="#FBF6E9"
              stroke="#DDD3C0"
              strokeWidth="2"
            />
            {/* 壳顶先冒出三个小卷，破壳那一下才不是从零开始 */}
            <g className="d-mid" fill="#EFE6D2" stroke="#DDD3C0" strokeWidth="1.6">
              <circle cx="86" cy="86" r="9" />
              <circle cx="100" cy="80" r="10" />
              <circle cx="114" cy="86" r="9" />
            </g>
            <ellipse cx="82" cy="72" rx="14" ry="8" fill="#FFFDF7" opacity=".6" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 120) scale(.62) translate(-100 -112)' : undefined}>
              <SheepGear layer="under" accessories={gear} animated={live} />

              {/* 细腿是这团毛唯一的支点。画粗一点就成了另一种动物 */}
              <g stroke="#8C6B4F" strokeWidth="10" strokeLinecap="round">
                <path d="M62,188 L58,214" />
                <path d="M138,188 L142,214" />
              </g>
              <g stroke="#A5825F" strokeWidth="11" strokeLinecap="round">
                <path d="M80,192 L76,224" />
                <path d="M120,192 L124,224" />
              </g>

              {/* 羊毛：先深后浅两遍，浅的那遍盖住深的，只在外缘留一圈 3px 的边 */}
              {WOOL.map((w) => (
                <circle key={`o${w.cx}-${w.cy}`} cx={w.cx} cy={w.cy} r={w.r + 3} fill="#DDD3C0" />
              ))}
              {WOOL.map((w) => (
                <circle key={`f${w.cx}-${w.cy}`} cx={w.cx} cy={w.cy} r={w.r} fill="url(#sheepWool)" />
              ))}

              {/* 耳朵向两侧平伸，画在脸之前，只露外半截。
                  ⚠️ 摆动的类挂在外层 <g> 上，静态的 rotate 留在 ellipse 上——
                  CSS 动画的 transform 会整个覆盖元素自己的 transform 属性，
                  两者写在同一个元素上，耳朵一动起来就会「啪」地摆平 */}
              <g className={anim('sheep-ear-l')}>
                <ellipse cx="56" cy="146" rx="21" ry="10" fill="#A5825F" transform="rotate(16 56 146)" />
              </g>
              <g className={anim('sheep-ear-r')}>
                <ellipse cx="144" cy="146" rx="21" ry="10" fill="#A5825F" transform="rotate(-16 144 146)" />
              </g>

              <ellipse cx="100" cy="152" rx="32" ry="38" fill="url(#sheepFace)" />

              {BANGS.map((b) => (
                <circle key={`bo${b.cx}`} cx={b.cx} cy={b.cy} r={b.r + 3} fill="#DDD3C0" />
              ))}
              {BANGS.map((b) => (
                <circle key={`bf${b.cx}`} cx={b.cx} cy={b.cy} r={b.r} fill="url(#sheepWool)" />
              ))}

              {/* 两只眼睛结构相同，只差横向位置。眼睑分开写——合并的话
                  transform-origin 会取两者的整体中心，闭眼就成了从中间往两边收 */}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <circle cx={e.eye} cy="150" r="8.5" fill="#2A211B" />
                  <circle className="d-mid" cx={e.shine} cy="146" r="3" fill="#FFF" />
                  {/* ⭐ 眼睑填**脸自己的**那份渐变，不能拿个近似的纯色顶替：
                      合上时它就是一块贴在脸上的方形，颜色差一点点都会露出边，
                      两只连起来看着像戴了个眼罩 */}
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="139"
                    width="21"
                    height="22"
                    fill="url(#sheepFace)"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <ellipse className="d-mid" cx="72" cy="166" rx="9" ry="5.5" fill="#FF7A6B" opacity=".26" />
              <ellipse className="d-mid" cx="128" cy="166" rx="9" ry="5.5" fill="#FF7A6B" opacity=".26" />

              <g className={anim('sheep-chew')}>
                <ellipse cx="100" cy="176" rx="19" ry="13" fill="#D8B491" />
                <path
                  d="M93,170 C93,167 107,167 107,170 C107,175 104,179 100,179 C96,179 93,175 93,170 Z"
                  fill="#5B4636"
                />
                <path
                  d="M100,179 L100,183 M100,183 C97,188 91,188 89,184 M100,183 C103,188 109,188 111,184"
                  stroke="#5B4636"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>

              <SheepGear layer="over" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M51,130 C51,170 73,200 100,200 C127,200 149,170 149,130 L136,143 L124,126
                   L112,141 L100,122 L88,141 L76,126 L64,143 Z"
                fill="#FBF6E9"
                stroke="#DDD3C0"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="156" y="64" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="156" y="64" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="156" y="64" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
