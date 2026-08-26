/**
 * @file 咩咩的配饰 —— 圆眼镜、云朵披风、花环，分身前身后两层
 * @layer components  纯渲染
 * @see src/components/pet/SheepArt.tsx 主体
 * @see design/06-宠物系统.md §6 槽位结构
 *
 * 披风做成云朵形而不是布：咩咩本体就是一团云，
 * 一块方方正正的布披上去只会像盖了张桌布。
 * 后面的几团 mint 从羊毛边缘探出来（under），前面垂两条下摆（over），
 * 「披着」这件事全靠这一后一前。
 *
 * 花环用五种颜色而不是同一色——「彩虹羊」这个形态名说的就是它，
 * 而单色花环在 48px 下会糊成一条彩带。
 */

import type { PetGearProps } from '@/components/pet/petArtProps'

/**
 * 披风露在羊毛外的几团。
 *
 * ⚠️ 位置要贴着羊毛轮廓，让它读成**沿着边探出来的一圈**。
 * 第一版摆得偏下，四团连上前面的下摆，两侧就成了两根从头拖到地的绿柱子。
 */
const CAPE_PUFFS = [
  { cx: 34, cy: 152, r: 22 },
  { cx: 166, cy: 152, r: 22 },
  { cx: 48, cy: 192, r: 20 },
  { cx: 152, cy: 192, r: 20 },
] as const

/** 花环上的五朵花。颜色按彩虹顺序排，最终形态的光效正好给它兜一圈底 */
const FLOWERS = [
  { cx: 60, cy: 104, fill: '#FF8A7A' },
  { cx: 80, cy: 90, fill: '#FFC65E' },
  { cx: 100, cy: 84, fill: '#8FD98A' },
  { cx: 120, cy: 90, fill: '#7CC2F7' },
  { cx: 140, cy: 104, fill: '#C9A6F5' },
] as const

/** 一朵五瓣小花的花瓣位置，相对花心 */
const PETALS = [
  { dx: 0, dy: -8 },
  { dx: 7.6, dy: -2.5 },
  { dx: 4.7, dy: 6.5 },
  { dx: -4.7, dy: 6.5 },
  { dx: -7.6, dy: -2.5 },
] as const

/**
 * 渲染小绵羊的配饰层。
 *
 * @param layer - `under` 出披风后面那几团，`over` 出披风下摆、圆眼镜、花环
 *
 * @example
 * <SheepGear layer="over" accessories={new Set(['specs', 'cloud-cape'])} animated />
 */
export function SheepGear({ layer, accessories, animated }: PetGearProps) {
  const anim = (cls: string): string | undefined => (animated ? cls : undefined)
  const has = (k: string): boolean => accessories.has(k)

  if (layer === 'under') {
    if (!has('cloud-cape')) return null
    return (
      <g>
        {CAPE_PUFFS.map((p) => (
          <circle key={p.cx} cx={p.cx} cy={p.cy} r={p.r + 3} fill="#3FAE83" />
        ))}
        {CAPE_PUFFS.map((p) => (
          <circle key={p.cx} cx={p.cx} cy={p.cy} r={p.r} fill="url(#sheepCape)" />
        ))}
      </g>
    )
  }

  return (
    <>
      {/* 垂在身前的两个布角。没有它们，后面那几团就只是背景里的云。
          ⚠️ 短而宽，收在腿的上方——垂到脚边就把细腿盖住了，
          而那四条细腿是这团毛唯一的支点 */}
      {has('cloud-cape') && (
        <g fill="url(#sheepCape)" stroke="#3FAE83" strokeWidth="2" strokeLinejoin="round">
          <path d="M44,190 C36,200 36,212 44,218 C56,214 62,202 60,190 Z" />
          <path d="M156,190 C164,200 164,212 156,218 C144,214 138,202 140,190 Z" />
        </g>
      )}

      {has('specs') && (
        <g>
          <path d="M92,148 C96,144 104,144 108,148" stroke="#6E5544" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68,146 L52,142 M132,146 L148,142" stroke="#6E5544" strokeWidth="3" strokeLinecap="round" />
          <circle cx="82" cy="149" r="15" fill="#FFFFFF" opacity=".24" />
          <circle cx="118" cy="149" r="15" fill="#FFFFFF" opacity=".24" />
          <circle cx="82" cy="149" r="15" fill="none" stroke="#6E5544" strokeWidth="3.4" />
          <circle cx="118" cy="149" r="15" fill="none" stroke="#6E5544" strokeWidth="3.4" />
          <path className="d-mid" d="M74,143 C76,140 80,138 83,138" stroke="#FFF" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".8" />
        </g>
      )}

      {has('flower-crown') && (
        <g className={anim('sheep-crown')}>
          {/* 藤蔓先画，花压在上面，才像串起来的一圈而不是各贴各的 */}
          <path
            d="M56,108 C72,86 128,86 144,108"
            stroke="#7FB069"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {FLOWERS.map((f) => (
            <g key={f.cx}>
              {PETALS.map((p) => (
                <circle key={p.dx} cx={f.cx + p.dx} cy={f.cy + p.dy} r="5.4" fill={f.fill} />
              ))}
              <circle cx={f.cx} cy={f.cy} r="4" fill="#FFF3C4" />
            </g>
          ))}
        </g>
      )}
    </>
  )
}
