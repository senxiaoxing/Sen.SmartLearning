/**
 * @file 档案仓储 —— 孩子的昵称怎么读、怎么改
 * @layer data  唯一接触 Dexie 的层
 * @see src/data/seed/nicknamePresets.ts     哪些昵称有专属语音
 * @see src/domain/encourage/addressed.ts    昵称怎么拼进一句话
 * @see src/stores/profileStore.ts           使用者
 *
 * ## 主昵称直接用 `Profile.name`，不另加字段
 *
 * 这个 App 一台设备只服务一个孩子（CLAUDE.md「纯自用」），
 * 「档案名」和「孩子的昵称」本来就是同一个东西。再加一个 `nickname` 字段
 * 就要处理「两者不一致时听谁的」，而这个问题在真实使用里根本不存在。
 *
 * 顺带的好处：备份文件名跟着变成 `希恩爱学习_小恩宝_2026-08-11.json`，
 * 家长在「文件」App 里一眼就认得出。
 *
 * 备用称呼放 `Profile.aliases`——它们只参与语音轮换，不该影响文件名。
 */

import { db } from '@/data/db'
import { toNickname } from '@/data/seed/nicknamePresets'
import { nowIso } from '@/domain/time'
import { NO_NICKNAME, type Nickname } from '@/domain/encourage/addressed'
import { GRADE_LEVELS, gradeLevelOf } from '@/domain/types'
import type { Grade, GradeLevel, ParentMessage, Uuid } from '@/domain/types'

/**
 * 昵称长度上限。
 *
 * 6 个字不是文件系统或数据库的限制，是**朗读**的限制：
 * 昵称会被拼在每一句鼓励语前面（「⋯⋯，太棒了」），
 * 再长就把一句两秒的鼓励拖成一段自我介绍，孩子会开始跳过它。
 */
export const NICKNAME_MAX_LENGTH = 6

/**
 * 最多存几个称呼。
 *
 * 4 个足够覆盖一家人对同一个孩子的常用叫法，再多就只是让家长区变乱——
 * 而轮换的效果在 3~4 个时就已经饱和了。
 */
export const NICKNAME_MAX_COUNT = 4

/**
 * 读出全部称呼，主昵称在最前，每个都标注有没有专属语音片段。
 *
 * @param profileId - 档案 ID
 * @returns 称呼列表。档案不存在或名字全是空白时返回**空数组**，
 *          此时所有文案退回不带称呼的原样
 *
 * @example
 * await loadNicknames(profileId)
 * // → [{ text: '小恩宝', clipKey: 'name.xiaoenbao' }, { text: '恩宝', clipKey: 'name.enbao' }]
 */
export async function loadNicknames(profileId: Uuid): Promise<Nickname[]> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) return []

  return [profile.name, ...(profile.aliases ?? [])]
    .map(toNickname)
    .filter((nickname) => nickname !== NO_NICKNAME)
}

/** 读孩子在读几年级。档案不存在时回落到一年级上学期 */
export async function loadGrade(profileId: Uuid): Promise<Grade> {
  return (await db.profiles.get(profileId))?.grade ?? '1A'
}

/**
 * 改孩子在读几年级。
 *
 * ⚠️ 这是个**牵连很广**的设置：它同时决定答题区默认出哪个年级的内容、
 * 首页养的是哪一批伙伴、以及学习成果结算给谁。
 * 因此只放在家长区，且 ⛔ **绝不按日期自动升级**——
 * 自动跳意味着某天她打开 App 发现一切都变了，而没有任何人跟她说过。
 *
 * ⭐ **往上升时留一个 `pendingGradeUp` 标记**，让首页欠孩子一场过场。
 * 家长区是家长的地方，孩子看不到那一下；不留标记的话，
 * 她下次打开 App 只会发现企鹅变成了猫。见 design/08 §6.3。
 *
 * 只负责落库；**创建新一批宠物由调用方编排**（`profileStore.setGrade`），
 * 仓储之间互相调用会让「改个年级」这件事的副作用藏进两层调用栈里。
 *
 * @param profileId - 档案 ID
 * @param grade - 新学期。年级由 `gradeLevelOf()` 从中推导
 * @returns 存下的年级，以及**这次是否欠了一场过场**（欠了就带上升到的年级）
 *
 * @example
 * await saveGrade(profileId, '2A')
 * // → { grade: '2A', pendingGradeUp: 'G2' }   欠一场过场
 *
 * @example
 * // 家长改回去（纠正误操作）：不演过场，且把之前欠的那场一并撤掉
 * await saveGrade(profileId, '1A')
 * // → { grade: '1A', pendingGradeUp: undefined }
 */
export async function saveGrade(
  profileId: Uuid,
  grade: Grade,
): Promise<{ grade: Grade; pendingGradeUp?: GradeLevel }> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) return { grade: '1A' }

  const from = GRADE_LEVELS.indexOf(gradeLevelOf(profile.grade))
  const to = GRADE_LEVELS.indexOf(gradeLevelOf(grade))

  /**
   * 只有真的往上走才欠过场。
   *
   * 往下改是家长在纠正误操作，那时还要**把之前欠的那场撤掉**——
   * 否则「点错了又改回来」会给孩子留下一场关于她根本没升的年级的仪式。
   */
  const pendingGradeUp = to > from ? gradeLevelOf(grade) : undefined

  await db.profiles.put({ ...profile, grade, pendingGradeUp, updatedAt: nowIso() })
  return { grade, pendingGradeUp }
}

/** 读出欠着的那场过场。没欠则 `undefined` */
export async function loadPendingGradeUp(profileId: Uuid): Promise<GradeLevel | undefined> {
  return (await db.profiles.get(profileId))?.pendingGradeUp
}

/**
 * 过场演完了，清掉标记。
 *
 * ⚠️ 不动 `updatedAt`：孩子看完一场过场不算「家长改过档案」，
 * 而 `updatedAt` 是默认名迁移的判据（见 data/bootstrap.ts）。同 `markMessageRead`。
 *
 * @example
 * await clearPendingGradeUp(profileId)   // 她点了「知道啦」
 */
export async function clearPendingGradeUp(profileId: Uuid): Promise<void> {
  const profile = await db.profiles.get(profileId)
  if (profile?.pendingGradeUp === undefined) return
  await db.profiles.put({ ...profile, pendingGradeUp: undefined })
}

/**
 * 留言长度上限。
 *
 * 留言要被**念出来**，而一年级孩子的听觉注意力撑不过一两句话。
 * 40 字念完约 10 秒，已经是上限；再长她会走神，那句话就白写了。
 */
export const MESSAGE_MAX_LENGTH = 40

/** 读出家长留言，没有则为 `undefined` */
export async function loadParentMessage(profileId: Uuid): Promise<ParentMessage | undefined> {
  return (await db.profiles.get(profileId))?.parentMessage
}

/**
 * 写一条新留言，替换掉上一条。
 *
 * 只留最新一条是刻意的：攒成收件箱之后它就变成了任务列表，
 * 而这个功能的价值恰恰在于「随手写一句」。
 *
 * @param profileId - 档案 ID
 * @param text - 留言正文。空白表示删除留言
 * @returns 存下的留言；删除时为 `undefined`
 *
 * @example
 * await saveParentMessage(profileId, '妈妈说，小恩宝昨天的拼音做得特别好')
 */
export async function saveParentMessage(
  profileId: Uuid,
  text: string,
): Promise<ParentMessage | undefined> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) return undefined

  const clean = text.trim().slice(0, MESSAGE_MAX_LENGTH)
  // 新留言一律是未读：改了字就该重新被听到，否则家长会以为写了没生效
  const message = clean.length === 0 ? undefined : { text: clean, createdAt: nowIso() }

  await db.profiles.put({ ...profile, parentMessage: message, updatedAt: nowIso() })
  return message
}

/**
 * 标记留言已被听过。听完之后卡片仍然留着，她想再听几遍是她的自由。
 *
 * @returns 更新后的留言；没有留言时为 `undefined`
 */
export async function markMessageRead(profileId: Uuid): Promise<ParentMessage | undefined> {
  const profile = await db.profiles.get(profileId)
  if (profile?.parentMessage === undefined) return undefined
  if (profile.parentMessage.readAt !== undefined) return profile.parentMessage

  const message = { ...profile.parentMessage, readAt: nowIso() }
  // ⚠️ 不动 profile.updatedAt：孩子听留言不算「家长改过档案」，
  //    而 updatedAt 是默认名迁移的判据（见 data/bootstrap.ts）
  await db.profiles.put({ ...profile, parentMessage: message })
  return message
}

/**
 * 读出生日 `'YYYY-MM-DD'`，没设置时为 `undefined`。
 *
 * @example
 * await loadBirthDate(profileId)   // '2019-08-11'
 */
export async function loadBirthDate(profileId: Uuid): Promise<string | undefined> {
  return (await db.profiles.get(profileId))?.birthDate
}

/**
 * 设置或清除生日。
 *
 * @param profileId - 档案 ID
 * @param birthDate - `'YYYY-MM-DD'`；传空串表示不过生日
 * @returns 实际存下的值
 *
 * @example
 * await saveBirthDate(profileId, '2019-08-11')
 * await saveBirthDate(profileId, '')            // 取消
 */
export async function saveBirthDate(
  profileId: Uuid,
  birthDate: string,
): Promise<string | undefined> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) return undefined

  // 非法格式一律当作「没设置」，而不是存进去等着 isBirthday 去猜
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : undefined
  await db.profiles.put({ ...profile, birthDate: valid, updatedAt: nowIso() })
  return valid
}

/**
 * 改称呼列表。立即生效，不需要重启 App。
 *
 * 超长会被截断而不是拒绝：家长在 iPad 上打字，弹一个「太长了」的错误
 * 远不如直接存下前几个字来得顺手，而昵称本来就该短。
 *
 * ⚠️ 第一个是**主昵称**，会写进 `Profile.name`——备份文件名用的就是它，
 * 所以它必须是家长最认得出的那个叫法。其余存进 `aliases`。
 *
 * @param profileId - 档案 ID
 * @param texts - 新的称呼列表。逐个去空白与截断，去重、剔空，最多留
 *                {@link NICKNAME_MAX_COUNT} 个
 * @returns 实际存下的称呼（已带上专属片段信息），可直接写回 store
 *
 * @example
 * await saveNicknames(profileId, ['  小恩宝 ', '恩宝', '恩宝', ''])
 * // → [{ text: '小恩宝', clipKey: 'name.xiaoenbao' }, { text: '恩宝', clipKey: 'name.enbao' }]
 */
export async function saveNicknames(profileId: Uuid, texts: string[]): Promise<Nickname[]> {
  const profile = await db.profiles.get(profileId)
  if (profile === undefined) return []

  const clean = [
    ...new Set(
      texts.map((t) => t.trim().slice(0, NICKNAME_MAX_LENGTH)).filter((t) => t.length > 0),
    ),
  ].slice(0, NICKNAME_MAX_COUNT)

  await db.profiles.put({
    ...profile,
    // 一个称呼都不留时 name 存空串：文案会整体退回不带称呼的说法，
    // 备份文件名那边有 '进度' 兜底，不会产出 `希恩爱学习__2026-08-11.json`
    name: clean[0] ?? '',
    aliases: clean.slice(1),
    updatedAt: nowIso(),
  })
  return loadNicknames(profileId)
}
