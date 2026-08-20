# 数据库 Schema 设计

> 版本：`schemaVersion: 1` ｜ 存储：IndexedDB via **Dexie.js**
> 部署形态：**纯本地，不上云**。所有数据存在设备本地，通过手动导出/导入迁移。

---

## 0. 三条不可违背的设计约束

这三条现在写进去只要几行，将来补要重构：

### 约束 1：ID 策略必须区分静态内容与用户数据

| 类别 | ID 类型 | 示例 | 原因 |
|---|---|---|---|
| **静态内容**（知识点、题库、成就定义、商店物品） | **语义 ID** | `M5.2`、`P3.3-L2-0007` | 跨设备必须完全一致，UUID 会导致备份导入错位 |
| **用户数据**（作答、掌握度、流水、会话） | **UUID v4** | `crypto.randomUUID()` | 跨设备唯一，合并时不会撞车 |

> ⚠️ **绝不使用自增整数主键**。自增 ID 在两台设备上会产生相同数字指向不同记录，
> 一旦将来做同步或合并备份，数据会静默错乱且极难排查。

### 约束 2：所有导出必须带版本号

半年后数据结构一定会变。有 `schemaVersion` 才能跑迁移把老备份升级上来；
没有版本号，老备份直接报废——而备份报废的时候，往往正是最需要它的时候。

### 约束 3：时间同时存 UTC 和本地日期

```ts
createdAt: string   // '2026-08-05T13:22:31.000Z'  ISO 8601 UTC，用于精确排序
localDate: string   // '2026-08-05'                本地日期，用于"今天做了多少题"
```

只存 UTC 会导致跨时区或凌晨时段的日统计错乱（晚上 8 点做的题算到了第二天）。
`localDate` 在写入时由客户端本地时区计算并冻结，**永不重算**。

---

## 1. 表总览

| # | 表名 | 类型 | 主键 | 说明 |
|---|---|---|---|---|
| 1 | `meta` | 系统 | `key` | schema 版本、安装 ID、导出记录 |
| 2 | `profiles` | 用户 | UUID | 学习档案 |
| 3 | `settings` | 用户 | `profileId` | 时长限制、音效开关等 |
| 4 | `knowledgePoints` | 静态 | 语义 ID | 知识点图谱（112 条） |
| 5 | `items` | 静态 | 语义 ID | 静态题库（拼音、英语） |
| 6 | `itemTemplates` | 静态 | 语义 ID | 数学题目生成器配置 |
| 7 | **`attempts`** | 用户 | UUID | ⭐ 每次作答记录（只增不改） |
| 8 | **`mastery`** | 用户 | UUID | ⭐ 掌握度（Profile × 知识点） |
| 9 | `sessions` | 用户 | UUID | 学习会话 |
| 10 | `dailyTasks` | 用户 | UUID | 每日任务 |
| 11 | `petState` | 用户 | UUID | 宠物状态（科目 × 年级各一只） |
| 12 | `ledger` | 用户 | UUID | 积分流水（账本式） |
| 13 | `collections` | 用户 | UUID | 图鉴解锁记录 |
| 14 | `achievements` | 用户 | UUID | 成就进度 |
| 15 | `assessments` | 用户 | UUID | 摸底测评结果 |
| 16 | `assetCache` | 系统 | `key` | 音频/图片缓存元信息 |

**静态表**（4、5、6）随 App 版本内置，导出备份时**不包含**，导入时由当前 App 版本重建。
**用户表**才是备份的内容。这样能让老备份导入到新版本 App（内容更多了），而不是被老内容覆盖。

---

## 2. Dexie 定义

```ts
// src/db/schema.ts
import Dexie, { type Table } from 'dexie'

export const SCHEMA_VERSION = 1

export class SmartLearningDB extends Dexie {
  meta!:            Table<MetaRecord, string>
  profiles!:        Table<Profile, string>
  settings!:        Table<Settings, string>
  knowledgePoints!: Table<KnowledgePoint, string>
  items!:           Table<Item, string>
  itemTemplates!:   Table<ItemTemplate, string>
  attempts!:        Table<Attempt, string>
  mastery!:         Table<Mastery, string>
  sessions!:        Table<Session, string>
  dailyTasks!:      Table<DailyTask, string>
  petState!:        Table<PetState, string>
  ledger!:          Table<LedgerEntry, string>
  collections!:     Table<CollectionCard, string>
  achievements!:    Table<Achievement, string>
  assessments!:     Table<Assessment, string>
  assetCache!:      Table<AssetCacheEntry, string>

  constructor() {
    super('smartlearning')

    this.version(1).stores({
      meta:            'key',
      profiles:        'id, createdAt',
      settings:        'profileId',
      knowledgePoints: 'id, subject, unit, order, *prerequisites',
      items:           'id, kpId, type, difficulty',
      itemTemplates:   'id, kpId',

      // ⭐ 高频查询表，索引要仔细设计
      attempts:        'id, profileId, sessionId, kpId, createdAt, ' +
                       '[profileId+localDate], [profileId+kpId], ' +
                       '[profileId+kpId+createdAt], [profileId+isCorrect]',

      mastery:         'id, &[profileId+kpId], [profileId+state], ' +
                       '[profileId+dueAt], [profileId+subject]',

      sessions:        'id, profileId, [profileId+localDate], startedAt',
      dailyTasks:      'id, &[profileId+localDate]',
      // v3 起：宠物按「科目 × 年级」划分
      petState:        'id, profileId, [profileId+gradeLevel], &[profileId+subject+gradeLevel]',
      ledger:          'id, profileId, [profileId+localDate], createdAt',
      collections:     'id, profileId, [profileId+collectionId], &[profileId+cardId]',
      achievements:    'id, profileId, &[profileId+achievementId]',
      assessments:     'id, profileId, startedAt',
      assetCache:      'key, lastUsedAt',
    })
  }
}

export const db = new SmartLearningDB()
```

> `&` 前缀 = 唯一索引，`*` 前缀 = 多值索引（数组字段），`[a+b]` = 复合索引。

---

## 3. 表结构详解

### 3.1 `meta` — 系统元数据

```ts
interface MetaRecord {
  key: string
  value: unknown
  updatedAt: string
}
```

固定 key：

| key | 值示例 | 说明 |
|---|---|---|
| `schemaVersion` | `1` | 当前数据库结构版本 |
| `contentVersion` | `1` | 内置内容版本（知识点/题库） |
| `appVersion` | `'0.1.0'` | 写入时的 App 版本 |
| `installId` | UUID | 本次安装的唯一标识，用于识别备份来源设备 |
| `activeProfileId` | UUID | 当前使用的档案 |
| `lastExportAt` | ISO 时间 | 上次导出时间，用于提醒备份 |
| `firstLaunchAt` | ISO 时间 | 首次启动时间 |

---

### 3.2 `profiles` — 学习档案

```ts
interface Profile {
  id: string              // UUID
  name: string            // 孩子的名字/昵称
  avatarId: string        // 头像资源 key
  birthDate?: string      // 'YYYY-MM-DD'，用于年龄适配（可选）
  grade: '1A' | '1B'      // 当前学期
  createdAt: string
  updatedAt: string
}
```

> 当前只有一个档案，但保留表结构。将来加"爸爸妈妈陪练"或第二个孩子时无需迁移。

---

### 3.3 `settings` — 设置

```ts
interface Settings {
  profileId: string           // 主键

  // 时长与护眼（家长控制）
  dailySessionLimit: number   // 每天最多几段，默认 3
  sessionDurationMin: number  // 每段时长（分钟），默认 15
  breakDurationMin: number    // 强制休息（分钟），默认 5

  // 音频
  bgmEnabled: boolean
  bgmVolume: number           // 0~1
  sfxEnabled: boolean
  sfxVolume: number
  ttsRate: number             // 语速 0.5~1.5，儿童建议 0.85
  ttsVoiceZh?: string         // 中文音色标识
  ttsVoiceEn?: string         // 英文音色标识

  // 内容
  subjectsEnabled: ('math' | 'pinyin' | 'english')[]
  dailyTargetItems: number    // 每日目标题量，默认 20

  // 无障碍
  autoReadStem: boolean       // 自动朗读题干，默认 true ⭐一年级必开
  reducedMotion: boolean

  updatedAt: string
}
```

---

### 3.4 `knowledgePoints` — 知识点（静态）

```ts
interface KnowledgePoint {
  id: string                  // 语义 ID: 'M5.2'
  subject: 'math' | 'pinyin' | 'english'
  unit: string                // 'M5'
  unitName: string            // '20以内进位加法'
  name: string                // '9加几'
  grade: '1A' | '1B'
  order: number               // 全局教学顺序
  prerequisites: string[]     // ['M5.1', 'M3.3']  多值索引
  itemTypes: ItemType[]
  difficulty: 1 | 2 | 3
  isKeyNode: boolean
  targetMastery: number       // 目标掌握度，默认 0.85，关键节点 0.95
  estimatedItems: number      // 达到掌握预计题量
  misconceptions: string[]    // ['no_carry', 'carry_lost', ...]
  collectionCardId?: string   // 掌握后解锁的图鉴卡
}
```

---

### 3.5 `items` — 静态题库（拼音、英语）

```ts
interface Item {
  id: string                  // 'P3.3-L2-0007'
  kpId: string
  type: ItemType
  difficulty: 1 | 2 | 3

  stem: {
    text?: string             // 题干文字（也用于 TTS）
    ttsText?: string          // 专用朗读文本（与显示不同时使用）
    ttsLang?: 'zh-CN' | 'en-US'
    audioKey?: string         // 预生成音频资源 key
    imageKey?: string
  }

  options: ItemOption[]
  answer: string | string[]   // 正确 option id（可多个，用于排序/组合题）

  explanation?: {
    text: string
    ttsText?: string
    imageKey?: string
  }

  assetKeys: string[]         // 该题依赖的所有资源，用于会话预加载
  tags: string[]
}

interface ItemOption {
  id: string                  // 'a' | 'b' | 'c' | 'd'
  text?: string
  imageKey?: string
  audioKey?: string
  isCorrect: boolean
  misconceptionTag?: string   // ⭐ 该错误选项对应的认知误区
}
```

> **`misconceptionTag` 是整个系统最有价值的字段。**
> 干扰项绝不能随机生成——`9+5` 的错误选项必须是 `13`(`no_carry`)、`10`(`carry_lost`)、`4`(`sub_instead`)。
> 孩子选了哪个，就知道她卡在认知链条的哪一环。没有这个字段，后面所有"智慧"都无从谈起。

---

### 3.6 `itemTemplates` — 数学题目生成器配置（静态）

数学题**不入库**，运行时按配置生成，因此题量无限、内容成本为零。

```ts
interface ItemTemplate {
  id: string                  // 'M5.2-gen'
  kpId: string
  generator: string           // 生成器注册名，如 'addWithCarry'
  type: ItemType

  // 三档难度的生成参数
  params: {
    1: Record<string, unknown>
    2: Record<string, unknown>
    3: Record<string, unknown>
  }
}
```

> **⚠️ 实现修正**：本表原设计含 `distractors` / `stemTemplate` / `ttsTemplate` 三个配置字段，
> 实现阶段已移除。原因：干扰项需要访问生成过程的中间值（凑十的余数、破十的差），
> 做成配置就必须引入「策略函数名 → 实现」的间接层，既失去类型安全又更难验证。
> **现在干扰项策略写在生成器内部**，并在其 JSDoc 里以对照表说明每个误区对应什么值。
> 见 `src/domain/generators/addWithCarry.ts`。

**示例：M5.2（9 加几）** — 实际实现见 `src/data/seed/itemTemplates.ts`

```ts
{
  id: 'M5.2-gen',
  kpId: 'M5.2',
  generator: 'addWithCarry',
  type: 'input_number',
  params: {
    1: { addends: [9] },
    2: { addends: [9] },
    3: { addends: [9] },   // 难度 3 额外启用 digit_concat 干扰项
  },
}
```

**难度档设计原则**：难度不是「换个更大的数」，而是**换一种更难的思维方式**。
例如 M1.3 数的顺序三档为 后继 → 前驱 → 中间数；M3.x 三档为 分解 → 分解 → 合成（反向思维）。

---

### 3.7 `attempts` — 作答记录 ⭐核心表

**只增不改（append-only）**。这是所有分析、自适应、家长报告的唯一数据源。

```ts
interface Attempt {
  id: string                  // UUID
  profileId: string
  sessionId: string
  kpId: string

  itemId: string              // 静态题：题目 ID；生成题：签名 'M5.2-gen#9+5'
  itemSnapshot?: {            // ⭐ 生成题必须存快照，否则无法复现和复盘
    stem: string
    options: Array<{ id: string; text: string; misconceptionTag?: string }>
    answer: string
  }

  difficulty: 1 | 2 | 3
  isCorrect: boolean
  selectedOptionId?: string
  inputValue?: string         // input_number 类型的实际输入

  misconceptionTag?: string   // ⭐ 命中的认知误区
  responseTimeMs: number
  hintUsed: boolean
  ttsReplayCount: number      // 重听次数（低龄段的重要信号）
  isRetry: boolean            // 是否为错题订正 ⭐订正也给积分

  createdAt: string           // ISO UTC
  localDate: string           // 'YYYY-MM-DD'
}
```

**为什么要存 `itemSnapshot`**
数学题是运行时生成的，不存快照就无法回答"她上周那道错题到底是什么"。
错题本、家长报告、复盘讲解全都依赖它。存储成本极小（一条约 200 字节）。

**为什么要记 `ttsReplayCount`**
一年级孩子不识字，全靠听。反复重听说明题干理解有困难，而不是知识点没掌握。
这两种情况的补救方式完全不同。

---

### 3.8 `mastery` — 掌握度 ⭐核心表

每个 `(profileId, kpId)` 组合一条，**唯一索引**。

```ts
interface Mastery {
  id: string                  // UUID
  profileId: string
  kpId: string
  subject: 'math' | 'pinyin' | 'english'   // 冗余字段，便于按科目查询

  state: 'locked' | 'available' | 'learning' | 'mastered' | 'review'
  masteryScore: number        // 0~1
  currentDifficulty: 1 | 2 | 3

  totalAttempts: number
  correctAttempts: number
  consecutiveCorrect: number
  consecutiveWrong: number    // 连续答错次数，答对归零
  avgResponseTimeMs: number

  // 间隔重复（SM-2 变体）
  easeFactor: number          // 默认 2.5，范围 [1.3, 2.8]
  intervalDays: number        // 当前复习间隔
  repetitions: number         // 连续成功复习次数
  dueAt: string               // 下次复习时间（ISO UTC）

  // ⭐ 错误类型累计，定向补救的触发依据
  misconceptionCounts: Record<string, number>   // { 'no_carry': 4, 'carry_lost': 1 }

  firstPracticedAt?: string
  lastPracticedAt?: string
  masteredAt?: string
  createdAt: string
  updatedAt: string
}
```

**masteryScore 更新公式**

```ts
// 指数移动平均（EMA），近期表现权重更高
const ALPHA = 0.3
const score = isCorrect ? 1 : 0
// 难度加权：高难度做对加分更多，低难度做错扣分更多
const weight = isCorrect ? (0.7 + difficulty * 0.15) : (1.3 - difficulty * 0.15)
newScore = clamp(oldScore + ALPHA * weight * (score - oldScore), 0, 1)
```

**状态跃迁条件**

| 跃迁 | 条件 |
|---|---|
| `locked → available` | 所有 `prerequisites` 均为 `mastered` |
| `available → learning` | 首次作答 |
| `learning → mastered` | `masteryScore >= targetMastery` **且** `consecutiveCorrect >= 5` **且** `totalAttempts >= 8` |
| `mastered → review` | 当前时间 >= `dueAt` |
| `review → mastered` | 复习答对，按 SM-2 延长 `intervalDays` |
| `review → learning` | 复习答错，`intervalDays` 重置为 1，`repetitions = 0` |
| `mastered → learning` | `consecutiveWrong >= 2`（掌握度回退） |

> 回退阈值设为 2 而非 1：孩子手滑点错、走神一次很常见，
> 一次失误就把辛苦掌握的知识点打回去，既不准确也打击积极性。
> 这也是 `consecutiveWrong` 字段存在的理由——只看 `consecutiveCorrect === 0`
> 无法区分「错了 1 次」和「错了 5 次」。

**SM-2 间隔计算**

```ts
function nextInterval(m: Mastery, quality: 0|1|2|3|4|5): Partial<Mastery> {
  if (quality < 3) {
    return { repetitions: 0, intervalDays: 1, easeFactor: m.easeFactor }
  }
  const ef = clamp(
    m.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    1.3, 2.8
  )
  const reps = m.repetitions + 1
  const interval =
    reps === 1 ? 1 :
    reps === 2 ? 3 :
    Math.round(m.intervalDays * ef)
  return { repetitions: reps, intervalDays: interval, easeFactor: ef }
}

// quality 由正确性 + 反应时间推导（一年级不做主观自评）
function toQuality(isCorrect: boolean, rtMs: number, baselineMs: number): 0|1|2|3|4|5 {
  if (!isCorrect) return rtMs < baselineMs * 0.5 ? 1 : 2   // 秒答错 = 乱点
  if (rtMs < baselineMs * 0.7) return 5                     // 又快又对
  if (rtMs < baselineMs * 1.5) return 4
  return 3                                                   // 对但很慢
}
```

---

### 3.9 `sessions` — 学习会话

```ts
interface Session {
  id: string
  profileId: string
  mode: 'daily' | 'free' | 'review' | 'assessment' | 'remedial'
  subject?: 'math' | 'pinyin' | 'english'   // free 模式指定科目

  startedAt: string
  endedAt?: string
  durationMs: number
  activeDurationMs: number    // 剔除挂机（超过 60s 无操作不计入）⭐

  itemCount: number
  correctCount: number
  pointsEarned: number
  kpIdsTouched: string[]

  completedNormally: boolean  // 是否正常结束（非中途退出）
  localDate: string
}
```

> `activeDurationMs` 与 `durationMs` 分开记：家长报告要显示**真实专注时长**，
> 而不是"打开了 40 分钟"（其中 25 分钟在发呆）。护眼时长限制也应基于 active 计算。

---

### 3.10 `dailyTasks` — 每日任务

```ts
interface DailyTask {
  id: string
  profileId: string
  localDate: string           // 与 profileId 组成唯一索引

  tasks: Array<{
    id: string                // 'task-1'
    type: 'answer_count' | 'accuracy' | 'subject_session'
         | 'retry_wrong' | 'challenge_hard' | 'streak'
    label: string             // '答对 20 道题'
    ttsLabel: string          // 朗读文本
    target: number
    progress: number
    completed: boolean
    reward: number            // 积分
  }>

  allCompleted: boolean
  bonusClaimed: boolean
  createdAt: string
  updatedAt: string
}
```

**任务设计原则：奖励过程，不只奖励结果**

| 任务类型 | 示例 | 为什么 |
|---|---|---|
| `retry_wrong` | 订正 3 道错题 | ⭐ 订正也给积分，否则孩子会回避错题 |
| `challenge_hard` | 挑战 2 道难题 | ⭐ 鼓励跳出舒适区 |
| `answer_count` | 答对 20 题 | 基础量 |
| `streak` | 连续第 N 天 | 习惯养成 |

> ❌ **不要设置"全对才有奖励"的任务**——会让孩子专挑简单题刷，是最典型的游戏化反效果。

---

### 3.11 `petState` — 宠物状态

> 完整设计见 **[06-宠物系统.md](./06-宠物系统.md)**。

按「**科目 × 年级**」划分，每个 `(profileId, subject, gradeLevel)` 唯一一条。

```ts
interface PetState {
  id: string                  // UUID
  profileId: string
  subject: Subject            // 语文/数学/英语各一只
  gradeLevel: GradeLevel      // 'G1' ~ 'G6'，升年级换一批新宠物
  petTypeId: string           // 对应 data/seed/pets.ts 的定义 ID
  name: string                // ⭐ 孩子自己起，最强的情感绑定

  /**
   * 累计经验，只增不减。
   * ⚠️ 等级与形态都由它推导（domain/pet/growth.ts），不单独存储——
   * 存冗余的 level 迟早与 exp 不一致，表现为「宠物等级莫名变了」，对孩子非常伤。
   */
  exp: number

  lastSeenAt: string          // 用于生成"想你了"的问候

  /**
   * ⭐ 小屋里的站位：舞台宽/高的比例（0~1），指向宠物盒子的左上角。
   *
   * 存比例而不是像素——换个设备打开屏幕尺寸就变了，像素会让三只跑到屏幕外。
   * 两个字段**可缺失**，缺了就是「她还没摆过」，由 domain/pet/roomSpot.ts 的
   * roomSpotOf() 回落到默认布局。不给默认值写进库里：那样分不清
   * 「摆到了默认位置」和「从没摆过」，以后想调默认布局就再也动不了已有档案。
   *
   * ⚠️ 不建索引，因此新增这两个字段**不需要升 schemaVersion**，
   * 也不需要备份迁移——旧备份导进来就是 undefined，正好等于「没摆过」。
   */
  roomX?: number
  roomY?: number

  createdAt: string
  updatedAt: string
}
```

> ⚠️ 任何整条 `put()` 回去的写入路径（`addExp` / `renamePet` / 以后新增的）
> 都必须带上这两个字段，漏一次她摆好的布置就没了。
> 由 `petRepo.test.ts`「站位不会被别的写入抹掉」守着。

**设计红线（已写入 CLAUDE.md）**

1. 宠物永远不会死亡、不会掉级、不会因疏于照顾受损
2. 久未登录 → 「我有点想你」，❌ 绝不是责备或「快饿死了」
3. ⭐ 三只宠物之间**绝不比较**：不排名、不并列进度
4. 未开放科目的宠物显示「还在睡觉」，❌ 不能一直停在蛋阶段
5. ❌ 不做随机奖励（抽卡/开箱）——成长必须确定、努力可预期

> **喂养机制已废弃**：早期设计有 `fullness`/`cleanliness`/`equippedItems`，
> 实现时移除。原因是喂养需要配套的积分商店与美术资源，
> 而宠物成长本身已提供足够动机，引入第二套货币对一年级孩子是额外的认知负担。

---

### 3.12 `ledger` — 积分流水（账本式）

**余额由流水推导，不单独存可变余额字段**，避免不一致。为查询性能冗余 `balanceAfter`。

```ts
interface LedgerEntry {
  id: string
  profileId: string
  delta: number               // +2 / -10
  balanceAfter: number        // 冗余，便于快速取余额（取最新一条）
  reason: LedgerReason
  refId?: string              // 关联的 attemptId / taskId / shopItemId
  note?: string
  createdAt: string
  localDate: string
}

type LedgerReason =
  | 'correct_answer'      // +2  答对
  | 'retry_correct'       // +1  ⭐ 订正答对也给分
  | 'challenge_bonus'     // +5  挑战高难度成功
  | 'daily_task'          // +20 完成每日任务
  | 'all_tasks_bonus'     // +30 全部任务完成
  | 'streak_bonus'        // +N  连续天数奖励
  | 'kp_mastered'         // +15 掌握一个知识点
  | 'assessment_complete' // +50 完成摸底测评
  | 'buy_food'            // -N  给宠物买零食
  | 'buy_item'            // -N  给小屋买家具
  | 'redeem_real'         // -N  兑换现实奖励券
  | 'purchase_refund'     // +N  撤销购买，按成交价原额退回
  | 'manual_adjust'       // 家长手动调整
```

**⭐ `EARNED_LEDGER_REASONS`（`domain/types.ts`）**

「今天赚了多少分」只统计这份白名单里的 reason，**且只统计正数**。
`purchase_refund` 虽是正数但不在其中——它是把花掉的分还回来，不是新赚的。
少了这道过滤，孩子买错再撤销会显示成「今天多赚了 300 分」，
那个数字从此不再是努力的度量。实现见 `ledgerRepo.sumEarnedOnDate`。

**积分经济平衡（重要，别通胀）**

> ⚠️ 下表已按**一轮 10 题**重算。早先那版按「一段 25 题 = 140 分/天」定价
> （装扮 100 / 稀有 300 / 场景 500），而轮次早已依 design/05 的孩子反馈砍到 10 题，
> 那套价格对应的攒钱周期只有实际的一半，照抄会直接通胀。

| 项 | 数值 |
|---|---|
| 一轮 | 10 题 |
| 单轮收入 | 全对 20 + 挑战/掌握偶发 ≈ **25~35 分/轮** |
| 每日（2~3 轮）收入 | ≈ **70~100 分/天** |

| 商品 | 价格 | 攒多久 |
|---|---|---|
| 宠物零食（`treat`） | 10~25 | 当天 |
| 小屋家具（`room`） | 300~400 | 4~5 天 |
| 现实 · 小体验 | 100~250 | 1~3 天 |
| 现实 · 零食 | 100~500 | 2~7 天 |
| 现实 · 大奖 | 800~3000 | 2 周~1 个月 |

节奏目标：**当天就能给宠物买点零食 + 攒 4~5 天添一件家具 + 攒 2 周以上换一次现实大奖**。
小屋首发 6 件家具合计 2120 分，约 3~4 周集齐。
上线后按孩子实际速度调数值即可，不需要改结构。

---

### 3.12b `purchases` — 购买记录（schema v4 新增）

```ts
type ShopItemKind = 'room' | 'treat' | 'real'
type PurchaseStatus = 'owned' | 'pending' | 'fulfilled'

interface Purchase {
  id: string                  // UUID
  profileId: string
  shopItemId: string          // 语义 ID：'room-rug' / 'real-icecream'
  kind: ShopItemKind
  label: string               // ⭐ 名称快照
  pricePaid: number           // ⭐ 成交价快照
  status: PurchaseStatus
  ledgerEntryId: string       // 对应那笔扣分流水
  createdAt: string
  localDate: string
  fulfilledAt?: string
}
```

索引：`id, profileId, createdAt, [profileId+status], [profileId+shopItemId]`

**⭐ 为什么不直接用 `ledger` 当兑换记录**

`ledger` 是 append-only 的账本，而「待兑现 → 已兑现」是**可变状态**。
塞进流水就得靠再记一笔来表达状态变化，于是「这张券兑现了没」
要靠扫描全部流水来推导——那正是账本式设计刻意避免的东西。
两张表各司其职：**ledger 管钱，purchases 管东西**。

**⭐ 为什么冻结 `label` 与 `pricePaid`**

现实券由家长维护，可以下架、可以改价。不冻结的话，家长把「一个冰淇淋」下架后，
孩子记录里那条会变成空白，历史价格也会跟着现价漂移。
这与数学题必须写 `itemSnapshot` 是同一条原则：**历史记录不依赖当前的静态内容表**。

**状态流转**

```
room  → owned                  终态：家具一直在小屋里
treat → fulfilled              终态：买入即消耗（播动画，不产生任何状态）
real  → pending → fulfilled    家长在家长区点「已兑现」
```

没有 `cancelled` 状态：**撤销一笔购买是删除该记录并原额退分**，不留作废记录。
孩子的「我买过什么」里出现一条划掉的东西，传达的是「你买错了」，而手滑不该由她背。

> ⚠️ `treat`（宠物零食）**不产生任何状态**——不加经验、不涨好感、没有饱食度。
> 喂养系统在本文 §3.11、design/03 §4.5、design/06 §9 三处都被明确移除过，
> 理由是它必然带来「没喂 = 宠物变惨」的惩罚感。零食是一次性的开心，仅此而已。

---

### 3.13 `collections` — 图鉴解锁

```ts
interface CollectionCard {
  id: string
  profileId: string
  collectionId: string        // 'math-number-spirits' | 'pinyin-island' | 'english-animals'
  cardId: string              // 'card-M5.2'，与知识点一一对应
  unlockedAt: string
  unlockedByKpId: string
  isNew: boolean              // 未查看过，用于小红点
}
```

**图鉴定义（静态，代码内置）**

| 图鉴 | 卡片数 | 对应 |
|---|---|---|
| 数字精灵 | 48 | 数学 48 个知识点 |
| 拼音岛 | 35 | 拼音 35 个知识点 |
| 动物朋友 | 30 | 英语 30 个知识点 |
| **合计** | **112** | 每个知识点对应 1 张，`collectionCardId = 'card-' + kpId'` |

> 去掉排行榜后，**图鉴是最重要的收集类动机来源**。
> UI 上必须显示空位（灰色剪影 + "还差 3 张集齐本册"），空位比已获得更能驱动行为。

---

### 3.14 `achievements` — 成就

```ts
interface Achievement {
  id: string
  profileId: string
  achievementId: string       // 静态定义 ID: 'streak-7'
  progress: number
  target: number
  unlockedAt?: string
  isNew: boolean
  createdAt: string
  updatedAt: string
}
```

**成就定义示例（静态）**

| ID | 名称 | 条件 |
|---|---|---|
| `streak-3` / `-7` / `-30` | 坚持之星 | 连续学习 N 天 |
| `retry-50` | 不服输 | 累计订正 50 道错题 ⭐ |
| `challenge-20` | 小挑战家 | 完成 20 道最高难度题 |
| `perfect-session` | 全对达人 | 单次会话全对 |
| `kp-master-10/50/112` | 知识收集者 | 掌握 N 个知识点 |
| `subject-clear-math` | 数学通关 | 数学全部知识点 mastered |
| `early-bird` | 早起鸟 | 8 点前学习 5 次 |
| `pet-stage-3` | 亲密伙伴 | 宠物成长到第三阶段 |

---

### 3.15 `assessments` — 摸底测评

```ts
interface Assessment {
  id: string
  profileId: string
  type: 'initial' | 'periodic'
  startedAt: string
  completedAt?: string

  probes: Array<{
    kpId: string
    itemId: string
    isCorrect: boolean
    responseTimeMs: number
  }>

  results: Array<{
    unit: string
    estimatedLevel: 'not_started' | 'partial' | 'proficient'
    placedKpId: string        // 该单元定位到的起点知识点
  }>

  appliedAt?: string          // 结果应用到 mastery 表的时间
}
```

---

### 3.16 `assetCache` — 资源缓存元信息

```ts
interface AssetCacheEntry {
  key: string                 // 'audio/pinyin/ba1.mp3'
  type: 'audio' | 'image' | 'lottie'
  size: number
  cachedAt: string
  lastUsedAt: string
  source: 'bundled' | 'generated'   // 内置 / TTS 运行时生成
}
```

> 实际二进制由 Service Worker Cache API 管理，此表只存元信息用于容量管理和 LRU 清理。
> **TTS 生成的音频建议缓存**：Web Speech API 每次朗读都要实时合成，
> 高频音节（拼音 420 个音节）缓存后响应更快、离线可用。

---

## 4. 导出 / 导入格式

### 4.1 导出结构

```ts
interface BackupFile {
  format: 'smartlearning-backup'
  schemaVersion: number       // ⭐ 必须字段
  appVersion: string
  contentVersion: number
  exportedAt: string
  installId: string           // 来源设备标识
  deviceHint?: string         // 'iPad' 等，仅用于显示

  profile: Profile
  settings: Settings

  data: {
    attempts: Attempt[]
    mastery: Mastery[]
    sessions: Session[]
    dailyTasks: DailyTask[]
    petState: PetState[]        // 每科目每年级一只
    ledger: LedgerEntry[]
    collections: CollectionCard[]
    achievements: Achievement[]
    assessments: Assessment[]
  }

  stats: {                    // 冗余摘要，导入前给用户看，避免导错文件
    totalAttempts: number
    masteredCount: number
    firstAttemptAt?: string
    lastAttemptAt?: string
    profileName: string
    petNames: string[]        // ⚠️ 只列名字，绝不含等级/经验
  }

  checksum: string            // FNV-1a 32 位，形如 'fnv1a32:1a2b3c4d'
}
```

> ⚠️ **`stats` 不含宠物等级**。把三只宠物的进度并排列出来就是变相排名，
> 违反 CLAUDE.md 宠物红线第 3 条。名字是孩子自己起的，辨识度足够且不构成比较。

> ⚠️ **校验和不用 SHA-256**。`crypto.subtle` 只在安全上下文可用，
> 而日常调试走 `npm run dev -- --host`，iPad 打开的是 `http://192.168.x.x:5173` ——
> 非安全上下文，`crypto.subtle` 是 `undefined`。备份恰恰是最需要在真机上反复验证的功能，
> 不能用一个在验证环境里必然崩溃的 API。且用途只是检测损坏，不是防篡改（自用 App 无攻击者）。
> 实现与完整理由见 `src/domain/backup/checksum.ts`。

**不导出静态表**（`knowledgePoints` / `items` / `itemTemplates` / `assetCache`），
它们由目标设备的 App 版本重建。这样老备份能导入到内容更新过的新版本。

### 4.2 导出实现（iOS 友好）

```ts
async function exportBackup(profileId: string): Promise<void> {
  const backup = await buildBackup(profileId)
  const json = JSON.stringify(backup)
  const blob = new Blob([json], { type: 'application/json' })
  const fileName = `希恩爱学习_${backup.stats.petName}_${todayLocal()}.json`
  const file = new File([blob], fileName, { type: 'application/json' })

  // ⭐ 优先用 Web Share API —— 直接调起 iOS 分享面板，
  //    可 AirDrop 到新 iPad / 存 iCloud Drive / 发微信，换设备最顺的路径
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '学习进度备份' })
  } else {
    // 降级：触发下载，iOS Safari 会存到「文件」App
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileName; a.click()
    URL.revokeObjectURL(url)
  }

  await db.meta.put({ key: 'lastExportAt', value: nowISO(), updatedAt: nowISO() })
}
```

### 4.3 导入策略

```
读取文件
  ↓
校验 format 字段 → 不匹配则拒绝
  ↓
校验 checksum → 不匹配则警告"文件可能损坏"，允许用户强制继续
  ↓
比较 schemaVersion
  ├─ 备份 < 当前 → 依次执行迁移函数 migrate_1_to_2, migrate_2_to_3 …
  ├─ 备份 = 当前 → 直接导入
  └─ 备份 > 当前 → ⛔ 拒绝，提示"请先更新 App"（绝不能降级导入，会丢字段）
  ↓
展示 stats 摘要，让用户确认（"这是 小豆 的进度，宠物 3 阶段，共 3421 道题，最后学习于 8月3日"）
  ↓
MVP 策略：整体替换（先清空用户表，再写入）—— 简单可靠
  ↓
全过程在单个 Dexie 事务里，任何一步失败 IndexedDB 自动回滚
```

> **回滚策略的调整**：早期设计写的是「导入前生成一份本地快照」，实现时改成了
> **单事务原子写入**。理由：快照要存进 IndexedDB，而 IndexedDB 正是要被清空的对象——
> 快照和它保护的数据在同一个爆炸半径内，起不到保护作用，还平白多占一份 ~18MB。
> 事务回滚覆盖「导入中途崩溃」，`stats` 确认卡覆盖「导错文件」，两者合起来才是真正的保障。

> **MVP 用"整体替换"而非合并。** 合并需要处理"两台设备各做了一部分"的冲突，
> 逻辑复杂且容易静默出错。等阶段 2 做同步码时再实现按 UUID + `updatedAt` 的合并。

#### ⭐ 4.3a 导入前必须 `ensureOpen()`

恢复备份是**整个 App 里唯一需要离开再回来的操作**——家长得切到「文件」App
去挑那个 `.json`。而 iOS 会在页面转入后台时关掉它持有的 IndexedDB 连接，
Dexie 被动关闭后**不会自己重开**：此后每一次读写都抛 `DatabaseClosedError`，
一直到整页重载为止。

于是最坏的组合出现了：家长回到 App、点「确认恢复」，事务在第一步就炸——
而他往往刚刚为了拿到新版本把主屏幕图标删掉重装过，本机已经没有别的副本了。

```ts
export async function importBackup(backup: BackupFile) {
  await ensureOpen()        // ⭐ 少了这一行，换设备恢复会在真机上随机失败
  await db.transaction('rw', tables, async () => { … })
}
```

`ensureOpen()` 定义在 `src/data/db.ts`，`buildBackup` / `bootstrap` 同样要先调。
另有一道全局保障：`App.tsx` 通过 `platform/onPageResume.ts` 在页面回到前台时
统一体检一次，孩子中途切出去再回来接着做的题也不会写不进去。

> 回归测试见 `importBackup.test.ts` 的「换设备/重装后的恢复（事故回归）」一组，
> 其中一条会先 `db.close()` 再导入。把 `ensureOpen()` 去掉，它立刻以
> `DatabaseClosedError` 失败。

### 4.4 备份提醒机制

```ts
// 触发条件（满足任一即提醒）
const shouldRemindBackup =
  daysSince(lastExportAt) >= 7 ||
  attemptsSinceLastExport >= 300 ||
  justUnlockedPetStage                     // 里程碑时刻
```

**包装成剧情**：宠物出来说"我们把成长记录存起来好不好～"，一键触发导出。
把技术操作变成互动环节，孩子自己都会点。

---

## 5. 迁移机制

```ts
// src/db/migrations.ts
this.version(2).stores({
  // 只列出结构有变化的表
  attempts: 'id, profileId, sessionId, kpId, createdAt, ' +
            '[profileId+localDate], [profileId+kpId], [profileId+newField]',
}).upgrade(async tx => {
  await tx.table('attempts').toCollection().modify(a => {
    a.newField = defaultValue
  })
})
```

**规则**

1. `version(n)` **只增不改**，历史版本定义永久保留在代码里
2. 每次结构变更同时写 `migrateBackup_n_to_n1(backup)` 函数，处理旧备份文件
3. 新增字段一律给默认值，**不允许 required 无默认值的新字段**
4. 删除字段时保留读取兼容，至少跨 2 个版本再彻底移除

**已发生的迁移**

| 版本 | 变更 | 备份迁移 |
|---|---|---|
| v2 | 宠物从「每档案一只」改为「每科目一只」 | —（备份功能尚未上线） |
| v3 | 宠物再加年级维度，旧记录补 `'G1'` | — （备份功能自此上线） |
| v4 | 积分商店：新增 `purchases` 表 | `BACKUP_MIGRATIONS[3]` 补 `purchases: []` |

> v4 是**纯新增表**，不需要 `upgrade()` 回调，老数据一条都不用动。
> 积分余额由 `ledger` 推导，那张表没变，升级前攒的星星一分不少。

**⭐ 两条踩过的坑（加迁移时必看）**

1. **校验和要对着「迁移前」的 data 算。**
   `checksum` 是导出那一刻对着当时的 `data` 算的，回答的是「文件传输途中有没有坏」。
   迁移会往 `data` 里补字段，拿迁移后的结果去比必然不等——
   于是每一份老备份都跳「文件可能已损坏」，恰好出现在家长最紧张的时刻（换设备恢复）。
2. **必检表清单要跟着备份自己声明的版本走。**
   结构检查跑在迁移**之前**。拿 v4 的清单去要求一份 v3 备份会把老备份全判成损坏，
   而迁移的全部意义正是让老备份还能用。见 `validateBackup.ts` 的 `TABLES_ADDED_IN`。

---

## 6. 常用查询

```ts
// 今日答题统计
const today = await db.attempts
  .where('[profileId+localDate]').equals([pid, todayLocal()]).toArray()

// 到期复习的知识点
const due = await db.mastery
  .where('[profileId+dueAt]').between([pid, ''], [pid, nowISO()]).toArray()

// 当前可学习的知识点（调度器主查询）
const learning = await db.mastery
  .where('[profileId+state]').equals([pid, 'learning']).toArray()

// 某知识点的错误类型分布（家长报告）
const m = await db.mastery.where('[profileId+kpId]').equals([pid, 'M5.2']).first()
// → m.misconceptionCounts = { no_carry: 4, carry_lost: 1 }
//   报告文案："9加几主要卡在忘记进位，建议重做凑十法练习"

// 错题本（最近 7 天答错且未订正）
const wrong = await db.attempts
  .where('[profileId+kpId+createdAt]').between([pid, kpId, since], [pid, kpId, nowISO()])
  .filter(a => !a.isCorrect && !a.isRetry).toArray()

// 当前积分余额
const balance = (await db.ledger.where('profileId').equals(pid)
  .reverse().sortBy('createdAt'))[0]?.balanceAfter ?? 0
```

---

## 7. 容量估算

| 表 | 单条大小 | 一年数据量 | 合计 |
|---|---|---|---|
| `attempts` | ~250 B | 约 40,000 条 | **~10 MB** |
| `mastery` | ~400 B | 112 条 | 45 KB |
| `sessions` | ~200 B | ~700 条 | 140 KB |
| `ledger` | ~150 B | ~45,000 条 | 6.7 MB |
| `purchases` | ~200 B | < 200 条 | 40 KB |
| 其他 | — | — | < 1 MB |
| **用户数据合计** | | | **~18 MB** |
| 静态资源（音图） | | | ~80 MB |

iOS Safari 对已安装 PWA 的存储配额通常在数百 MB 以上，**完全够用**。
导出的 JSON 经 gzip 后约 **2~3 MB**，AirDrop 秒传。

> ⚠️ 若一年后 `attempts` 增长影响查询性能，可归档 180 天前的记录到 `attemptsArchive` 表，
> 但**不要删除**——它们是错题复盘和长期进步曲线的唯一来源。

---

## 8. 检查清单

实现时逐条对照：

- [ ] 用户数据全部使用 `crypto.randomUUID()`，**无任何自增主键**
- [ ] 静态内容使用语义 ID，与代码内置数据一致
- [ ] 所有记录同时写 `createdAt`(UTC) 和 `localDate`(本地)
- [ ] `attempts` 表 append-only，**永不 update / delete**
- [ ] 数学生成题必须写 `itemSnapshot`
- [ ] 每个错误选项都带 `misconceptionTag`
- [ ] `meta.schemaVersion` 在首次启动时写入
- [x] 导出文件包含 `schemaVersion` + `checksum` + `stats`
- [x] 导入时版本高于当前一律拒绝
- [x] 导入在单个 Dexie 事务内完成，失败自动回滚
- [ ] 宠物状态**无死亡、无掉阶、无惩罚**逻辑
- [x] 积分余额从 `ledger` 推导，无独立可变余额字段
- [x] ⭐ 同档案内 `ledger.createdAt` 严格递增——否则「最新一条」不确定，余额会永久错位
