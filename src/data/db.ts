/**
 * @file Dexie 数据库实例与 schema 定义 —— 全项目唯一的 IndexedDB 入口
 * @layer data  只有本目录下的代码可以 import 它，domain/ 与 features/ 一律禁止
 * @see design/02-数据库Schema.md §2 Dexie 定义、§3 各表字段详解
 *
 * 版本升级规则（见 design/02-数据库Schema.md §5）：
 * 1. `version(n)` 只增不改，历史版本定义永久保留在代码里
 * 2. 每次结构变更须同步写 `migrateBackup_n_to_n1()`，处理旧备份文件
 * 3. 新增字段一律给默认值，不允许 required 且无默认值的新字段
 */

import Dexie, { type Table } from 'dexie'
import type {
  Achievement,
  AssetCacheEntry,
  Assessment,
  Attempt,
  CollectionCard,
  DailyTask,
  Item,
  ItemTemplate,
  KnowledgePoint,
  LedgerEntry,
  Mastery,
  MetaKey,
  MetaRecord,
  PetState,
  Profile,
  Session,
  Settings,
} from '@/domain/types'

/**
 * 当前数据库结构版本。
 *
 * ⚠️ 每次修改表结构都必须递增，并在 `version(n)` 中补写迁移逻辑。
 * 导出的备份文件会带上此值，导入时据此决定跑哪些迁移。
 */
export const SCHEMA_VERSION = 3

/**
 * 内置静态内容版本（知识点、题库、成就定义）。
 * 与 `SCHEMA_VERSION` 独立：内容更新不需要改数据库结构。
 */
export const CONTENT_VERSION = 1

/**
 * 构建期注入的 App 版本号，取自 `package.json` 的 `version`。
 * 由 vite.config.ts 的 `define` 替换，见那里的说明。
 */
declare const __APP_VERSION__: string

/**
 * App 版本号，写进备份文件用于排查「这份备份是哪个版本导出的」。
 *
 * 兜底成 `'0.0.0-dev'` 而不是直接用 `__APP_VERSION__`：万一某个工具链
 * （某些 vitest 配置、future 的 SSR）没跑 `define` 替换，直接引用会是
 * ReferenceError，而这个常量在 `data/db.ts` 里，崩了等于整个 App 打不开。
 * 一个用于显示的版本号不值得承担这种风险。
 */
export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev'

export class SmartLearningDB extends Dexie {
  // —— 系统表
  meta!: Table<MetaRecord, MetaKey>
  assetCache!: Table<AssetCacheEntry, string>

  // —— 静态内容表（随 App 版本内置，备份时不导出，语义 ID 作主键）
  knowledgePoints!: Table<KnowledgePoint, string>
  items!: Table<Item, string>
  itemTemplates!: Table<ItemTemplate, string>

  // —— 用户数据表（备份导出的就是这些，主键一律 UUID）
  profiles!: Table<Profile, string>
  settings!: Table<Settings, string>
  attempts!: Table<Attempt, string>
  mastery!: Table<Mastery, string>
  sessions!: Table<Session, string>
  dailyTasks!: Table<DailyTask, string>
  petState!: Table<PetState, string>
  ledger!: Table<LedgerEntry, string>
  collections!: Table<CollectionCard, string>
  achievements!: Table<Achievement, string>
  assessments!: Table<Assessment, string>

  constructor(name = 'smartlearning') {
    super(name)

    // 索引语法：`&` 唯一索引，`*` 多值索引（数组字段），`[a+b]` 复合索引
    this.version(1).stores({
      meta: 'key',
      assetCache: 'key, lastUsedAt',

      knowledgePoints: 'id, subject, unit, order, *prerequisites',
      items: 'id, kpId, type, difficulty',
      itemTemplates: 'id, kpId',

      profiles: 'id, createdAt',
      settings: 'profileId',

      // 高频查询表，索引覆盖：按天统计、按知识点取历史、错题本
      attempts:
        'id, profileId, sessionId, kpId, createdAt, ' +
        '[profileId+localDate], [profileId+kpId], [profileId+kpId+createdAt]',

      // `&[profileId+kpId]` 唯一：每个知识点每个档案只有一条掌握度
      mastery:
        'id, &[profileId+kpId], [profileId+state], [profileId+dueAt], [profileId+subject]',

      sessions: 'id, profileId, [profileId+localDate], startedAt',
      dailyTasks: 'id, &[profileId+localDate]',
      petState: 'id, &profileId',
      ledger: 'id, profileId, [profileId+localDate], createdAt',
      collections: 'id, profileId, [profileId+collectionId], &[profileId+cardId]',
      achievements: 'id, profileId, &[profileId+achievementId]',
      assessments: 'id, profileId, startedAt',
    })

    /**
     * v2：宠物从「每档案一只」改为「每科目一只」。
     *
     * 唯一索引从 `&profileId` 变为 `&[profileId+subject]`，
     * 因此必须显式升级。旧的单只宠物记录直接清空——
     * 它没有 `subject` 字段，无法判断该归给哪个科目，
     * 而当前仍处于试用阶段，重新养一只的代价远小于数据错乱。
     */
    this.version(2)
      .stores({
        petState: 'id, profileId, &[profileId+subject]',
      })
      .upgrade(async (tx) => {
        await tx.table('petState').clear()
      })

    /**
     * v3：宠物再加一个维度——年级。
     *
     * 每升一个年级换一批新宠物，让每学年有明确的终点和新的期待。
     * 唯一索引变为 `&[profileId+subject+gradeLevel]`。
     *
     * 旧记录缺 `gradeLevel`，统一补成 `'G1'` 而非清空——
     * 此时孩子可能已经养了一阵子，抹掉等于白练。
     */
    this.version(3)
      .stores({
        petState: 'id, profileId, [profileId+gradeLevel], &[profileId+subject+gradeLevel]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('petState')
          .toCollection()
          .modify((pet: { gradeLevel?: string }) => {
            pet.gradeLevel ??= 'G1'
          })
      })
  }
}

/** 全局数据库单例。测试中请用 `new SmartLearningDB('test-xxx')` 另建实例以隔离数据。 */
export const db = new SmartLearningDB()

/**
 * 用户数据表名清单 —— 备份导出、导入清空、重置进度都以此为准。
 *
 * ⚠️ 静态内容表（knowledgePoints / items / itemTemplates / assetCache）**不在其中**：
 * 它们由目标设备的 App 版本重建，这样老备份能导入到内容更新过的新版本，
 * 而不会用旧内容覆盖新内容。
 */
export const USER_DATA_TABLES = [
  'profiles',
  'settings',
  'attempts',
  'mastery',
  'sessions',
  'dailyTasks',
  'petState',
  'ledger',
  'collections',
  'achievements',
  'assessments',
] as const

export type UserDataTableName = (typeof USER_DATA_TABLES)[number]
