/**
 * @file 宠物页 —— 在三只伙伴之间切换，也能翻回往届的伙伴
 * @layer features
 * @see src/features/pet/PetDetail.tsx  单只伙伴的详情与起名
 * @see design/08-年级分区与内容扩展.md §5.2  为什么必须有「回忆」这个地方
 *
 * ## ⭐ 往届伙伴不会消失
 *
 * 宠物按「科目 × 年级」划分，升年级会换一批新的。没有这一页的话，
 * 孩子养到满级的团团会在升年级那天**直接从首页消失**——
 * 那比二升三失去语音伤人得多。
 *
 * 年级切换条复用 `VolumePicker`：她在识字墙和诗单上已经学会
 * 「按数字换一批」，这里原样再用一次。只在**养过一个以上年级**时才出现，
 * 与 `SubjectPicker`「只在开放科目多于一个时才出现」同构——
 * 现在只有一年级，这一页看起来和以前一模一样。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { PetAvatar } from '@/components/PetAvatar'
import { VolumePicker } from '@/components/VolumePicker'
import { loadOwnedGrades, loadPets } from '@/data/repositories/petRepo'
import { GRADE_BADGE, GRADE_NAME } from '@/data/seed/gradeLabels'
import { isOpened, petDefinitionOf } from '@/data/seed/pets'
import { levelProgress } from '@/domain/pet/growth'
import { PetDetail } from '@/features/pet/PetDetail'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import { gradeLevelOf, type GradeLevel, type PetState } from '@/domain/types'

export function PetHome() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  // 她**在读**几年级——正在养的就是这一批。与首页「做哪个年级的题」无关：
  // 切到往届答题区不会让往届的伙伴重新开始长
  const gradeLevel = gradeLevelOf(useProfileStore((s) => s.grade))
  const pets = usePetStore((s) => s.pets)
  const load = usePetStore((s) => s.load)
  const rename = usePetStore((s) => s.rename)
  /**
   * 她翻到了哪个年级。`null` = 跟着档案年级走。
   *
   * ⚠️ **不能写成 `useState(gradeLevel)`**（原来就是那样，二年级开放后才暴露）：
   * `profileStore.grade` 是异步读出来的，初值恒为 `'1A'`。用它当 `useState` 初值，
   * 首帧就把 `viewGrade` 钉死在 `'G1'`，之后档案年级变成 `'G2'` 它也不会再跟——
   * 于是二年级的孩子每次刷新进这一页，看到的都是**往届存档**：
   * 正在养的三只一只不见，迎面是「小企鹅陪你上完了一年级，现在住在回忆里」。
   *
   * 做成可空之后 `archived` 在加载期间恒为 `false`，绝不会误进存档态。
   * 与首页 `contentGradeLevel ?? 档案年级` 是同一个写法。
   */
  const [viewGradeOverride, setViewGradeOverride] = useState<GradeLevel | null>(null)
  const viewGrade = viewGradeOverride ?? gradeLevel
  const [ownedGrades, setOwnedGrades] = useState<GradeLevel[]>([])
  const [archivePets, setArchivePets] = useState<PetState[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (profileId === null) return
    void load(profileId, gradeLevel)
    void loadOwnedGrades(profileId).then(setOwnedGrades)
  }, [profileId, gradeLevel, load])

  /**
   * 往届的伙伴单独读，**不塞进 petStore**——那里的 `pets` 是「当前年级」的，
   * 首页、小屋、商店都在用。翻一下回忆就把全局改掉，那三处会跟着一起变。
   */
  useEffect(() => {
    if (profileId === null || viewGrade === gradeLevel) return
    void loadPets(profileId, viewGrade).then(setArchivePets)
  }, [profileId, viewGrade, gradeLevel])

  const archived = viewGrade !== gradeLevel
  // 当前年级走 store：改完名字要立刻反映出来
  const shown = archived ? archivePets : pets
  const pet = shown[activeIndex]

  // 点回当前年级时存 null 而不是存那个值：这样家长在别处改了档案年级，
  // 这一页会自动跟上，不需要两处互相同步（同 sessionStore.setContentGrade）
  const switchTo = (grade: GradeLevel) => {
    setViewGradeOverride(grade === gradeLevel ? null : grade)
    setActiveIndex(0)
    setRenaming(false)
  }

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} title="我的伙伴" />

      {/* 只养过一个年级时不出现——多一层选择对她是纯粹的干扰 */}
      {ownedGrades.length > 1 && (
        <div className="mt-3">
          <VolumePicker
            volumes={ownedGrades.map((g) => ({
              id: g,
              name: GRADE_NAME[g],
              badge: GRADE_BADGE[g],
              hint: g === gradeLevel ? '正在一起学习' : '陪你走过的伙伴',
            }))}
            activeId={viewGrade}
            countLabel="三个伙伴"
            onSelect={(id) => switchTo(id as GradeLevel)}
          />
        </div>
      )}

      {/* 三只切换。刻意用平铺的头像而非排行榜式列表，避免暗示高下 */}
      <nav className="mt-4 flex items-center justify-center gap-3">
        {shown.map((p, i) => {
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
                stageIndex={levelProgress(p.exp, p.gradeLevel).stage}
                size="sm"
                animated={false}
                asleep={!isOpened(p.subject, p.gradeLevel)}
              />
            </button>
          )
        })}
      </nav>

      {pet !== undefined && (
        <PetDetail
          key={pet.id}
          pet={pet}
          archived={archived}
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
