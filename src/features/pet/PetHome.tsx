/**
 * @file 宠物页 —— 三只伙伴的详情与互动
 * @layer features
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { PetAvatar, PetLevelBar } from '@/components/PetAvatar'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress, MAX_LEVEL } from '@/domain/pet/growth'
import { greetingMoment, pickLine } from '@/domain/pet/personality'
import { nowIso } from '@/domain/time'
import { speak } from '@/platform/tts'
import { usePetStore } from '@/stores/petStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { PetState } from '@/domain/types'

export function PetHome() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const gradeLevel = useSessionStore((s) => s.gradeLevel)
  const pets = usePetStore((s) => s.pets)
  const load = usePetStore((s) => s.load)
  const rename = usePetStore((s) => s.rename)
  const [activeIndex, setActiveIndex] = useState(0)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (profileId !== null) void load(profileId, gradeLevel)
  }, [profileId, gradeLevel, load])

  const pet = pets[activeIndex]

  return (
    <div className="safe-area flex h-full flex-col px-6 py-4">
      <header className="flex items-center gap-4">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/')}
          className="h-12 w-12 shrink-0 rounded-full bg-white/70 text-2xl text-ink/50"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">我的伙伴</h1>
      </header>

      {/* 三只切换。刻意用平铺的头像而非排行榜式列表，避免暗示高下 */}
      <nav className="mt-4 flex items-center justify-center gap-3">
        {pets.map((p, i) => {
          const def = petDefinitionOf(p.subject, p.gradeLevel)
          if (def === undefined) return null
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.name}
              onClick={() => {
                setActiveIndex(i)
                setRenaming(false)
              }}
              className={[
                'rounded-blob p-2 transition-opacity',
                i === activeIndex ? 'bg-white shadow-[0_4px_0_#E8DFCC]' : 'opacity-50',
              ].join(' ')}
            >
              <PetAvatar
                def={def}
                stageIndex={levelProgress(p.exp).stage}
                size="sm"
                animated={false}
                asleep={!isSubjectOpened(p.subject)}
              />
            </button>
          )
        })}
      </nav>

      {pet !== undefined && (
        <PetDetail
          key={pet.id}
          pet={pet}
          renaming={renaming}
          draftName={draftName}
          onDraftChange={setDraftName}
          onStartRename={() => {
            setDraftName(pet.name)
            setRenaming(true)
          }}
          onCancelRename={() => setRenaming(false)}
          onConfirmRename={() => {
            if (profileId !== null) {
              void rename(profileId, pet.subject, pet.gradeLevel, draftName)
            }
            setRenaming(false)
          }}
        />
      )}
    </div>
  )
}

interface PetDetailProps {
  pet: PetState
  renaming: boolean
  draftName: string
  onDraftChange: (v: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
}

function PetDetail({
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
          className="max-w-xs rounded-blob bg-white px-5 py-3 text-center text-lg shadow-[0_4px_0_#E8DFCC]"
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
            className="w-full rounded-blob border-4 border-honey/40 bg-white px-5 py-3 text-center text-2xl font-bold outline-none"
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
            className="rounded-full bg-white/70 px-5 py-2 text-base text-ink/60"
          >
            ✏️ 给它起个名字
          </button>
        </div>
      )}
    </main>
  )
}
