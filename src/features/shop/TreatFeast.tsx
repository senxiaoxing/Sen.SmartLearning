/**
 * @file 三只一起吃零食 —— 买了零食之后的那一小段动画
 * @layer features
 * @see src/data/seed/shopItems.ts  `TreatItem` 的定义与红线说明
 *
 * ## ⚠️ 这是一次性的开心，**不是喂养**
 *
 * 吃完什么都不产生：不加经验、不涨好感、没有饱食度。
 * 喂养系统在 design/02 §3.11、design/03 §4.5、design/06 §9 三处都被
 * 明确移除过，理由是它必然带来「没喂 = 宠物变惨」的惩罚感。
 *
 * ## ⭐ 三只**各拿到一份**，不是共分一块
 *
 * 最初只在正中间掉一块，三只凑过来。孩子实测反馈
 * 「只有中间出现一个小饼干，应该是三个宠物都吃到」——她说得对：
 * 一块饼干配三只，画面上就是有两只没吃着，
 * 而「谁吃到了」正是宠物红线第 3 条最不该出现的那种比较。
 * 现在每只头顶各掉一份，各吃各的，同时开心。
 *
 * ## ⭐ 动画要够长
 *
 * 同样是实测反馈：「吃小饼干的动画太短了」。原来全程 1.25 秒，
 * 掉下来还没看清是什么就没了。现在拆成四拍——
 * 掉落 → **停住让她看清** → 吃掉 → 一起蹦一下，将近 3 秒。
 * 这是花掉星星唯一能看见的回报，值得给足时间。
 *
 * 动画只用 `scale` / `opacity` / `y` / `rotate`（transform 类，GPU 合成），
 * 不碰任何触发 layout 的属性 —— CLAUDE.md 性能红线。
 */

import { motion } from 'framer-motion'
import { PetAvatar } from '@/components/PetAvatar'
import { ShopItemArt } from '@/components/room/ShopItemArt'
import { isOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState } from '@/domain/types'

/** 零食从上方落到伙伴头顶要多久（秒） */
const FALL_SEC = 0.55
/** 落定之后停多久才开始被吃掉 —— 太快看不清是什么东西，这一拍是给她看的 */
const PAUSE_SEC = 1.0
/** 「吃掉」这个动作本身的时长 */
const EAT_SEC = 0.55
/** 吃完一起蹦一下 */
const CHEER_SEC = 0.5

const EAT_AT = FALL_SEC + PAUSE_SEC
/** 一只伙伴从头到尾的总时长 */
const SOLO_SEC = EAT_AT + EAT_SEC + CHEER_SEC

/** 三只错开一点点，一起整齐划一地动会像机器人 */
const STAGGER_SEC = 0.14

interface TreatFeastProps {
  /** 零食的图形名，如 `'cookie'` */
  art: string
  pets: readonly PetState[]
}

/**
 * 每只头顶掉一份零食 → 停住看清 → 吃掉 → 一起开心地蹦一下。
 *
 * @param art - 零食图形名
 * @param pets - 三只伙伴，缺谁少谁都照常播（不因数据异常卡住这段动画）
 *
 * @example
 * <TreatFeast art="cookie" pets={pets} />
 */
export function TreatFeast({ art, pets }: TreatFeastProps) {
  return (
    <div className="relative flex h-48 w-full items-end justify-center gap-1 sm:gap-2">
      {pets.map((pet, index) => {
        const def = petDefinitionOf(pet.subject, pet.gradeLevel)
        if (def === undefined) return null

        return (
          <div key={pet.id} className="relative flex flex-col items-center justify-end">
            <motion.span
              aria-hidden
              className="absolute bottom-full left-1/2 h-12 w-12 -translate-x-1/2"
              initial={{ y: -46, opacity: 0, scale: 0.7 }}
              animate={{
                // 掉下来 → 停在原地 → 缩小消失，那就是「被吃掉」
                y: [-46, 14, 14, 22],
                opacity: [0, 1, 1, 0],
                scale: [0.7, 1, 1, 0.3],
              }}
              transition={{
                duration: EAT_AT + EAT_SEC,
                times: [0, FALL_SEC / (EAT_AT + EAT_SEC), EAT_AT / (EAT_AT + EAT_SEC), 1],
                delay: index * STAGGER_SEC,
                ease: 'easeOut',
              }}
            >
              <ShopItemArt art={art} />
            </motion.span>

            <motion.span
              className="flex items-end"
              initial={{ scale: 0.92, y: 0, rotate: 0 }}
              animate={{
                // 抬头看 → 张嘴够 → 咀嚼（左右各歪一下）→ 蹦起来
                scale: [0.92, 1, 1, 1.04, 1, 1.1, 1],
                y: [0, 0, -6, 0, 0, -14, 0],
                rotate: [0, 0, 0, -4, 4, 0, 0],
              }}
              transition={{
                duration: SOLO_SEC,
                times: timesOf([FALL_SEC, PAUSE_SEC * 0.6, PAUSE_SEC * 0.4, EAT_SEC * 0.5, EAT_SEC * 0.5, CHEER_SEC]),
                delay: index * STAGGER_SEC,
                ease: 'easeOut',
              }}
            >
              <PetAvatar
                def={def}
                stageIndex={levelProgress(pet.exp, pet.gradeLevel).stage}
                size="md"
                asleep={!isOpened(pet.subject, pet.gradeLevel)}
                animated={false}
              />
            </motion.span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 把「每一拍多长」换算成 framer-motion 要的 `times`（0~1 的累计比例）。
 *
 * 手写 `times` 数组的问题是：调任何一拍的时长，后面全部要重算，
 * 而算错的表现只是「动画节奏怪怪的」，不会报错也没人查得出来。
 *
 * @param beats - 每一拍的秒数，长度比关键帧数少 1
 * @returns 长度为 `beats.length + 1` 的递增比例数组，首项 0、末项 1
 *
 * @example
 * timesOf([1, 1, 2])   // [0, 0.25, 0.5, 1]
 */
function timesOf(beats: readonly number[]): number[] {
  const total = beats.reduce((sum, beat) => sum + beat, 0)
  const times = [0]
  let elapsed = 0
  for (const beat of beats) {
    elapsed += beat
    times.push(elapsed / total)
  }
  return times
}
