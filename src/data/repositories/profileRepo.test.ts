/**
 * @file 昵称读写测试
 * @layer data
 * @see src/data/repositories/profileRepo.ts
 *
 * 昵称是全 App 出现频率最高的一段文本，而它同时决定备份文件名。
 * 这里守两件事：**主昵称永远是第一个**，以及**脏输入不会存进去**。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bootstrap } from '@/data/bootstrap'
import { db } from '@/data/db'
import {
  clearPendingGradeUp,
  loadGrade,
  loadNicknames,
  loadParentMessage,
  loadPendingGradeUp,
  markMessageRead,
  MESSAGE_MAX_LENGTH,
  NICKNAME_MAX_COUNT,
  NICKNAME_MAX_LENGTH,
  saveBirthDate,
  saveGrade,
  saveNicknames,
  saveParentMessage,
} from '@/data/repositories/profileRepo'

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
  db.close()
})

describe('年级读写', () => {
  it('新档案从一年级上学期开始', async () => {
    expect(await loadGrade(await bootstrap())).toBe('1A')
  })

  it('改年级会落库，并且不动昵称', async () => {
    const profileId = await bootstrap()

    await saveGrade(profileId, '3A')

    expect(await loadGrade(profileId)).toBe('3A')
    expect(await loadNicknames(profileId)).toEqual([{ text: '小恩宝', clipKey: 'name.xiaoenbao' }])
  })
})

/**
 * 升年级过场的标记。
 *
 * 家长在**家长区**改年级，孩子看不到那一下——不留标记的话，
 * 她下次打开 App 只会发现企鹅变成了猫。见 design/08 §6.3。
 */
describe('⭐ 欠着的那场过场', () => {
  it('新档案不欠过场', async () => {
    expect(await loadPendingGradeUp(await bootstrap())).toBeUndefined()
  })

  it('往上升 → 欠一场，记的是升到的那个年级', async () => {
    const profileId = await bootstrap()

    const result = await saveGrade(profileId, '2A')

    expect(result.pendingGradeUp).toBe('G2')
    expect(await loadPendingGradeUp(profileId)).toBe('G2')
  })

  it('同一个年级内换学期不算升年级', async () => {
    // 一上 → 一下，伙伴没换、内容范围没动，没什么可宣布的
    const profileId = await bootstrap()

    expect((await saveGrade(profileId, '1B')).pendingGradeUp).toBeUndefined()
    expect(await loadPendingGradeUp(profileId)).toBeUndefined()
  })

  /**
   * ⭐ 家长点错了又改回来，不能给孩子留下一场
   * 关于她**根本没升的年级**的仪式。
   */
  it('⭐ 改回低年级 → 不欠过场，还要把之前欠的那场撤掉', async () => {
    const profileId = await bootstrap()
    await saveGrade(profileId, '2A')
    expect(await loadPendingGradeUp(profileId)).toBe('G2')

    const result = await saveGrade(profileId, '1A')

    expect(result.pendingGradeUp).toBeUndefined()
    expect(await loadPendingGradeUp(profileId)).toBeUndefined()
  })

  it('演完就清掉，不会第二次弹出来', async () => {
    const profileId = await bootstrap()
    await saveGrade(profileId, '2A')

    await clearPendingGradeUp(profileId)

    expect(await loadPendingGradeUp(profileId)).toBeUndefined()
    // 年级本身不受影响 —— 清的只是「说过了没有」
    expect(await loadGrade(profileId)).toBe('2A')
  })

  it('清标记不动 updatedAt —— 那是默认名迁移的判据', async () => {
    const profileId = await bootstrap()
    await saveGrade(profileId, '2A')
    const before = (await db.profiles.get(profileId))!.updatedAt

    await clearPendingGradeUp(profileId)

    expect((await db.profiles.get(profileId))!.updatedAt).toBe(before)
  })
})

describe('昵称读写', () => {
  it('新档案默认只有主昵称「小恩宝」，且它有专属语音', async () => {
    const nicknames = await loadNicknames(await bootstrap())

    expect(nicknames).toEqual([{ text: '小恩宝', clipKey: 'name.xiaoenbao' }])
  })

  it('存多个称呼，第一个是主昵称并写进 Profile.name', async () => {
    const profileId = await bootstrap()
    await saveNicknames(profileId, ['小恩宝', '恩宝', '小恩恩'])

    const profile = await db.profiles.get(profileId)
    expect(profile?.name, '备份文件名用的是它').toBe('小恩宝')
    expect(profile?.aliases).toEqual(['恩宝', '小恩恩'])
    expect((await loadNicknames(profileId)).map((n) => n.text)).toEqual([
      '小恩宝',
      '恩宝',
      '小恩恩',
    ])
  })

  it('去空白、剔空、去重', async () => {
    const profileId = await bootstrap()
    const saved = await saveNicknames(profileId, ['  小恩宝 ', '', '恩宝', '小恩宝', '   '])

    expect(saved.map((n) => n.text)).toEqual(['小恩宝', '恩宝'])
  })

  it(`超长截断到 ${NICKNAME_MAX_LENGTH} 个字 —— 昵称要被念出来，长了拖节奏`, async () => {
    const profileId = await bootstrap()
    const saved = await saveNicknames(profileId, ['一二三四五六七八九十'])

    expect(saved[0]?.text).toHaveLength(NICKNAME_MAX_LENGTH)
  })

  it(`最多留 ${NICKNAME_MAX_COUNT} 个`, async () => {
    const profileId = await bootstrap()
    const saved = await saveNicknames(profileId, ['一', '二', '三', '四', '五', '六'])

    expect(saved).toHaveLength(NICKNAME_MAX_COUNT)
  })

  it('不在预设清单里的昵称没有 clipKey —— 那时整句会降级为 TTS', async () => {
    const profileId = await bootstrap()
    const saved = await saveNicknames(profileId, ['小明'])

    expect(saved[0]).toEqual({ text: '小明' })
  })

  it('全部删光：文案退回不带称呼，且备份文件名不会出现空档', async () => {
    const profileId = await bootstrap()
    await saveNicknames(profileId, [])

    expect(await loadNicknames(profileId)).toEqual([])
    expect((await db.profiles.get(profileId))?.name).toBe('')
  })

  it('改名前导出的备份没有 aliases 字段，读出来只有主昵称', async () => {
    const profileId = await bootstrap()
    const profile = (await db.profiles.get(profileId))!
    // 模拟老数据：整个 aliases 字段都不存在
    const { aliases: _dropped, ...legacy } = profile
    await db.profiles.put(legacy)

    expect((await loadNicknames(profileId)).map((n) => n.text)).toEqual(['小恩宝'])
  })
})

describe('生日', () => {
  it('存合法日期', async () => {
    const profileId = await bootstrap()
    expect(await saveBirthDate(profileId, '2019-08-11')).toBe('2019-08-11')
  })

  it('格式不对一律当作没设置，不存进去等 isBirthday 去猜', async () => {
    const profileId = await bootstrap()

    for (const bad of ['', '2019/08/11', '八月十一', '2019-8-1']) {
      expect(await saveBirthDate(profileId, bad), `「${bad}」不该被存下`).toBeUndefined()
      expect((await db.profiles.get(profileId))?.birthDate).toBeUndefined()
    }
  })
})

describe('家长留言', () => {
  it('写一条留言，初始是未读', async () => {
    const profileId = await bootstrap()
    const saved = await saveParentMessage(profileId, '妈妈说，小恩宝昨天的拼音做得特别好')

    expect(saved?.text).toBe('妈妈说，小恩宝昨天的拼音做得特别好')
    expect(saved?.readAt, '刚写的留言必须是未读').toBeUndefined()
    expect(saved?.createdAt).toBeDefined()
  })

  it('只保留最新一条 —— 留言板攒成收件箱就变成任务列表了', async () => {
    const profileId = await bootstrap()
    await saveParentMessage(profileId, '第一条')
    await saveParentMessage(profileId, '第二条')

    expect((await loadParentMessage(profileId))?.text).toBe('第二条')
  })

  it('⭐ 改了留言就重新变成未读，否则家长会以为写了没生效', async () => {
    const profileId = await bootstrap()
    await saveParentMessage(profileId, '第一条')
    await markMessageRead(profileId)
    expect((await loadParentMessage(profileId))?.readAt).toBeDefined()

    await saveParentMessage(profileId, '第二条')

    expect((await loadParentMessage(profileId))?.readAt).toBeUndefined()
  })

  it('留空表示删除留言', async () => {
    const profileId = await bootstrap()
    await saveParentMessage(profileId, '有话说')

    expect(await saveParentMessage(profileId, '   ')).toBeUndefined()
    expect(await loadParentMessage(profileId)).toBeUndefined()
  })

  it(`超长截断到 ${MESSAGE_MAX_LENGTH} 字 —— 念太久孩子会走神，那句话就白写了`, async () => {
    const profileId = await bootstrap()
    const saved = await saveParentMessage(profileId, '好'.repeat(100))

    expect(saved?.text).toHaveLength(MESSAGE_MAX_LENGTH)
  })

  it('标记已读是幂等的，重复听不会刷新时间', async () => {
    const profileId = await bootstrap()
    await saveParentMessage(profileId, '有话说')

    const first = await markMessageRead(profileId)
    const second = await markMessageRead(profileId)

    expect(second?.readAt).toBe(first?.readAt)
  })

  it('⭐ 孩子听留言不算「家长改过档案」，不能动 updatedAt', async () => {
    // updatedAt 是默认昵称迁移的判据（见 data/bootstrap.ts），
    // 被听留言顺手改掉的话，那次迁移会莫名其妙地不生效
    const profileId = await bootstrap()
    await saveParentMessage(profileId, '有话说')
    const before = (await db.profiles.get(profileId))!.updatedAt

    await markMessageRead(profileId)

    expect((await db.profiles.get(profileId))?.updatedAt).toBe(before)
  })

  it('没有留言时标记已读不报错', async () => {
    expect(await markMessageRead(await bootstrap())).toBeUndefined()
  })
})
