/**
 * @file 初始化与作答闭环的集成测试
 * @layer data
 *
 * 单测各自验证了模块内部逻辑，但「装到 iPad 上打开会不会白屏」取决于
 * 这些模块**串起来**能不能跑通。这个测试走完整链路：
 * 初始化 → 排期 → 生成题目 → 作答 → 掌握度更新 → 解锁下一个知识点。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap, refreshUnlocks } from '@/data/bootstrap'
import { buildSessionItems } from '@/data/buildSessionItems'
import { db } from '@/data/db'
import { loadMasteryMap, recordAttempt } from '@/data/repositories/masteryRepo'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { ASSUMED_MASTERY_SCORE } from '@/data/seed/placementPresets'
import { createRng } from '@/domain/generators/rng'
import { selectNextItems } from '@/domain/scheduler/selectNextItems'
import { nowIso, todayLocal } from '@/domain/time'
import type { Attempt, GeneratedItem, Uuid } from '@/domain/types'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

/** 构造一次作答记录 */
/** 真正出得了题的知识点，与 sessionStore 的生产用法保持一致 */
const ANSWERABLE = new Set(ITEM_TEMPLATE_BY_KP.keys())

function attemptFor(
  item: GeneratedItem,
  profileId: Uuid,
  isCorrect: boolean,
  responseTimeMs = 4000,
): Attempt {
  const option = item.options.find((o) => o.isCorrect === isCorrect)!
  return {
    id: crypto.randomUUID(),
    profileId,
    sessionId: 'test-session',
    kpId: item.kpId,
    itemId: item.signature,
    difficulty: item.difficulty,
    isCorrect,
    selectedOptionId: option.id,
    ...(option.misconceptionTag !== undefined && { misconceptionTag: option.misconceptionTag }),
    responseTimeMs,
    hintUsed: false,
    ttsReplayCount: 0,
    isRetry: false,
    createdAt: nowIso(),
    localDate: todayLocal(),
  }
}

describe('bootstrap', () => {
  it('首次启动创建档案、设置与全量掌握度记录', async () => {
    const profileId = await bootstrap()

    expect(await db.profiles.count()).toBe(1)
    expect(await db.settings.get(profileId)).toBeDefined()
    expect(await db.mastery.where('profileId').equals(profileId).count()).toBe(
      KNOWLEDGE_POINTS.length,
    )
    expect(await db.knowledgePoints.count()).toBe(KNOWLEDGE_POINTS.length)
  })

  it('⚠️ 一年级不识字，自动朗读必须默认开启', async () => {
    const profileId = await bootstrap()
    expect((await db.settings.get(profileId))?.autoReadStem).toBe(true)
  })

  it('重复调用幂等，不会创建第二个档案', async () => {
    const first = await bootstrap()
    const second = await bootstrap()
    expect(second).toBe(first)
    expect(await db.profiles.count()).toBe(1)
  })

  it('⭐ 并发调用不会产生重复记录', async () => {
    // 真机上「页面挂载的 init」与「点击开始学习的兜底初始化」会同时发生。
    // 没有并发守卫时两次都读到空表，各建一套记录，进度会随机丢失。
    const ids = await Promise.all([bootstrap(), bootstrap(), bootstrap()])

    expect(new Set(ids).size, '并发调用应返回同一个档案').toBe(1)
    expect(await db.profiles.count()).toBe(1)
    expect(await db.mastery.count(), '每个知识点应只有一条掌握度').toBe(
      KNOWLEDGE_POINTS.length,
    )
  })

  it('⭐ 起点预设生效：跳过幼儿园阶段内容，不从「数一数」开始', async () => {
    // 孩子实测反馈「像幼儿园小朋友做的题目」，起点预设就是为此而设
    const profileId = await bootstrap()
    const map = await loadMasteryMap(profileId)

    expect(map.get('M1.1')?.state, 'M1.1 数一数属幼儿园内容，应假定已掌握').toBe('mastered')
    expect(map.get('M3.1')?.state, '前置已假定掌握，分与合应开放').toBe('available')
    expect(map.get('M5.2')?.state, 'M5.2 依赖链未完成，仍应锁定').toBe('locked')
  })

  it('假定掌握用较低分数，会被巩固题验证而非永久跳过', async () => {
    const profileId = await bootstrap()
    const map = await loadMasteryMap(profileId)
    const assumed = map.get('M1.1')!

    // 0.7 低于 targetMastery(0.85)，意味着它仍会以巩固/复习题形式回来接受验证
    expect(assumed.masteryScore).toBe(ASSUMED_MASTERY_SCORE)
    expect(assumed.masteryScore).toBeLessThan(0.85)
    expect(assumed.totalAttempts, '没有任何作答样本支撑，只是假定').toBe(0)
  })

  it('假定掌握的复习时间分散开，避免某天全是复习题', async () => {
    const profileId = await bootstrap()
    const all = await db.mastery.where('profileId').equals(profileId).toArray()
    const dueDates = new Set(
      all.filter((m) => m.state === 'mastered').map((m) => m.dueAt.slice(0, 10)),
    )
    expect(dueDates.size).toBeGreaterThan(1)
  })

  it('首次建档的昵称就是「小恩宝」，装上不需要先做配置', async () => {
    const profileId = await bootstrap()
    expect((await db.profiles.get(profileId))?.name).toBe('小恩宝')
  })

  it('旧档案里没被改过的默认名「小朋友」会迁移成「小恩宝」', async () => {
    const profileId = await bootstrap()
    const profile = (await db.profiles.get(profileId))!
    // 模拟改默认名之前建的档案：名字是旧默认值，且从没被家长动过
    await db.profiles.put({ ...profile, name: '小朋友', updatedAt: profile.createdAt })

    await bootstrap()

    expect((await db.profiles.get(profileId))?.name).toBe('小恩宝')
  })

  it('⭐ 家长特意选的「小朋友」不会被迁移改回去', async () => {
    // 「小朋友」本身是合法昵称（预设清单里就有）。少了 updatedAt 判据的话，
    // 家长每次选它都会在下次冷启动时被悄悄改成「小恩宝」——那是 bug 不是迁移
    const profileId = await bootstrap()
    const profile = (await db.profiles.get(profileId))!
    await db.profiles.put({ ...profile, name: '小朋友', updatedAt: nowIso() })

    await bootstrap()

    expect((await db.profiles.get(profileId))?.name).toBe('小朋友')
  })

  it('不覆盖已有学习进度', async () => {
    const profileId = await bootstrap()
    const before = await db.mastery
      .where('[profileId+kpId]')
      .equals([profileId, 'M1.1'])
      .first()
    await db.mastery.put({ ...before!, masteryScore: 0.77, totalAttempts: 9 })

    await bootstrap()

    const after = await db.mastery.where('[profileId+kpId]').equals([profileId, 'M1.1']).first()
    expect(after?.masteryScore).toBe(0.77)
  })
})

describe('会话闭环', () => {
  it('从排期到生成题目全程可跑通', async () => {
    const profileId = await bootstrap()
    const now = nowIso()
    const masteryMap = await loadMasteryMap(profileId, now)

    // M3.1 起点预设后为 available，把它推进到 learning 模拟已开始学习
    const seed = masteryMap.get('M3.1')!
    await db.mastery.put({ ...seed, state: 'learning', masteryScore: 0.5, totalAttempts: 3 })

    const plan = selectNextItems({
      profileId,
      mode: 'daily',
      subject: 'math',
      count: 10,
      masteryMap: await loadMasteryMap(profileId, now),
      knowledgePoints: KNOWLEDGE_POINTS,
      now,
      answerableKpIds: ANSWERABLE,
    })
    expect(plan.length).toBe(10)

    const items = buildSessionItems(plan, createRng(42))
    expect(items.length).toBeGreaterThan(0)
    for (const { item } of items) {
      expect(item.options.filter((o) => o.isCorrect)).toHaveLength(1)
      expect(item.stem.ttsText.length).toBeGreaterThan(0)
    }
  })

  it('作答后掌握度与作答记录同步更新', async () => {
    const profileId = await bootstrap()
    const map = await loadMasteryMap(profileId)
    await db.mastery.put({ ...map.get('M3.1')!, state: 'learning' })

    const plan = selectNextItems({
      profileId, mode: 'daily', subject: 'math', count: 3,
      masteryMap: await loadMasteryMap(profileId), knowledgePoints: KNOWLEDGE_POINTS,
      now: nowIso(), answerableKpIds: ANSWERABLE,
    })
    const [first] = buildSessionItems(plan, createRng(7))
    expect(first).toBeDefined()

    const before = await db.mastery
      .where('[profileId+kpId]')
      .equals([profileId, first!.item.kpId])
      .first()

    const { mastery: updated } = await recordAttempt(attemptFor(first!.item, profileId, true))

    expect(await db.attempts.count()).toBe(1)
    expect(updated!.masteryScore).toBeGreaterThan(before!.masteryScore)
    expect(updated!.totalAttempts).toBe(before!.totalAttempts + 1)
  })

  it('⭐ 答错时认知误区被记录，构成定向补救的依据', async () => {
    const profileId = await bootstrap()
    const map = await loadMasteryMap(profileId)
    await db.mastery.put({ ...map.get('M3.1')!, state: 'learning' })

    const plan = selectNextItems({
      profileId, mode: 'daily', subject: 'math', count: 3,
      masteryMap: await loadMasteryMap(profileId), knowledgePoints: KNOWLEDGE_POINTS,
      now: nowIso(), answerableKpIds: ANSWERABLE,
    })
    const [first] = buildSessionItems(plan, createRng(11))
    const wrong = attemptFor(first!.item, profileId, false)

    const { mastery: updated } = await recordAttempt(wrong)

    expect(wrong.misconceptionTag, '错误选项必须带诊断标签').toBeDefined()
    expect(updated!.misconceptionCounts[wrong.misconceptionTag!]).toBe(1)
  })

  it('掌握一个知识点后，依赖它的后继自动解锁', async () => {
    const profileId = await bootstrap()
    const map = await loadMasteryMap(profileId)

    // M3.2 依赖 M3.1，起点预设后 M3.1 只是 available，因此 M3.2 仍锁定
    expect(map.get('M3.2')?.state).toBe('locked')
    await db.mastery.put({ ...map.get('M3.1')!, state: 'mastered' })

    const unlocked = await refreshUnlocks(profileId)

    expect(unlocked).toContain('M3.2')
    const after = await loadMasteryMap(profileId)
    expect(after.get('M3.2')?.state).toBe('available')
  })
})
