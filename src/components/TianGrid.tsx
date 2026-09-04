/**
 * @file 田字格 —— 一个字写在格子里，可以一笔一笔演示怎么写
 * @layer components  跨功能复用的 UI 原子
 * @see src/domain/strokeTiming.ts  每一笔的排期（纯计算在那边）
 * @see src/features/chinese/StrokeWall.tsx  写字墙
 * @see design/09-竞品借鉴.md §2.3
 *
 * 与 `TenFrame.tsx` 同一个地位：田字格是识字写字的通用教具，
 * 演示动画和笔顺跟随图共用它，**同一个概念只用一套视觉语言**。
 *
 * ## 动画怎么做的
 *
 * 每一笔有两份数据：`strokes` 是笔画**轮廓**（带粗细形状的闭合路径），
 * `medians` 是笔画**中线**。做法是拿轮廓当 `clipPath`，
 * 在里面画一条沿中线走的粗线，让它从起点长出来——
 * 被轮廓裁住，看起来就是这一笔被写出来。
 *
 * ## ⚠️ 四条容易踩的
 *
 * 1. **坐标系 y 轴向上**（makemeahanzi 的约定），且字形下沿到 -124。
 *    必须套 {@link FLIP} 翻过来，否则整个字是倒的。
 * 2. ⛔ **不要在格子里标笔顺序号**。试过，圈再小也压着笔画，
 *    而这里要看的正是笔画本身。顺序由 `StrokeSheet` 底下那排跟随图承担。
 * 3. ⚠️ **`stroke-dashoffset` 不在 CLAUDE.md 的 transform/opacity 白名单里**。
 *    它不触发 layout 但会触发 paint。单字最多二十来笔，实测可接受；
 *    **这是明知的破例，别照性能规范把它改掉**。
 * 4. ⛔⛔ **描画绝不能用 framer-motion 的 `pathLength`。**
 *    第一版用了，4 笔的「天」正常，而 11 笔的「黄」一点开就**整页冻结**——
 *    连 JS 都执行不了，不是慢，是死。换成下面这套原生
 *    `strokeDasharray` + CSS transition 之后一切正常，
 *    而那正是 `npm run stroke:check` 那一页跑 100 个字都没事的画法。
 *    ⭐ 教训：**校验页已经验证过的画法，App 里要用同一套**，
 *    换一种「更 React 的」写法等于把没验过的东西放进产品。
 */

import { useEffect, useId, useRef } from 'react'
import { strokeTimings, type StrokeMedian } from '@/domain/strokeTiming'

/**
 * makemeahanzi 的坐标系：1024×1024，y 轴向上，字形下沿到 -124。
 * 这是它官方文档给的翻转写法。
 */
const FLIP = 'translate(0, 900) scale(1, -1)'

/**
 * 字形在格子里缩到多大。
 *
 * ⚠️ makemeahanzi 的字形几乎占满 1024×1024，直接画会顶到格子边上，
 * 「字在格子里」的关系就没了——而田字格的全部意义就是让她看清
 * 这一笔起在格子的哪个位置。0.86 留出的边正好是字帖上那一圈。
 *
 * ⚠️ transform 从右往左应用：先 {@link FLIP} 把字摆正，再围着中心缩。
 */
const FIT = `translate(512, 512) scale(0.86) translate(-512, -512) ${FLIP}`

/** 中线画多粗才能盖住整笔。笔画最宽处约 128，留些余量 */
const INK_WIDTH = 160


interface TianGridProps {
  /** 笔画轮廓（SVG path 的 d），顺序即笔顺 */
  strokes: readonly string[]
  /** 笔画中线。传了才会有描画动画；只想要静态字形就不传 */
  medians?: readonly StrokeMedian[]
  /** 只画前 n 笔。省略 = 全画。用于笔顺跟随图 */
  upTo?: number
  /** 把最后画的那一笔标成强调色，其余淡灰。笔顺跟随图用 */
  highlightLast?: boolean
  /** 画田字格的边框与米字虚线 */
  grid?: boolean
  /**
   * 变一次就从头写一次。
   *
   * ⭐ **`0` 表示「先别写，藏着等」**——每一笔都拉到隐藏状态但不排期。
   * 浮层要等自己的入场动画放完才动笔（字在窗还在放大时就开写，
   * 那一下最关键的起笔她根本没看到），靠的就是先给 0、开完再给 1。
   */
  playToken?: number
  className?: string
}

/**
 * 田字格里的一个字。
 *
 * @example
 * // 演示怎么写，点一下重播
 * <TianGrid strokes={d.strokes} medians={d.medians} grid playToken={n} />
 *
 * @example
 * // 笔顺跟随图的第 3 格：画前 3 笔，第 3 笔标红
 * <TianGrid strokes={d.strokes} upTo={3} highlightLast />
 */
export function TianGrid({
  strokes,
  medians,
  upTo,
  highlightLast = false,
  grid = false,
  playToken = 0,
  className = '',
}: TianGridProps) {
  const shown = upTo ?? strokes.length
  const visible = strokes.slice(0, Math.max(0, shown))
  const animated = medians !== undefined && medians.length === strokes.length
  const timings = animated ? strokeTimings(medians) : []
  const inkRefs = useRef<(SVGPathElement | null)[]>([])
  // ⚠️ clipPath 的 id 必须全页唯一：写字墙上同时挂着上百个田字格，
  //    id 撞了会让一笔被另一个字的轮廓裁掉。useId 的冒号在 url(#…) 里不安全，换掉
  const gridId = useId().replace(/:/g, 'g')

  /**
   * 逐笔描画：先把每一笔的虚线偏移量拉满（整笔藏起来），
   * 到点了再用一次 transition 把它推回 0，笔就从起点长出来。
   *
   * ⚠️ 直接操作 DOM 而不是走 React state：这是一次性的、每帧都在变的样式，
   * 交给 React 意味着每帧一次 render。framer-motion 的 pathLength 就是
   * 死在这条路上的（见文件头第 4 条）。
   */
  useEffect(() => {
    if (!animated) return

    // ① 全部拉回隐藏，且这一步不要有过渡
    for (let i = 0; i < timings.length; i += 1) {
      const el = inkRefs.current[i]
      if (el === null || el === undefined) continue
      el.style.transition = 'none'
      el.style.strokeDashoffset = String((timings[i]?.length ?? 0) + INK_WIDTH)
    }

    // playToken 0 = 藏着等，别排期（见 playToken 的说明）
    if (playToken === 0) return

    // ② ⭐ 等浏览器真的把 ① 画出去，再排期。**这两帧不能省**。
    //
    //    第一笔的 delay 是 0，它的 setTimeout 会落在同一帧里，于是
    //    「拉回隐藏」和「推到 0」被合并成一次样式变更——浏览器看到的起止值
    //    都是 0（上一轮结束时就是 0），判定为没有变化，**transition 不触发**。
    //    表现正是循环第二轮起第一笔凭空出现、没有书写过程。
    //    首轮不受影响：那时的初始值本来就是隐藏的。
    //
    // ⛔ 不要改回 `getComputedStyle(...)` 那种「强制同步布局」的写法：
    //    它确实也能提交，但会连带整个文档重算一次样式与布局，而这一页挂着
    //    100 个田字格、上千个 path。循环每轮强制一次的代价是肉眼可见的卡顿
    //    （上机反馈「点空白处关窗时动画会卡一下」）。双 rAF 等的是同一件事，
    //    但让浏览器按自己的节奏来。
    let raf2 = 0
    let timers: number[] = []
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        timers = timings.map((t, i) => {
          const el = inkRefs.current[i]
          if (el === null || el === undefined) return 0
          return window.setTimeout(() => {
            el.style.transition = `stroke-dashoffset ${t.duration}ms linear`
            el.style.strokeDashoffset = '0'
          }, t.delay)
        })
      })
    })

    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      timers.forEach((id) => window.clearTimeout(id))
    }
    // timings 每次渲染都是新数组，不能进依赖；playToken 变化就是「重播一次」的信号
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken, animated, strokes])

  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden="true">
      {grid && (
        // ⚠️ 别再调淡：第一版用 ink/10，在 iPad 上几乎看不见格线，
        //    那等于没有田字格 —— 而这一页的字正是要靠格子定位置的
        <g stroke="currentColor" className="text-ink/25">
          <rect x="8" y="8" width="1008" height="1008" fill="none" strokeWidth="7" rx="24" />
          <g strokeWidth="5" strokeDasharray="24 18">
            <line x1="512" y1="8" x2="512" y2="1016" />
            <line x1="8" y1="512" x2="1016" y2="512" />
            <line x1="8" y1="8" x2="1016" y2="1016" opacity="0.5" />
            <line x1="1016" y1="8" x2="8" y2="1016" opacity="0.5" />
          </g>
        </g>
      )}

      <g transform={FIT}>
        {animated ? (
          <>
            {/* 淡淡的完整字形垫在底下：她先看得见这个字长什么样，再看它被写出来 */}
            {strokes.map((d, i) => (
              <path key={`ghost-${i}`} d={d} className="fill-ink/10" />
            ))}
            {strokes.map((d, i) => {
              const dash = (timings[i]?.length ?? 0) + INK_WIDTH
              return (
                <g key={`ink-${i}`}>
                  <clipPath id={`${gridId}-${i}`}>
                    <path d={d} />
                  </clipPath>
                  <path
                    ref={(el) => {
                      inkRefs.current[i] = el
                    }}
                    d={medianPath(medians[i] ?? [])}
                    clipPath={`url(#${gridId}-${i})`}
                    fill="none"
                    strokeWidth={INK_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-ink"
                    style={{ strokeDasharray: dash, strokeDashoffset: dash }}
                  />
                </g>
              )
            })}
          </>
        ) : (
          visible.map((d, i) => (
            <path
              key={i}
              d={d}
              className={
                // 笔顺跟随图：已写的淡下去，最新一笔跳出来。
                // 不开 highlightLast 就是普通的一个字（墙上的格子），照常用墨色
                highlightLast
                  ? i === visible.length - 1
                    ? 'fill-primary'
                    : 'fill-ink/30'
                  : 'fill-ink'
              }
            />
          ))
        )}
      </g>
    </svg>
  )
}

/** 中线折线 → SVG path。动画沿它走 */
function medianPath(median: StrokeMedian): string {
  if (median.length === 0) return ''
  return `M ${median.map((p) => `${p[0] ?? 0} ${p[1] ?? 0}`).join(' L ')}`
}
