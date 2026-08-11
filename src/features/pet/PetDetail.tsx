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
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { PetAvatar, PetLevelBar } from '@/components/PetAvatar'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress, MAX_LEVEL } from '@/domain/pet/growth'
import { greetingMoment, pickLine } from '@/domain/pet/personality'
import { nowIso } from '@/domain/time'
import { speak } from '@/platform/tts'
import type { PetState } from '@/domain/types'

interface PetDetailProps {
  pet: PetState
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
 * @param renaming - 是否处于改名态。改名是全 App 唯一需要键盘的地方
 *
 * @example
 * <PetDetail pet={pet} renaming={false} draftName="" … />
 */
export function PetDetail({
  pet,
  renaming,
  draftName,
  onDraftChange,
  onStartRename,
  onCancelRename,
  onConfirmRename,
}: PetDetailProps) {
  const def = petDefinitionOf(pet.subject, pet.gradeLevel)
  const [line, setLine] = useState('')

  const progress = levelProgress(pet.exp)
  const opened = def !== undefined && isSubjectOpened(pet.subject)

  useEffect(() => {
    if (def === undefined || !opened) return
    const moment = greetingMoment(pet.lastSeenAt, nowIso())
    const text = pickLine(def.personality, moment, Math.random())
    setLine(text)
    speak(text)
  }, [pet.id, pet.lastSeenAt, def, opened])

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
          const text = pickLine(def.personality, 'greet', Math.random())
          setLine(text)
          speak(text)
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
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <input
            value={draftName}
            onChange={(e) => onDraftChange(e.target.value)}
            maxLength={8}
            autoFocus
            aria-label="宠物名字"
            className="w-full rounded-blob border-4 border-primary/40 bg-surface px-5 py-3 text-center text-2xl font-bold text-ink outline-none"
          />
          <div className="flex gap-3">
            <BigButton tone="neutral" onClick={onCancelRename}>
              算了
            </BigButton>
            <BigButton tone="primary" onClick={onConfirmRename}>
              就叫这个
            </BigButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{pet.name}</span>
            <span className="text-base text-ink/40">{def.species}</span>
          </div>

          {opened ? (
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

          {/* ⭐ 起名是最强的情感绑定，入口要好找 */}
          <button
            type="button"
            onClick={onStartRename}
            className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 text-base text-ink/60 shadow-card"
          >
            <Icon name="pencil" className="h-5 w-5" />
            给它起个名字
          </button>
        </div>
      )}
    </main>
  )
}
