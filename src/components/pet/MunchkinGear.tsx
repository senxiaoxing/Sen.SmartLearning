/**
 * @file 喵喵的配饰 —— 铃铛项圈、斜挎书包、星星帽，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/MunchkinArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * ## ⭐ 书包为什么是斜挎的，不是背在背上的
 *
 * 第一版画的是双肩包：包体藏在身体后面，只从两侧各鼓出一块，
 * 加上两条从肩膀垂到肚子的带子。真机上它读成了**一条背带裤**——
 * 一只趴得极低的猫，背后根本没有能露出来的地方，
 * 而「两块色块 + 两条竖带」正好是背带裤的全部特征。
 *
 * 改成斜挎：一条带子从右肩斜到左胯，包**整个挂在身体轮廓外面**，
 * 有翻盖、有搭扣、有侧缝。不依赖任何遮挡关系，一眼就是个包。
 *
 * ⚠️ 挂**左**边：右边是尾巴（x 148~195），挂右边会和尾巴叠在一起。
 *
 * 书包用主题蓝：本体现在是灰白，蓝色是整只身上唯一的大面积彩色，
 * 也顺手把「数学是蓝的」带上身。
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
    // 项圈后半圈：椭圆整个画出来，身体和头会盖掉中段，只在轮廓两侧留月牙
    if (!has('bell-collar')) return null
    return <ellipse cx="100" cy="146" rx="52" ry="12" fill="#B33223" />
  }

  return (
    <>
      {/* ⭐ 斜挎书包，整个挂在身体轮廓外面。
          带子先画、包后画：包要压住带子的下端，才像「带子吊着包」。

          ⚠️ 整段画在**项圈之后**（见下面的 bell-collar）。原先画在项圈之前，
          那条从右肩斜跨过来的长带子整条被项圈盖住，包就成了凭空摆在旁边的东西。
          带子也因此改短：只留从包口到项圈那一截——它要说明的只是「挂着」。 */}
      {has('satchel') && (
        <g>
          {/* 包体：上窄下宽的梯形，圆角 */}
          <path
            d="M12,178 C10,178 8,180 9,184 L16,214 C17,218 20,220 24,220
               L52,220 C56,220 59,218 60,214 L67,184 C68,180 66,178 64,178 Z"
            fill="url(#catBag)"
            stroke="#2F6FA8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* 翻盖 + 搭扣：这两样是「包」区别于「一块色块」的全部依据 */}
          <path
            d="M9,180 C8,176 10,172 14,171 L62,171 C66,172 68,176 67,180 L64,194
               C63,197 60,199 57,199 L19,199 C16,199 13,197 12,194 Z"
            fill="#2F6FA8"
            stroke="#255C8C"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="31" y="192" width="14" height="11" rx="3" fill="#FFD25E" stroke="#E8952A" strokeWidth="1.4" />
          {/* 侧缝：一条竖线就让平面的包有了厚度 */}
          <path
            className="d-mid"
            d="M22,203 L26,218"
            stroke="#2F6FA8"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity=".7"
          />
        </g>
      )}

      {/* 肩带：从包口伸到项圈那一截。
          画在书包之后、项圈之前——上端正好被项圈压住，
          读起来就是「带子绕过肩膀、掖在项圈下面」 */}
      {has('satchel') && (
        <path
          d="M30,174 C36,162 44,154 55,149"
          stroke="#3E8FD0"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
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
