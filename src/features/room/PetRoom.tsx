/**
 * @file 宠物小屋 —— 三只伙伴住的地方，也是买来的家具摆放的地方
 * @layer features
 * @see src/components/room/RoomScene.tsx  场景渲染
 * @see design/02-数据库Schema.md §3.12b   purchases 表
 *
 * ⭐ **一间共享小屋，不是三个房间**。理由写在 `RoomScene.tsx` 文件头，
 * 一句话概括：分房会让孩子先装扮最喜欢的那只，另外两只空着——
 * 那是宠物红线第 3 条的另一种形式，而且比等级差距更伤，
 * 因为空着是她自己选的。
 *
 * 家具位置写死、买了自动摆好，这里**没有任何布置操作**——
 * 一年级孩子不该做「摆放」这种事。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { PageHeader } from '@/components/PageHeader'
import { RoomScene } from '@/components/room/RoomScene'
import { ownedRoomItemIds } from '@/data/repositories/purchaseQueries'
import { ROOM_ITEMS } from '@/data/seed/shopItems'
import { isBirthday } from '@/domain/encourage/birthdayLine'
import { todayLocal } from '@/domain/time'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'

export function PetRoom() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const gradeLevel = useSessionStore((s) => s.gradeLevel)
  const balance = useSessionStore((s) => s.balance)
  const birthDate = useProfileStore((s) => s.birthDate)
  const pets = usePetStore((s) => s.pets)
  const loadPets = usePetStore((s) => s.load)
  const [owned, setOwned] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (profileId === null) return
    void loadPets(profileId, gradeLevel)
    void ownedRoomItemIds(profileId).then(setOwned)
  }, [profileId, gradeLevel, loadPets])

  const birthday = isBirthday(birthDate, todayLocal())

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/')} title="宠物小屋" />

      <div className="mx-auto mt-4 flex w-full max-w-2xl flex-col gap-4">
        <RoomScene owned={owned} pets={pets} festive={birthday} />
        <RoomProgress owned={owned} balance={balance} />
        {/* 商店的唯一入口。放在小屋里而不是首页：买完东西直接看到它摆进屋里，
            那个瞬间是整个功能的高光，别浪费在一个孤立的商店页上 */}
        <BigButton
          tone="primary"
          fullWidth
          className="py-5 text-2xl"
          onClick={() => navigate('/shop')}
        >
          去商店逛逛
        </BigButton>
      </div>
    </AppShell>
  )
}

interface RoomProgressProps {
  owned: ReadonlySet<string>
  balance: number
}

/**
 * 小屋的收集进度与当前星星数。
 *
 * ⭐ 说的是「还差 N 件」而不是「已有 M 件」：空位比已获得更能驱动行为，
 * 与图鉴必须显示未解锁卡位是同一条原理（design/02 §3.13）。
 * 全部集齐后换成一句纯粹的肯定，不再挂着任何待办。
 */
function RoomProgress({ owned, balance }: RoomProgressProps) {
  const total = ROOM_ITEMS.length
  const have = ROOM_ITEMS.filter((i) => owned.has(i.id)).length
  const left = total - have

  return (
    <div className="flex items-center justify-between gap-4 rounded-blob bg-surface px-5 py-4 shadow-card">
      <span className="text-lg font-bold">
        {left === 0 ? '小屋布置好啦' : `还差 ${left} 件就布置好啦`}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-lg font-bold text-alert">
        <span aria-hidden>⭐</span>
        <span aria-label={`你有 ${balance} 颗星星`}>{balance}</span>
      </span>
    </div>
  )
}
