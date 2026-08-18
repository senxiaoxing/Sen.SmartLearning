/**
 * @file 宠物零食的图形 —— 小饼干、水果篮、大蛋糕
 * @layer components  纯渲染，无业务逻辑
 * @see src/data/seed/shopItems.ts  `TREAT_ITEMS[].art` 即这里的键
 *
 * ⚠️ 与家具**不共用坐标系**：家具画在房间的 400×300 里、有固定位置，
 * 而零食买完就吃掉，从不摆进屋里，所以各自在 100×100 的小画布里居中画。
 *
 * ⚠️ 三样都是**三只通吃**的东西，不是小鱼干/竹叶这类专属食物——
 * 专属食物会诱导「今天喂谁」，那是在给三只排序（见 shopItems.ts）。
 */

/** 零食的图形名 */
export type TreatArtName = 'cookie' | 'fruit' | 'cake'

interface TreatArtProps {
  art: TreatArtName
}

/**
 * 渲染一样零食。画布是 `viewBox="0 0 100 100"`。
 *
 * @example
 * <svg viewBox="0 0 100 100"><TreatArt art="cake" /></svg>
 */
export function TreatArt({ art }: TreatArtProps) {
  if (art === 'cookie') return <Cookie />
  if (art === 'fruit') return <Fruit />
  return <Cake />
}

/** 小饼干：最便宜的那样，画得朴素但要一眼认得出 */
function Cookie() {
  return (
    <g>
      <circle cx="50" cy="52" r="33" fill="#DBA362" />
      <circle cx="50" cy="52" r="33" fill="none" stroke="#B87F3E" strokeWidth="3" />
      <circle cx="38" cy="41" r="6" fill="#6B4423" />
      <circle cx="63" cy="47" r="5" fill="#6B4423" />
      <circle cx="45" cy="63" r="5.5" fill="#6B4423" />
      <circle cx="63" cy="67" r="4" fill="#6B4423" />
      {/* 左上一道高光，饼干才像烤出来的而不是一块木头 */}
      <path
        d="M31,41 a25,25 0 0 1 14,-12"
        stroke="#EFCB96"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  )
}

/** 水果篮：篮口露出三个果子，比画一个孤零零的苹果更像「一篮」 */
function Fruit() {
  return (
    <g>
      <circle cx="36" cy="42" r="14" fill="#E4726B" />
      <circle cx="63" cy="41" r="13" fill="#F2A65A" />
      <circle cx="49" cy="32" r="11" fill="#8DC98A" />
      <path d="M49,22 q5,-7 11,-7" stroke="#6FB56D" strokeWidth="3" fill="none" strokeLinecap="round" />

      <path d="M20,52 h60 l-7,32 h-46 z" fill="#C08B5C" />
      <path d="M31,58 l3,20 M50,58 v20 M69,58 l-3,20" stroke="#A87545" strokeWidth="2.5" />
      <rect x="16" y="47" width="68" height="10" rx="5" fill="#A87545" />
    </g>
  )
}

/** 大蛋糕：最贵的那样，要有分量 —— 三层加一颗樱桃 */
function Cake() {
  return (
    <g>
      <ellipse cx="50" cy="84" rx="32" ry="5" fill="#000000" opacity=".10" />
      <rect x="20" y="60" width="60" height="24" rx="4" fill="#F5D9B0" />
      <rect x="25" y="44" width="50" height="18" rx="4" fill="#F0A5B0" />
      {/* 奶油边的波浪：直角矩形堆起来像积木，有这一道才像蛋糕 */}
      <path
        d="M25,48 q6,9 12.5,0 q6,9 12.5,0 q6,9 12.5,0 q6,9 12.5,0 v-6 h-50 z"
        fill="#FBDCDF"
      />
      <circle cx="50" cy="36" r="7.5" fill="#E4726B" />
      <path d="M50,29 q5,-9 12,-10" stroke="#6FB56D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="71" r="3.5" fill="#F2A65A" />
      <circle cx="50" cy="74" r="3.5" fill="#8DC98A" />
      <circle cx="66" cy="71" r="3.5" fill="#A78BFA" />
    </g>
  )
}
