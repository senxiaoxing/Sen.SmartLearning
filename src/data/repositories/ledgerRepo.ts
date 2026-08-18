/**
 * @file 积分流水仓储 —— 读余额、追加流水
 * @layer data  唯一允许接触 Dexie 的层
 * @see design/02-数据库Schema.md §3.12  ledger 表（账本式：余额由流水推导）
 * @see src/domain/economy/applyGrants.ts  balanceAfter 链的纯函数计算
 *
 * ⚠️ 本模块的写入函数设计成**可被外层事务包住**：
 * 发积分必须和写 attempt 在同一个事务里，否则会出现「题记下了但分没给」
 * 或反过来的不一致。见 data/repositories/masteryRepo.ts 的 recordAttempt。
 */

import { db } from '@/data/db'
import { applyGrants, type GrantSettlement } from '@/domain/economy/applyGrants'
import type { RewardGrant } from '@/domain/economy/rewards'
import { nowIso, parseIso, toIso, todayLocal } from '@/domain/time'
import { newId } from '@/platform/newId'
import { EARNED_LEDGER_REASONS } from '@/domain/types'
import type { IsoDateTime, LedgerEntry, LedgerReason, LocalDate, Uuid } from '@/domain/types'

/**
 * 取某档案最新的一条流水。
 *
 * ⚠️ 刻意不用 design/02-数据库Schema.md §6 给的那句
 * `where('profileId').equals(pid).reverse().sortBy('createdAt')`——
 * `sortBy` 会把该档案的**全部流水读进内存再排序**，而 ledger 一年约 45000 条
 * （见 §7 容量估算），在答题路径上每题跑一次是不可接受的。
 *
 * 这里改走 `createdAt` 索引的反向游标：从最新一条往回找，命中即停。
 * 单档案（本项目的实际情况）下就是第一条，等同 O(1)。
 *
 * 「最新」有确定含义的前提是同档案内 `createdAt` 互不相同，
 * 这由 {@link appendGrants} 保证——见那里关于严格单调的说明。
 */
async function latestEntry(profileId: Uuid): Promise<LedgerEntry | undefined> {
  return db.ledger
    .orderBy('createdAt')
    .reverse()
    .filter((e) => e.profileId === profileId)
    .first()
}

/**
 * 取当前积分余额 = 最新一条流水的 `balanceAfter`。
 *
 * @param profileId - 档案 ID
 * @returns 余额；从未有过流水时返回 0
 *
 * @example
 * const balance = await getBalance(profileId)   // 138
 */
export async function getBalance(profileId: Uuid): Promise<number> {
  return (await latestEntry(profileId))?.balanceAfter ?? 0
}

export interface AppendGrantsOptions {
  /** 关联对象 ID：attemptId / taskId / shopItemId */
  refId?: string
  now?: IsoDateTime
  localDate?: LocalDate
}

/**
 * {@link appendGrants} 的结果：纯函数算出的结算，外加真正写进库的流水 ID。
 *
 * ID 由本层生成（`newId()`），domain 层的 {@link GrantSettlement} 不可能知道，
 * 所以在这里加宽一层。购买流程要靠它把 `Purchase.ledgerEntryId` 指回那笔扣分——
 * 没有这个指针，撤销购买时就只能靠「金额 + 时间」去猜是哪一笔，必然出错。
 */
export interface AppendedGrants extends GrantSettlement {
  /** 本次写入的流水 ID，顺序与 `entries` 一一对应。空发放时为空数组 */
  entryIds: Uuid[]
}

/**
 * 追加若干笔积分流水，并返回结算结果。
 *
 * 余额在写入前**当场从流水读取**而非由调用方传入：账本的正确性不能依赖
 * 调用方记得传对数字。若本函数运行在外层事务内（推荐），这次读取与随后的
 * 写入同属一个事务，天然避免并发下的余额错乱。
 *
 * `grants` 为空时不写任何记录，但仍返回当前真实余额——
 * 答错、以及将来「任务未达标」等场景都会走到这里，返回值必须始终可信。
 *
 * @param profileId - 档案 ID
 * @param grants - 待入账的发放，由 domain/economy/rewards.ts 算出
 * @param options - 关联 ID 与时间；不传时间则取当前时刻
 * @returns 每笔的结余快照、最终余额与本次净变化
 *
 * @example
 * const grants = rewardsForAttempt({ isCorrect: true, isRetry: false, difficulty: 3, justMastered: false })
 * const { totalDelta, balanceAfter } = await appendGrants(profileId, grants, { refId: attempt.id })
 * // totalDelta 7（答对 2 + 挑战 5），balanceAfter 为累计余额
 */
export async function appendGrants(
  profileId: Uuid,
  grants: readonly RewardGrant[],
  options: AppendGrantsOptions = {},
): Promise<AppendedGrants> {
  const latest = await latestEntry(profileId)
  const settlement = applyGrants(latest?.balanceAfter ?? 0, grants)
  if (settlement.entries.length === 0) return { ...settlement, entryIds: [] }

  /**
   * ⭐ 同一档案内 `createdAt` 必须**严格递增**，这是整个账本的地基。
   *
   * 余额取自「最新一条的 balanceAfter」，而「最新」只能靠 `createdAt` 排序判定。
   * 一次作答往往同时产生多笔（答对 + 挑战 + 掌握），若它们共用同一个时间戳，
   * 索引内的先后就退化成由 UUID 主键决定的随机顺序——读余额时可能读到中间那条，
   * 于是后续每一笔都建立在错误的基数上，账**从此永久性地对不上**。
   * 毫秒精度不够用：同一毫秒内连续记两笔完全可能发生。
   *
   * 因此批内逐条 +1ms，并整体不早于已有的最后一条。代价是时间戳最多偏后几毫秒，
   * 对账本毫无影响；而 `localDate` 保持取自作答本身，不受这个微调影响。
   */
  const requestedMs = parseIso(options.now ?? nowIso()).getTime()
  const floorMs = latest === undefined ? 0 : parseIso(latest.createdAt).getTime() + 1
  const baseMs = Math.max(requestedMs, floorMs)

  const localDate = options.localDate ?? todayLocal()

  const rows: LedgerEntry[] = settlement.entries.map((entry, i) => ({
    id: newId(),
    profileId,
    delta: entry.delta,
    balanceAfter: entry.balanceAfter,
    reason: entry.reason,
    ...(options.refId !== undefined && { refId: options.refId }),
    createdAt: toIso(new Date(baseMs + i)),
    localDate,
  }))

  await db.ledger.bulkAdd(rows)
  return { ...settlement, entryIds: rows.map((r) => r.id) }
}

/**
 * 某一天赚到的积分总额，用于主页与家长报告的「今天得了多少分」。
 *
 * 两道过滤，缺一不可：
 *
 * 1. **只统计正数**——支出（买东西）不该让「今天赚了多少」这个数字变小，
 *    那会让孩子觉得花钱是在损失努力成果。
 * 2. **只统计 {@link EARNED_LEDGER_REASONS}**——退款（`purchase_refund`）也是正数，
 *    但它是把花掉的分还回来，不是新赚的。少了这道过滤，孩子手滑买错再撤销
 *    就会显示成「今天多赚了 300 分」，这个数字从此不再是努力的度量。
 *
 * @param profileId - 档案 ID
 * @param localDate - 本地日期 `'YYYY-MM-DD'`
 *
 * @example
 * await sumEarnedOnDate(profileId, todayLocal())   // 46
 */
export async function sumEarnedOnDate(
  profileId: Uuid,
  localDate: LocalDate,
): Promise<number> {
  const entries = await db.ledger
    .where('[profileId+localDate]')
    .equals([profileId, localDate])
    .toArray()

  const earned = new Set<LedgerReason>(EARNED_LEDGER_REASONS)
  return entries.reduce(
    (sum, e) => (e.delta > 0 && earned.has(e.reason) ? sum + e.delta : sum),
    0,
  )
}
