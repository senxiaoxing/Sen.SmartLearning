/**
 * @file 识字墙顶部的分辑切换 —— 三个大按钮，一辑 100 字
 * @layer features
 * @see src/features/chinese/HanziWall.tsx  调用方
 * @see src/data/seed/hanziCards.ts  为什么要分辑
 *
 * ## 孩子读不出「第二辑」，她认的是那个数字
 *
 * 按钮上最大的元素是 1️⃣2️⃣3️⃣ —— 这套图在第一辑第二组就学过，
 * 数学题和首页也天天见。「第一辑」那三个字是给家长看的，字号刻意压小。
 *
 * ⚠️ 点按钮**不朗读**。理由与选项按钮一致（见 items/OptionButton.tsx）：
 * 这一下是「换一批字」的操作，不是试听；紧接着整面墙会重排，
 * 再叠一句「第二辑」只会盖住她真正想点的那个字的读音。
 */

import type { HanziVolume } from '@/data/seed/hanziCards'
import { BigButton } from '@/components/BigButton'

interface HanziVolumePickerProps {
  volumes: readonly HanziVolume[]
  /** 当前选中的辑 id */
  activeId: string
  onSelect: (id: string) => void
}

export function HanziVolumePicker({ volumes, activeId, onSelect }: HanziVolumePickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pb-1">
      {volumes.map((volume) => {
        const active = volume.id === activeId

        return (
          <BigButton
            key={volume.id}
            tone={active ? 'primary' : 'neutral'}
            // 家长听不到、孩子看不懂，两边的信息都塞进读屏文本里
            ariaLabel={`${volume.name}，100 个字，${volume.hint}`}
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
