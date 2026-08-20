/**
 * @file 小屋正中的桌子 —— 房间自带的固定陈设，不是商品
 * @layer components  纯渲染，无业务逻辑
 * @see src/components/room/RoomScene.tsx  房间容器与坐标系（viewBox 400×300）
 *
 * ## ⭐ 为什么桌子是免费的固定陈设，而不是第七件家具
 *
 * 孩子实测反馈「小屋太单调了，希望中间能有一个桌子」。
 * 把它做成商品，等于把她提出的问题变成一个要攒 400 分才能解决的问题——
 * 而「单调」是这间屋子**现在**的毛病，不是一个可以慢慢期待的空位。
 *
 * 商店的职责是往屋里**加东西**，不是让屋子在买之前立不住。
 * 桌子（连同上面的绿植和杯子）是屋子的地基，一进门就在。
 *
 * ## 位置：靠后墙，正中
 *
 * 桌面压在地面线（y=196）上下，读起来就是「贴着后墙摆的」。
 * 三只默认站位里中间那只正好站在它前面，把桌腿挡住一截——
 * 那一点遮挡正是「有前后」的全部来源，屋子因此不再是一张平面图。
 */

/**
 * 桌子与桌上的两样小东西。
 *
 * ⚠️ 必须在**地毯之后**绘制：地毯的椭圆一直画到 y=228，
 * 会盖住桌腿下缘。先画桌子的话，桌子看起来就埋进地毯里了。
 *
 * @example
 * <RoomTableArt />
 */
export function RoomTableArt() {
  return (
    <g>
      {/* 落影先画。桌腿只有 9 单位宽，没有这块影子它会像浮在半空 */}
      <ellipse cx="200" cy="231" rx="60" ry="6" fill="#000000" opacity=".10" />

      {/* 桌腿与横撑。横撑不只是装饰——两条孤立的腿看起来是两根柱子，
          连起来才是一张桌子 */}
      <rect x="152" y="202" width="9" height="27" rx="3" fill="#A0713F" />
      <rect x="239" y="202" width="9" height="27" rx="3" fill="#A0713F" />
      <rect x="161" y="214" width="78" height="5" rx="2.5" fill="#B4834F" />

      {/* 桌面分成上下两条：上面一条是台面、下面一条是板材厚度。
          单独一个矩形没有厚度，从正面看会变成一条贴在墙上的横线 */}
      <rect x="140" y="197" width="120" height="7" rx="3" fill="#B4834F" />
      <rect x="140" y="192" width="120" height="6" rx="3" fill="#D2A06B" />

      <PottedPlant />
      <Cup />
    </g>
  )
}

/** 桌上的绿植。屋里唯一的活物（除了三只），也是唯一的绿色 */
function PottedPlant() {
  return (
    <g>
      <ellipse cx="167" cy="169" rx="9" ry="6" fill="#8DC98A" transform="rotate(-22 167 169)" />
      <ellipse cx="185" cy="169" rx="9" ry="6" fill="#6FB56D" transform="rotate(22 185 169)" />
      <ellipse cx="176" cy="164" rx="6" ry="10" fill="#79BE7A" />
      {/* 盆身画成上宽下窄的梯形，比矩形更像花盆 */}
      <path d="M166,179 h20 l-3,13 h-14 z" fill="#E08A6E" />
      <rect x="163" y="174" width="26" height="5.5" rx="2.5" fill="#EC9C81" />
    </g>
  )
}

/** 桌上的杯子。有人刚坐过这张桌子，屋子才像在被使用 */
function Cup() {
  return (
    <g>
      <path d="M239,183 q6,3.5 0,7" stroke="#DCD3BE" strokeWidth="2.5" fill="none" />
      <path d="M223,181 h16 l-2,11 h-12 z" fill="#F7F3E8" />
      <rect x="221" y="178" width="20" height="4" rx="2" fill="#FFFFFF" />
    </g>
  )
}
