/**
 * @file 宠物页 —— 在三只伙伴之间切换
 * @layer features
 * @see src/features/pet/PetDetail.tsx  单只伙伴的详情与起名
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { PetAvatar } from '@/components/PetAvatar'
import { isSubjectOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import { PetDetail } from '@/features/pet/PetDetail'
import { usePetStore } from '@/stores/petStore'
import { useSessionStore } from '@/stores/sessionStore'

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
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} title="我的伙伴" />

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
                i === activeIndex ? 'bg-surface shadow-card' : 'opacity-50',
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
    </AppShell>
  )
}
