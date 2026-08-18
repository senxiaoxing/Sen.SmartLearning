/**
 * @file 小屋地上的三件家具 —— 地毯、小台灯、玩具箱
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/room/RoomScene.tsx  房间容器与坐标系
 * @see src/data/seed/shopItems.ts         `art` 字段即这里的键
 *
 * 与 `RoomWallArt` 分成两个文件，是因为**渲染顺序有硬要求**：
 * 墙上的先画，地上的后画，三只宠物再叠在最上面。
 * 顺序错了会出现「地毯盖住宠物」这种一眼就不对的画面。
 *
 * 地面从 y=196 起，所以这三件都站在 196 以下。
 */

/** 地上的家具 */
export type FloorArtName = 'rug' | 'lamp' | 'toybox'

interface RoomFloorArtProps {
  art: FloorArtName
}

/**
 * 渲染一件地上的家具。
 *
 * @param art - 家具的语义名，来自 `ROOM_ITEMS[].art`
 *
 * @example
 * <RoomFloorArt art="rug" />
 */
export function RoomFloorArt({ art }: RoomFloorArtProps) {
  if (art === 'rug') return <Rug />
  if (art === 'lamp') return <Lamp />
  return <ToyBox />
}

/**
 * 地毯：正中偏下，三只就站在它上面。
 *
 * 画成椭圆而不是矩形：矩形要做透视才不别扭，而椭圆天然没有方向，
 * 从任何角度看都成立，省掉一整套透视校正。
 */
function Rug() {
  return (
    <g>
      <ellipse cx="200" cy="258" rx="96" ry="30" fill="#E9A0A6" />
      <ellipse cx="200" cy="258" rx="74" ry="22" fill="none" stroke="#F7D5D8" strokeWidth="6" />
      <ellipse cx="200" cy="258" rx="50" ry="14" fill="#F2B9BE" />
      <ellipse cx="200" cy="258" rx="26" ry="7" fill="#FBDCDF" />
    </g>
  )
}

/**
 * 小台灯：右下角的小几 + 台灯。暖光让屋子有「亮着」的感觉。
 *
 * ⚠️ 整件东西**完全落在地面以内**（y ≥ 196），不跨过墙地交界。
 * 落地灯那种从地板一路顶到墙面的画法，会让它的空位轮廓横跨两块底色，
 * 看起来像画歪了——而空位恰恰是买之前唯一能看到的东西。
 */
function Lamp() {
  return (
    <g>
      {/*
        光晕用径向渐变而非实心色块：实心的边缘会切出一条硬线，
        看起来像贴了张纸而不是灯照出来的光。
      */}
      <defs>
        <radialGradient id="roomLampGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFDF9E" stopOpacity=".8" />
          <stop offset="100%" stopColor="#FFDF9E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="351" cy="216" rx="40" ry="32" fill="url(#roomLampGlow)" />

      {/* 小几 */}
      <rect x="324" y="234" width="54" height="7" rx="3" fill="#B08453" />
      <rect x="330" y="241" width="5" height="28" rx="2" fill="#96693C" />
      <rect x="367" y="241" width="5" height="28" rx="2" fill="#96693C" />
      <ellipse cx="351" cy="270" rx="30" ry="5" fill="#000000" opacity=".10" />

      {/* 台灯 */}
      <rect x="348" y="216" width="6" height="18" fill="#A98255" />
      <ellipse cx="351" cy="234" rx="13" ry="4" fill="#8A6A45" />
      <path d="M334,216 L342,198 h18 l9,18 z" fill="#FFD570" />
      <path d="M334,216 L342,198 h5 l-7,18 z" fill="#FFE39C" />
      <ellipse cx="351.5" cy="216" rx="17.5" ry="4" fill="#FFEDC2" />
    </g>
  )
}

/** 玩具箱：左下角。盖子半开、东西冒出来，比一个闭合的箱子更有「在用」的感觉 */
function ToyBox() {
  return (
    <g>
      {/* 先画露出来的玩具，再画箱体，箱体自然把它们的下半截压住 */}
      <circle cx="45" cy="218" r="11" fill="#F2A0A6" />
      <path d="M34,218 h22" stroke="#DE8894" strokeWidth="2.5" />
      <rect x="61" y="206" width="17" height="17" rx="2" fill="#F5D06B" />
      <rect x="80" y="212" width="13" height="13" rx="2" fill="#8DC98A" />

      <rect x="26" y="228" width="72" height="44" rx="6" fill="#7FB6E0" />
      <rect x="22" y="222" width="80" height="12" rx="5" fill="#5E96C4" />
      <rect x="52" y="240" width="20" height="20" rx="3" fill="#A5D2F0" />
      <circle cx="62" cy="250" r="3.5" fill="#5E96C4" />
    </g>
  )
}
