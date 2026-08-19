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
 * ## ⚠️ 三只一起吃，不选「喂哪一只」
 *
 * 让她挑一只来喂，就是让她给三只排序——那和「每件家具买三次」是同一个陷阱
 * （宠物红线第 3 条）。所以零食掉在正中间，三只一起凑过来。
 *
 * 动画只用 `scale` / `opacity` / `y`（transform 类，GPU 合成），
 * 不碰任何触发 layout 的属性 —— CLAUDE.md 性能红线。
 */

import { motion } from 'framer-motion'
import { PetAvatar } from '@/components/PetAvatar'
import { ShopItemArt } from '@/components/room/ShopItemArt'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import type { PetState } from '@/domain/types'

/** 零食落到三只中间要多久（秒） */
const FALL_SEC = 0.45
/** 落定之后停多久才开始被吃掉——太快看不清是什么东西 */
const PAUSE_SEC = 0.5
/** 「吃掉」这个动作本身的时长 */
const EAT_SEC = 0.45

const EAT_AT = FALL_SEC + PAUSE_SEC

interface TreatFeastProps {
  /** 零食的图形名，如 `'cookie'` */
  art: string
  pets: readonly PetState[]
}

/**
 * 零食掉下来 → 三只凑过来 → 吃掉 → 一起开心地跳一下。
 *
 * @param art - 零食图形名
 * @param pets - 三只伙伴，缺谁少谁都照常播（不因数据异常卡住这段动画）
 *
 * @example
 * <TreatFeast art="cookie" pets={pets} />
 */
export function TreatFeast({ art, pets }: TreatFeastProps) {
  return (
    <div className="relative flex h-40 w-full items-end justify-center gap-1">
      {/* 零食：从上方掉到三只中间，停一下，然后缩小消失 —— 那就是「被吃掉」 */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2"
        initial={{ y: -40, opacity: 0, scale: 0.7 }}
        animate={{
          y: [-40, 24, 24, 30],
          opacity: [0, 1, 1, 0],
          scale: [0.7, 1, 1, 0.35],
        }}
        transition={{
          duration: EAT_AT + EAT_SEC,
          times: [0, FALL_SEC / (EAT_AT + EAT_SEC), EAT_AT / (EAT_AT + EAT_SEC), 1],
          ease: 'easeOut',
        }}
      >
        <ShopItemArt art={art} />
      </motion.span>

      {pets.map((pet, index) => {
        const def = petDefinitionOf(pet.subject, pet.gradeLevel)
        if (def === undefined) return null

        return (
          <motion.span
            key={pet.id}
            className="flex items-end"
            initial={{ scale: 0.9, y: 0 }}
            animate={{
              // 先微微凑近（放大一点），吃完再开心地跳一下
              scale: [0.9, 1, 1, 1.06, 1],
              y: [0, 0, 0, -10, 0],
            }}
            transition={{
              duration: EAT_AT + EAT_SEC + 0.35,
              times: [0, 0.25, 0.62, 0.82, 1],
              // 三只错开一点点，一起整齐划一地跳会像机器人
              delay: index * 0.06,
              ease: 'easeOut',
            }}
          >
            <PetAvatar
              def={def}
              stageIndex={levelProgress(pet.exp).stage}
              size="md"
              asleep={!isSubjectOpened(pet.subject)}
              animated={false}
            />
          </motion.span>
        )
      })}
    </div>
  )
}
