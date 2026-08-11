/**
 * @file 团团的配饰 —— 围巾、红披风、皇冠，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/PenguinArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 围巾之所以拆成两半，是因为「绕过脖子」这件事只能靠遮挡表达：
 * 后半圈是一整个椭圆，但画在身体之前，身体随后盖掉它中段，
 * 只在轮廓两侧留下两道月牙。整圈都画出来就只是贴了个环。
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

        {/* 围巾后半圈。椭圆心比前圈高 12px——环的后半在透视上本来就更高 */}
        {has('scarf') && (
          <g>
            <ellipse cx="100" cy="120" rx="80" ry="19" fill="#B33223" />
            <ellipse cx="100" cy="116" rx="80" ry="15" fill="#CC4030" />
          </g>
        )}
      </>
    )
  }

  return (
    <>
      {/* 围巾前半圈：两端探到身体轮廓之外，正好接上后圈露出的月牙。
          接不上，「绕了一圈」就不成立 */}
      {has('scarf') && (
        <g>
          <path
            d="M22,120 C38,146 162,146 178,120 L178,138 C162,164 38,164 22,138 Z"
            fill="#FF7A6B"
          />
          <path
            className="d-mid"
            d="M25,122 C41,146 159,146 175,122"
            stroke="#FFA294"
            strokeWidth="2.5"
            fill="none"
            opacity=".55"
          />
          <path
            className="d-fine"
            d="M38,133 L35,150 M59,143 L57,160 M80,148 L79,165 M100,150 L100,167
               M120,148 L121,165 M141,143 L143,160 M162,133 L165,150"
            stroke="#DE4F3C"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".42"
          />
          <g className={anim('peng-tail')}>
            <path
              d="M124,146 C132,153 142,151 148,144 L154,176 C148,185 135,187 128,180 Z"
              fill="#EE5945"
            />
            <path
              className="d-mid"
              d="M133,182 L131,192 M141,184 L141,194 M149,181 L151,191"
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
