/**
 * @file 喵喵 · 二年级数学矮脚猫的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/MunchkinGear.tsx 配饰层
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 曼基康的全部识别点是**腿极短**：身体几乎贴着地，四只爪子只露出一截。
 * 因此剪影做成「大圆头 ＋ 横躺的长身」，宽高比 ≈1.55——
 * 团团是倒梯形、墨墨是上下两球、波波是一个圆，四种剪影互不相认。
 *
 * 眼睛用**绿虹膜 + 竖瞳**，是前三只都没用过的第四种方案。
 * 瞳孔刻意留成圆角竖椭圆而不是细缝：细缝在 48px 下会消失，
 * 放大了又显凶——它要像只猫，不能像只警惕的猫。
 */

import { MunchkinGear } from '@/components/pet/MunchkinGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 左右眼的横向定位。瞳孔比眼白偏内 1px，两只眼因此微微朝中间看，显得更专注 */
const EYES = [
  { white: 77, iris: 78, shine: 73.5, lid: 64 },
  { white: 123, iris: 122, shine: 118.5, lid: 110 },
] as const

/** 猫脸上的胡须。左右各三根，只在最大尺寸下画——48px 时它们只会糊成脏点 */
const WHISKERS =
  'M64,129 L28,121 M64,135 L26,135 M64,141 L29,150 M136,129 L172,121 M136,135 L174,135 M136,141 L171,150'

/**
 * 渲染矮脚猫。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 * @param asleep - 睡眠态：闭眼、不戴配饰、呼吸放慢。⚠️ 不做灰度
 *
 * @example
 * <MunchkinArt stageIndex={5} accessories={new Set(['bell-collar', 'satchel', 'star-hat'])} lod={3} animated asleep={false} />
 */
export function MunchkinArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
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
        {/* ⚠️ 必须 userSpaceOnUse：头、身体、眼睑是三个各自独立的元素，
            默认的 objectBoundingBox 会让它们各算各的渐变，
            合眼时那块眼睑就成了脸上两块颜色对不上的方补丁 */}
        <linearGradient id="catFur" x1="46" y1="40" x2="130" y2="225" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F7B876" />
          <stop offset="100%" stopColor="#E08434" />
        </linearGradient>
        <linearGradient id="catCream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBF2" />
          <stop offset="100%" stopColor="#F4E4CB" />
        </linearGradient>
        <linearGradient id="catIris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FD98A" />
          <stop offset="100%" stopColor="#4E9C57" />
        </linearGradient>
        <linearGradient id="catBag" x1="0" y1="0" x2=".2" y2="1">
          <stop offset="0%" stopColor="#63B3F2" />
          <stop offset="100%" stopColor="#2F6FA8" />
        </linearGradient>
        <linearGradient id="catHat" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0%" stopColor="#7CC2F7" />
          <stop offset="100%" stopColor="#3E8FD0" />
        </linearGradient>
        <radialGradient id="catBell" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#FFEFB0" />
          <stop offset="100%" stopColor="#F0B429" />
        </radialGradient>
        <radialGradient id="catGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFD98A" stopOpacity=".9" />
          <stop offset="100%" stopColor="#F5A65B" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="230" rx="66" ry="8" fill="#000" opacity=".09" />

      {gear.has('star-hat') && (
        <circle className={anim('petart-glow')} cx="100" cy="130" r="106" fill="url(#catGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('cat-breathe')}>
        {isEgg ? (
          <g>
            <path
              d="M100,44 C67,44 51,82 51,124 C51,166 73,198 100,198 C127,198 149,166 149,124 C149,82 133,44 100,44 Z"
              fill="#FBF0DC"
              stroke="#DFCBA6"
              strokeWidth="2"
            />
            {/* 橘色斑点先把毛色透露出来，破壳那一下才不是从零开始 */}
            <ellipse className="d-mid" cx="78" cy="102" rx="12" ry="9" fill="#F0AC64" opacity=".7" />
            <ellipse className="d-mid" cx="118" cy="140" rx="14" ry="10" fill="#F0AC64" opacity=".55" />
            <ellipse cx="82" cy="76" rx="15" ry="9" fill="#FFFDF7" opacity=".6" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 118) scale(.62) translate(-100 -112)' : undefined}>
              {/* 尾巴竖起来向右弯——猫立着尾巴是「心情好」，这只伙伴永远是这个状态 */}
              <g className={anim('cat-tail')}>
                <path
                  d="M148,190 C178,186 192,154 185,126 C181,108 173,98 167,93"
                  stroke="#E8934A"
                  strokeWidth="21"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* ⚠️ 尾尖不做白色。粗描边加圆头，再短的一截白也是个圆球，
                    整条尾巴就成了举起来的一根棒棒糖。
                    换成三道环纹——虎斑猫的尾巴本来就有，也和额头那个「M」是一套 */}
                <path
                  className="d-mid"
                  d="M168,181 L168,195 M181,155 L195,153 M174,116 L188,119"
                  stroke="#C96B22"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity=".4"
                />
              </g>

              <MunchkinGear layer="under" accessories={gear} animated={live} />

              {/* 后爪只露一点，前爪整只落在身体外——这个差别就是「趴得低」 */}
              <ellipse cx="40" cy="212" rx="17" ry="13" fill="#D9772C" />
              <ellipse cx="160" cy="212" rx="17" ry="13" fill="#D9772C" />

              {/* 身体：横躺的长圆，宽 136 × 高 86。腿短到几乎看不见，全靠它贴地 */}
              <path
                d="M100,136 C58,136 32,152 32,180 C32,206 58,222 100,222
                   C142,222 168,206 168,180 C168,152 142,136 100,136 Z"
                fill="url(#catFur)"
              />
              <ellipse cx="100" cy="198" rx="44" ry="21" fill="url(#catCream)" />
              <path
                className="d-fine"
                d="M62,158 C70,164 74,172 75,180 M100,150 C108,158 111,168 111,177"
                stroke="#C96B22"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity=".38"
              />

              {/* 前爪：白袜子。落在身体轮廓之外才看得出是「伸出来的」 */}
              <ellipse cx="70" cy="220" rx="20" ry="12" fill="url(#catCream)" />
              <ellipse cx="130" cy="220" rx="20" ry="12" fill="url(#catCream)" />
              <path
                className="d-fine"
                d="M64,222 L64,214 M76,222 L76,214 M124,222 L124,214 M136,222 L136,214"
                stroke="#D8C3A2"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* 耳朵画在头之前，只露出头顶两侧探出来的两个尖 */}
              <path d="M52,80 L38,24 L90,52 Z" fill="#E8934A" strokeLinejoin="round" />
              <path d="M148,80 L162,24 L110,52 Z" fill="#E8934A" strokeLinejoin="round" />
              <path className="d-mid" d="M59,70 L49,38 L81,54 Z" fill="#F7A8A0" />
              <path className="d-mid" d="M141,70 L151,38 L119,54 Z" fill="#F7A8A0" />

              <path
                d="M100,46 C68,46 46,70 46,102 C46,132 68,152 100,152
                   C132,152 154,132 154,102 C154,70 132,46 100,46 Z"
                fill="url(#catFur)"
              />
              {/* 额头三道深纹是虎斑猫的「M」，认得出的人会心一笑 */}
              <path
                className="d-mid"
                d="M86,58 L82,72 M100,54 L100,70 M114,58 L118,72"
                stroke="#C96B22"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity=".45"
              />
              {/* ⚠️ 口鼻白斑的上缘（y=114）必须压在眼睑下缘（y=110）之下。
                  它俩原本重叠，睡着时方形的眼睑会啃掉白斑两个角，
                  中间剩一条露出来——脸上凭空多出一个白方块 */}
              <ellipse cx="100" cy="131" rx="31" ry="17" fill="url(#catCream)" />
              <ellipse className="d-mid" cx="62" cy="127" rx="10" ry="6" fill="#FF7A6B" opacity=".24" />
              <ellipse className="d-mid" cx="138" cy="127" rx="10" ry="6" fill="#FF7A6B" opacity=".24" />

              {/* 两只眼睛结构相同，只差横向位置。眼睑分开写——合并的话
                  transform-origin 会取两者的整体中心，闭眼就成了从中间往两边收 */}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <ellipse cx={e.white} cy="96" rx="12.5" ry="14" fill="#FFFFFF" />
                  <ellipse cx={e.iris} cy="97" rx="10" ry="12" fill="url(#catIris)" />
                  <ellipse cx={e.iris} cy="97" rx="4.4" ry="9.2" fill="#17202F" />
                  <circle className="d-mid" cx={e.shine} cy="91" r="3.2" fill="#FFF" />
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="80"
                    width="27"
                    height="30"
                    fill="url(#catFur)"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <path d="M93,121 L107,121 L100,131 Z" fill="#F0837A" strokeLinejoin="round" />
              <path
                d="M100,131 L100,136 M100,136 C96,143 88,143 85,138 M100,136 C104,143 112,143 115,138"
                stroke="#8A5230"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                className="d-fine"
                d={WHISKERS}
                stroke="#C9A882"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity=".65"
              />

              <MunchkinGear layer="over" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M51,130 C51,170 73,200 100,200 C127,200 149,170 149,130 L136,143 L124,126
                   L112,141 L100,122 L88,141 L76,126 L64,143 Z"
                fill="#FBF0DC"
                stroke="#DFCBA6"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="154" y="58" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="154" y="58" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="154" y="58" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
