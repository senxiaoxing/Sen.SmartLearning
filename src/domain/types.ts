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
export type Grade =
  | '1A'
  | '1B'
  | '2A'
  | '2B'
  | '3A'
  | '3B'
  | '4A'
  | '4B'
  | '5A'
  | '5B'
  | '6A'
  | '6B'

/**
 * 年级 —— **内容的分区键**。
 *
 * 一年级和三年级不是同一批知识点的难易差异，是两批不同的知识点。
 * 宠物同样按「科目 × 年级」划分：每升一个年级换一批新伙伴，
 * 让每学年有明确的终点和新的期待。
 *
 * ⚠️ 年级是「**新内容的天花板**」，不是「内容的围墙」——
 * 开新知识点只从当前年级取，但复习、巩固、前置回退一律允许跨年级往下。
 * 挡住回退会让 `findWeakestPrerequisite()` 失效，那是本项目诊断能力的落点。
 * 见 design/08-年级分区与内容扩展.md §1.1。
 */
export type GradeLevel = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6'

/** 全部年级，按学段顺序。遍历年级时用它，加年级只改这一处。 */
export const GRADE_LEVELS: readonly GradeLevel[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']

/**
 * 从学期推导年级。`'1A'` / `'1B'` 都属于 `'G1'`。
 *
 * @example
 * gradeLevelOf('1B')   // 'G1'
 * gradeLevelOf('3A')   // 'G3'
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
  | 'choice_compare' // ⭐ 挨个试听、对比后确认（见下）
  | 'input_number' // 数字小键盘输入
  | 'listen_number' // ⭐ 听算：只报题、不显示算式（见下）
  | 'drag_match' // 拖拽配对
  | 'drag_combine' // 拖拽组合（拼读 b + ā → bā）
  | 'drag_order' // 拖拽排序
  | 'memory_pair' // 记忆翻牌
  | 'record_compare' // 跟读录音回放
  | 'tap_count' // 点数计数
  | 'trace' // 描红笔顺（阶段 2）

/**
 * ⭐ `choice_audio` 与 `choice_compare` 的区别 —— 别再搞混了
 *
 * 两者长得像，交互却是相反的：
 *
 * | | 要听的是什么 | 点选项等于 |
 * |---|---|---|
 * | `choice_audio` | **题干**（喇叭就是题目本身，如「听 gē 选 gē」） | 提交答案 |
 * | `choice_compare` | **选项**（四个音节挨个听，比出不一样的那个） | 试听 ＋ 选中，⛔ 不提交 |
 *
 * `pinyinOddOne` 原先错用了 `choice_audio`，于是题干写着「点一点听一听」，
 * 孩子照做点了第一个想听——直接被判做错了（2026-08-27 真机反馈）。
 *
 * ⚠️ `choice_compare` 的「点选项会发声」**不违反**「点击选项不朗读」那条红线：
 * 红线的理由是「那一下是提交答案，紧接着响反馈语，两个声音会叠在一起」，
 * 而这里点选项不提交，反馈语要等她点「好了」才响，两者隔着一次点击。
 * 见 `items/OptionButton.tsx` 与 `items/ChoiceCompare.tsx` 的文件头。
 */

/**
 * ⭐ `listen_number` 听算 —— 与 `input_number` 是同一批数据的两种考法
 *
 * 只报题、不显示算式，她听完在心里算，再从四个选项里挑。
 * 数据结构与 `input_number` / `choice_text` **完全相同**（四个选项 + 一个答案），
 * 差别只在渲染时藏不藏算式，所以三者可以由 `readItemType` 的 `as` 参数互换。
 *
 * 它练的是另一种能力：看着算靠的是读，听着算要先把数字在脑子里存住——
 * 工作记忆参与了，而那正是口算熟练度的一部分。顺带，孩子那句
 * 「答题界面单一，都是题目 + 4 个选项」在这里得到的是最彻底的回答：**没有题面**。
 *
 * ⚠️ **只能一、二年级**。三年级起不再朗读中文题干（CLAUDE.md 产品红线），
 * 那时这个题型没有语音就完全做不了——不是体验变差，是题目不存在。
 * 现在靠「只给 G1/G2 的知识点挂听算模板」保证，G3 内容做出来时要重新确认这条。
 *
 * ⚠️ 计时要扣掉听题那一段，见 `stores/sessionStore.ts` 的 `LISTEN_LEAD_MS`。
 */

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

  // ==========================================================================
  // 数学 · 二年级
  // ==========================================================================

  // —— 笔算与混合运算
  //
  // ⚠️ 这里**没有**「连续进位/退位漏掉一次」那两个标签，虽然教材单元名会让人
  // 想当然地以为需要。二年级 100 以内加减法的结果不超过 100，竖式最多进位一次——
  // 孩子「个位进了位、十位忘了加那个 1」就是 `no_carry`，不是别的病。
  // 真正的连续进位（187 + 256）要到三年级多位数笔算，到那时再加。
  /**
   * **数位没对齐**：`35 + 7` 把 7 写在了十位下面，算成 `35 + 70`。
   *
   * 与 `place_value_swap` 是两种病：那个是不知道哪一位叫十位（命名问题），
   * 这个是知道数位、但列竖式时没把末位对齐（书写习惯问题）。
   * 补救是拿方格纸列竖式，先只做「个位对个位」这一个动作。
   */
  | 'column_misaligned'
  | 'op_order' // 混合运算没有先乘除后加减
  | 'paren_ignored' // 无视括号，仍从左往右算

  // —— 乘除法
  /**
   * ⭐ **乘法当成加法**：`3 × 4` 答 7。
   *
   * 与 `op_confusion` 是两种病：那个是看错符号（`8 - 3` 做成 `8 + 3`），
   * 换个题照样会做；这个是**没建立「几个几」的概念**，
   * 补救必须回到摆小棒数几堆，练口诀没有用。
   * 这是二年级乘法的头号误区，`mulTable` 的干扰项必须把 `a + b` 摆进选项。
   */
  | 'mul_as_add'
  /**
   * **口诀记错**：`7 × 8` 答 54（串到了「六九五十四」）。
   *
   * 与 `mul_extra_group` 是两种病：这个答出来的数和题目**没有倍数关系**，
   * 是背串行了；那个答的是相邻的一组，说明概念对、只是数错了组数。
   */
  | 'table_confusion'
  /**
   * **多算或少算一组**：`3 × 4` 答 15（算成 3×5）或 9（算成 3×3）。
   *
   * 她知道是「几个几」，只是数组数时差了一组。补救是用图圈出来一组一组数，
   * 而不是回去背口诀——见 `table_confusion` 的对比。
   */
  | 'mul_extra_group'
  | 'div_as_sub' // 除法做成减法（12 ÷ 3 答 9）
  | 'div_as_mul' // 除法做成乘法（12 ÷ 3 答 36）
  | 'remainder_ignored' // 有余数的除法只答商，余数丢了
  | 'remainder_too_big' // 余数大于等于除数（13 ÷ 4 答「2 余 5」）
  /**
   * **商和余数写反**：`13 ÷ 4` 答「3 余 1」写成「1 余 3」。
   *
   * 与 `remainder_ignored` 是两种病：那个是没意识到还剩东西，
   * 这个是算对了、只是不知道哪个数写在哪。补救是回到分东西的场景：
   * 「每人分到几个」是商，「剩下几个」是余数。
   */
  | 'quotient_remainder_swap'

  // —— 数与单位
  /**
   * **中间的 0 漏掉**：三千零五写成 305。
   *
   * 与 `place_value_swap` 是两种病：那个是数位说反，
   * 这个是知道数位、但不知道空着的那一位要用 0 占位。
   * 补救是拿数位表把千百十个四格摆出来，让她看见百位和十位是空的。
   */
  | 'zero_placeholder_lost'
  /**
   * **单位换算错**：认为 1 米 = 10 厘米、1 千克 = 100 克。
   *
   * 与 `unit_sense_weak` 是两种病：这个是进率记错（知识问题，背得下来），
   * 那个是对量级没概念（经验问题，得靠身体去比）。
   */
  | 'unit_conversion'
  /** 单位量感差：给铅笔选「米」、给一个苹果选「千克」。见 `unit_conversion` 的对比 */
  | 'unit_sense_weak'
  /**
   * **取近似数时直接截断**：4985 约等于 4000，只看了千位、后面几位一概不管。
   *
   * 与 `place_value_swap` 是两种病：那个是分不清哪一位叫千位，
   * 这个是数位认得清清楚楚，只是不知道还要看后一位来决定进不进。
   * 补救是把数放到数轴上：4985 离 5000 近还是离 4000 近。
   */
  | 'estimate_truncate'
  /**
   * **量长度没从 0 开始**：把物体左端对在刻度 1 上，直接读右端的数。
   *
   * 与 `off_by_one` 是两种病：那个是数数时多数少数了一个，
   * 这个是**测量起点**的问题——她读的数其实是对的，只是没减去起点。
   * 补救是每次量之前先念一句「左边对准 0」。
   */
  | 'ruler_start_wrong'

  // —— 时间与图形
  /**
   * ⭐ **分针的格数当成分钟**：分针指向 3，读成「3 分」而不是「15 分」。
   *
   * 与 `hand_swap` 是两种病：那个是时针分针认反（认针的问题），
   * 这个是认对了针、但不知道一大格等于 5 分（换算的问题）。
   * 这是「几时几分」的头号误区，干扰项必须把格数本身摆进选项。
   */
  | 'minute_misread'
  /**
   * **时针读快一格**：`3:55` 读成 `4:55`，因为时针已经很接近 4 了。
   *
   * 补救是强调「时针走过谁就是谁」，没走到 4 就还是 3 时。
   */
  | 'hour_overread'
  /**
   * ⭐ **边画得长就以为角大**：两个角开口一样，边长的那个被判成更大。
   *
   * 角的大小只由开口决定、与边的长短无关，这是二年级「角」整个单元的核心。
   * 补救是拿活动角把边推进推出给她看：边变短了，角没变。
   */
  | 'angle_side_length'
  /**
   * **角的类别认错**：问哪个是直角，她挑了个锐角。
   *
   * 与 `angle_side_length` 是两种病：那个是被边长骗了（她在比大小，只是比错了依据），
   * 这个是压根还没建立「直角 / 锐角 / 钝角」这三档的概念。
   * 补救也不同——前者用活动角把边推进推出给她看，
   * 后者要拿三角板的直角去比每一个角。
   */
  | 'angle_kind_confusion'
  | 'view_direction_confusion' // 观察物体时把「从上面看」当成「从正面看」
  | 'symmetry_axis_wrong' // 对称轴认错或画错（把非对称图形判成对称）

  // —— 数学广角
  /**
   * **漏掉一种搭配**：3 件上衣配 2 条裤子，只数出 5 种。
   *
   * 与 `count_skip` 是两种病：那个是数数本身跳了，
   * 这个是**没有有序地配**——想到哪配到哪，于是漏了。
   * 补救是固定一件上衣、把裤子全配一遍再换下一件。
   */
  | 'combination_missed'
  /**
   * **只用一个条件就下结论**：听到「小明不是第一」就直接答「小明是第二」，
   * 没有再看第二个条件。
   *
   * 推理题的全部难点就在「要把条件合起来看」，因此干扰项必须是
   * 「只用第一个条件能得到的那个答案」——否则这道题什么也诊断不出来。
   */
  | 'logic_first_only'

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
 * 知识点。整个自适应系统的骨架，共 113 个（数学 48 / 拼音 35 / 英语 30）。
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
  /**
   * ⭐ 刚升到了这个年级，**还没跟孩子说过**。过场演完就清掉。
   *
   * 家长在家长区改年级，会一次性换掉三只伙伴、整体前移内容范围。
   * 而家长区是家长的地方——孩子看不到那一下。没有这个标记的话，
   * 她下次打开 App 会发现企鹅变成了猫，而没有任何人跟她说过。
   * design/08 §6.3：**绝不能让 App 无声无息地换掉一切**。
   *
   * 存年级而不是布尔值，是因为过场要说出「你已经是二年级的大孩子啦」。
   *
   * ⚠️ 只在**往上升**时写：家长把年级改回去是在纠正误操作，
   * 给她演一场「你已经是一年级的小孩子啦」只会让人莫名其妙。
   *
   * ⚠️ 可选字段，理由同 {@link Profile.aliases}：不涉及索引变化，
   * Dexie 的 `stores()` 不用动，也不需要递增 SCHEMA_VERSION。
   */
  pendingGradeUp?: GradeLevel
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

  /**
   * 现实兑换券的家长配置：哪些上架、卖多少分、隔多久能再兑。
   *
   * ⚠️ **可选字段，缺失即视为「一张都没上架」**（不是「全部上架」）。
   * 上架等于家长已经答应了这件事——见 `data/seed/realRewards.ts`。
   * 默认全关，家长主动勾选才出现在商店里，绝不能反过来。
   *
   * 存在 `settings` 而不是单开一张表：它就是一份家长设置，
   * 和时长限制、音量放在一起最自然；而且 `settings` 本就在备份范围内，
   * 不需要再动 schema 与备份迁移。
   */
  realRewardConfigs?: RealRewardConfig[]

  updatedAt: IsoDateTime
}

/**
 * 一张现实券的家长配置。
 *
 * 价格与冷却存在这里而非只读预设里，是因为「小礼物 / 大礼物」具体是什么
 * 由家长定，**而价格就是它的定义**。预设给的只是建议值。
 */
export interface RealRewardConfig {
  /** 对应 `REAL_REWARD_PRESETS` 里的 `id` */
  presetId: string
  /** 是否上架。⚠️ 下架后即便余额充足也不能兑，见 `canPurchase` */
  listed: boolean
  /** 家长定的价格 */
  price: number
  /** 家长定的冷却天数，`0` 表示不限 */
  cooldownDays: number
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
  /**
   * 这次作答来自哪。**缺失即视为 `'practice'`**（本字段之前的旧数据）。
   *
   * - `practice` —— 日常答题。题目由生成器产出，每个错误选项都带 `misconceptionTag`，
   *   正常进 `misconceptionCounts`
   * - `quiz` —— 单元测评。题目来自外部题库，**没有 `misconceptionTag`**
   *
   * ⛔ **`quiz` 的作答只计对错，绝不进 `misconceptionCounts`。**
   * 题库的错误选项是命题人随手凑的，不承载任何诊断信息；混进误区统计
   * 会稀释定向补救的触发阈值——补救该在孩子错 3 次 `bd_confusion` 时触发，
   * 而不是被一堆无标签作答冲淡到永远不触发。
   *
   * ⚠️ 可选字段且不建索引，因此 Dexie 的 `stores()` 定义不用动，
   * 也**不需要递增 SCHEMA_VERSION**。理由同 {@link Profile.aliases}。
   *
   * @see design/08-年级分区与内容扩展.md §2.5 · §9
   */
  source?: 'practice' | 'quiz'
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
  /**
   * 小屋里的站位：舞台宽/高的比例（0~1），指向宠物盒子的**左上角**。
   *
   * ⚠️ 两个字段**可缺失**，缺了就是「她还没摆过」，由
   * `domain/pet/roomSpot.ts` 的 `roomSpotOf()` 回落到默认站位。
   * 不给默认值写进库里：那样分不清「摆到了默认位置」和「从没摆过」，
   * 以后想调默认布局就再也动不了已有档案。
   *
   * 存比例而不是像素——换个设备打开屏幕尺寸就变了，像素会让三只跑到屏幕外。
   * 不建索引，因此新增这两个字段**不需要升 Dexie schema 版本**。
   */
  roomX?: number
  roomY?: number
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
      /**
       * ⭐ 仅 `front` / `behind` 用：靠前的那个画在**右**边还是左边。
       *
       * 前后只能靠遮挡表达，而遮挡必然把两个物体摆成一左一右。
       * 若靠前的那个永远在同一侧，「前面」就等价于「在右边」——
       * 孩子完全可以不看遮挡、只看位置作答，这道题既考不到东西，
       * 还会把「前后」和「左右」在她脑子里焊死。
       *
       * 因此左右顺序必须由生成器用 `ctx.rng()` 随机，**不能在渲染层写死**。
       * 由 `position.test.ts`「靠前的那个不能总在同一边」强制。
       */
      frontOnRight?: boolean
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
       * ⭐ 等分的几组（M2-4.1 乘法的意义 · M2-4.2 乘加互换 · M2-9.1 平均分）。
       *
       * 与 `storyGroups` 的区别是**每组一样多**，而且这件事必须一眼看得出来——
       * 「几个几」的全部意思就在这里。因此渲染时每组要有自己的边界，
       * 摆成一堆散的会让这道题退化成数数题（那是 M1 的内容）。
       *
       * ⚠️ 乘法与除法**共用这一种图**，只是问的东西不同：
       * 看着同一幅「3 组，每组 4 个」，问「一共几个」是乘法，
       * 问「每份几个」是除法。两者本来就是一回事的两个方向，
       * 图一样正好帮她建立这个联系。
       */
      kind: 'equalGroups'
      emoji: string
      /** 物体名称，用于朗读 */
      name: string
      /** 分成几组 */
      groups: number
      /** 每组几个 */
      perGroup: number
    }
  | {
      /**
       * ⭐ 条形图（M2-8 数据收集整理）。
       *
       * ## 不识字的孩子怎么读图表
       *
       * 类别一律用 **emoji** 标注而不是文字；纵轴用数字刻度（数字她认得）；
       * 并且**画出横向网格线**——柱子有多高变成「数几格」，
       * 与 `gridPattern` 是同一个思路：把读数变成可以一格一格数的事。
       *
       * ⛔ 柱子顶上**不标数字**：标了她就不用读图了，这道题也就白出。
       */
      kind: 'barChart'
      /** 每根柱子：emoji、名称（朗读用）、数量 */
      bars: ReadonlyArray<{ emoji: string; name: string; count: number }>
      /** 纵轴最高刻度。由生成器算好，留出柱顶到边框的余量 */
      maxScale: number
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

/**
 * 答错反馈里「答案是 X」那半句怎么念。
 *
 * ⭐ 它存在的理由是：**「点这个选项听什么」和「答案怎么念」不是一回事**，
 * 挤在 `ItemOption.ttsParts` 一个字段里必然互相牺牲。
 *
 * - 英语听音题：点选项念**中文**（念英文等于报答案，见 `generators/faceOptions.ts`），
 *   而答完之后那句「答案是 apple」恰恰必须念**英语**——发音本身就是教学内容。
 * - 拼音听辨题：选项一律**不可点读**（念出来就是报答案），但答案要念出正确的音。
 *
 * @see src/domain/resolveAnswerSpeech.ts  取值优先级与降级规则
 */
export interface AnswerSpeech {
  /**
   * 片段序列。
   *
   * ⭐ **空数组 = 这道题的答案念不出来**，反馈只说伙伴的安慰语，不接「答案是 X」。
   * 方格图案（`grid:5:00.11`）没有名字，拼音写法题（ju / jü）四个选项读音一模一样——
   * 硬念比不念糟得多：前者会被 TTS 一个字符一个字符念出来，后者是在念一句废话。
   * 正确答案本来就会在屏幕上高亮（`OptionButton` 的 `reveal-correct`），不靠这半句。
   */
  parts: string[]
  /**
   * 缺片段时整句 TTS 用的答案文本。
   *
   * ⚠️ 与屏幕上显示的**可能不同**：选项是 emoji（🍎）时屏幕显示图，
   * 这里必须放一个念得出来的词（「苹果」），否则兜底那条路通向一句念不出的话。
   */
  text: string
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
  /**
   * 答错时那句「答案是 X」怎么念。
   *
   * 缺省时按 {@link AnswerSpeech} 的降级顺序推导（正确选项的 `ttsParts` →
   * 数字答案自动解析），推不出就整句走 TTS。数值答案不必填这个字段。
   */
  answerSpeech?: AnswerSpeech
  /** 可视化数据，仅部分题型需要 */
  visual?: ItemVisual
}

/** 数学题目生成器统一签名。所有生成器必须是纯函数。 */
export type Generator = (ctx: GeneratorContext) => GeneratedItem

export interface ScheduleInput {
  profileId: Uuid
  mode: SessionMode
  subject?: Subject
  /**
   * 这次要学哪个年级。省略则不限年级。
   *
   * ⚠️ **它只挡「新开的知识点」**——复习、巩固、补救、前置回退一律不受它影响。
   * 三年级的「两位数乘法」前置是二年级的「乘法口诀」，挡住往下的路
   * 会让 `findWeakestPrerequisite()` 失效，而回退是本项目诊断能力的落点。
   *
   * 换句话说：年级天花板**只挡超前，不挡补漏**。
   * 见 {@link GradeLevel} 与 design/08-年级分区与内容扩展.md §1.1。
   */
  gradeLevel?: GradeLevel
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
