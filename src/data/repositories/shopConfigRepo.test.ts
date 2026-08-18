/**
 * @file 现实券家长配置的集成测试
 * @layer data
 *
 * 守的是一条产品红线：**上架 = 家长已经答应了这件事**。
 * 默认反了（全部上架）的后果是孩子兑了一张家长根本没准备的券——
 * App 承诺了、家长兑不了，这个功能教的就成了「攒星星没用」，比不做更糟。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import {
  loadRealRewardConfigs,
  saveRealRewardConfigs,
} from '@/data/repositories/shopConfigRepo'
import { REAL_REWARD_PRESETS } from '@/data/seed/realRewards'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

describe('默认配置', () => {
  it('⭐ 从未配置过时全部未上架 —— 上架等于家长已经答应了', async () => {
    const profileId = await bootstrap()

    const configs = await loadRealRewardConfigs(profileId)

    expect(configs.every((c) => !c.listed), '默认必须全关').toBe(true)
  })

  it('补齐全部预设，与清单等长同序', async () => {
    const profileId = await bootstrap()

    const configs = await loadRealRewardConfigs(profileId)

    expect(configs).toHaveLength(REAL_REWARD_PRESETS.length)
    expect(configs.map((c) => c.presetId)).toEqual(REAL_REWARD_PRESETS.map((p) => p.id))
  })

  it('默认价格与冷却取预设的建议值', async () => {
    const profileId = await bootstrap()
    const candy = REAL_REWARD_PRESETS.find((p) => p.id === 'real-candy')

    const configs = await loadRealRewardConfigs(profileId)
    const config = configs.find((c) => c.presetId === 'real-candy')

    expect(config?.price).toBe(candy?.suggestedPrice)
    expect(config?.cooldownDays).toBe(candy?.suggestedCooldownDays)
  })
})

describe('保存与读回', () => {
  it('存过的配置盖过默认值', async () => {
    const profileId = await bootstrap()

    await saveRealRewardConfigs(profileId, [
      { presetId: 'real-icecream', listed: true, price: 250, cooldownDays: 3 },
    ])

    const configs = await loadRealRewardConfigs(profileId)
    const icecream = configs.find((c) => c.presetId === 'real-icecream')
    expect(icecream).toEqual({
      presetId: 'real-icecream',
      listed: true,
      price: 250,
      cooldownDays: 3,
    })
  })

  it('⭐ 没存过的那些仍然是未上架，不会被顺带打开', async () => {
    const profileId = await bootstrap()

    await saveRealRewardConfigs(profileId, [
      { presetId: 'real-icecream', listed: true, price: 300, cooldownDays: 7 },
    ])

    const configs = await loadRealRewardConfigs(profileId)
    const others = configs.filter((c) => c.presetId !== 'real-icecream')
    expect(others.every((c) => !c.listed)).toBe(true)
  })

  it('整体替换：上一次存的会被这一次覆盖掉', async () => {
    const profileId = await bootstrap()
    await saveRealRewardConfigs(profileId, [
      { presetId: 'real-icecream', listed: true, price: 300, cooldownDays: 7 },
    ])

    await saveRealRewardConfigs(profileId, [
      { presetId: 'real-candy', listed: true, price: 100, cooldownDays: 14 },
    ])

    const configs = await loadRealRewardConfigs(profileId)
    expect(configs.find((c) => c.presetId === 'real-icecream')?.listed).toBe(false)
    expect(configs.find((c) => c.presetId === 'real-candy')?.listed).toBe(true)
  })

  it('丢掉预设里已经不存在的 ID，不留孤儿配置', async () => {
    const profileId = await bootstrap()

    const kept = await saveRealRewardConfigs(profileId, [
      { presetId: 'real-icecream', listed: true, price: 300, cooldownDays: 7 },
      { presetId: 'real-已经删掉的券', listed: true, price: 999, cooldownDays: 0 },
    ])

    expect(kept).toHaveLength(1)
    expect(kept[0]?.presetId).toBe('real-icecream')
  })

  it('配置写进 settings，因此天然进备份', async () => {
    // settings 本就在 USER_DATA_TABLES 里，不需要额外改备份与迁移
    const profileId = await bootstrap()

    await saveRealRewardConfigs(profileId, [
      { presetId: 'real-book', listed: true, price: 800, cooldownDays: 30 },
    ])

    const settings = await db.settings.get(profileId)
    expect(settings?.realRewardConfigs).toHaveLength(1)
  })
})
