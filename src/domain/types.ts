/**
 * @file 全局类型契约 —— 整个项目所有数据结构的唯一定义源
 * @layer domain  纯类型声明，无运行时代码
 * @see design/02-数据库Schema.md  各表字段的完整说明与设计理由
 * @see design/01-知识点图谱.md    知识点、认知误区、题型定义
 *
 * 修改本文件前请先读 CLAUDE.md 的「架构铁律 §1 类型先行」。
 * 这里是 AI 与人之间的契约，改动会波及全项目，务必同步更新设计文档。
 */

// ============================================================================
// 时间类型 —— 用品牌类型强制区分 UTC 时间戳与本地日期
// ============================================================================

/**
 * ISO 8601 UTC 时间戳，如 `'2026-08-05T13:22:31.000Z'`。
 * 用于精确排序与跨时区计算。只能通过 `domain/time.ts` 的构造函数创建。
 */
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' }

/**
 * 本地时区日期，格式 `'YYYY-MM-DD'`。
 * 用于「今天做了多少题」这类按天统计——写入时按设备本地时区冻结，**永不重算**。
 *
 * 为什么需要独立类型：只用 UTC 会让晚上 8 点做的题算到第二天（东八区 UTC+8），
 * 日统计与连续打卡天数全部错乱。品牌类型让 `localDate: nowIso()` 这类错误在编译期就被拦下。
 */
export type LocalDate = string & { readonly __brand: 'LocalDate' }

/** UUID v4 字符串，由 `newId()`（platform/newId.ts）生成。仅用于用户数据，静态内容用语义 ID。 */
export type Uuid = string

// ============================================================================
// 基础枚举
// ============================================================================

export type Subject = 'math' | 'pinyin' | 'english'

/** 学期。`1A` = 一年级上学期，`1B` = 一年级下学期。 */
export type Grade = '1A' | '1B'

/**
 * 年级。宠物按「科目 × 年级」划分——每升一个年级换一批新宠物，
 * 让每学年有明确的终点和新的期待。
 */
export type GradeLevel = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6'

/**
 * 从学期推导年级。`'1A'` / `'1B'` 都属于 `'G1'`。
 *
 * @example
 * gradeLevelOf('1B')   // 'G1'
 */
export function gradeLevelOf(grade: Grade): GradeLevel {
  return `G${grade.charAt(0)}` as GradeLevel
}

/** 题目难度档。每个知识点都有三档，由掌握度自动调节。 */
export type Difficulty = 1 | 2 | 3

/**
 * 题型。
 *
 * ⚠️ 一年级上学期孩子**不识字**，因此 `choice_audio` 与 `choice_image`
 * 必须是主力题型，且所有题型都无条件支持语音播报题干。
 */
export type ItemType =
  | 'choice_image' // 看图选择
  | 'choice_text' // 文字/算式选择
  | 'choice_audio' // 听音选择（零阅读门槛）
  | 'input_number' // 数字小键盘输入
  | 'drag_match' // 拖拽配对
  | 'drag_combine' // 拖拽组合（拼读 b + ā → bā）
  | 'drag_order' // 拖拽排序
  | 'memory_pair' // 记忆翻牌
  | 'record_compare' // 跟读录音回放
  | 'tap_count' // 点数计数
  | 'trace' // 描红笔顺（阶段 2）

/**
 * 掌握度状态机。跃迁条件见 design/02-数据库Schema.md §3.8。
 *
 * `locked` → `available` → `learning` → `mastered` ⇄ `review`
 */
export type MasteryState = 'locked' | 'available' | 'learning' | 'mastered' | 'review'

export type SessionMode = 'daily' | 'free' | 'review' | 'assessment' | 'remedial'

/**
 * 认知误区标签 —— **本项目自适应能力的核心**。
 *
 * 每个错误选项都必须绑定一个标签，孩子选了哪个就能定位她卡在认知链条的哪一环。
 * 例：`9 + 5` 选 `13` 是 `no_carry`（凑十丢了 1），选 `10` 是 `carry_lost`（凑十后忘记加），
 * 两者的补救路径完全不同。
 *
 * 做成联合类型而非 `string`：标签拼错会导致诊断统计静默失效——不报错，但功能废掉。
 * 新增标签时必须同步更新 design/01-知识点图谱.md 对应章节。
 */
export type MisconceptionTag =
  // —— 数学：计数与数感
  | 'count_skip' // 数数跳数或重复数
  | 'ordinal_cardinal_confusion' // 基数序数混淆（"第3个"选成"3个"）
  | 'symbol_reversed' // 大于小于号方向反了
  | 'off_by_one' // 数手指多数/少数 1
  /**
   * 排序方向反了（从大到小排）。
   *
   * 与 `count_skip` 是**两种病**：这孩子完全懂「排序」，只是搞反了方向，
   * 补救是强调「从小到大」四个字；而 count_skip 是数序本身不熟，
   * 得回去练数数。混作一谈会把补救指向错误的方向。
   */
  | 'order_reversed'
  // —— 数学：位置
  | 'lr_mirror' // 左右镜像混淆（自己视角 vs 图中人物视角）
  // —— 数学：加减法
  | 'op_confusion' // 加减号看错，做成另一种运算
  | 'zero_rule' // 认为 5 - 0 = 0 或 5 + 0 = 0
  | 'whole_part_confusion' // 整体与部分混淆（「5 分成 2 和几」答 5）
  | 'no_carry' // 忘记进位（9+5 答 13）
  | 'carry_lost' // 凑十后忘记加剩余（9+5 答 10）
  /**
   * ⭐ 凑十/破十时**补数算错**：知道要拆，但不知道 9 还差 1 才到 10
   * （把 5 拆成 2 和 3 补给 9）。
   *
   * 这个标签的价值在于它**直指 M3.3「10 的分与合」**——全局最关键节点。
   * 命中它说明问题不在进位规则，而在地基没打牢，
   * 补救路径是回退到 M3.3 而不是继续练 9 加几。
   * 见 design/03-技术方案.md §4.1 关键节点保护。
   */
  | 'ten_split_wrong'
  | 'digit_concat' // 直接拼接数字（9+5 答 95）
  /**
   * **数位说反**：问 15 的十位是几，答 5。
   *
   * 与 `digit_concat` 是两回事：那个是不理解「加起来」的含义，
   * 这个是知道 15 由 1 和 5 组成，但分不清哪一位叫十位。
   * 补救是回到小棒/十格阵，把「一捆十根」和「散的几根」摆出来看。
   */
  | 'place_value_swap'
  | 'sub_instead' // 该加做成了减
  | 'add_instead' // 该减做成了加
  | 'no_borrow' // 不会退位，用大数减小数（13-9 答 6）
  | 'borrow_lost' // 破十后忘记加个位
  // —— 数学：图形与钟表
  | 'solid_plane_confusion' // 立体/平面混淆（正方体叫成正方形）
  | 'hand_swap' // 时针分针看反
  | 'wrong_operation' // 应用题选错运算
  // —— 拼音：拼读规则
  | 'u_umlaut_kept' // jü 而不是 ju（j q x 与 ü 相拼未去两点）
  | 'tone_wrong_position' // 声调标错位置
  /**
   * **听不出声调**：把 `wú` 听成 `wǔ`。
   *
   * 与 `tone_wrong_position` 是两回事：那个是「知道几声但标错地方」（写的问题），
   * 这个是「压根没听出是几声」（听的问题）。补救路径完全不同——
   * 前者练标调规则，后者得回去练四声本身。
   */
  | 'tone_confusion'
  | 'three_syllable_missing_medial' // 三拼音节漏掉介母
  | 'spell_integral' // 把整体认读音节当两拼去拼（zhi 拼成 zh-i）
  // —— 拼音：韵母混淆
  | 'ui_iu_swap' // ui / iu 混淆
  | 'ei_ie_swap' // ei / ie 混淆
  | 'nasal_confusion' // 前后鼻音不分（in/ing、en/eng）
  // —— 拼音：字形混淆
  /**
   * **音形对应没建立**：认得图上是猫、也会念 māo，但选不出 `māo` 这串拼音。
   *
   * 与 `tone_confusion` 是两回事：那个是没听出第几声，
   * 这个是「听得出、说得出，但对不上写法」。前者补听辨，
   * 后者要回到拼读——把音节拆成声母韵母再拼一遍。
   */
  | 'pinyin_form_unlinked'
  | 'bd_confusion' // b / d
  | 'pq_confusion' // p / q
  | 'ft_confusion' // f / t
  | 'nl_confusion' // n / l
  | 'flat_curl_confusion' // 平翘舌 z-zh / c-ch / s-sh
  // —— 英语
  | 'similar_sound' // 音近词混淆（cat/cake、bear/pear），也是英语的兜底标签
  | 'letter_mirror' // 字母 b/d、p/q 镜像混淆
  /**
   * 字母的**对应关系**没建立：`A` 与 `a` 连不起来，或不知道 apple 以 A 开头。
   *
   * 与 `letter_mirror` 是两种病：镜像混淆的孩子知道要找对应的那个，
   * 只是把 b 和 d 看反了，补救是用手势固定方向；
   * 而这个是压根没建立「这两个形状是同一个字母」的概念，
   * 补救得回字母墙看 `Aa` 并列。混作一谈会指向错误的补救。
   */
  | 'letter_pairing_weak'
  /**
   * ⭐ **teen 词尾没听见**：听 `fourteen` 选 `4`。
   *
   * 一年级英语数字最普遍的错误——`-teen` 轻读，与个位数只差一个词尾。
   * 它是 E2.2 真正在考的东西：干扰项必须把对应的个位数摆进选项，
   * 否则四个选项全是 11~20，孩子随便选也有 25% 蒙对，
   * 而真正要诊断的错误压根没机会发生。
   */
  | 'number_teen_ty'

// ============================================================================
// 静态内容 —— 随 App 版本内置，使用语义 ID，备份时不导出
// ============================================================================

/**
 * 知识点。整个自适应系统的骨架，共 112 个（数学 47 / 拼音 35 / 英语 30）。
 *
 * ID 使用语义格式而非 UUID：`M5.2` = Math 第 5 单元第 2 个知识点。
 * 静态内容跨设备必须完全一致，用 UUID 会导致备份导入时错位。
 */
export interface KnowledgePoint {
  /** 语义 ID，如 `'M5.2'` `'P3.3'` `'E4.1'` */
  id: string
  subject: Subject
  /** 单元 ID，如 `'M5'` */
  unit: string
  /** 单元名，如 `'20以内进位加法'` */
  unitName: string
  /** 知识点名，如 `'9加几'` */
  name: string
  grade: Grade
  /** 全局教学顺序，用于线性推进与进度展示 */
  order: number
  /** 前置知识点 ID。全部 `mastered` 后本知识点才从 `locked` 转为 `available` */
  prerequisites: string[]
  itemTypes: ItemType[]
  difficulty: Difficulty
  /**
   * 是否关键节点——卡住会阻塞大量后续内容。
   * 调度器对关键节点有特殊保护：后继知识点大面积出错时无条件回退到此。
   */
  isKeyNode: boolean
  /** 目标掌握度阈值。默认 0.85，关键节点 0.95（需练到条件反射级别） */
  targetMastery: number
  /** 达到掌握预计所需题量，用于进度预估 */
  estimatedItems: number
  /** 本知识点的典型认知误区，生成器据此构造诊断性干扰项 */
  misconceptions: MisconceptionTag[]
  /** 掌握后解锁的图鉴卡 ID */
  collectionCardId: string
}

export interface ItemOption {
  /** 选项 ID，如 `'a'` `'b'` */
  id: string
  text?: string
  /**
   * 主显示内容下方的小字说明。
   *
   * 为英语题而设：选项主体是 emoji（`🍎`），中文释义（「苹果」）挂在这里。
   * ⚠️ 它**不泄题**——孩子必须先听懂 `apple` 指的是苹果才选得对，
   * 中文只是帮她确认这个 emoji 表示什么，避免把听力题变成猜谜题。
   */
  caption?: string
  /**
   * 点击该选项时朗读的文本。缺省时朗读 `text`。
   *
   * 同样是为 emoji 选项而设：直接把 `🍎` 喂给 TTS 等于什么也念不出来，
   * 而「每个选项可单独点击朗读」是本项目的无障碍硬要求（孩子不识字）。
   */
  ttsText?: string
  /**
   * 点读时优先播放的**预生成语音片段**，如 `['py.ba1']`。
   *
   * ⚠️ 拼音选项必须走这条路：实时 TTS 拿到裸拼音串只能猜怎么读，
   * 实测**大面积读错声调**（`á` 读成 `ā`）。而在「找不同」这类题里
   * 孩子要靠点读逐个比对，读错声调等于把题目本身弄坏了。
   * 见 data/seed/pinyinSyllables.ts 文件头。
   */
  ttsParts?: string[]
  /** 点读语言。英语选项必须显式标 `'en-US'`，否则中文引擎会念错 */
  ttsLang?: 'zh-CN' | 'en-US'
  imageKey?: string
  audioKey?: string
  isCorrect: boolean
  /**
   * 该错误选项对应的认知误区。
   * ⚠️ 除正确选项外**必填**——缺失会让这道题失去诊断价值。
   */
  misconceptionTag?: MisconceptionTag
  /**
   * 拖拽题专用：这个选项对应「摆成什么样」的序列化键，如 `'1+4'` `'3,4,5,6'`。
   *
   * 选择题的答案是「点了哪个」，拖拽题的答案是「摆成了什么样」。
   * 把排列编码进这个字段（而不是另开一条作答通路），
   * 拖拽题在数据层就与选择题完全同构——`Attempt`、`itemSnapshot`、
   * 掌握度、错题订正、备份格式统统不用改。
   *
   * 组件把孩子摆出的结果序列化成同样的键去匹配，命中哪个就提交哪个选项 ID。
   * 详见 `domain/generators/arrangements.ts`。
   */
  arrangementKey?: string
}

/**
 * 静态题目（拼音、英语）。数学题不入库，由生成器运行时产出。
 */
export interface Item {
  /** 语义 ID，如 `'P3.3-L2-0007'`（知识点-难度-序号） */
  id: string
  kpId: string
  type: ItemType
  difficulty: Difficulty
  stem: {
    text?: string
    /** 专用朗读文本，与显示文本不同时使用（如算式 `9+5` 读作「9 加 5 等于几」） */
    ttsText?: string
    ttsLang?: 'zh-CN' | 'en-US'
    audioKey?: string
    imageKey?: string
  }
  options: ItemOption[]
  /** 正确选项 ID。排序/组合类题型可为多个，顺序即答案顺序 */
  answer: string | string[]
  explanation?: {
    text: string
    ttsText?: string
    imageKey?: string
  }
  /** 本题依赖的全部资源 key，用于会话开始前批量预加载 */
  assetKeys: string[]
  tags: string[]
}

/**
 * 数学题目生成器配置。数学题不入库，按此配置运行时生成，题量无限、内容成本为零。
 *
 * 注意：干扰项策略与题干文案**不在这里配置**，而是写在生成器内部。
 * 原因：干扰项需要访问生成过程的中间值（凑十的余数、破十的差），
 * 做成配置需要引入策略函数名的间接层，既失去类型安全又更难验证。
 * 各生成器的干扰项与认知误区对照表见其 JSDoc。
 */
export interface ItemTemplate {
  /** 语义 ID，如 `'M5.2-gen'` */
  id: string
  kpId: string
  /** 生成器函数名，对应 `domain/generators/index.ts` 注册表的键 */
  generator: string
  type: ItemType
  /** 三档难度各自的生成参数 */
  params: Record<Difficulty, Record<string, unknown>>
}

// ============================================================================
// 用户数据 —— 主键一律 UUID，备份导出的就是这些表
// ============================================================================

/**
 * 家长写给孩子的一句话。
 *
 * ⭐ 这是全 App 唯一由**另一个人**产生的内容。孩子不识字，所以它必须被念出来；
 * 而它把 App 从「一个人练」变成「有人在看着我」——
 * 这件事的情感强度和任何积分系统都不是一个量级。
 *
 * @see src/features/home/ParentMessageCard.tsx  孩子那一端
 * @see src/features/parent/MessageSetting.tsx   家长那一端
 */
export interface ParentMessage {
  /** 留言正文。家长手写，因此只能走 TTS 朗读 */
  text: string
  createdAt: IsoDateTime
  /**
   * 孩子听过的时间，没听过则为 `undefined`。
   *
   * 只用来决定要不要显示「新留言」的提示——听过之后卡片仍然留着，
   * 她想再听几遍是她的自由。
   */
  readAt?: IsoDateTime
}

export interface Profile {
  id: Uuid
  /**
   * 主昵称。App 用它称呼孩子，也用作备份文件名的一部分。
   * @see src/data/repositories/profileRepo.ts
   */
  name: string
  /**
   * 备用昵称，与 {@link Profile.name} 一起随机轮换（「小恩宝」/「恩宝」/「小恩恩」）。
   *
   * ⭐ 真实的家长不会一天到晚只用一个称呼，固定一个叫法很快就变成提示音的一部分，
   * 被自动忽略掉。轮换让「叫名字」这件事保持有效。
   *
   * ⚠️ 可选字段：改名之前导出的备份没有它，导入后按「只有主昵称」处理。
   * 因为不涉及索引变化，Dexie 的 `stores()` 定义不用动，也不需要递增 SCHEMA_VERSION。
   */
  aliases?: string[]
  /**
   * 家长留给孩子的一句话，下次打开时由伙伴念出来。
   *
   * 只保留**最新一条**：留言板攒成收件箱就变成了任务列表，
   * 而它的价值恰恰在于「随手写一句」。
   *
   * ⚠️ 可选字段，理由同 {@link Profile.aliases}。
   */
  parentMessage?: ParentMessage
  avatarId: string
  /** `'YYYY-MM-DD'`，可选，仅用于年龄适配 */
  birthDate?: string
  grade: Grade
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface Settings {
  /** 主键即 profileId */
  profileId: Uuid

  // —— 时长与护眼（家长控制）
  /** 每天最多几段，默认 3 */
  dailySessionLimit: number
  /** 每段时长（分钟），默认 15 */
  sessionDurationMin: number
  /** 强制休息时长（分钟），默认 5 */
  breakDurationMin: number

  // —— 音频
  bgmEnabled: boolean
  bgmVolume: number
  sfxEnabled: boolean
  sfxVolume: number
  /** TTS 语速 0.5~1.5，儿童建议 0.85 */
  ttsRate: number
  ttsVoiceZh?: string
  ttsVoiceEn?: string

  // —— 内容
  subjectsEnabled: Subject[]
  dailyTargetItems: number

  // —— 无障碍
  /** 自动朗读题干。⚠️ 一年级不识字，默认必须为 `true` */
  autoReadStem: boolean
  reducedMotion: boolean

  updatedAt: IsoDateTime
}

/**
 * 单次作答记录。**append-only：只增不改、永不删除。**
 *
 * 这是所有分析、自适应、家长报告、错题本的唯一数据源。
 */
export interface Attempt {
  id: Uuid
  profileId: Uuid
  sessionId: Uuid
  kpId: string
  /** 静态题为题目 ID；生成题为参数签名，如 `'M5.2-gen#9+5'` */
  itemId: string
  /**
   * 生成题的题目快照。
   * ⚠️ 数学题运行时生成，不存快照就无法回答「她上周那道错题到底是什么」——
   * 错题本、复盘讲解、家长报告全都依赖它。单条约 200 字节，成本可忽略。
   */
  itemSnapshot?: {
    stem: string
    options: Array<{ id: string; text: string; misconceptionTag?: MisconceptionTag }>
    answer: string
  }
  difficulty: Difficulty
  isCorrect: boolean
  selectedOptionId?: string
  /** `input_number` 类型的实际输入值 */
  inputValue?: string
  /** 命中的认知误区，答对时为空 */
  misconceptionTag?: MisconceptionTag
  responseTimeMs: number
  hintUsed: boolean
  /**
   * 题干重听次数。
   * 一年级孩子不识字全靠听，反复重听说明**题目理解**有困难而非知识点没掌握，
   * 两者的补救方式完全不同。
   */
  ttsReplayCount: number
  /** 是否为错题订正。⭐ 订正也给积分，否则孩子会回避错题 */
  isRetry: boolean
  createdAt: IsoDateTime
  localDate: LocalDate
}

/**
 * 掌握度。每个 `(profileId, kpId)` 组合唯一一条。
 *
 * 更新公式（EMA）与状态跃迁条件见 design/02-数据库Schema.md §3.8。
 */
export interface Mastery {
  id: Uuid
  profileId: Uuid
  kpId: string
  /** 冗余字段，便于按科目直接查询而不必 join 知识点表 */
  subject: Subject

  state: MasteryState
  /** 掌握度 0~1，指数移动平均，近期表现权重更高 */
  masteryScore: number
  currentDifficulty: Difficulty

  totalAttempts: number
  correctAttempts: number
  consecutiveCorrect: number
  /**
   * 连续答错次数，答对即归零。
   * 用于「已掌握的知识点连续错 2 次则回退到 learning」的判定——
   * 只靠 `consecutiveCorrect === 0` 无法区分「错了 1 次」和「错了 5 次」。
   */
  consecutiveWrong: number
  avgResponseTimeMs: number

  // —— 间隔重复（SM-2 变体）
  /** 难度因子，默认 2.5，范围 [1.3, 2.8] */
  easeFactor: number
  intervalDays: number
  /** 连续成功复习次数 */
  repetitions: number
  /** 下次复习时间。到期后状态转为 `review` */
  dueAt: IsoDateTime

  /**
   * ⭐ 认知误区累计次数，定向补救的触发依据。
   * 例：`{ bd_confusion: 3 }` 达到阈值时调度器自动插入 P7.1（b/d 辨析）专项。
   */
  misconceptionCounts: Partial<Record<MisconceptionTag, number>>

  firstPracticedAt?: IsoDateTime
  lastPracticedAt?: IsoDateTime
  masteredAt?: IsoDateTime
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface Session {
  id: Uuid
  profileId: Uuid
  mode: SessionMode
  subject?: Subject
  startedAt: IsoDateTime
  endedAt?: IsoDateTime
  durationMs: number
  /**
   * 剔除挂机后的真实专注时长（超过 60 秒无操作不计入）。
   * 家长报告显示的是这个值，而不是「打开了 40 分钟」（其中 25 分钟在发呆）。
   * 护眼时长限制也基于此计算。
   */
  activeDurationMs: number
  itemCount: number
  correctCount: number
  pointsEarned: number
  kpIdsTouched: string[]
  /** 是否正常结束（非中途退出） */
  completedNormally: boolean
  localDate: LocalDate
}

/**
 * 每日任务类型。
 *
 * ⚠️ 设计红线：**绝不设置「全对才有奖励」的任务**——会让孩子专挑简单题刷，
 * 是最典型的游戏化反效果。要奖励过程（订正、挑战难题），不只奖励结果。
 */
export type DailyTaskType =
  | 'answer_count' // 答对 N 题
  | 'accuracy' // 正确率达标（阈值须宽松）
  | 'subject_session' // 完成某科目一段
  | 'retry_wrong' // ⭐ 订正 N 道错题
  | 'challenge_hard' // ⭐ 挑战 N 道高难度题
  | 'streak' // 连续学习天数

export interface DailyTaskEntry {
  id: string
  type: DailyTaskType
  label: string
  /** 朗读文本（孩子不识字，任务也要能听） */
  ttsLabel: string
  target: number
  progress: number
  completed: boolean
  /** 完成奖励积分 */
  reward: number
}

export interface DailyTask {
  id: Uuid
  profileId: Uuid
  localDate: LocalDate
  tasks: DailyTaskEntry[]
  allCompleted: boolean
  bonusClaimed: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/**
 * 宠物状态。**每个科目一只**：语文小飞龙 · 数学小企鹅 · 英语小熊猫。
 *
 * 三条并行成长线的意义在于总有一只接近升级——
 * 单宠物养到高级后会陷入「升一级要好久」的动力真空。
 *
 * 🚫 **产品红线（见 CLAUDE.md，修改前必读）**
 * 1. 宠物永远不会死亡、不会掉级、不会因疏于照顾受到任何损害
 * 2. 久未登录的正确反应是「我有点想你」，绝不能是责备或「快饿死了」
 * 3. **三只宠物之间绝不比较**：不排名、不显示谁更高级。
 *    孩子必然偏向喜欢的科目，把差距摆上台面只会让她对落后的那只愧疚
 *
 * 原因：孩子几天没玩回来看到宠物惨状，产生的是负罪感和回避，不是动力。
 */
export interface PetState {
  id: Uuid
  profileId: Uuid
  /** 所属科目 */
  subject: Subject
  /**
   * 所属年级。宠物按「科目 × 年级」划分，
   * 每个 `(profileId, subject, gradeLevel)` 唯一一只。
   *
   * 升年级时换一批新宠物，上一批保留在「回忆」里不再成长——
   * 这样每学年都有明确的终点（养到最终形态）和新的期待（新伙伴）。
   */
  gradeLevel: GradeLevel
  /** 宠物种类 ID，对应 `data/seed/pets.ts` 的定义 */
  petTypeId: string
  /** 名字。⭐ 让孩子自己起，这是最强的情感绑定 */
  name: string
  /**
   * 累计经验，**只增不减**。
   *
   * 等级与形态都由它推导（`domain/pet/growth.ts`），不单独存储——
   * 存冗余的 level 字段迟早会和 exp 不一致，而不一致的表现是
   * 「宠物等级莫名其妙变了」，对孩子来说非常伤。
   */
  exp: number
  /** 上次见面时间，用于生成「好几天没来了，我有点想你」的问候 */
  lastSeenAt: IsoDateTime
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type LedgerReason =
  | 'correct_answer' // +2  答对
  | 'retry_correct' // +1  ⭐ 订正答对也给分
  | 'challenge_bonus' // +5  挑战高难度成功
  | 'daily_task' // +20 完成单个每日任务
  | 'all_tasks_bonus' // +30 当日任务全部完成
  | 'streak_bonus' // +N  连续天数奖励
  | 'kp_mastered' // +15 掌握一个知识点
  | 'assessment_complete' // +50 完成摸底测评
  | 'buy_food' // -N  给宠物买零食（一次性动画，不产生任何状态）
  | 'buy_item' // -N  给小屋买家具
  | 'redeem_real' // -N  兑换现实奖励券，待家长兑现
  | 'purchase_refund' // +N  撤销一笔购买，按成交价原额退回
  | 'manual_adjust' // 家长手动调整

/**
 * 「赚到」的流水理由 —— 用于「今天得了多少分」这类累计统计。
 *
 * ⚠️ `purchase_refund` 虽然是正数，但**不在此列**：
 * 它是把已经花掉的分还回来，不是新赚的。算进去会让孩子手滑买错再撤销
 * 变成「今天多赚了 300 分」，那个数字就不再是努力的度量了。
 */
export const EARNED_LEDGER_REASONS: readonly LedgerReason[] = [
  'correct_answer',
  'retry_correct',
  'challenge_bonus',
  'daily_task',
  'all_tasks_bonus',
  'streak_bonus',
  'kp_mastered',
  'assessment_complete',
  // 家长手动加分（做了好事、帮了忙）在孩子视角就是「我得到了分」，算赚到。
  // 手动**扣**分不会误入统计——调用方还有一层 `delta > 0` 的过滤。
  'manual_adjust',
]

/**
 * 积分流水。**账本式设计：余额由流水推导，不设独立可变余额字段**，避免不一致。
 * 取余额 = 按 `createdAt` 倒序取第一条的 `balanceAfter`。
 */
export interface LedgerEntry {
  id: Uuid
  profileId: Uuid
  /** 正数为收入，负数为支出 */
  delta: number
  /** 结余快照，冗余存储仅为查询性能 */
  balanceAfter: number
  reason: LedgerReason
  /** 关联对象 ID：attemptId / taskId / shopItemId */
  refId?: string
  note?: string
  createdAt: IsoDateTime
  localDate: LocalDate
}

/**
 * 商品大类。决定了买下之后会发生什么，以及归哪个界面管。
 *
 * - `room`  小屋家具。**永久拥有**，买了就摆在小屋固定位置上，不消耗
 * - `treat` 宠物零食。买完立刻消耗：三只一起吃，播个动画，各说一句谢谢
 * - `real`  现实兑换券。需要家长在现实里兑现，因此多一道「待兑现」状态
 *
 * ⚠️ `treat` **不产生任何状态**——不加经验、不涨好感、没有饱食度。
 * 喂养系统在 design/02 §3.11、design/03 §4.5、design/06 §9 三处都被明确移除过，
 * 理由是它必然带来「没喂 = 宠物变惨」的惩罚感。零食是一次性的开心，仅此而已。
 */
export type ShopItemKind = 'room' | 'treat' | 'real'

/**
 * 购买记录的状态。
 *
 * ```
 * room  → owned                  （终态：家具一直在小屋里）
 * treat → fulfilled              （终态：买入即吃掉）
 * real  → pending → fulfilled    （家长在家长区点「已兑现」）
 * ```
 *
 * 没有 `cancelled` 状态：撤销一笔购买是**删除这条记录**并原额退分，
 * 而不是留一条作废记录。孩子的「我买过什么」里出现一条划掉的东西，
 * 传达的是「你买错了」，而手滑不该由她背。
 */
export type PurchaseStatus = 'owned' | 'pending' | 'fulfilled'

/**
 * 一笔购买。
 *
 * ⭐ **为什么不直接用 ledger 当兑换记录**：`ledger` 是 append-only 的账本，
 * 而「待兑现 → 已兑现」是可变状态，塞进流水就得靠再记一笔来表达状态变化，
 * 于是「这张券兑现了没」要靠扫描全部流水来推导——那正是账本式设计
 * 刻意避免的东西。两张表各司其职：ledger 管钱，purchases 管东西。
 *
 * ⭐ **为什么冻结 `label` 和 `pricePaid`**：现实券由家长维护，可以下架、可以改价。
 * 不冻结的话，家长把「一个冰淇淋」下架后，孩子记录里那条会变成空白，
 * 已经兑换过的价格也会跟着现价漂移。这和数学题必须写 `itemSnapshot`
 * 是同一条原则：**历史记录不依赖当前的静态内容表**。
 *
 * `shopItemId` 仍然保留，因为小屋渲染要靠它找到对应的 SVG 部件，
 * 语音 clipKey 也由它推导。
 */
export interface Purchase {
  id: Uuid
  profileId: Uuid
  /** 商品的语义 ID，如 `'room-rug'` / `'real-icecream'` */
  shopItemId: string
  kind: ShopItemKind
  /** 名称快照。⚠️ 商品下架或改名后，记录里显示的仍是买当时的名字 */
  label: string
  /** 成交价快照，用于撤销时按原额退回 */
  pricePaid: number
  status: PurchaseStatus
  /** 对应的那笔扣分流水，撤销时据此精确反查 */
  ledgerEntryId: Uuid
  createdAt: IsoDateTime
  localDate: LocalDate
  /** 家长点「已兑现」的时间。`treat` 在买入时即写入 */
  fulfilledAt?: IsoDateTime
}

/**
 * 图鉴卡解锁记录。每掌握一个知识点解锁一张，共 110 张。
 *
 * 去掉排行榜后，图鉴是最重要的收集类动机来源。
 * UI 上必须显示未解锁的空位（灰色剪影 + 「还差 3 张集齐」），空位比已获得更能驱动行为。
 */
export interface CollectionCard {
  id: Uuid
  profileId: Uuid
  /** `'math-number-spirits'` | `'pinyin-island'` | `'english-animals'` */
  collectionId: string
  /** 卡片 ID，与知识点一一对应，如 `'card-M5.2'` */
  cardId: string
  unlockedAt: IsoDateTime
  unlockedByKpId: string
  /** 未查看过，用于小红点提示 */
  isNew: boolean
}

export interface Achievement {
  id: Uuid
  profileId: Uuid
  /** 静态成就定义 ID，如 `'streak-7'` */
  achievementId: string
  progress: number
  target: number
  unlockedAt?: IsoDateTime
  isNew: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface AssessmentProbe {
  kpId: string
  itemId: string
  isCorrect: boolean
  responseTimeMs: number
}

export interface AssessmentResult {
  unit: string
  estimatedLevel: 'not_started' | 'partial' | 'proficient'
  /** 该单元定位到的起点知识点 */
  placedKpId: string
}

/**
 * 摸底测评。首次启动时进行，5 分钟 18 题，用于定位起点。
 *
 * 目的：孩子上过幼小衔接班，直接从最简单的内容开始会被劝退。
 * ⚠️ 必须游戏化包装为「和宠物一起探险，看看能走多远」，答错不给红叉。
 * 绝不能让第一次体验就产生挫败感。
 */
export interface Assessment {
  id: Uuid
  profileId: Uuid
  type: 'initial' | 'periodic'
  startedAt: IsoDateTime
  completedAt?: IsoDateTime
  probes: AssessmentProbe[]
  results: AssessmentResult[]
  /** 结果应用到 mastery 表的时间 */
  appliedAt?: IsoDateTime
}

// ============================================================================
// 系统表
// ============================================================================

export type MetaKey =
  | 'schemaVersion'
  | 'contentVersion'
  | 'appVersion'
  | 'installId'
  | 'activeProfileId'
  | 'lastExportAt'
  | 'firstLaunchAt'

export interface MetaRecord {
  key: MetaKey
  value: unknown
  updatedAt: IsoDateTime
}

/**
 * 资源缓存元信息。二进制本身由 Service Worker 的 Cache API 管理，
 * 此表只存元数据用于容量统计与 LRU 清理。
 */
export interface AssetCacheEntry {
  /** 资源 key，如 `'audio/pinyin/ba1.mp3'` */
  key: string
  type: 'audio' | 'image' | 'lottie'
  size: number
  cachedAt: IsoDateTime
  lastUsedAt: IsoDateTime
  /** `bundled` 随包内置 / `generated` 运行时 TTS 生成后缓存 */
  source: 'bundled' | 'generated'
}

// ============================================================================
// 模块间契约 —— domain 各模块的输入输出定义
// ============================================================================

export interface GeneratorContext {
  /**
   * 本次要出题的知识点 ID。
   * 一个生成器通常服务多个知识点（`arithmetic` 覆盖 M4.2~M4.9），
   * 靠 `kpId` + `params` 区分具体出哪一种。
   */
  kpId: string
  difficulty: Difficulty
  params: Record<string, unknown>
  /**
   * ⚠️ 注入的随机源。生成器内**禁止直接调用 `Math.random()`**，
   * 否则测试无法固定种子、无法验证干扰项策略是否正确。
   */
  rng: () => number
  /** 已出过的题目签名，用于同一会话内去重 */
  exclude?: string[]
}

/**
 * 题型专用的可视化数据。
 *
 * 让题型组件拿到结构化数据而不是去解析题干字符串——
 * 从 `'🍎🍎🍎'` 反推数量要处理多码点 emoji，既脆弱又容易出错。
 */
/**
 * 图形题的图形标识，编码进 `ItemOption.imageKey` 与 `ItemVisual`。
 *
 * ⚠️ 本项目**没有位图资源**：英语用 emoji，宠物与这里的图形都是手绘 SVG。
 * 几何图形恰好最适合 SVG——正方体、圆柱、钟面本来就是由线和圆构成的，
 * 画出来比位图更清晰、可任意缩放、体积几乎为零，且指针角度能由数据算出来。
 *
 * 格式 `'<族>:<参数>'`，由 `components/shape/MathShape.tsx` 解析：
 * ```
 * 'solid:cube'      正方体
 * 'plane:triangle'  三角形
 * 'clock:3:30'      3 点半
 * ```
 */
export type SolidShapeKind = 'cube' | 'cuboid' | 'cylinder' | 'sphere' | 'cone'
export type PlaneShapeKind = 'square' | 'rect' | 'triangle' | 'circle'

/** 图形画面里的一块。`shape` 用 `SolidShapeKind` 或 `PlaneShapeKind` 的值 */
export interface ScenePiece {
  shape: string
  /** 左上角坐标，单位与 `shapeScene` 的 width/height 一致 */
  x: number
  y: number
  /** 边长，默认 24 */
  size?: number
}

/**
 * 记忆翻牌里的一张卡。
 *
 * 同 `pairId` 的两张为一对。⚠️ 两张卡的 `face` **通常不同**
 * （`A` 配 `a`），这正是 E1.6 要考的「这两个形状是同一个字母」。
 */
export interface MemoryCard {
  id: string
  pairId: string
  /** 正面内容：字母、emoji 或短词 */
  face: string
  /** 翻开时朗读的文本。孩子不识字，每翻一张都要出声 */
  ttsText?: string
  ttsParts?: string[]
  ttsLang?: 'zh-CN' | 'en-US'
  /** 正面下方的小字（如中文释义） */
  caption?: string
}

export type ItemVisual =
  | {
      kind: 'countable'
      /** 可数对象的 emoji */
      emoji: string
      /** 对象名称，用于朗读 */
      name: string
      /** 数量 */
      count: number
    }
  | {
      /**
       * 题干配一张图。图形由 `imageKey` 指定，见 {@link SolidShapeKind} 的说明。
       *
       * 只描述「画什么」，不描述「怎么画」——渲染在
       * `components/shape/MathShape.tsx`，换美术不影响生成器。
       */
      kind: 'figure'
      imageKey: string
    }
  | {
      /**
       * 一幅由若干图形摆成的画，用来数个数（M7 数积木 · 数图形）。
       *
       * ⭐ 这类题是 M7 题量的主要来源：认图形题只有 4 种图形可问，
       * 而「摆法 × 问哪种图形」的组合是几百种。见 `countShapes.ts`。
       *
       * 坐标由生成器算好（domain 纯函数），组件只负责画——
       * 摆放位置是题目内容的一部分，必须能被固定种子复现。
       */
      kind: 'shapeScene'
      pieces: ScenePiece[]
      /** 画布逻辑宽高，组件按它设 viewBox */
      width: number
      height: number
    }
  | {
      /**
       * 一排**各不相同**的物体，其中一个被指出来（M1.4 基数与序数）。
       *
       * ⚠️ 必须有**明确的起点方向**：「第 3 个」从左数还是从右数，
       * 一年级是要专门教的。`fromRight` 让这件事成为可考的内容而非歧义。
       */
      kind: 'ordinalRow'
      /** 一排物体的 emoji，互不相同 */
      emojis: string[]
      /** 被指出来的那个，0-based，按 `fromRight` 指定的方向计数 */
      targetIndex: number
      /** 从右往左数 */
      fromRight?: boolean
    }
  | {
      /**
       * 两个物体的空间关系（M2 位置与方向）。
       *
       * 用**布局**表达关系而不是画箭头：上下就真的摆上下。
       * 孩子看图判断，而不是先学会看箭头符号。
       */
      kind: 'spatialPair'
      /** 参照物（固定的那个，如「桌子」） */
      anchor: string
      /** 被问的物体 */
      target: string
      relation: 'above' | 'below' | 'left' | 'right' | 'front' | 'behind'
    }
  | {
      /**
       * 情境组（M4.1 合并 / M4.3 去掉 / M9 应用题）。
       *
       * `groups` 是几堆物体的数量，`operation` 决定怎么画：
       * - `add` 两堆并排，中间一个「和」的提示
       * - `remove` 一堆里后 N 个画成半透明（表示拿走）
       * - `compare` 上下两排对齐，方便一眼看出多几个
       */
      kind: 'storyGroups'
      emoji: string
      /** 物体名称，用于朗读 */
      name: string
      groups: number[]
      operation: 'add' | 'remove' | 'compare'
    }
  | {
      /**
       * 大括号 + 问号（M9.4）。
       *
       * 人教版一年级的标志性题型：物体分成几组，一个大括号把它们括起来，
       * 已知的部分标数字、要求的部分标「?」。
       *
       * ⭐ **问号的位置决定用加还是减**——问号在括号外（求总数）用加法，
       * 在某一组上（求部分）用减法。这正是 M9.4 要教的看图列式，
       * 也是 `wrong_operation` 的诊断点。
       */
      kind: 'braceGroups'
      emoji: string
      name: string
      /** 各组数量 */
      groups: number[]
      /** 问号标在总数上（括号外），还是标在第几组上 */
      question: 'total' | number
    }
  | {
      /**
       * 记忆翻牌：若干对卡片，打乱后背面朝上，翻开两张找配对。
       *
       * ⚠️ 翻错是这个游戏的**正常机制**，不是失败——记忆游戏本来就靠试错。
       * 因此判定不是「错一次就算不会」，而是给一个错误配额
       * （{@link mistakeBudget}），超了才算没掌握。
       * 否则孩子第一次玩必然被判错，而她其实什么都没做错。
       */
      kind: 'memoryPairs'
      /** 卡片，已打乱 */
      cards: MemoryCard[]
      /** 允许错几次仍判为掌握。超出即判错，并按错法给 misconceptionTag */
      mistakeBudget: number
    }
  | {
      /**
       * 十格阵脚手架，把抽象算式变成看得见的数量。
       *
       * ⚠️ **只在难度 1 提供**：教学上脚手架要逐步撤除，
       * 一直给着孩子就不会去心算了。难度 2、3 必须靠脑子。
       */
      kind: 'tenFrame'
      /** 十格阵内的点数 */
      frame: number
      /** 格子外的散点数 */
      loose: number
    }
  | {
      /** 拖拽排序：把打乱的数字卡按从小到大放进一排空槽 */
      kind: 'ordering'
      /** 打乱后的卡片值，数组顺序即初始展示顺序 */
      cards: number[]
    }
  | {
      /** 拖拽配对：左右两列连线，每对之和等于 `total` */
      kind: 'matching'
      /** 左列（固定不动的一侧） */
      left: number[]
      /** 右列（可拖动的一侧），已打乱 */
      right: number[]
      /** 每对应当凑成的总数 */
      total: number
    }
  | {
      /**
       * 拖拽拆分：把一个数拆成两份放进两个槽。凑十法与破十法共用。
       *
       * 十格阵字段复用 `tenFrame` 的同一套语义，
       * 保证「讲解里看到的」和「自己动手做的」是同一套视觉语言
       * （见 design/05-孩子反馈与响应.md 第 5 条）。
       */
      kind: 'splitting'
      /** 被拆的数 */
      total: number
      /** 可拖的候选卡片，已打乱 */
      cards: number[]
      /** 两个槽的说明文字，孩子不识字所以同时要能朗读 */
      slotLabels: [string, string]
      /** 十格阵内已有的点数 */
      frame: number
      /** 格子外的散点数 */
      loose: number
    }
  | {
      /**
       * 拼读：拖一个声母 + 一个韵母拼成音节（P3.1）。
       *
       * 与 `splitting` 同为 `drag_combine` 题型、共用交互，但数据完全不同——
       * 拼读的卡片是**字母**不是数字，也没有十格阵。
       * 分成两种 kind 而不是把 `cards` 放宽成 `(number|string)[]`：
       * 后者会让两边的组件都得先判类型，且数学那边的 `total/frame/loose`
       * 在拼读场景下毫无意义，硬塞 0 进去是假数据。
       */
      kind: 'blending'
      /** 声母候选，已打乱，必含正确答案 */
      initials: string[]
      /**
       * 介母候选（i / u / ü）。**只有三拼音节（P3.2）有**，两拼时省略。
       *
       * 有它就是三个槽，没有就是两个——槽数由 `slotLabels.length` 决定。
       */
      medials?: string[]
      /** 韵母候选，已打乱，必含正确答案 */
      finals: string[]
      /** 各槽的说明。两拼两个、三拼三个 */
      slotLabels: string[]
    }

export interface GeneratedItem {
  /** 参数签名，如 `'M5.2-gen#9+5'`。用于去重，并写入 `Attempt.itemId` */
  signature: string
  kpId: string
  type: ItemType
  difficulty: Difficulty
  stem: {
    text: string
    /**
     * 朗读文本。⚠️ 仍是必填 —— 它是 `ttsParts` 缺片段时的 TTS 兜底，
     * 孩子不识字，任何一条路径都不能通向静音。
     */
    ttsText: string
    /**
     * 预生成语音片段序列，如 `['num.9', 'op.plus', 'num.5', 'phrase.equalsWhat']`。
     *
     * 省略则整句走实时 TTS。生成器按 `domain/speech.ts` 的 `utter()` 构造，
     * 片段清单见 `data/seed/voiceManifest.ts`。
     */
    ttsParts?: string[]
    /**
     * 题干语言，默认中文。
     *
     * ⚠️ 英语题**必须**显式标 `'en-US'`：片段缺失时整句会降级到实时 TTS，
     * 而用中文引擎念 `apple` 得到的是一个孩子听不懂、也学不对的发音。
     * 发音教错比没有声音严重得多（见 design/07-音频方案.md §3.3）。
     */
    ttsLang?: 'zh-CN' | 'en-US'
  }
  options: ItemOption[]
  answer: string
  /** 可视化数据，仅部分题型需要 */
  visual?: ItemVisual
}

/** 数学题目生成器统一签名。所有生成器必须是纯函数。 */
export type Generator = (ctx: GeneratorContext) => GeneratedItem

export interface ScheduleInput {
  profileId: Uuid
  mode: SessionMode
  subject?: Subject
  /** 本段题量，默认 25 */
  count: number
  masteryMap: Map<string, Mastery>
  knowledgePoints: KnowledgePoint[]
  now: IsoDateTime
  /**
   * 当前**确实出得了题**的知识点集合。省略则视为全部可出。
   *
   * 图谱里有知识点尚无对应的题目生成器或题库（M2 位置、M7 图形等待图片资源）。
   * 若调度器排进这些知识点，组装阶段会静默跳过，导致实际题量小于请求量——
   * 孩子会遇到「说好 25 题却只做了 13 题」。
   *
   * 由调用方注入而非让 domain 去查 seed 数据：domain 不依赖 data 层是分层铁律。
   */
  answerableKpIds?: ReadonlySet<string>
}

export interface ScheduledItem {
  kpId: string
  difficulty: Difficulty
  /** 该题的来源，用于会话结束后的统计与调试 */
  source: 'review' | 'learning' | 'confidence' | 'remedial'
  /** 静态题 ID；数学题为空，运行时由生成器产出 */
  itemId?: string
}

// ============================================================================
// 备份格式
// ============================================================================

/**
 * 备份文件格式。
 *
 * ⚠️ **不包含静态表**（knowledgePoints / items / itemTemplates / assetCache）——
 * 它们由目标设备的 App 版本重建。这样老备份能导入到内容更新过的新版本，
 * 而不会用旧内容覆盖新内容。
 */
export interface BackupFile {
  format: 'smartlearning-backup'
  /** ⚠️ 必须字段。导入时若高于当前版本一律拒绝，绝不降级导入（会丢字段） */
  schemaVersion: number
  appVersion: string
  contentVersion: number
  exportedAt: IsoDateTime
  /** 来源设备标识 */
  installId: Uuid
  deviceHint?: string

  profile: Profile
  settings: Settings

  data: {
    attempts: Attempt[]
    mastery: Mastery[]
    sessions: Session[]
    dailyTasks: DailyTask[]
    /**
     * ⚠️ 数组而非单只。schema v2/v3 把宠物拆成了「科目 × 年级」，
     * 一个档案同时养着三只（语文/数学/英语），升年级还会再来一批。
     */
    petState: PetState[]
    ledger: LedgerEntry[]
    /**
     * 买过什么。schema v4 新增——v3 及更早的备份没有这个字段，
     * 由 `BACKUP_MIGRATIONS[3]` 补成空数组。
     */
    purchases: Purchase[]
    collections: CollectionCard[]
    achievements: Achievement[]
    assessments: Assessment[]
  }

  /**
   * 冗余摘要。导入前展示给家长确认「这是不是我要的那份文件」，避免覆盖错数据。
   *
   * ⚠️ 刻意**不含宠物等级/经验**：一旦把三只的进度并排列出来就是变相排名，
   * 违反 CLAUDE.md 宠物红线第 3 条。名字是孩子自己起的，辨识度足够，且不构成比较。
   */
  stats: {
    totalAttempts: number
    masteredCount: number
    firstAttemptAt?: IsoDateTime
    lastAttemptAt?: IsoDateTime
    profileName: string
    /** 宠物名字，仅用于辨认文件。⚠️ 绝不附带等级或经验 */
    petNames: string[]
  }

  /**
   * `data` 的校验和，用于检测文件损坏（截断、编码错乱）。
   * 算法见 `domain/backup/checksum.ts` —— 刻意不用 SHA-256，理由在那里。
   */
  checksum: string
}
