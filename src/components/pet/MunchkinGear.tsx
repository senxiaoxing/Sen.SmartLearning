/**
 * @file 喵喵的配饰 —— 铃铛项圈、小书包、星星帽，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/MunchkinArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 书包的读法全靠遮挡：包体画在身体**之前**（under），身体随后盖掉中段，
 * 只在两侧留下鼓出来的边；背带画在身体**之后**（over），从肩上跨到胸前。
 * 少了任何一半，它都会退回成一块贴在肚子上的色块。
 *
 * 书包用主题蓝而不是猫身上的橘：本体是暖色，
 * 冷色的包才跳得出来，也顺手把「数学是蓝的」带上身。
 */

import type { PetGearProps } from '@/components/pet/petArtProps'

/**
 * 渲染矮脚猫的配饰层。
 *
 * @param layer - `under` 出书包本体与项圈后圈，`over` 出背带、项圈前圈与铃铛、星星帽
 *
 * @example
 * <MunchkinGear layer="over" accessories={new Set(['bell-collar', 'satchel'])} animated />
 */
export function MunchkinGear({ layer, accessories, animated }: PetGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'under') {
    return (
      <>
        {has('satchel') && (
          <g>
            {/* 两侧各鼓出一块，中段交给身体遮住。
                ⚠️ 上窄下宽 + 一条翻盖线 + 一颗扣子，三样缺一样就读成背带裤了——
                第一版只画了两块方色块，孩子看到的是「穿了条蓝裤子」 */}
            <path
              d="M46,152 C24,160 16,186 26,206 C34,220 54,222 64,214 L64,156 Z"
              fill="url(#catBag)"
            />
            <path
              d="M154,152 C176,160 184,186 174,206 C166,220 146,222 136,214 L136,156 Z"
              fill="url(#catBag)"
            />
            {/* 翻盖：包身上那道横向的分界，是「这是个包」最直接的提示 */}
            <path
              d="M40,168 C30,172 24,180 22,188 L64,188 L64,164 Z M160,168 C170,172 176,180 178,188 L136,188 L136,164 Z"
              fill="#2F6FA8"
            />
            <circle cx="34" cy="190" r="4.5" fill="#FFD25E" />
            <circle cx="166" cy="190" r="4.5" fill="#FFD25E" />
          </g>
        )}

        {/* 项圈后半圈：椭圆整个画出来，身体和头会盖掉中段，只在轮廓两侧留月牙 */}
        {has('bell-collar') && <ellipse cx="100" cy="146" rx="52" ry="12" fill="#B33223" />}
      </>
    )
  }

  return (
    <>
      {/* 背带从肩上跨到胸前，正好接上包体露出的两块。
          ⚠️ 收在胸口就够了——垂到肚子底下，两条带子加两侧的包
          会一起读成一条背带裤 */}
      {has('satchel') && (
        <g stroke="#3E8FD0" strokeWidth="9" strokeLinecap="round" fill="none">
          <path d="M74,150 C69,164 67,176 68,186" />
          <path d="M126,150 C131,164 133,176 132,186" />
        </g>
      )}

      {has('bell-collar') && (
        <g>
          {/* 前半圈两端探到轮廓之外，接上后圈的月牙，「绕了一圈」才成立 */}
          <path
            d="M50,148 C64,164 136,164 150,148 L150,160 C136,176 64,176 50,160 Z"
            fill="#E0362A"
          />
          <path
            className="d-mid"
            d="M53,150 C67,164 133,164 147,150"
            stroke="#FF8A7A"
            strokeWidth="2.6"
            fill="none"
            opacity=".6"
          />
          {/* 铃铛：整只猫身上唯一会反光的东西，也是她一眼看见的那一下变化 */}
          <g className={anim('cat-bell')}>
            <circle cx="100" cy="176" r="12.5" fill="url(#catBell)" stroke="#C98A12" strokeWidth="1.6" />
            <path
              d="M91,174 L109,174"
              stroke="#C98A12"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity=".7"
            />
            <path d="M100,176 L100,186" stroke="#C98A12" strokeWidth="2.4" strokeLinecap="round" />
            <circle className="d-mid" cx="95.5" cy="171" r="3" fill="#FFF8DC" opacity=".85" />
          </g>
        </g>
      )}

      {has('star-hat') && (
        <g>
          <path
            d="M100,16 L127,58 L73,58 Z"
            fill="url(#catHat)"
            stroke="#2F6FA8"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="66" y="53" width="68" height="11" rx="5.5" fill="#2F6FA8" />
          {/* 星星戴在帽尖上，「星星喵王」这个形态名说的就是它 */}
          <path
            d="M100,2 L104.4,11.6 L114.8,12.8 L107.1,20 L109.2,30.4 L100,25.2
               L90.8,30.4 L92.9,20 L85.2,12.8 L95.6,11.6 Z"
            fill="#FFD25E"
            stroke="#E8952A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
      )}
    </>
  )
}
