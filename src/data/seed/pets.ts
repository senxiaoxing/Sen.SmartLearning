/**
 * @file 宠物定义 —— 按「科目 × 年级」组织的伙伴，各 6 个形态
 * @layer data  静态内容
 * @see design/06-宠物系统.md
 *
 * 一年级：语文小飞龙「墨墨」· 数学小企鹅「团团」· 英语小熊猫「波波」。
 *
 * **按年级换宠物**：每升一个年级换一批新伙伴，
 * 让每学年都有明确的终点（把它养到最终形态）和新的期待（认识新伙伴）。
 * 成长曲线也据此校准——学完一个年级的内容，宠物正好满级。
 *
 * ⚠️ 三只宠物之间**绝不比较**：不排名、不显示谁更高级。
 * 孩子必然会偏向喜欢的科目，若把差距摆到台面上，
 * 只会让她对落后的那只产生愧疚——那是在惩罚她的兴趣。
 */

import { GRADE_LEVELS, type GradeLevel, type Subject } from '@/domain/types'

/**
 * 配饰的挂载点。渲染层据此决定画在身体的哪个位置。
 *
 * 有了槽位，围巾才能长在脖子上、皇冠才能戴在头顶——
 * 而不是所有配饰都堆在头像右上角当贴纸。
 */
export type AccessorySlot = 'head' | 'face' | 'neck' | 'back'

/**
 * 一件配饰。
 *
 * `kind` 是语义名而非具体图形：渲染层拿它去查该画什么。
 * 换美术时只改渲染层的映射表，这里的数据一行不动。
 */
export interface StageAccessory {
  slot: AccessorySlot
  /** 语义化部件名，如 'scarf' | 'cape' | 'crown' */
  kind: string
  /** emoji 占位。SVG 部件就位后这个字段可以删掉 */
  emoji: string
}

/**
 * 宠物在某个形态下的外观。当前用 emoji 占位，美术就位后替换为 SVG 部件。
 *
 * 六个形态必须**视觉上真的能区分**：同一个 emoji 只靠大小变化远远不够，
 * 因此每个形态都要有可辨识的装饰差异。
 */
export interface PetStageAppearance {
  /** 主体 emoji */
  emoji: string
  /**
   * 配饰列表，**累加式**：围巾 → ＋披风 → ＋皇冠。
   *
   * 刻意不做替换制——孩子攒下来的东西一直挂在身上，
   * 成长感比每进阶一次就换掉上一件强得多。
   *
   * 同一个 slot 只能挂一件（由 pets.test.ts 强制）。
   */
  accessories: readonly StageAccessory[]
  /** 相对尺寸，随成长逐步变大 */
  scale: number
  /** 是否带光效。留给最终形态，才有分量 */
  glow?: boolean
  /** 形态名，用于「变身啦！现在是数数小能手」这类提示 */
  label: string
}

/**
 * 一句宠物台词，自带语音片段 key。
 *
 * ⭐ **为什么台词要背着自己的 clipKey，而不是只写文本**
 *
 * 宠物台词全是静态内容，完全可以预生成 mp3——而这直接决定它是少女音还是机器音。
 * 台词会出现在答对反馈里（每题必播），机器音在那个位置格外刺耳。
 *
 * key 写在台词旁边而不是由代码按下标推导（`petline.penguinG1Greet0`），
 * 是为了让 `scripts/generate-voices.mjs` 能用**和昵称完全相同的正则**扫出来。
 * 代价是啰嗦一点，换来的是台词文本仍然留在 pets.ts 里——
 * 打开这一个文件就能看到这只宠物是什么性格，不用跳到第二个文件去拼。
 */
export interface PetLine {
  /** 语音片段 key，形如 `petline.penguinG1Greet0` */
  clipKey: string
  /** 台词文本 */
  text: string
}

export interface PetPersonality {
  /** 口头禅，最能体现性格的一句 */
  catchphrase: PetLine
  /** 各场景台词池。随机取用，避免每次都是同一句 */
  greet: readonly PetLine[]
  correct: readonly PetLine[]
  /** ⚠️ 答错台词必须温和，见 CLAUDE.md 产品红线 */
  wrong: readonly PetLine[]
  levelUp: readonly PetLine[]
  /** 久别重逢。⚠️ 只能是「想你了」，绝不能是「你都不理我」 */
  comeback: readonly PetLine[]
}

/** `personality` 里全部台词池的字段名。遍历时用它，加了新场景这里也要加 */
export const PET_LINE_MOMENTS = ['greet', 'correct', 'wrong', 'levelUp', 'comeback'] as const

/** 六个形态，分别对应 Lv1-2 / 3-4 / 5-6 / 7-8 / 9-10 / 11-12 */
export type PetStages = [
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
]

export interface PetDefinition {
  id: string
  subject: Subject
  gradeLevel: GradeLevel
  /** 默认名字，孩子可以改 */
  defaultName: string
  species: string
  stages: PetStages
  personality: PetPersonality
  /** 主题色，用于卡片与进度条 */
  themeColor: string
}

/** 蛋阶段三只共用：都是从一颗蛋开始 */
const EGG: PetStageAppearance = { emoji: '🥚', accessories: [], scale: 0.85, label: '蛋' }

/** 破壳期挂在身后的半片蛋壳，三只共用 */
const EGGSHELL: StageAccessory = { slot: 'back', kind: 'eggshell', emoji: '🥚' }

/** 团团的围巾与红披风。两件都是累加的，从 Lv7 起一直挂到满级 */
const PENGUIN_SCARF: StageAccessory = { slot: 'neck', kind: 'scarf', emoji: '🧣' }
const PENGUIN_CAPE: StageAccessory = { slot: 'back', kind: 'cape', emoji: '🦸' }

/**
 * 一年级 · 数学 · 小企鹅「团团」
 * 性格：认真、爱数数、有点小得意。数学的气质是严谨而可爱。
 */
const PENGUIN_G1: PetDefinition = {
  id: 'penguin-g1',
  subject: 'math',
  gradeLevel: 'G1',
  defaultName: '团团',
  species: '小企鹅',
  themeColor: '#63B3F2',
  stages: [
    EGG,
    { emoji: '🐣', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐧', accessories: [], scale: 0.95, label: '小企鹅' },
    { emoji: '🐧', accessories: [PENGUIN_SCARF], scale: 1.05, label: '数数小能手' },
    { emoji: '🐧', accessories: [PENGUIN_SCARF, PENGUIN_CAPE], scale: 1.12, label: '计算高手' },
    {
      emoji: '🐧',
      accessories: [PENGUIN_SCARF, PENGUIN_CAPE, { slot: 'head', kind: 'crown', emoji: '👑' }],
      scale: 1.2,
      glow: true,
      label: '企鹅王',
    },
  ],
  personality: {
    catchphrase: { clipKey: 'petline.penguinG1Catchphrase', text: '让我数数看～' },
    greet: [
      { clipKey: 'petline.penguinG1Greet0', text: '今天也来数数吗？' },
      { clipKey: 'petline.penguinG1Greet1', text: '我刚才数到 100 啦！' },
      { clipKey: 'petline.penguinG1Greet2', text: '你来啦，我等你好久了～' },
      { clipKey: 'petline.penguinG1Greet3', text: '一起做数学题吧！' },
    ],
    correct: [
      { clipKey: 'petline.penguinG1Correct0', text: '哇，算对了！' },
      { clipKey: 'petline.penguinG1Correct1', text: '你比我还快！' },
      { clipKey: 'petline.penguinG1Correct2', text: '让我数数看…没错！' },
      { clipKey: 'petline.penguinG1Correct3', text: '厉害厉害～' },
    ],
    wrong: [
      { clipKey: 'petline.penguinG1Wrong0', text: '嗯…我们再看看' },
      { clipKey: 'petline.penguinG1Wrong1', text: '这道题有点绕呢' },
      { clipKey: 'petline.penguinG1Wrong2', text: '没关系，我也常常数错' },
      { clipKey: 'petline.penguinG1Wrong3', text: '再想想，你可以的' },
    ],
    levelUp: [
      { clipKey: 'petline.penguinG1LevelUp0', text: '我长大啦！' },
      { clipKey: 'petline.penguinG1LevelUp1', text: '又进步了一点点～' },
      { clipKey: 'petline.penguinG1LevelUp2', text: '快看快看，我不一样了！' },
    ],
    comeback: [
      { clipKey: 'petline.penguinG1Comeback0', text: '好几天没见到你了，我有点想你' },
      { clipKey: 'petline.penguinG1Comeback1', text: '你回来啦！我一直在等你' },
      { clipKey: 'petline.penguinG1Comeback2', text: '想你想得都不会数数了～' },
    ],
  },
}

/**
 * 墨墨的配饰。
 *
 * 成长线借「小火龙 → 喷火龙」的进化叙事：眼镜之后长小翅膀、再换大翅膀加尖角。
 * 尾焰随等级变大由渲染层按 stage 索引推导，不占槽位——
 * 它是身体的一部分，不是戴上去的东西。
 */
const DRAGON_GLASSES: StageAccessory = { slot: 'face', kind: 'glasses', emoji: '👓' }
const DRAGON_WINGS_SMALL: StageAccessory = { slot: 'back', kind: 'wings-small', emoji: '🪽' }
const DRAGON_WINGS_BIG: StageAccessory = { slot: 'back', kind: 'wings-big', emoji: '🪽' }

/**
 * 一年级 · 语文 · 小飞龙「墨墨」
 * 性格：话痨、爱讲故事、文绉绉但可爱。语文的气质是有文化又爱表达。
 *
 * ⚠️ 形象走绿色系，但 `themeColor` 保持紫——绿色 `#5FD3A6` 是英语熊猫波波的主题色，
 * 进度条和等级徽章要是也变绿就跟波波撞了。形象色与 UI 主题色刻意分离。
 */
const DRAGON_G1: PetDefinition = {
  id: 'dragon-g1',
  subject: 'pinyin',
  gradeLevel: 'G1',
  defaultName: '墨墨',
  species: '小飞龙',
  themeColor: '#A78BFA',
  stages: [
    EGG,
    { emoji: '🦎', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐲', accessories: [], scale: 0.95, label: '小飞龙' },
    { emoji: '🐲', accessories: [DRAGON_GLASSES], scale: 1.05, label: '识字小龙' },
    { emoji: '🐉', accessories: [DRAGON_GLASSES, DRAGON_WINGS_SMALL], scale: 1.12, label: '读书龙' },
    {
      emoji: '🐉',
      accessories: [DRAGON_GLASSES, DRAGON_WINGS_BIG, { slot: 'head', kind: 'horns', emoji: '📜' }],
      scale: 1.2,
      glow: true,
      label: '文曲龙',
    },
  ],
  personality: {
    catchphrase: { clipKey: 'petline.dragonG1Catchphrase', text: '本龙又学会一个字！' },
    greet: [
      { clipKey: 'petline.dragonG1Greet0', text: '本龙今日也要读书！' },
      { clipKey: 'petline.dragonG1Greet1', text: '来听我念诗吗？' },
      { clipKey: 'petline.dragonG1Greet2', text: '你来啦，我正读到精彩处～' },
      { clipKey: 'petline.dragonG1Greet3', text: '今天学什么字呀？' },
    ],
    correct: [
      { clipKey: 'petline.dragonG1Correct0', text: '妙哉妙哉！' },
      { clipKey: 'petline.dragonG1Correct1', text: '本龙都要记下来了！' },
      { clipKey: 'petline.dragonG1Correct2', text: '读得真好听～' },
      { clipKey: 'petline.dragonG1Correct3', text: '你比本龙还厉害！' },
    ],
    wrong: [
      { clipKey: 'petline.dragonG1Wrong0', text: '无妨无妨，再想想' },
      { clipKey: 'petline.dragonG1Wrong1', text: '这个字确实难写' },
      { clipKey: 'petline.dragonG1Wrong2', text: '本龙当年也念错过～' },
      { clipKey: 'petline.dragonG1Wrong3', text: '慢慢来，不着急' },
    ],
    levelUp: [
      { clipKey: 'petline.dragonG1LevelUp0', text: '本龙长大了！' },
      { clipKey: 'petline.dragonG1LevelUp1', text: '又长了一片鳞～' },
      { clipKey: 'petline.dragonG1LevelUp2', text: '快看，本龙的角！' },
    ],
    comeback: [
      { clipKey: 'petline.dragonG1Comeback0', text: '好久不见，本龙甚是想念' },
      { clipKey: 'petline.dragonG1Comeback1', text: '你终于回来啦！' },
      { clipKey: 'petline.dragonG1Comeback2', text: '这几日无人听我念书～' },
    ],
  },
}

/**
 * 波波的配饰。
 *
 * 墨镜与熊猫天生的黑眼圈是一对——戴上真墨镜等于把天生特征升了一级。
 * 斗篷用 mint，正是波波的 `themeColor`：本体黑白，全靠这件把主题色带上身。
 *
 * 竹子不在这里——它是本体的一部分（随等级从 0.7 长到 1.25 倍），
 * 跟墨墨的尾焰同一个待遇，所以 `neck` 槽位空着。
 */
const PANDA_SHADES: StageAccessory = { slot: 'face', kind: 'sunglasses', emoji: '🕶️' }
const PANDA_CLOAK: StageAccessory = { slot: 'back', kind: 'cloak', emoji: '🧥' }

/**
 * 一年级 · 英语 · 小熊猫「波波」
 * 性格：好奇、爱模仿、中英夹杂。英语的气质是活泼爱说。
 */
const PANDA_G1: PetDefinition = {
  id: 'panda-g1',
  subject: 'english',
  gradeLevel: 'G1',
  defaultName: '波波',
  species: '小熊猫',
  themeColor: '#5FD3A6',
  stages: [
    EGG,
    { emoji: '🐻', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐼', accessories: [], scale: 0.95, label: '小熊猫' },
    { emoji: '🐼', accessories: [PANDA_SHADES], scale: 1.05, label: '单词学徒' },
    { emoji: '🐼', accessories: [PANDA_SHADES, PANDA_CLOAK], scale: 1.12, label: '双语熊猫' },
    {
      emoji: '🐼',
      accessories: [PANDA_SHADES, PANDA_CLOAK, { slot: 'head', kind: 'cap', emoji: '🎓' }],
      scale: 1.2,
      glow: true,
      label: '熊猫博士',
    },
  ],
  /**
   * ⚠️ 波波的台词**中英夹杂**，而它和其他台词一样用中文少女声生成
   * （见 scripts/generate-voices.mjs 的音色规则）。
   *
   * 这是刻意的，不是漏了：这些 `Hello` `Yes` `Wow` 是**语气词**，属于波波的性格，
   * 不是教学内容。真正要教发音的英语词在 `en.*` 片段里，那些一律用英语童声。
   * 反过来，把整句喂给英语音色会让中文部分念得一塌糊涂——那才是真的教错。
   */
  personality: {
    catchphrase: { clipKey: 'petline.pandaG1Catchphrase', text: 'This is 好吃的！' },
    greet: [
      { clipKey: 'petline.pandaG1Greet0', text: 'Hello！今天学什么？' },
      { clipKey: 'petline.pandaG1Greet1', text: '波波想学新单词！' },
      { clipKey: 'petline.pandaG1Greet2', text: 'Hi～你来啦！' },
      { clipKey: 'petline.pandaG1Greet3', text: "Let's go！我们开始吧" },
    ],
    correct: [
      { clipKey: 'petline.pandaG1Correct0', text: 'Yes！答对啦！' },
      { clipKey: 'petline.pandaG1Correct1', text: 'You are 太棒了！' },
      { clipKey: 'petline.pandaG1Correct2', text: 'Very good！' },
      { clipKey: 'petline.pandaG1Correct3', text: 'Wow～好厉害' },
    ],
    wrong: [
      { clipKey: 'petline.pandaG1Wrong0', text: 'Oh no～再试试' },
      { clipKey: 'petline.pandaG1Wrong1', text: '没关系 no problem' },
      { clipKey: 'petline.pandaG1Wrong2', text: '波波也常常记错～' },
      { clipKey: 'petline.pandaG1Wrong3', text: 'Try again！' },
    ],
    levelUp: [
      { clipKey: 'petline.pandaG1LevelUp0', text: '波波长大了！' },
      { clipKey: 'petline.pandaG1LevelUp1', text: 'I am 变大了！' },
      { clipKey: 'petline.pandaG1LevelUp2', text: '快看看我～' },
    ],
    comeback: [
      { clipKey: 'petline.pandaG1Comeback0', text: '好久不见，I miss you～' },
      { clipKey: 'petline.pandaG1Comeback1', text: '你回来啦！波波好开心' },
      { clipKey: 'petline.pandaG1Comeback2', text: '波波一直在等你哦' },
    ],
  },
}

/**
 * 全部宠物定义。
 *
 * 新增年级时在这里追加三只即可——成长逻辑、UI、仓储都不需要改动。
 */
export const PET_DEFINITIONS: readonly PetDefinition[] = [PENGUIN_G1, DRAGON_G1, PANDA_G1]

/** 按 `科目|年级` 索引 */
const KEY = (subject: Subject, gradeLevel: GradeLevel): string => `${subject}|${gradeLevel}`

const BY_KEY: ReadonlyMap<string, PetDefinition> = new Map(
  PET_DEFINITIONS.map((p) => [KEY(p.subject, p.gradeLevel), p]),
)

/** 查某个年级某个科目的宠物定义 */
export function petDefinitionOf(
  subject: Subject,
  gradeLevel: GradeLevel,
): PetDefinition | undefined {
  return BY_KEY.get(KEY(subject, gradeLevel))
}

/** 取某个年级的全部宠物定义，按科目固定顺序排列 */
export function petsOfGrade(gradeLevel: GradeLevel): PetDefinition[] {
  return PET_DEFINITIONS.filter((p) => p.gradeLevel === gradeLevel)
}

/**
 * 当前已开放内容的 `科目|年级` 组合。
 *
 * ⚠️ 一个组合只有在**真的出得了题**之后才能列进来。
 * 没题库却让宠物醒着，孩子点进去发现什么都没有，那是明确的失望；
 * 而「还在睡觉，等课程准备好就醒来」至少给了诚实的预期，
 * 也不会让她觉得是自己没养好（那正是产品红线第 4 条要避免的）。
 * 由 `pets.test.ts`「开放的科目必须真的出得了题」强制校验。
 *
 * ⭐ **按「科目 × 年级」而不是只按科目**：「三年级英语开了但三年级拼音还没开」
 * 是一定会发生的——内容一个年级一个科目地做出来，不会三科齐步走。
 * 只按科目判会让还没做的那科的宠物醒着，点进去一片空白。
 *
 * 一年级三科现已全部开放：数学（M1/M3~M6）、拼音（P1~P7，阶段 ⑧）、
 * 英语（E1~E10 的 27 个知识点，阶段 ⑨）。
 */
const OPENED: ReadonlySet<string> = new Set([KEY('math', 'G1'), KEY('pinyin', 'G1'), KEY('english', 'G1')])

/**
 * 这个科目在这个年级有内容了吗。
 *
 * @example
 * isOpened('math', 'G1')   // true
 * isOpened('math', 'G2')   // false —— 二年级内容还没做
 */
export function isOpened(subject: Subject, gradeLevel: GradeLevel): boolean {
  return OPENED.has(KEY(subject, gradeLevel))
}

/**
 * 某个年级已开放的科目，按 `SUBJECT_ORDER` 之外的固定顺序（宠物定义顺序）排列。
 *
 * @example
 * openedSubjectsOf('G1')   // ['math', 'pinyin', 'english']
 * openedSubjectsOf('G2')   // []
 */
export function openedSubjectsOf(gradeLevel: GradeLevel): Subject[] {
  return petsOfGrade(gradeLevel)
    .map((p) => p.subject)
    .filter((s) => isOpened(s, gradeLevel))
}

/** 至少有一个科目已开放的年级，按学段顺序 */
export function openedGradeLevels(): GradeLevel[] {
  return GRADE_LEVELS.filter((g) => openedSubjectsOf(g).length > 0)
}
