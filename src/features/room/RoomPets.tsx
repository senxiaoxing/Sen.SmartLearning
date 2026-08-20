/**
 * @file 小屋里的三只伙伴 —— 摆放与说话，整层就这一处发声
 * @layer features
 * @see src/features/room/RoomPet.tsx  单只的拖动与点击
 * @see src/domain/pet/roomSpot.ts     站位坐标系
 * @see design/06-宠物系统.md §10      小屋与自由站位
 *
 * ## ⭐ 一次只说一句话
 *
 * 「谁在说话」是**这一层**的状态，不是每只自己管。三只各自持有一个气泡、
 * 各自 `say()` 的话，她连点两下就会听到两句叠在一起——
 * 而 `say()` 是打断式的，后一句必然把前一句掐掉（CLAUDE.md 产品红线）。
 * 所以同一时刻只有一个 `talking`，新的一句自然顶掉旧的。
 *
 * ## ⭐ 进屋不自动打招呼
 *
 * 宠物页那样一进去就说话，在这里做不到：**得先挑一只来说**，
 * 而挑哪只都是在三只之间排序（宠物红线第 3 条）。
 * 所以小屋里的话全部由她点出来——她点谁谁说，这本身就是最好的答案。
 */

import { useEffect, useRef, useState } from 'react'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { pickLine } from '@/domain/pet/personality'
import { roomSpotOf, type RoomSpot } from '@/domain/pet/roomSpot'
import { utter } from '@/domain/speech'
import { RoomPet } from '@/features/room/RoomPet'
import { say } from '@/platform/speech'
import { useElementSize } from '@/platform/useElementSize'
import type { PetState, Uuid } from '@/domain/types'

/** 气泡挂多久（毫秒）。比台词略长一点，让最后一个字说完了字还在 */
const BUBBLE_MS = 4200

/**
 * 睡着的伙伴点了给什么。
 *
 * ⚠️ 是一个「它在睡觉」的符号，**不发声**：没开放的科目没有预录台词，
 * 现场 TTS 会在满屋子少女音里冒出一句机器音，
 * 而这正是这次要修掉的问题（见 domain/economy/celebrationLine.ts）。
 */
const SLEEPING_BUBBLE = '💤'

interface RoomPetsProps {
  pets: readonly PetState[]
  /** 生日当天给每只挂个蛋糕 */
  festive?: boolean
  /** 摆到了新位置。上层负责夹范围与落库 */
  onMove: (petId: Uuid, spot: RoomSpot) => void
}

/**
 * 铺满舞台的伙伴层。
 *
 * ⚠️ 根节点是 `absolute inset-0`，必须放进 `RoomScene` 的 children 里——
 * 它同时是拖动的坐标系原点和 `dragConstraints` 的量尺，
 * 挪到别的容器里三只就会按错误的尺寸算站位。
 *
 * @param pets - 三只伙伴，数组顺序决定默认站位（左 / 中 / 右）
 * @param onMove - 松手回调
 *
 * @example
 * <RoomScene owned={owned}>
 *   <RoomPets pets={pets} festive={birthday} onMove={moveInRoom} />
 * </RoomScene>
 */
export function RoomPets({ pets, festive = false, onMove }: RoomPetsProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const stage = useElementSize(stageRef)
  const [talking, setTalking] = useState<{ petId: Uuid; text: string } | null>(null)

  useEffect(() => {
    if (talking === null) return
    const timer = setTimeout(() => setTalking(null), BUBBLE_MS)
    return () => clearTimeout(timer)
  }, [talking])

  const talk = (pet: PetState): void => {
    const def = petDefinitionOf(pet.subject, pet.gradeLevel)
    if (def === undefined) return

    if (!isSubjectOpened(pet.subject)) {
      setTalking({ petId: pet.id, text: SLEEPING_BUBBLE })
      return
    }

    // 反复点着玩的台词不带昵称 —— 每一句都喊名字会从「它记得我」
    // 变成「它只会喊我名字」（CLAUDE.md 昵称红线）
    const line = pickLine(def.personality, 'greet', Math.random())
    setTalking({ petId: pet.id, text: line.text })
    say(utter([line.clipKey], line.text))
  }

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 transition-opacity duration-300"
      // 舞台还没量出来时三只会全挤在左上角。先藏一帧，量到了再淡入
      style={{ opacity: stage.width === 0 ? 0 : 1 }}
    >
      {pets.map((pet, index) => (
        <RoomPet
          key={pet.id}
          pet={pet}
          spot={roomSpotOf(pet, index)}
          stage={stage}
          festive={festive}
          {...(talking?.petId === pet.id && { bubble: talking.text })}
          onTap={() => talk(pet)}
          onMoved={(spot) => onMove(pet.id, spot)}
        />
      ))}
    </div>
  )
}
