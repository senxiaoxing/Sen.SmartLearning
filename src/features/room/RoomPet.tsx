/**
 * @file 小屋里的一只伙伴 —— 能拖着走，点一下会回应
 * @layer features
 * @see src/domain/pet/roomSpot.ts        站位坐标系与可及范围
 * @see src/features/room/RoomPets.tsx    上层：谁在说话、说什么
 * @see src/platform/useElementSize.ts    舞台像素尺寸的来源
 *
 * ## ⭐ 位置的两套单位，以及它们在哪儿换算
 *
 * 存的是舞台比例（0~1），framer-motion 拖的是像素。换算只发生在两处：
 * 挂载/舞台尺寸变化时比例 → 像素，松手时像素 → 比例。
 * 中间全程用像素，**不因为 store 里的 spot 变了就回写 motion value**——
 * 那会和 framer 自己的回弹动画抢同一个 transform，表现是一松手就跳一下。
 *
 * ## ⭐ 伙伴要随屋子一起变大
 *
 * 屋子改成整屏之后，固定 123px 的伙伴在 iPad 上会小得像贴纸。
 * 所以按舞台宽度等比放大（{@link PET_REFERENCE_WIDTH}），
 * 于是「伙伴占屋子多大一块」在任何屏幕上都一样——
 * 站位比例也才能在换设备后依然成立。
 */

import { motion, useAnimationControls, useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { PetAvatar } from '@/components/PetAvatar'
import { isOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import { ROOM_SPOT_BOUNDS, type RoomSpot } from '@/domain/pet/roomSpot'
import type { ElementSize } from '@/platform/useElementSize'
import type { PetState } from '@/domain/types'

/**
 * 舞台宽到这个值时伙伴是原始尺寸（`PetAvatar` 的 md，约 123px）。
 *
 * 取 720 是照着「三只并排后中间还剩得下一张桌子」定的：
 * 每只约占舞台宽度的 17%（最终形态 scale 1.2 时约 21%），
 * 三只加间距占掉一半多一点，屋子还留得出空。
 *
 * ⚠️ 改这个值要同时复核 `domain/pet/roomSpot.ts` 的 `ROOM_SPOT_BOUNDS`：
 * 边界是按「一整只还塞得进舞台」算的，伙伴变大了边界就得收窄，
 * 由 `roomSpot.test.ts` 的边界用例兜底。
 */
const PET_REFERENCE_WIDTH = 720

/** 缩放上下限。下限保证手机上还点得到（88pt 触控区），上限防止大屏上顶到天花板 */
const PET_SCALE_RANGE = { min: 0.8, max: 2.1 }

interface RoomPetProps {
  pet: PetState
  /** 该站在哪儿（舞台归一化坐标，指向盒子左上角） */
  spot: RoomSpot
  /** 舞台像素尺寸。宽为 0 表示还没测到，此时不要渲染 */
  stage: ElementSize
  /** 生日当天挂蛋糕 */
  festive: boolean
  /** 这只正在说的话；没在说话时为 `undefined` */
  bubble?: string
  /** 点了它（拖动不算） */
  onTap: () => void
  /** 松手了，参数是新站位（未夹范围，由上层负责夹） */
  onMoved: (spot: RoomSpot) => void
}

/**
 * 一只可拖动、可点击的伙伴。
 *
 * @param bubble - 气泡文字。⚠️ 孩子不识字，气泡只是「它在说话」的视觉提示，
 *                 内容靠声音传达（发声由上层统一负责，见 RoomPets）
 *
 * @example
 * <RoomPet pet={pet} spot={roomSpotOf(pet, 0)} stage={stage}
 *          festive={false} onTap={() => talk(pet)} onMoved={save} />
 */
export function RoomPet({ pet, spot, stage, festive, bubble, onTap, onMoved }: RoomPetProps) {
  const def = petDefinitionOf(pet.subject, pet.gradeLevel)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const hop = useAnimationControls()
  const [lifted, setLifted] = useState(false)
  /** 这一次交互到底是拖还是点。⚠️ 在 pointerdown 时重置，不能在 dragEnd 里清 ——
   *  click 是浏览器在 pointerup 之后另一轮才派发的，那时清早了 */
  const dragged = useRef(false)

  useEffect(() => {
    if (stage.width === 0) return
    x.set(spot.x * stage.width)
    y.set(spot.y * stage.height)
    // ⚠️ 故意不依赖 spot：她拖动之后 store 里的 spot 会变，
    //    但那时画面已经在新位置上了，再写一次只会和回弹动画打架
  }, [stage.width, stage.height, x, y])

  if (def === undefined || stage.width === 0) return null

  const petScale = Math.min(
    PET_SCALE_RANGE.max,
    Math.max(PET_SCALE_RANGE.min, stage.width / PET_REFERENCE_WIDTH),
  )

  return (
    <motion.div
      className="absolute left-0 top-0 cursor-grab active:cursor-grabbing"
      style={{
        x,
        y,
        // 站得靠前的挡住靠后的。拖动中的那只临时提到最前，
        // 否则她把伙伴拖到别人身后时会看着像「钻进去了」
        zIndex: lifted ? 60 : Math.round(spot.y * 100),
      }}
      drag
      dragMomentum={false}
      dragElastic={0.06}
      dragConstraints={{
        left: ROOM_SPOT_BOUNDS.minX * stage.width,
        right: ROOM_SPOT_BOUNDS.maxX * stage.width,
        top: ROOM_SPOT_BOUNDS.minY * stage.height,
        bottom: ROOM_SPOT_BOUNDS.maxY * stage.height,
      }}
      // 拿起来歪一点。只动 rotate（GPU 合成属性），不碰布局 —— CLAUDE.md 性能红线
      whileDrag={{ rotate: -5 }}
      onPointerDown={() => {
        dragged.current = false
      }}
      onDragStart={() => {
        dragged.current = true
        setLifted(true)
      }}
      onDragEnd={() => {
        setLifted(false)
        onMoved({ x: x.get() / stage.width, y: y.get() / stage.height })
      }}
      onClick={() => {
        if (dragged.current) return
        void hop.start({ y: [0, -12, 0], scale: [1, 1.08, 1] })
        onTap()
      }}
      role="button"
      aria-label={`${pet.name}，点一点它会说话，也可以拖着换个位置`}
    >
      {/* 尺寸缩放单独一层，且以左上角为原点 —— 站位记的就是左上角，
          若以中心缩放，同一个比例在不同形态（scale 0.85~1.2）下会落在不同的地方 */}
      <div style={{ transform: `scale(${petScale})`, transformOrigin: 'top left' }}>
        <motion.div animate={hop} className="origin-bottom">
          <PetAvatar
            def={def}
            stageIndex={levelProgress(pet.exp, pet.gradeLevel).stage}
            size="md"
            // 未开放科目的伙伴在睡觉，不是没养好 —— 宠物红线第 4 条
            asleep={!isOpened(pet.subject, pet.gradeLevel)}
            animated
            festive={festive}
          />
        </motion.div>
      </div>

      {bubble !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          // 气泡不跟着放大（字会变成巨无霸）。用 50%×petScale 把它挪到
          // 放大后那只的正上方 —— 百分比是相对未缩放的盒子宽度算的
          style={{ left: `${50 * petScale}%`, bottom: '100%' }}
          className="pointer-events-none absolute mb-1 w-max max-w-[42vw] -translate-x-1/2 rounded-blob bg-surface px-4 py-2 text-center text-base font-bold shadow-card sm:text-lg"
        >
          {bubble}
        </motion.div>
      )}
    </motion.div>
  )
}
