/**
 * @file 团团的配饰 —— 围巾、红披风、皇冠，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/PenguinArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 围巾之所以拆成两半，是因为「绕过脖子」这件事只能靠遮挡表达：
 * 后半圈是一整个椭圆，但画在身体之前，身体随后盖掉它中段，
 * 只在轮廓两侧留下两道月牙。整圈都画出来就只是贴了个环。
 *
 * ## ⭐ 围巾的高度与宽度都是贴着身体定的
 *
 * 它必须落在**喙底（y≈114）稍下方**，也就是脖子的位置。
 * 掉到肩膀（鳍状肢根部 y≈94）以下就成了系在肚子上，看着像掉下来了。
 *
 * 两端也只能比身体轮廓宽出一两个像素——那一点点正好接上后圈露出的月牙，
 * 「绕了一圈」才成立。探得再多就变成一个悬在半空、没挨着身体的环
 * （2026-09-10 上机反馈：「像在肩膀下面而且悬空着」）。
 */

import type { PetGearProps } from '@/components/pet/petArtProps'

/**
 * 渲染企鹅的配饰层。
 *
 * @param layer - `under` 出披风与围巾后圈，`over` 出围巾前圈与皇冠
 *
 * @example
 * <PenguinGear layer="under" accessories={new Set(['scarf', 'cape'])} animated />
 */
export function PenguinGear({ layer, accessories, animated }: PetGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'under') {
    return (
      <>
        {has('cape') && (
          <g>
            <g className={anim('peng-cape-back')}>
              <path
                d="M54,90 C24,104 12,148 8,188 Q4,202 9,214 Q26,222 43,211 Q60,201 77,212
                   Q94,222 111,211 Q128,201 145,212 Q162,222 179,211 Q196,202 192,188
                   C188,148 176,104 146,90 Z"
                fill="#8E1810"
              />
            </g>
            <g className={anim('peng-cape-front')}>
              <path
                d="M58,94 C30,110 18,150 15,186 Q12,198 17,208 Q32,215 47,205 Q62,197 77,206
                   Q92,215 107,205 Q122,197 137,206 Q152,215 167,205 Q183,198 185,186
                   C182,150 170,110 142,94 Z"
                fill="url(#pengCape)"
              />
            </g>
          </g>
        )}

        {/* 围巾后半圈。椭圆心比前圈高近 30px——环的后半在透视上本来就更高，
            而且只有抬到这个位置，月牙才会落在鳍状肢最窄的那一小段上露出来；
            压低一点就被整片鳍完全盖住，等于白画 */}
        {has('scarf') && (
          <g>
            <ellipse cx="100" cy="104" rx="70" ry="18" fill="#B33223" />
            <ellipse cx="100" cy="100" rx="70" ry="14" fill="#CC4030" />
          </g>
        )}
      </>
    )
  }

  return (
    <>
      {/* 围巾前半圈：起落于 y=104（喙底下方一点），两端 x=35/165 —— 身体在这个高度上
          的轮廓正好是 37/163，只比它宽两像素。这两像素就是接上后圈月牙的那一截 */}
      {has('scarf') && (
        <g>
          <path
            d="M35,104 C50,130 150,130 165,104 L165,122 C150,148 50,148 35,122 Z"
            fill="#FF7A6B"
          />
          <path
            className="d-mid"
            d="M38,106 C52,130 148,130 162,106"
            stroke="#FFA294"
            strokeWidth="2.5"
            fill="none"
            opacity=".55"
          />
          <path
            className="d-fine"
            d="M48,117 L46,134 M66,127 L64,144 M83,132 L82,149 M100,134 L100,151
               M117,132 L118,149 M134,127 L136,144 M152,117 L154,134"
            stroke="#DE4F3C"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".42"
          />
          <g className={anim('peng-tail')}>
            <path
              d="M124,130 C132,137 142,135 148,128 L154,160 C148,169 135,171 128,164 Z"
              fill="#EE5945"
            />
            <path
              className="d-mid"
              d="M133,166 L131,176 M141,168 L141,178 M149,165 L151,175"
              stroke="#EE5945"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}

      {has('crown') && (
        <g>
          <path
            d="M66,40 L66,16 L83,28 L100,6 L117,28 L134,16 L134,40 Z"
            fill="#FFB84D"
            stroke="#E8952A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="64" y="35" width="72" height="9" rx="4.5" fill="#E8952A" />
          <circle className="d-mid" cx="100" cy="8" r="4.5" fill="#FF7A6B" />
        </g>
      )}
    </>
  )
}
