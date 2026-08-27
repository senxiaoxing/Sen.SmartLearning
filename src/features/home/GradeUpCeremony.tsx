/**
 * @file 升年级过场 —— 「你已经是二年级的大孩子啦」
 * @layer features
 * @see src/domain/encourage/gradeUpLine.ts  这句话怎么拼出来、为什么必须说
 * @see design/08-年级分区与内容扩展.md §6.3  升年级是仪式，不是断崖
 * @see design/08-年级分区与内容扩展.md §5.2  往届伙伴去了哪里
 *
 * ## 它挡在首页前面，是刻意的
 *
 * 改 `Profile.grade` 会一次性换掉三只伙伴、整体前移内容范围，
 * 而改这个开关的地方是**家长区**——孩子看不到那一下。
 * 做成首页上一张可以忽略的卡片，等于让她自己去发现企鹅变成了猫。
 * 一年一次，值得占满一整屏。
 *
 * ## ⚠️ 挂载时不自动朗读
 *
 * iOS 只在用户手势里允许播放，而这一屏是自己弹出来的。
 * 自动 `say()` 会静默失败，看起来就像「坏了」。
 * 所以走首页问候语那套已经验证过的模式：**整句可点，点一下才念**
 * （见 `HomeGreeting`），解锁与朗读在同一个同步栈里完成。
 *
 * ## ⚠️ 一次只说一句话
 *
 * 「你长大了」和「旧伙伴没有走」拼在**同一句** `SpokenLine` 里
 * （`gradeUpLine()` 负责），这一屏只有一个 `say()`。
 * 要加新播报就往那句话里拼，不要在这里新开 effect——
 * 升级横幅就是这么被小结语掐掉的（CLAUDE.md「一次只说一句话」）。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PetAvatar } from '@/components/PetAvatar'
import { BigButton } from '@/components/BigButton'
import { SpeakerButton } from '@/components/SpeakerButton'
import { loadPreviousGradePets } from '@/data/repositories/petRepo'
import { petDefinitionOf } from '@/data/seed/pets'
import { gradeUpLine } from '@/domain/encourage/gradeUpLine'
import { levelProgress } from '@/domain/pet/growth'
import { unlockAllAudio } from '@/features/home/unlockAllAudio'
import type { Nickname } from '@/domain/encourage/addressed'
import type { GradeLevel, PetState, Uuid } from '@/domain/types'

interface GradeUpCeremonyProps {
  /** 升到了哪个年级 */
  gradeLevel: GradeLevel
  profileId: Uuid
  nickname: Nickname
  /** 她点了「知道啦」。实现方负责清掉 `pendingGradeUp`，否则下次还会再演一遍 */
  onDismiss: () => void
}

/**
 * 升年级过场。全屏，一句话，一个按钮。
 *
 * ⛔ **不给任何奖励**——不加积分、不送经验、不解锁内容。理由同生日
 * （见 `domain/encourage/birthdayLine.ts`）：挂上奖励它就从「今天是你的日子」
 * 变成又一个可以领的东西，而升年级本来是件只需要被看见的事。
 *
 * @example
 * <GradeUpCeremony gradeLevel="G2" pets={pets} nickname={nickname} onDismiss={dismiss} />
 */
export function GradeUpCeremony({
  gradeLevel,
  profileId,
  nickname,
  onDismiss,
}: GradeUpCeremonyProps) {
  const line = gradeUpLine(nickname, gradeLevel)
  /**
   * 露脸的是**上一批**伙伴，不是新的。
   *
   * 新那批此刻 `exp` 全是 0，画出来是三个几乎一样的蛋，
   * 而这句话的主语本来就是旧伙伴（见 `loadPreviousGradePets`）。
   */
  const [farewellPets, setFarewellPets] = useState<PetState[]>([])

  useEffect(() => {
    void loadPreviousGradePets(profileId, gradeLevel).then(setFarewellPets)
  }, [profileId, gradeLevel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      // 只动 opacity / transform（GPU 合成），不碰尺寸属性
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-canvas px-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
        // mb 而不是靠父级 gap：PetAvatar 自带投影与留白，
        // 光靠 gap 时企鹅的脚会贴着下面那行字
        className="mb-2 flex items-end gap-3"
      >
        {farewellPets.map((pet) => {
          const def = petDefinitionOf(pet.subject, pet.gradeLevel)
          if (def === undefined) return null
          return (
            <PetAvatar
              key={pet.id}
              def={def}
              stageIndex={levelProgress(pet.exp, pet.gradeLevel).stage}
              size={pet.subject === 'math' ? 'lg' : 'md'}
              animated
            />
          )
        })}
      </motion.div>

      <p className="max-w-lg text-center text-3xl font-bold leading-snug tracking-tight">
        {line.text}
      </p>

      {/* 她不识字，这句话不念出来等于没说。用全 App 同一个喇叭——
          她在每道题上按了几百次，这里不需要再学一次新东西 */}
      <SpeakerButton
        text={line.utterance.fallbackText}
        parts={line.utterance.parts}
        // ⚠️ 这一屏是自己弹出来的，可能是 App 打开后的第一次点击 —— 先解锁
        onBeforeSpeak={() => unlockAllAudio(nickname)}
      />

      <BigButton tone="primary" className="px-12 py-5 text-2xl" onClick={onDismiss}>
        知道啦
      </BigButton>
    </motion.div>
  )
}
