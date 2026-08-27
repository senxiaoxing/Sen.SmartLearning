/**
 * @file 分辑切换 —— 一排大按钮，点一下换一批内容
 * @layer components  跨功能复用的 UI 原子，不含任何业务逻辑
 * @see src/features/chinese/HanziWall.tsx  识字墙（3 辑 × 100 字）
 * @see src/features/chinese/PoemLibrary.tsx  诗单（3 辑 × 20 首）
 * @see src/data/seed/hanziCards.ts  为什么要分辑
 *
 * ## 孩子读不出「第二辑」，她认的是那个数字
 *
 * 按钮上最大的元素是 1️⃣2️⃣3️⃣ —— 这套图在识字第一辑第二组就学过，
 * 数学题和首页也天天见。「第一辑」那三个字是给家长看的，字号刻意压小。
 *
 * ⚠️ 点按钮**不朗读**。理由与选项按钮一致（见 items/OptionButton.tsx）：
 * 这一下是「换一批」的操作，不是试听；紧接着整页会重排，
 * 再叠一句「第二辑」只会盖住她真正想点的那个字、那首诗的读音。
 *
 * ## ⚠️ 两处共用同一个组件，是为了让两边长得一模一样
 *
 * 她在识字墙上学会的「按数字换一批」这个动作，到诗单上要能直接用。
 * 两边各写一份的话，迟早会在其中一边改出不同的间距或选中态——
 * 而那点差别足以让她以为这是另一个不认识的东西。
 */

import { BigButton } from '@/components/BigButton'

/** 一辑在切换条上需要的东西。识字的 `HanziVolume`、古诗的 `PoemVolume` 都满足它 */
export interface VolumeTab {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1️⃣2️⃣3️⃣ */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
}

interface VolumePickerProps {
  volumes: readonly VolumeTab[]
  /** 当前选中的辑 id */
  activeId: string
  /**
   * 一辑有多少东西，如 `'100 个字'`、`'20 首诗'`。
   * 只进读屏文本——屏幕上没有位置放它，而家长开读屏时需要知道这一辑有多大。
   *
   * ⚠️ **可选**：只有「一辑装了 N 个同类东西」时才填得出有信息量的值。
   * 年级切换器上「这一辑有多大」这个概念根本不成立（一年级和二年级题量不同，
   * 也没有一个家长关心的数字），硬填出来的是
   * 「二年级，一个年级的题，换这个年级的题做做看」——同一件事说三遍。
   * 填不出来就不填，`name` 和 `hint` 本来就够了。
   */
  countLabel?: string
  onSelect: (id: string) => void
}

export function VolumePicker({ volumes, activeId, countLabel, onSelect }: VolumePickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pb-1">
      {volumes.map((volume) => {
        const active = volume.id === activeId

        return (
          <BigButton
            key={volume.id}
            tone={active ? 'primary' : 'neutral'}
            // 家长听不到、孩子看不懂，两边的信息都塞进读屏文本里
            ariaLabel={[volume.name, countLabel, volume.hint].filter(Boolean).join('，')}
            className={[
              'flex-col gap-0 px-6 py-3',
              // 未选中的压暗一点：三个按钮同样亮时，她看不出现在在哪一辑
              active ? '' : 'opacity-70',
            ].join(' ')}
            onClick={() => onSelect(volume.id)}
          >
            <span className="text-3xl leading-tight" aria-hidden="true">
              {volume.badge}
            </span>
            <span className="text-sm font-normal opacity-80" aria-hidden="true">
              {volume.name}
            </span>
          </BigButton>
        )
      })}
    </div>
  )
}
