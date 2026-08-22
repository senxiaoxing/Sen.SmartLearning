/**
 * @file 宠物详情 —— 单只伙伴的形象、等级与起名
 * @layer features
 * @see design/06-宠物系统.md  成长曲线与性格设计
 *
 * 从 PetHome 拆出来的原因是行数（CLAUDE.md 组件 ≤200 行），
 * 但拆得开也说明职责本来就是两件事：PetHome 管「在三只之间切换」，
 * 这里管「这一只怎么样」。
 *
 * ⚠️ 产品红线：这里**绝不出现任何跨宠物的比较**——不排名、不并列进度、
 * 不写「最高级的是…」。把三只的差距摆上台面等于惩罚孩子对某个科目的兴趣。
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { PetAvatar, PetLevelBar } from '@/components/PetAvatar'
import { GRADE_NAME } from '@/data/seed/gradeLabels'
import { isOpened, petDefinitionOf } from '@/data/seed/pets'
import { addressed } from '@/domain/encourage/addressed'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { levelProgress } from '@/domain/pet/growth'
import { MAX_LEVEL } from '@/domain/pet/levelCurves'
import { greetingMoment, pickLine } from '@/domain/pet/personality'
import { utter } from '@/domain/speech'
import { nowIso } from '@/domain/time'
import { PetNamePicker } from '@/features/pet/PetNamePicker'
import { say } from '@/platform/speech'
import { useProfileStore } from '@/stores/profileStore'
import type { PetState } from '@/domain/types'

interface PetDetailProps {
  pet: PetState
  /** 往届伙伴：已经陪她读完那一年，不再成长。见下面的说明 */
  archived?: boolean
  renaming: boolean
  draftName: string
  onDraftChange: (v: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
}

/**
 * 一只伙伴的详情面板。
 *
 * @param pet - 当前选中的宠物
 * @param archived - 往届伙伴。⛔ **不显示经验条、不显示「还差多少升级」**——
 *                   它已经完成了，再挂一个永远走不完的进度条，
 *                   等于告诉她「你当年没养满」。也不提供改名：
 *                   起名是养育动作的一部分，那一程已经走完了。
 *                   ✅ 但它仍然会说话、仍然可以点着玩——回忆里的伙伴还认得她，
 *                   这正是「存档」和「删掉」的全部区别
 * @param renaming - 是否处于改名态。起名从预录名单里点选（PetNamePicker），
 *                   不再用键盘——预设之外的名字没有语音片段，升级播报会掉成机器音
 *
 * @example
 * <PetDetail pet={pet} renaming={false} draftName="" … />
 * <PetDetail pet={lastYearPet} archived renaming={false} draftName="" … />
 */
export function PetDetail({
  pet,
  archived = false,
  renaming,
  draftName,
  onDraftChange,
  onStartRename,
  onCancelRename,
  onConfirmRename,
}: PetDetailProps) {
  const def = petDefinitionOf(pet.subject, pet.gradeLevel)
  const nicknames = useProfileStore((s) => s.nicknames)
  const [line, setLine] = useState('')

  const progress = levelProgress(pet.exp, pet.gradeLevel)
  const opened = def !== undefined && isOpened(pet.subject, pet.gradeLevel)

  /**
   * 见面第一句叫名字：「小恩宝，我有点想你」。
   *
   * ⚠️ 只有见面这一句带昵称，后面点着玩的台词不带——
   * 每一句都喊名字会从「它记得我」变成「它只会喊我名字」。
   */
  useEffect(() => {
    if (def === undefined || !opened) return
    const moment = greetingMoment(pet.lastSeenAt, nowIso())
    const spoken = pickLine(def.personality, moment, Math.random())
    const greeting = addressed(
      pickNickname(nicknames, Math.random()),
      [spoken.clipKey],
      spoken.text,
    )
    setLine(greeting.text)
    say(greeting.utterance)
  }, [pet.id, pet.lastSeenAt, def, opened, nicknames])

  if (def === undefined) return null
  const stage = def.stages[progress.stage]

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => {
          if (!opened) return
          // 反复点着玩的台词不带昵称，理由见上面 useEffect 的说明
          const spoken = pickLine(def.personality, 'greet', Math.random())
          setLine(spoken.text)
          say(utter([spoken.clipKey], spoken.text))
        }}
      >
        <PetAvatar def={def} stageIndex={progress.stage} size="lg" asleep={!opened} animated />
      </motion.div>

      {opened && line.length > 0 && (
        <motion.div
          key={line}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xs rounded-blob bg-surface px-5 py-3 text-center text-lg shadow-card"
        >
          {line}
        </motion.div>
      )}

      {renaming ? (
        <PetNamePicker
          defaultName={def.defaultName}
          current={draftName}
          onPick={onDraftChange}
          onCancel={onCancelRename}
          onConfirm={onConfirmRename}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{pet.name}</span>
            <span className="text-base text-ink/40">{def.species}</span>
          </div>

          {archived ? (
            // ⛔ 往届只说陪伴，不说成绩：既不显示等级进度，也不提「最终形态」——
            // 任何暗示「养到了第几阶」的说法，都会让没养满的那一只变成遗憾
            <p className="max-w-xs text-center text-base text-ink/50">
              {def.species}陪你上完了{GRADE_NAME[pet.gradeLevel]}，现在住在回忆里～
            </p>
          ) : opened ? (
            <>
              <div className="w-64">
                <PetLevelBar
                  level={progress.level}
                  ratio={progress.ratio}
                  isMax={progress.isMax}
                  color={def.themeColor}
                />
              </div>
              <p className="text-sm text-ink/50">
                {progress.isMax
                  ? `已经是最厉害的 ${stage.label} 啦！`
                  : `再做 ${Math.ceil(progress.expToNextLevel / 2)} 道题就升级`}
                {/* 形态每 2 级一变：偶数级的下一级就是变身 */}
                {progress.level < MAX_LEVEL && progress.level % 2 === 0 && ' · 下一级会变身哦'}
              </p>
            </>
          ) : (
            <p className="max-w-xs text-center text-base text-ink/50">
              {def.species}还在睡觉，等{pet.subject === 'pinyin' ? '语文' : '英语'}
              课程准备好就会醒来～
            </p>
          )}

          {/* ⭐ 起名是最强的情感绑定，入口要好找。往届不给改：那一程已经走完了 */}
          {!archived && (
            <button
              type="button"
              onClick={onStartRename}
              className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 text-base text-ink/60 shadow-card"
            >
              <Icon name="pencil" className="h-5 w-5" />
              给它起个名字
            </button>
          )}
        </div>
      )}
    </main>
  )
}
