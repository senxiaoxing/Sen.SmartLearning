/**
 * @file 商店 —— 小屋的东西与现实里的兑换券，分两块
 * @layer features
 * @see src/stores/shopStore.ts  可买性判定
 * @see design/02-数据库Schema.md §3.12b
 *
 * ## 为什么分成「小屋」和「兑换」两块
 *
 * 一块是虚拟的、一块是现实的，视觉上本来就该不一样：
 * 小屋的东西用手绘 SVG（和宠物同一套画风），现实券用 emoji
 * （它代表真实世界里的东西，本就不该出现在宠物的画面里）。
 * 混在一列里会显得杂乱，分区之后两种画风各自成立。
 *
 * ## 现实券没上架就不显示
 *
 * 上架等于家长已经答应了这件事。显示一张他没准备好的券，
 * 孩子点下去只会撞在「不能兑」上——那比看不见更伤。
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { REAL_REWARD_CATEGORIES, REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { ROOM_ITEMS, TREAT_ITEMS } from '@/data/seed/shopItems'
import { plain, utter } from '@/domain/speech'
import { BuyCelebration } from '@/features/shop/BuyCelebration'
import { BuyConfirm } from '@/features/shop/BuyConfirm'
import { ShopItemCard } from '@/features/shop/ShopItemCard'
import { prefetchClips, say } from '@/platform/speech'
import { usePetStore } from '@/stores/petStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useShopStore } from '@/stores/shopStore'
import type { BuyRequest } from '@/data/repositories/purchaseRepo'
import type { ShopItemKind } from '@/domain/types'

/** 待确认的购买 */
interface Pending {
  request: Omit<BuyRequest, 'profileId'>
  isReal: boolean
}

/**
 * 商店里全部商品名的语音片段（21 条）。
 *
 * ⭐ 一进店就全部预取。片段是「fetch + 解码」两步，等按下去才开始加载，
 * 那一下就是「按了没反应」——而孩子点卡片的**唯一目的**就是听它叫什么名字。
 * 字母乐园当初就是漏了这一步，实测反馈「L 及后面的字母发音有延迟」。
 */
const SHOP_CLIPS: readonly string[] = [
  ...ROOM_ITEMS.map((i) => i.clipKey),
  ...TREAT_ITEMS.map((i) => i.clipKey),
  ...REAL_REWARD_PRESETS.map((p) => p.clipKey),
]

export function ShopPage() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const gradeLevel = useSessionStore((s) => s.gradeLevel)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const pets = usePetStore((s) => s.pets)
  const loadPets = usePetStore((s) => s.load)
  const { verdicts, configs, celebration, load, buy, dismissCelebration } = useShopStore()
  const [pending, setPending] = useState<Pending | null>(null)

  // ⭐ 进店就把 21 条商品名预取好，见 SHOP_CLIPS 的说明
  useEffect(() => {
    prefetchClips(SHOP_CLIPS)
  }, [])

  useEffect(() => {
    if (profileId === null) return
    void load(profileId)
    // 零食买完要让三只出来一起吃，所以进店就先把它们备好——
    // 等按下去才加载，那一下会是「点了没反应」
    void loadPets(profileId, gradeLevel)
  }, [profileId, gradeLevel, load, loadPets])

  const confirm = async () => {
    if (profileId === null || pending === null) return
    const request = pending.request
    setPending(null)
    const newBalance = await buy(profileId, { ...request, profileId })
    if (newBalance !== null) setBalance(newBalance)
  }

  /**
   * ⚠️ 必须 `useCallback`。`BuyCelebration` 的朗读 effect 依赖这个函数，
   * 写成内联箭头函数的话每次渲染都是新引用，effect 就会反复重跑——
   * 表现为同一句庆祝语被念好几遍，而且每次都把上一次掐断。
   */
  const speak = useCallback((text: string) => say(plain(text)), [])

  /** 上架了的现实券才出现在商店里 */
  const listedReals = REAL_REWARD_PRESETS.filter((p) => configs[p.id]?.listed === true)

  return (
    <AppShell width="wide" layout="stack">
      <PageHeader onBack={() => navigate('/room')} title="商店">
        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-xl font-bold text-alert shadow-card">
          <span aria-hidden>⭐</span>
          <span className="tabular-nums" aria-label={`你有 ${balance} 颗星星`}>
            {balance}
          </span>
        </span>
      </PageHeader>

      <div className="mx-auto mt-5 flex w-full max-w-3xl flex-col gap-8 pb-8">
        <Section title="给小屋">
          {ROOM_ITEMS.map((item) => (
            <ShopItemCard
              key={item.id}
              label={item.label}
              price={item.price}
              verdict={verdicts[item.id] ?? { ok: true }}
              art={item.art}
              onSpeak={() => say(utter([item.clipKey], item.label))}
              onPick={() =>
                setPending({
                  request: buyRequestOf(item.id, 'room', item.label, item.price),
                  isReal: false,
                })
              }
            />
          ))}
        </Section>

        <Section title="给伙伴吃">
          {TREAT_ITEMS.map((item) => (
            <ShopItemCard
              key={item.id}
              label={item.label}
              price={item.price}
              verdict={verdicts[item.id] ?? { ok: true }}
              art={item.art}
              onSpeak={() => say(utter([item.clipKey], item.label))}
              onPick={() =>
                setPending({
                  request: buyRequestOf(item.id, 'treat', item.label, item.price),
                  isReal: false,
                })
              }
            />
          ))}
        </Section>

        {REAL_REWARD_CATEGORIES.map(({ id, label }) => {
          const items = listedReals.filter((p) => p.category === id)
          if (items.length === 0) return null

          return (
            <Section key={id} title={label}>
              {items.map((preset) => {
                const config = configs[preset.id]
                const price = config?.price ?? preset.suggestedPrice
                return (
                  <ShopItemCard
                    key={preset.id}
                    label={preset.label}
                    price={price}
                    verdict={verdicts[preset.id] ?? { ok: true }}
                    emoji={preset.emoji}
                    onSpeak={() => say(utter([preset.clipKey], preset.label))}
                    onPick={() =>
                      setPending({
                        request: {
                          ...buyRequestOf(preset.id, 'real', preset.label, price),
                          cooldownDays: config?.cooldownDays ?? preset.suggestedCooldownDays,
                          listed: true,
                        },
                        isReal: true,
                      })
                    }
                  />
                )
              })}
            </Section>
          )
        })}
      </div>

      {pending !== null && (
        <BuyConfirm
          label={pending.request.label}
          price={pending.request.price}
          isReal={pending.isReal}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        />
      )}

      {celebration !== null && (
        <BuyCelebration
          celebration={celebration}
          pets={pets}
          onSpeak={speak}
          onClose={dismissCelebration}
        />
      )}
    </AppShell>
  )
}

function buyRequestOf(
  shopItemId: string,
  kind: ShopItemKind,
  label: string,
  price: number,
): Omit<BuyRequest, 'profileId'> {
  return { shopItemId, kind, label, price }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-ink/70">{title}</h2>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">{children}</div>
    </section>
  )
}
