/**
 * @file 商店商品表的校验
 * @layer data
 *
 * 这里守的大多是「错了不会崩、只会悄悄坏掉」的东西：
 * ID 撞车会让两件商品共用一条购买记录，缺语音会让商品名念不出来
 * （孩子不识字，等于这件东西没有名字），槽位重复会让两件家具画在同一个位置上。
 */

import { describe, expect, it } from 'vitest'
import { REAL_REWARD_BY_ID, REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import {
  ROOM_ITEMS,
  ROOM_ITEM_BY_ID,
  TREAT_ITEMS,
  TREAT_ITEM_BY_ID,
} from '@/data/seed/shopItems'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import { planPurchase } from '@/domain/economy/planPurchase'

const ALL_IDS = [
  ...ROOM_ITEMS.map((i) => i.id),
  ...TREAT_ITEMS.map((i) => i.id),
  ...REAL_REWARD_PRESETS.map((i) => i.id),
]

describe('ID', () => {
  it('⭐ 全局唯一 —— 撞车会让两件商品共用一条购买记录', () => {
    expect(new Set(ALL_IDS).size).toBe(ALL_IDS.length)
  })

  it('用语义 ID，不是 UUID —— 静态内容跨设备必须一致', () => {
    for (const id of ALL_IDS) {
      expect(id).toMatch(/^(room|treat|real)-[a-z0-9-]+$/)
    }
  })

  it('按 ID 能查回来', () => {
    expect(ROOM_ITEM_BY_ID.get('room-rug')?.label).toBe('地毯')
    expect(TREAT_ITEM_BY_ID.get('treat-cookie')?.label).toBe('小饼干')
    expect(REAL_REWARD_BY_ID.get('real-icecream')?.label).toBe('一个冰淇淋')
  })
})

describe('⭐ 每件商品都有语音', () => {
  it('孩子不识字，念不出来等于这件东西没有名字', () => {
    const withClips = [
      ...ROOM_ITEMS.map((i) => ({ key: i.clipKey, text: i.label })),
      ...TREAT_ITEMS.map((i) => ({ key: i.clipKey, text: i.label })),
      ...REAL_REWARD_PRESETS.map((i) => ({ key: i.clipKey, text: i.label })),
    ]

    for (const { key, text } of withClips) {
      expect(VOICE_MANIFEST[key], `${key} 不在语音清单里`).toBe(text)
    }
  })

  it('片段 key 都在 shop.* 组里，且互不重复', () => {
    const keys = [
      ...ROOM_ITEMS.map((i) => i.clipKey),
      ...TREAT_ITEMS.map((i) => i.clipKey),
      ...REAL_REWARD_PRESETS.map((i) => i.clipKey),
    ]
    for (const key of keys) expect(key).toMatch(/^shop\./)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('⭐ 念的文本与显示的文字逐字一致 —— 对不上就是「看到 A、听到 B」', () => {
    for (const item of REAL_REWARD_PRESETS) {
      expect(VOICE_MANIFEST[item.clipKey]).toBe(item.label)
    }
  })

  it('名称里没有阿拉伯数字 —— 交给 TTS 读「20」不如直接写「二十」稳', () => {
    for (const item of REAL_REWARD_PRESETS) {
      expect(item.label, `${item.id} 的名称含数字`).not.toMatch(/\d/)
    }
  })
})

describe('小屋家具', () => {
  it('⭐ 一位一件 —— 槽位重复会让两件家具画在同一个位置上', () => {
    const slots = ROOM_ITEMS.map((i) => i.slot)
    expect(new Set(slots).size).toBe(slots.length)
  })

  it('合计 2120 分，约 3~4 周集齐', () => {
    // 按每天 70~100 分算。改价了就更新这个数字，顺便重想一遍攒钱周期
    const total = ROOM_ITEMS.reduce((sum, i) => sum + i.price, 0)
    expect(total).toBe(2120)
  })

  it('渲染层要用的 art 名互不重复', () => {
    const arts = ROOM_ITEMS.map((i) => i.art)
    expect(new Set(arts).size).toBe(arts.length)
  })
})

describe('宠物零食', () => {
  it('⭐ 当天就买得起 —— 它只是一个动画，贵了不划算', () => {
    // 一天约 70~100 分，零食必须低到「今天也有点收获」能天天发生
    for (const treat of TREAT_ITEMS) {
      expect(treat.price).toBeLessThanOrEqual(25)
    }
  })

  it('⭐ 都是三只通吃的东西 —— 专属食物会诱导「今天喂谁」，那是在排序', () => {
    const labels = TREAT_ITEMS.map((t) => t.label).join()
    for (const exclusive of ['小鱼', '竹', '肉']) {
      expect(labels).not.toContain(exclusive)
    }
  })
})

describe('现实券', () => {
  it('三类齐全', () => {
    const categories = new Set(REAL_REWARD_PRESETS.map((p) => p.category))
    expect([...categories].sort()).toEqual(['experience', 'prize', 'snack'])
  })

  it('⭐ 体验型比零食便宜 —— 给出去不心疼、也不会腻', () => {
    const cheapestSnack = Math.min(
      ...REAL_REWARD_PRESETS.filter((p) => p.category === 'snack').map((p) => p.suggestedPrice),
    )
    const cheapestExperience = Math.min(
      ...REAL_REWARD_PRESETS.filter((p) => p.category === 'experience').map(
        (p) => p.suggestedPrice,
      ),
    )
    expect(cheapestExperience).toBeLessThanOrEqual(cheapestSnack)
  })

  it('⭐ 大奖要攒两周以上 —— 按每天 100 分算，最便宜的也得 8 天', () => {
    const prizes = REAL_REWARD_PRESETS.filter((p) => p.category === 'prize')
    for (const prize of prizes) {
      expect(prize.suggestedPrice).toBeGreaterThanOrEqual(800)
    }
  })

  it('糖果有很长的冷却 —— 家长会特意压制它', () => {
    const candy = REAL_REWARD_BY_ID.get('real-candy')
    expect(candy?.suggestedCooldownDays).toBeGreaterThanOrEqual(14)
  })

  it('每张券都有建议冷却，不留 undefined', () => {
    for (const preset of REAL_REWARD_PRESETS) {
      expect(Number.isInteger(preset.suggestedCooldownDays)).toBe(true)
      expect(preset.suggestedCooldownDays).toBeGreaterThanOrEqual(0)
    }
  })

  it('都有 emoji 图标', () => {
    for (const preset of REAL_REWARD_PRESETS) {
      expect(preset.emoji.length).toBeGreaterThan(0)
    }
  })
})

describe('价格', () => {
  it('⭐ 全部为正整数 —— planPurchase 会对非正价格抛错', () => {
    const prices = [
      ...ROOM_ITEMS.map((i) => i.price),
      ...TREAT_ITEMS.map((i) => i.price),
      ...REAL_REWARD_PRESETS.map((i) => i.suggestedPrice),
    ]
    for (const price of prices) {
      expect(Number.isInteger(price)).toBe(true)
      expect(price).toBeGreaterThan(0)
    }
  })

  it('每件商品都真的能走通购买结算', () => {
    for (const item of ROOM_ITEMS) {
      expect(planPurchase('room', item.price).grant.delta).toBe(-item.price)
    }
    for (const item of TREAT_ITEMS) {
      expect(planPurchase('treat', item.price).status).toBe('fulfilled')
    }
    for (const preset of REAL_REWARD_PRESETS) {
      expect(planPurchase('real', preset.suggestedPrice).status).toBe('pending')
    }
  })
})
