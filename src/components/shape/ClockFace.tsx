/**
 * @file 钟面 —— M8 认识钟表的图形面
 * @layer components  纯渲染，无业务逻辑
 * @see src/domain/generators/clock.ts  时间从哪来
 *
 * ⭐ **为什么不用 emoji 🕐**
 *
 * emoji 时钟只有 12 个整点 + 12 个半点，看似够用，但：
 * 1. 它太小，且不同系统画法不同——**时针和分针在 iPad 上几乎分不出长短**，
 *    而 M8.1 要学的恰恰就是「哪根是时针」。
 * 2. 干扰项没法按认知误区构造。`hand_swap`（时针分针看反）要求画出
 *    「3 点」和「时针分针交换后的样子」两张图，emoji 给不了。
 *
 * SVG 把指针角度交给数据算，两条都自然满足。
 */

/** 表盘半径（viewBox 单位），整个图是 100×100 */
const R = 46
const CENTER = 50

/** 时针与分针的长度。差距刻意拉大到 1.5 倍——一年级要先能一眼分出长短 */
const HOUR_HAND = 24
const MINUTE_HAND = 36

interface ClockFaceProps {
  hour: number
  minute: number
  size?: number
  /** 是否画 1~12 的数字。M8.1 认钟面时需要，纯读时刻时可以省掉减少干扰 */
  showNumbers?: boolean
}

/**
 * 一个可读时刻的钟面。
 *
 * @param hour - 小时，12 小时制（0~12 都接受，内部取模）
 * @param minute - 分钟 0~59
 * @param showNumbers - 是否显示表盘数字，默认显示
 *
 * @example
 * <ClockFace hour={3} minute={30} />   // 3 点半：时针在 3 与 4 之间，分针指 6
 */
export function ClockFace({ hour, minute, size = 120, showNumbers = true }: ClockFaceProps) {
  // ⭐ 时针必须随分钟走：3 点半的时针在 3 和 4 中间，
  //    画成正对 3 是错的，孩子照着学会读错半点
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${hour} 点${minute === 0 ? '整' : ` ${minute} 分`}`}
    >
      <circle cx={CENTER} cy={CENTER} r={R} fill="#FFFDF6" stroke="#E8DFCC" strokeWidth={4} />

      {/* 12 个刻度。刻意压短并贴住外圈，给全部 12 个数字让出位置 */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const outer = R - 2
        const inner = R - 6
        return (
          <line
            key={i}
            x1={CENTER + Math.sin(a) * inner}
            y1={CENTER - Math.cos(a) * inner}
            x2={CENTER + Math.sin(a) * outer}
            y2={CENTER - Math.cos(a) * outer}
            stroke="#C9BFA8"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      })}

      {/* ⭐ 12 个数字全部标出。只标 12/3/6/9 时孩子得自己推算中间的刻度，
          而 M8 要练的是「读出时刻」，不是「心算钟面刻度」——
          缺的那些数字会变成额外的门槛，也更容易读错 */}
      {showNumbers &&
        Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
          const a = ((n % 12) * 30 * Math.PI) / 180
          return (
            <text
              key={n}
              x={CENTER + Math.sin(a) * (R - 13)}
              y={CENTER - Math.cos(a) * (R - 13) + 4.5}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
              fill="#7A6E55"
            >
              {n}
            </text>
          )
        })}

      {/* 分针细长、时针短粗 —— 长短之外再加一层粗细区分，
          因为 hand_swap 是 M8 的主要误区 */}
      <Hand angle={hourAngle} length={HOUR_HAND} width={6} color="#FF8C42" />
      <Hand angle={minuteAngle} length={MINUTE_HAND} width={3.5} color="#4A9DEC" />

      <circle cx={CENTER} cy={CENTER} r={4} fill="#7A6E55" />
    </svg>
  )
}

/** 一根指针。角度以 12 点为 0°，顺时针为正 */
function Hand({
  angle,
  length,
  width,
  color,
}: {
  angle: number
  length: number
  width: number
  color: string
}) {
  const a = (angle * Math.PI) / 180
  return (
    <line
      x1={CENTER}
      y1={CENTER}
      x2={CENTER + Math.sin(a) * length}
      y2={CENTER - Math.cos(a) * length}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  )
}
