/**
 * @file 宠物小屋 —— 三只伙伴住的地方，也是买来的家具摆放的地方
 * @layer features
 * @see src/components/room/RoomScene.tsx  场景渲染（铺满整屏）
 * @see src/features/room/RoomPets.tsx     三只伙伴：拖动与点击
 * @see design/02-数据库Schema.md §3.12b   purchases 表
 * @see design/06-宠物系统.md §10          小屋与自由站位
 *
 * ⭐ **一间共享小屋，不是三个房间**。理由写在 `RoomScene.tsx` 文件头，
 * 一句话概括：分房会让孩子先装扮最喜欢的那只，另外两只空着——
 * 那是宠物红线第 3 条的另一种形式，而且比等级差距更伤，
 * 因为空着是她自己选的。
 *
 * ## ⭐ 这一页不走 AppShell
 *
 * 别的页面是「内容居中、四周留白」，而小屋要的恰恰相反：房间就是背景本身，
 * 铺满整块屏幕（孩子实测反馈「要大一点，最好能整屏占满」）。
 * 所以标题栏和商店入口做成**浮在屋子上的两条**，中间整片留给房间。
 *
 * 代价是安全区要自己处理——`.safe-area` 挪到了两条浮层上，
 * 刘海和 Home 指示条压不到按钮。
 *
 * 家具位置仍然写死、买了自动摆好；**可以自由摆的只有三只伙伴**。
 * 家具让她摆等于让她做布局决策，那不是一年级该做的事；
 * 而挪伙伴不存在「摆错」——怎么摆都是她的家。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { PageHeader } from '@/components/PageHeader'
import { RoomScene } from '@/components/room/RoomScene'
import { ownedRoomItemIds } from '@/data/repositories/purchaseQueries'
import { ROOM_ITEMS } from '@/data/seed/shopItems'
import { isBirthday } from '@/domain/encourage/birthdayLine'
import { todayLocal } from '@/domain/time'
import { gradeLevelOf } from '@/domain/types'
import { RoomPets } from '@/features/room/RoomPets'
import { usePetStore } from '@/stores/petStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'

export function PetRoom() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  // 小屋里住的是正在养的那批伙伴
  const gradeLevel = gradeLevelOf(useProfileStore((s) => s.grade))
  const balance = useSessionStore((s) => s.balance)
  const birthDate = useProfileStore((s) => s.birthDate)
  const pets = usePetStore((s) => s.pets)
  const loadPets = usePetStore((s) => s.load)
  const moveInRoom = usePetStore((s) => s.moveInRoom)
  const [owned, setOwned] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (profileId === null) return
    void loadPets(profileId, gradeLevel)
    void ownedRoomItemIds(profileId).then(setOwned)
  }, [profileId, gradeLevel, loadPets])

  const left = ROOM_ITEMS.filter((i) => !owned.has(i.id)).length

  return (
    <div className="relative h-full w-full overflow-hidden">
      <RoomScene owned={owned}>
        <RoomPets
          pets={pets}
          festive={isBirthday(birthDate, todayLocal())}
          onMove={(petId, spot) => void moveInRoom(petId, spot)}
        />
      </RoomScene>

      {/* 顶部浮层。⚠️ `pointer-events-none` 让它不吃屋子里的拖动，
          只有里面的按钮自己收点击 —— 否则整条横带都拖不动伙伴 */}
      <div className="safe-area pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="px-4 py-3 sm:px-6">
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl">
            <PageHeader onBack={() => navigate('/')} title="宠物小屋">
              {/* 进度挂在顶栏而不是底部：底部正中恰好是中间那只站的地方，
                  挂在那儿会压住它的脚 */}
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <RoomProgress left={left} />
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-xl font-bold text-alert shadow-card">
                  <span aria-hidden>⭐</span>
                  <span className="tabular-nums" aria-label={`你有 ${balance} 颗星星`}>
                    {balance}
                  </span>
                </span>
              </span>
            </PageHeader>
          </div>
        </div>
      </div>

      {/* 底部浮层：商店的唯一入口。
          放在小屋里而不是首页——买完东西直接看到它摆进屋里，
          那个瞬间是整个功能的高光，别浪费在一个孤立的商店页上 */}
      <div className="safe-area pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="px-4 pb-4 sm:px-6">
          <div className="pointer-events-auto mx-auto w-full max-w-xs">
            <BigButton
              tone="primary"
              fullWidth
              className="py-4 text-xl"
              onClick={() => navigate('/shop')}
            >
              去商店逛逛
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 小屋的收集进度。
 *
 * ⭐ 说的是「还差 N 件」而不是「已有 M 件」：空位比已获得更能驱动行为，
 * 与图鉴必须显示未解锁卡位是同一条原理（design/02 §3.13）。
 * 全部集齐后换成一句纯粹的肯定，不再挂着任何待办。
 */
function RoomProgress({ left }: { left: number }) {
  return (
    <span className="hidden shrink-0 rounded-full bg-surface px-4 py-2 text-base font-bold text-ink/70 shadow-card sm:inline">
      {left === 0 ? '小屋布置好啦' : `还差 ${left} 件`}
    </span>
  )
}
