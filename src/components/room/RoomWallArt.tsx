/**
 * @file 小屋墙上的三件家具 —— 挂画、窗帘、小书架
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/room/RoomScene.tsx  房间容器与坐标系
 * @see src/data/seed/shopItems.ts         `art` 字段即这里的键
 *
 * 坐标直接落在 `RoomScene` 的 `viewBox="0 0 400 300"` 里，
 * 每件家具占一个固定位置——**买了自动摆好，孩子不用布置**。
 * 位置写死也让每件都能照着自己那块地方画到刚好合适，不必考虑任意缩放。
 *
 * 墙面到 y=196 为止，所以这三件的纵坐标都在 196 以内。
 */

/** 墙上的家具。与 `RoomFloorArt` 分开是因为渲染顺序必须先墙后地 */
export type WallArtName = 'picture' | 'curtain' | 'shelf'

interface RoomWallArtProps {
  art: WallArtName
}

/**
 * 渲染一件墙上家具。
 *
 * @param art - 家具的语义名，来自 `ROOM_ITEMS[].art`
 *
 * @example
 * <RoomWallArt art="curtain" />
 */
export function RoomWallArt({ art }: RoomWallArtProps) {
  if (art === 'picture') return <Picture />
  if (art === 'curtain') return <Curtain />
  return <Shelf />
}

/** 挂画：左墙。画面里是最好认的三样——太阳、山、草地 */
function Picture() {
  return (
    <g>
      <rect x="36" y="42" width="70" height="56" rx="4" fill="#C08B5C" />
      <rect x="42" y="48" width="58" height="44" rx="2" fill="#BFE3F2" />
      <circle cx="59" cy="61" r="7" fill="#FFD86B" />
      <path d="M42,92 L62,68 L78,92 Z" fill="#8DC98A" />
      <path d="M66,92 L84,73 L100,92 Z" fill="#6FB56D" />
      <rect x="42" y="86" width="58" height="6" fill="#7CB87A" />
      {/* 挂钉与吊线，让它看起来是「挂上去的」而不是贴上去的 */}
      <path d="M71,42 L71,34" stroke="#B0A08A" strokeWidth="2" />
      <circle cx="71" cy="33" r="2.5" fill="#B0A08A" />
    </g>
  )
}

/** 窗帘：后墙正中。窗外留一片天，屋子才不像盒子 */
function Curtain() {
  return (
    <g>
      <rect x="163" y="28" width="94" height="84" rx="3" fill="#CDEBF7" />
      <path d="M163,70 h94 M210,28 v84" stroke="#EBDFC9" strokeWidth="4" />
      <rect
        x="163"
        y="28"
        width="94"
        height="84"
        rx="3"
        fill="none"
        stroke="#E3D5BF"
        strokeWidth="5"
      />
      {/* 帘杆压在窗框之上 */}
      <rect x="148" y="18" width="124" height="6" rx="3" fill="#B08453" />
      <circle cx="149" cy="21" r="4" fill="#96693C" />
      <circle cx="271" cy="21" r="4" fill="#96693C" />
      {/* 两幅帘子。用二次曲线做出布的垂坠，比直角矩形柔和得多 */}
      <path d="M152,23 q13,42 5,94 q-13,9 -22,0 q11,-52 3,-94 z" fill="#F0A5B0" />
      <path d="M268,23 q-13,42 -5,94 q13,9 22,0 q-11,-52 -3,-94 z" fill="#F0A5B0" />
      <path d="M147,40 q6,38 1,72 M273,40 q-6,38 -1,72" stroke="#DE8894" strokeWidth="2" fill="none" />
    </g>
  )
}

/** 小书架：右墙。两层隔板，上面立着几本书 */
function Shelf() {
  /** 书脊：[x, 高度, 颜色]。高矮不齐才像真的书架 */
  const upper: [number, number, string][] = [
    [306, 24, '#E4726B'],
    [316, 20, '#6FA8DC'],
    [325, 26, '#F2C14E'],
    [336, 18, '#8DC98A'],
  ]
  const lower: [number, number, string][] = [
    [306, 20, '#A78BFA'],
    [315, 25, '#F0A5B0'],
    [325, 21, '#6FB56D'],
    [334, 24, '#F2A65A'],
    [345, 19, '#6FA8DC'],
  ]

  return (
    <g>
      {upper.map(([x, h, fill]) => (
        <rect key={`u${x}`} x={x} y={96 - h} width="8" height={h} rx="1.5" fill={fill} />
      ))}
      <rect x="300" y="96" width="82" height="7" rx="3" fill="#C08B5C" />

      {lower.map(([x, h, fill]) => (
        <rect key={`l${x}`} x={x} y={145 - h} width="8" height={h} rx="1.5" fill={fill} />
      ))}
      <rect x="300" y="145" width="82" height="7" rx="3" fill="#C08B5C" />

      {/* 两侧立板，把两层连成一个书架而不是两块浮板 */}
      <rect x="298" y="70" width="5" height="82" rx="2" fill="#A87545" />
      <rect x="379" y="70" width="5" height="82" rx="2" fill="#A87545" />
    </g>
  )
}
