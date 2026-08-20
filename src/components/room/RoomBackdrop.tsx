/**
 * @file 小屋的墙与地板 —— 铺满整块屏幕的那一层
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/room/RoomScene.tsx  家具层，只占中间那块 4:3 的舞台
 *
 * ## ⭐ 为什么墙地板是 CSS，家具是 SVG
 *
 * 孩子实测反馈「宠物小屋要大一点，最好能整屏占满」。
 * 但家具画在 400×300 的固定坐标里，硬拉到任意屏幕比例会变形
 * （挂画拉扁、地毯拉成一条），而把 SVG 按比例裁切（`slice`）
 * 又会在 iPad 竖屏下把左右两侧连同挂画、书架一起切掉。
 *
 * 所以分成两层：
 *
 * - **墙和地板**是几条纯色横带，横向纵向随便拉伸都不会「变形」——
 *   用 CSS 绝对定位，左右各溢出 100vw、上下各溢出 100vh，铺满整屏。
 * - **家具**留在中间那块严格 4:3 的舞台里，等比缩放，一根线都不歪。
 *
 * 两层的交界（地面线）都取 {@link ROOM_FLOOR_TOP}，因此不管屏幕多宽多高，
 * 地毯永远踩在地板上、挂画永远挂在墙上。
 */

/**
 * 地面线在舞台高度里的比例。
 *
 * ⚠️ 必须等于 `RoomScene` 画墙时用的 y 坐标 ÷ 300（viewBox 高度）。
 * 对不上的后果是家具的地面和背景的地面差几个像素，
 * 整屋子会出现一条谁也说不清是什么的横缝。
 */
export const ROOM_FLOOR_TOP = 196 / 300

/** 墙色。⚠️ 必须明显深于页面底色（canvas 是 #FFF3E2），否则小屋读不出「是个房间」 */
const WALL = '#EFE1C8'
const FLOOR = '#D9B98E'
/** 踢脚线。墙与地板之间没有这一道，两块色会像两张拼在一起的纸 */
const BASEBOARD = '#C2A170'
const PLANK_LINE = '#CDA97A'

/** 向舞台外溢出多少。够大就行——外层容器 `overflow-hidden` 会把多余的裁掉 */
const BLEED_X = '-100vw'
const BLEED_Y = '-100vh'

/** 地板缝的位置（舞台高度比例）。对应原来 SVG 里的 y=222 / 250 / 278 */
const PLANK_LINES = [222 / 300, 250 / 300, 278 / 300]

const pct = (ratio: number): string => `${(ratio * 100).toFixed(3)}%`

/**
 * 铺满整屏的墙与地板。
 *
 * 必须放在一个 `position: relative` 的舞台元素里，且该舞台的祖先要
 * `overflow-hidden`——溢出的部分正是靠它裁掉的。
 *
 * @example
 * <div className="relative h-full w-full overflow-hidden">
 *   <div className="relative aspect-[4/3]">
 *     <RoomBackdrop />
 *     …家具 SVG…
 *   </div>
 * </div>
 */
export function RoomBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none">
      {/* 墙。点状墙纸只用一层 radial-gradient，不产生任何额外元素 */}
      <div
        className="absolute"
        style={{
          left: BLEED_X,
          right: BLEED_X,
          top: BLEED_Y,
          bottom: pct(1 - ROOM_FLOOR_TOP),
          backgroundColor: WALL,
          backgroundImage: 'radial-gradient(rgba(255,255,255,.55) 2px, transparent 2.5px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* 地板 */}
      <div
        className="absolute"
        style={{
          left: BLEED_X,
          right: BLEED_X,
          top: pct(ROOM_FLOOR_TOP),
          bottom: BLEED_Y,
          backgroundColor: FLOOR,
        }}
      />

      {/* 踢脚线 */}
      <div
        className="absolute"
        style={{
          left: BLEED_X,
          right: BLEED_X,
          top: pct(189 / 300),
          height: pct(9 / 300),
          backgroundColor: BASEBOARD,
        }}
      />

      {PLANK_LINES.map((top) => (
        <div
          key={top}
          className="absolute opacity-60"
          style={{
            left: BLEED_X,
            right: BLEED_X,
            top: pct(top),
            // ⚠️ 用比例而不是固定 px：地板缝原本是 2 个 viewBox 单位，
            // 会跟着屋子一起放大。写死 2px 的话屋子越大缝越细，最后细到看不见
            height: pct(2 / 300),
            backgroundColor: PLANK_LINE,
          }}
        />
      ))}

      {/*
        地板中央的一汪暖光。屋子里最缺的不是东西而是「有人住」的感觉，
        一块柔和的光斑比再加一件家具有效得多，而且它随舞台缩放，
        在任何屏幕上都落在三只脚下。
      */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: pct(ROOM_FLOOR_TOP - 0.05),
          width: '120%',
          height: '60%',
          background:
            'radial-gradient(ellipse at center, rgba(255,230,175,.5), rgba(255,230,175,0) 70%)',
        }}
      />
    </div>
  )
}
