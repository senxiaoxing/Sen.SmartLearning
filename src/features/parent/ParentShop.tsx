/**
 * @file 家长区 · 奖励 —— 待兑现、兑换记录、现实券配置
 * @layer features
 * @see src/features/parent/PendingList.tsx       待兑现
 * @see src/features/parent/PurchaseLog.tsx       记录与撤销
 * @see src/features/parent/RewardConfigList.tsx  上架配置
 *
 * 三块的顺序按**多久看一次**排：待兑现可能天天有（而且拖着就是失信），
 * 记录偶尔翻，配置设一次管很久。
 * 这与家长区首页把「留言」排在「皮肤」前面是同一个道理。
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BigButton } from '@/components/BigButton'
import { pendingRedemptions, recentPurchases } from '@/data/repositories/purchaseQueries'
import {
  loadRealRewardConfigs,
  saveRealRewardConfigs,
} from '@/data/repositories/shopConfigRepo'
import { PendingList } from '@/features/parent/PendingList'
import { PurchaseLog } from '@/features/parent/PurchaseLog'
import { RewardConfigList } from '@/features/parent/RewardConfigList'
import { useSessionStore } from '@/stores/sessionStore'
import type { Purchase, RealRewardConfig } from '@/domain/types'

/** 记录页最多列多少条。翻更早的没有实际用途，而全量会让页面越来越长 */
const LOG_LIMIT = 30

export function ParentShop() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const setBalance = useSessionStore((s) => s.setBalance)
  const [pending, setPending] = useState<Purchase[]>([])
  const [log, setLog] = useState<Purchase[]>([])
  const [configs, setConfigs] = useState<RealRewardConfig[] | null>(null)

  const reload = useCallback(async () => {
    if (profileId === null) return
    const [p, l, c] = await Promise.all([
      pendingRedemptions(profileId),
      recentPurchases(profileId, LOG_LIMIT),
      loadRealRewardConfigs(profileId),
    ])
    setPending(p)
    setLog(l)
    setConfigs(c)
  }, [profileId])

  useEffect(() => {
    void reload()
  }, [reload])

  const changeConfigs = (next: RealRewardConfig[]) => {
    // 先更新界面再落库：勾选框卡半拍会让家长以为没点上，从而重复点击
    setConfigs(next)
    if (profileId !== null) void saveRealRewardConfigs(profileId, next)
  }

  return (
    <AppShell width="wide" layout="stack">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-7 py-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">奖励</h1>
          <BigButton
            tone="neutral"
            className="px-5 py-3 text-base"
            onClick={() => navigate('/parent')}
          >
            返回
          </BigButton>
        </header>

        <Block title="待兑现" hint="孩子换了、还没给到手的">
          <PendingList items={pending} onChanged={() => void reload()} />
        </Block>

        <Block title="兑换记录" hint="手滑买错了可以撤销，星星按原价退回">
          <PurchaseLog
            items={log}
            onRefunded={(balanceAfter) => {
              // 孩子端首页与小结页读的是 sessionStore.balance，退款后必须立刻跟上
              setBalance(balanceAfter)
              void reload()
            }}
          />
        </Block>

        <Block title="现实奖励" hint="改动即时生效，不用保存">
          {configs === null ? (
            <p className="rounded-blob bg-surface/60 p-5 text-base text-ink/40">读取中…</p>
          ) : (
            <RewardConfigList configs={configs} onChange={changeConfigs} />
          )}
        </Block>
      </div>
    </AppShell>
  )
}

function Block({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-ink/40">{hint}</p>
      </div>
      {children}
    </section>
  )
}
