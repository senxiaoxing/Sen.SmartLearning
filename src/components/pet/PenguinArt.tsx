/**
 * @file 团团 · 数学小企鹅的形象 —— 六个形态共用一套部件，按形态显隐
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/pet/PenguinGear.tsx 配饰层
 * @see design/06-宠物系统.md §6 形象方向
 *
 * 造型基准是《马达加斯加的企鹅》，三处关键轮廓不能动：
 * **头顶扁平的宽弧**、**下宽的倒梯形身体**、**往前伸的大脚蹼**。
 * 这三样是一眼认出它的依据，改圆了就成了普通卡通企鹅。
 *
 * 眼睛刻意用小黑点（无眼白），与墨墨的大眼白圆瞳、波波的黑眼圈区分开——
 * 三只在主页会并排出现，认错科目比不好看严重得多。
 */

import { PenguinGear } from '@/components/pet/PenguinGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/**
 * 渲染企鹅。
 *
 * @param stageIndex - 0 蛋 / 1 破壳 / 2–5 完整体
 * @param accessories - 配饰 kind 集合，见 data/seed/pets.ts
 * @param asleep - 睡眠态：闭眼、不戴配饰、呼吸放慢。⚠️ 不做灰度
 *
 * @example
 * <PenguinArt stageIndex={4} accessories={new Set(['scarf', 'cape'])} lod={3} animated asleep={false} />
 */
export function PenguinArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
  const isEgg = stageIndex === 0
  const isHatch = stageIndex === 1
  const gear = asleep ? new Set<string>() : accessories
  /** 清醒时才播的动画 */
  const anim = (cls: string): string | undefined => (animated && !asleep ? cls : undefined)
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
        {/* 多个实例同屏时 id 会重复，浏览器取第一个。同一只的多个实例定义完全相同，
            复用第一份无视觉差异；三只之间用前缀区分 */}
        <linearGradient id="pengBody" x1="0" y1="0" x2=".2" y2="1">
          <stop offset="0%" stopColor="#63A9E8" />
          <stop offset="100%" stopColor="#21395F" />
        </linearGradient>
        <linearGradient id="pengBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F2E9D6" />
        </linearGradient>
        <linearGradient id="pengBeak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFCB6B" />
          <stop offset="100%" stopColor="#EE9418" />
        </linearGradient>
        <linearGradient id="pengCape" x1="0" y1="0" x2=".15" y2="1">
          <stop offset="0%" stopColor="#E0362A" />
          <stop offset="100%" stopColor="#A81C13" />
        </linearGradient>
        <radialGradient id="pengGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFD98A" stopOpacity=".9" />
          <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="229" rx="64" ry="8" fill="#000" opacity=".09" />

      {gear.has('crown') && (
        <circle className={anim('petart-glow')} cx="100" cy="116" r="103" fill="url(#pengGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('peng-breathe')}>
        {isEgg ? (
          <g>
            <path
              d="M100,42 C66,42 50,80 50,122 C50,164 72,196 100,196 C128,196 150,164 150,122 C150,80 134,42 100,42 Z"
              fill="#F7E7C4"
              stroke="#E0CB9E"
              strokeWidth="2"
            />
            <ellipse className="d-mid" cx="79" cy="97" rx="9" ry="7" fill="#E8CE9B" opacity=".75" />
            <ellipse className="d-mid" cx="117" cy="133" rx="11" ry="8" fill="#E8CE9B" opacity=".6" />
            <ellipse cx="81" cy="74" rx="15" ry="9" fill="#FFFDF7" opacity=".55" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 112) scale(.62) translate(-100 -104)' : undefined}>
              <PenguinGear layer="under" accessories={gear} animated={animated && !asleep} />

              {/* 鳍状肢长在肩上（y≈94），藏在身体后只露外缘。
                  画在身体前面会像两片贴在肚子上的贴纸 */}
              <g className={anim('peng-flip-l')}>
                <path
                  d="M40,94 C25,102 17,126 20,148 C22,161 36,163 41,152 C36,132 39,108 40,94 Z"
                  fill="#3878BE"
                />
              </g>
              <g className={anim('peng-flip-r')}>
                <path
                  d="M160,94 C175,102 183,126 180,148 C178,161 164,163 159,152 C164,132 161,108 160,94 Z"
                  fill="#3878BE"
                />
              </g>

              {/* 脚蹼：从身体底下往前伸，单只宽 55px。原版的站姿全靠它 */}
              <path
                d="M76,199 C60,199 42,206 37,213 C33,219 39,224 50,224 C65,224 84,220 88,214 C91,209 87,201 76,199 Z"
                fill="#F7AE3A"
              />
              <path
                d="M124,199 C140,199 158,206 163,213 C167,219 161,224 150,224 C135,224 116,220 112,214 C109,209 113,201 124,199 Z"
                fill="#F7AE3A"
              />
              <path
                className="d-mid"
                d="M50,223 L52,211 M68,222 L68,208 M150,223 L148,211 M132,222 L132,208"
                stroke="#C97709"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity=".45"
              />

              {/* 身体：头顶扁平的宽弧 → 两侧外张 → 底部宽而平。宽高比 ≈0.80 */}
              <path
                d="M100,28 C76,28 58,38 50,60 C40,88 30,130 30,158 C30,182 44,198 68,201
                   C80,203 120,203 132,201 C156,198 170,182 170,158 C170,130 160,88 150,60
                   C142,38 124,28 100,28 Z"
                fill="url(#pengBody)"
              />

              {/* 白区上边缘是近水平的宽弧，看着像扣了顶深色帽子 */}
              <path
                d="M100,60 C78,60 62,66 56,78 C46,104 40,140 41,166 C42,184 54,196 70,198
                   C82,200 118,200 130,198 C146,196 158,184 159,166 C160,140 154,104 144,78
                   C138,66 122,60 100,60 Z"
                fill="url(#pengBelly)"
              />

              <ellipse className="d-mid" cx="66" cy="100" rx="9" ry="5.5" fill="#FF7A6B" opacity=".22" />
              <ellipse className="d-mid" cx="134" cy="100" rx="9" ry="5.5" fill="#FF7A6B" opacity=".22" />

              <ellipse cx="87" cy="82" rx="7.5" ry="8.5" fill="#17202F" />
              <circle className="d-mid" cx="84.5" cy="78" r="2.7" fill="#FFF" />
              <rect
                className="petart-lid"
                x="77"
                y="69"
                width="21"
                height="24"
                fill="#FDFBF4"
                transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
              />

              <ellipse cx="113" cy="82" rx="7.5" ry="8.5" fill="#17202F" />
              <circle className="d-mid" cx="110.5" cy="78" r="2.7" fill="#FFF" />
              <rect
                className="petart-lid"
                x="102"
                y="69"
                width="21"
                height="24"
                fill="#FDFBF4"
                transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
              />

              <path
                d="M100,92 C90,92 84,97 82,102 C81,108 89,114 100,114 C111,114 119,108 118,102 C116,97 110,92 100,92 Z"
                fill="url(#pengBeak)"
              />
              <path
                className="d-mid"
                d="M83,103 C90,107 110,107 117,103"
                stroke="#C97709"
                strokeWidth="1.9"
                fill="none"
                strokeLinecap="round"
                opacity=".55"
              />

              <PenguinGear layer="over" accessories={gear} animated={animated && !asleep} />
            </g>

            {isHatch && (
              <path
                d="M50,130 C50,170 73,200 100,200 C127,200 150,170 150,130 L137,143 L125,126
                   L112,141 L100,122 L88,141 L75,126 L63,143 Z"
                fill="#F7E7C4"
                stroke="#E0CB9E"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="150" y="66" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="150" y="66" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="150" y="66" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
