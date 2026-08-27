/**
 * @file 宠物定义 —— 按「科目 × 年级」组织的伙伴，各 6 个形态
 * @layer data  静态内容
 * @see design/06-宠物系统.md
 *
 * 一年级：语文小飞龙「墨墨」· 数学小企鹅「团团」· 英语小熊猫「波波」。
 * 二年级：语文萨摩耶「小白」· 数学矮脚猫「喵喵」· 英语小绵羊「咩咩」。
 *
 * **按年级换宠物**：每升一个年级换一批新伙伴，
 * 让每学年都有明确的终点（把它养到最终形态）和新的期待（认识新伙伴）。
 * 成长曲线也据此校准——学完一个年级的内容，宠物正好满级。
 *
 * ⚠️ 三只宠物之间**绝不比较**：不排名、不显示谁更高级。
 * 孩子必然会偏向喜欢的科目，若把差距摆到台面上，
 * 只会让她对落后的那只产生愧疚——那是在惩罚她的兴趣。
 *
 * ⛔ **全部 `petline.*` 台词必须写在本文件里**，不能拆到 `petsG2.ts` 之类的第二个文件。
 * `scripts/generate-voices.mjs` 的 `loadPetLines()` 只读这一个文件，
 * 搬走的后果是那些台词**没有音频**，运行时静默降级成机器音——
 * 而它出现在每一次答对的反馈里。
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
 *
 * ⭐ **key 里的 `penguin` / `dragon` / `panda` 是「声部」，不是物种。**
 *
 * 二年级换了物种（企鹅→矮脚猫、飞龙→萨摩耶、熊猫→绵羊）但**沿用同一批声音**：
 * 数学伙伴永远是男童声，语文永远是青年男声，英语永远是温柔女声。
 * 孩子闭着眼睛也知道现在是哪一科在说话，这条线索不该每升一个年级就重置一次。
 *
 * 音色路由写在三处正则里（`domain/encourage/petSpeaker.ts` 与生成脚本的两处），
 * 认的就是这三个词。**新伙伴的 clipKey 必须沿用同科目的那个词**，
 * 换成 `petline.catG2…` 会静默掉回旁白少女声。
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
  /**
   * ⭐ 往届伙伴在「我的伙伴」回忆页里说的话。
   *
   * **为什么必须单独一池，不能复用 `comeback`**：`lastSeenAt` 只在结算经验时更新，
   * 而往届伙伴不再成长——于是它必然、且**永久**命中「好几天没见到你了，我有点想你」。
   * 那句话在现役伙伴身上是想念，在回忆页里读出来却是「你抛弃我之后我一直在等」。
   * §5.2 造出「回忆」这个地方，正是为了让升年级不带负罪感，
   * 结果从这个门又放了进来。
   *
   * ⛔ 三条禁忌：**不催她回来**（「常来看看我」「我一直在等你」）、
   * **不提成绩与等级**（§5.2：往届只说陪伴，不说成绩，
   * 任何暗示「养到第几阶」的说法都会让没养满的那只变成遗憾）、
   * **不说再见**（它没有离开，只是换了个地方住）。
   * ✅ 要传达的只有一件事：**那段时光很好，它现在也很好**。
   */
  archived: readonly PetLine[]
}

/** `personality` 里全部台词池的字段名。遍历时用它，加了新场景这里也要加 */
export const PET_LINE_MOMENTS = [
  'greet',
  'correct',
  'wrong',
  'levelUp',
  'comeback',
  'archived',
] as const

/** 六个形态，分别对应 Lv1-2 / 3-4 / 5-6 / 7-8 / 9-10 / 11-12 */
export type PetStages = [
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
  PetStageAppearance,
]

/**
 * 画哪一套形体。`components/PetAvatar.tsx` 据此选 Art 组件。
 *
 * ⭐ **不能按科目派发**（二年级之前是那样写的）：二年级换了物种，
 * 数学从企鹅变成矮脚猫，而科目还是 `math`。形象是「这一年养的是谁」，
 * 与「学的是哪一科」是两件事，必须各有各的字段。
 *
 * ⚠️ 与**音色**也无关。喵喵沿用团团的声音（见 {@link PetPersonality}），
 * 音色由台词的 clipKey 前缀决定，不看这里。
 */
export type PetArtKey = 'penguin' | 'dragon' | 'panda' | 'munchkin' | 'samoyed' | 'sheep'

export interface PetDefinition {
  id: string
  subject: Subject
  gradeLevel: GradeLevel
  /** 默认名字，孩子可以改 */
  defaultName: string
  species: string
  /** 画哪一套形体，见 {@link PetArtKey} */
  art: PetArtKey
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
  art: 'penguin',
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
    // 往届的两句：说的都是「那时候」，没有一句指向「以后」——
    // 一旦出现将来时（等你、再来），它就从回忆变成了一个还没完成的约定
    archived: [
      { clipKey: 'petline.penguinG1Archived0', text: '那一年，我们一起数了好多好多数呀' },
      { clipKey: 'petline.penguinG1Archived1', text: '想起那时候，我就很开心' },
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
  art: 'dragon',
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
    archived: [
      { clipKey: 'petline.dragonG1Archived0', text: '那一年读过的书，本龙都记着呢' },
      { clipKey: 'petline.dragonG1Archived1', text: '本龙在回忆里也很好，有诗作伴' },
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
  art: 'panda',
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
    archived: [
      { clipKey: 'petline.pandaG1Archived0', text: '那一年好开心呀，thank you！' },
      { clipKey: 'petline.pandaG1Archived1', text: '波波把那时候的单词都记住啦' },
    ],
  },
}

/**
 * 喵喵的配饰。
 *
 * 三件各占一个新槽位（脖子 → 背 → 头），**升一次多一件、位置还都不一样**——
 * 孩子不用比对细节就知道「它又变了」。同槽位换件（墨墨的小翅膀换大翅膀）
 * 对二年级这批一律不用：那要求她记得上一件长什么样。
 */
const CAT_COLLAR: StageAccessory = { slot: 'neck', kind: 'bell-collar', emoji: '🔔' }
const CAT_SATCHEL: StageAccessory = { slot: 'back', kind: 'satchel', emoji: '🎒' }

/**
 * 二年级 · 数学 · 曼基康矮脚猫「喵喵」
 * 性格：认真、爱数数、有点小得意——与团团同一套台词，见下。
 *
 * ⭐ **台词对象直接复用团团的**（同一个引用，不是复制一份文本）。
 * 团团那 19 句里没有一句提到「企鹅」或「团团」，全部是通用的数学口吻，
 * 换成猫照样成立；而复用同一个 `clipKey` 意味着**零新增音频**，
 * 音色也自动还是那个男童声。
 *
 * ⚠️ 复制文本再起一套新 key 是错的：那会白白多出 19 条 mp3，
 * 念的还是一模一样的话。
 */
const MUNCHKIN_G2: PetDefinition = {
  id: 'munchkin-g2',
  subject: 'math',
  gradeLevel: 'G2',
  defaultName: '喵喵',
  species: '矮脚猫',
  art: 'munchkin',
  // 与团团同色：进度条与徽章上的蓝是「数学」的颜色，不是「企鹅」的颜色。
  // 换一批伙伴就换一套配色，会让她每年重新学一遍「哪个颜色是哪一科」
  themeColor: '#63B3F2',
  stages: [
    EGG,
    { emoji: '🐱', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐈', accessories: [], scale: 0.95, label: '小矮脚猫' },
    { emoji: '🐈', accessories: [CAT_COLLAR], scale: 1.05, label: '数数喵' },
    { emoji: '🐈', accessories: [CAT_COLLAR, CAT_SATCHEL], scale: 1.12, label: '算术小能手' },
    {
      emoji: '🐈',
      accessories: [CAT_COLLAR, CAT_SATCHEL, { slot: 'head', kind: 'star-hat', emoji: '🎩' }],
      scale: 1.2,
      glow: true,
      label: '星星喵王',
    },
  ],
  personality: PENGUIN_G1.personality,
}

/**
 * 小白的配饰。红领巾 → 背上背一支毛笔 → 状元帽。
 *
 * 毛笔像背剑一样斜背在身后，是这一条线里辨识度最高的一件——
 * 领巾和帽子谁都有，「背着一支笔」只有它。
 */
const DOG_KERCHIEF: StageAccessory = { slot: 'neck', kind: 'kerchief', emoji: '🧣' }
const DOG_BRUSH: StageAccessory = { slot: 'back', kind: 'brush', emoji: '🖌️' }

/**
 * 二年级 · 语文 · 萨摩耶「小白」
 * 性格：话痨、爱讲故事、文绉绉——沿用墨墨的口吻。
 *
 * ⚠️ **有 9 句必须改写，不能像喵喵那样整套复用**：墨墨自称「本龙」，
 * 还会说「又长了一片鳞」「快看，本龙的角」。
 * 一只狗说这些话，孩子得到的是一条明确错误的信息，
 * 而不是「换了个伙伴」。改动只把自称与身体部位换掉，
 * 文绉绉的语气（今日、无妨、甚是、妙哉）原样保留——那才是这只伙伴的性格。
 *
 * 其余 10 句直接复用墨墨的片段，一条新音频都不多花。
 */
const SAMOYED_G2: PetDefinition = {
  id: 'samoyed-g2',
  subject: 'pinyin',
  gradeLevel: 'G2',
  defaultName: '小白',
  species: '萨摩耶',
  art: 'samoyed',
  themeColor: '#A78BFA',
  stages: [
    EGG,
    { emoji: '🐶', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐕', accessories: [], scale: 0.95, label: '小萨摩耶' },
    { emoji: '🐕', accessories: [DOG_KERCHIEF], scale: 1.05, label: '识字小白' },
    { emoji: '🐕', accessories: [DOG_KERCHIEF, DOG_BRUSH], scale: 1.12, label: '小书童' },
    {
      emoji: '🐕',
      accessories: [DOG_KERCHIEF, DOG_BRUSH, { slot: 'head', kind: 'scholar-hat', emoji: '👑' }],
      scale: 1.2,
      glow: true,
      label: '状元汪',
    },
  ],
  personality: {
    catchphrase: { clipKey: 'petline.dragonG2Catchphrase', text: '我又学会一个字啦！' },
    greet: [
      { clipKey: 'petline.dragonG2Greet0', text: '今日我也要读书！' },
      DRAGON_G1.personality.greet[1]!, // 来听我念诗吗？
      DRAGON_G1.personality.greet[2]!, // 你来啦，我正读到精彩处～
      DRAGON_G1.personality.greet[3]!, // 今天学什么字呀？
    ],
    correct: [
      DRAGON_G1.personality.correct[0]!, // 妙哉妙哉！
      { clipKey: 'petline.dragonG2Correct1', text: '我都要记下来了！' },
      DRAGON_G1.personality.correct[2]!, // 读得真好听～
      { clipKey: 'petline.dragonG2Correct3', text: '你比我还厉害！' },
    ],
    wrong: [
      DRAGON_G1.personality.wrong[0]!, // 无妨无妨，再想想
      DRAGON_G1.personality.wrong[1]!, // 这个字确实难写
      { clipKey: 'petline.dragonG2Wrong2', text: '我当年也念错过～' },
      DRAGON_G1.personality.wrong[3]!, // 慢慢来，不着急
    ],
    levelUp: [
      { clipKey: 'petline.dragonG2LevelUp0', text: '我长大了！' },
      // 「毛又白了一点」是萨摩耶版的「又长了一片鳞」——
      // 都是拿身体上真实存在的东西说事，孩子低头就能在图上找到
      { clipKey: 'petline.dragonG2LevelUp1', text: '毛又白了一点～' },
      { clipKey: 'petline.dragonG2LevelUp2', text: '快看快看，我又变啦！' },
    ],
    comeback: [
      { clipKey: 'petline.dragonG2Comeback0', text: '好久不见，我甚是想念' },
      DRAGON_G1.personality.comeback[1]!, // 你终于回来啦！
      DRAGON_G1.personality.comeback[2]!, // 这几日无人听我念书～
    ],
    // 两句都带「本龙」，只换自称，文绉绉的语气原样留着
    archived: [
      { clipKey: 'petline.dragonG2Archived0', text: '那一年读过的书，我都记着呢' },
      { clipKey: 'petline.dragonG2Archived1', text: '我在回忆里也很好，有诗作伴' },
    ],
  },
}

/**
 * 咩咩的配饰。圆眼镜 → 云朵披风 → 花环。
 *
 * 披风用羊毛的形状再做一遍，是「它自己身上长出来的东西」；
 * 花环给最终形态，配上光效正好是一圈彩虹。
 */
const SHEEP_SPECS: StageAccessory = { slot: 'face', kind: 'specs', emoji: '👓' }
const SHEEP_CAPE: StageAccessory = { slot: 'back', kind: 'cloud-cape', emoji: '🧥' }

/**
 * 二年级 · 英语 · 小绵羊「咩咩」
 * 性格：好奇、爱模仿、中英夹杂——沿用波波的口吻。
 *
 * ⚠️ 有 5 句要改：波波的台词里会自称「波波」，那是名字不是物种，
 * 换成「我」即可。中英夹杂的部分全部原样保留——
 * 那些 `Hello` `Yes` `Wow` 是语气词、是这只伙伴的性格，
 * 不是教学内容（真正要教发音的词在 `en.*` 片段里）。
 */
const SHEEP_G2: PetDefinition = {
  id: 'sheep-g2',
  subject: 'english',
  gradeLevel: 'G2',
  defaultName: '咩咩',
  species: '小绵羊',
  art: 'sheep',
  themeColor: '#5FD3A6',
  stages: [
    EGG,
    { emoji: '🐑', accessories: [EGGSHELL], scale: 0.9, label: '破壳' },
    { emoji: '🐑', accessories: [], scale: 0.95, label: '小绵羊' },
    { emoji: '🐑', accessories: [SHEEP_SPECS], scale: 1.05, label: '单词小羊' },
    { emoji: '🐑', accessories: [SHEEP_SPECS, SHEEP_CAPE], scale: 1.12, label: '云朵羊' },
    {
      emoji: '🐑',
      accessories: [SHEEP_SPECS, SHEEP_CAPE, { slot: 'head', kind: 'flower-crown', emoji: '🌸' }],
      scale: 1.2,
      glow: true,
      label: '彩虹羊',
    },
  ],
  personality: {
    catchphrase: PANDA_G1.personality.catchphrase, // This is 好吃的！
    greet: [
      PANDA_G1.personality.greet[0]!, // Hello！今天学什么？
      { clipKey: 'petline.pandaG2Greet1', text: '我想学新单词！' },
      PANDA_G1.personality.greet[2]!, // Hi～你来啦！
      PANDA_G1.personality.greet[3]!, // Let's go！我们开始吧
    ],
    correct: PANDA_G1.personality.correct, // 四句都不带名字，整池复用
    wrong: [
      PANDA_G1.personality.wrong[0]!, // Oh no～再试试
      PANDA_G1.personality.wrong[1]!, // 没关系 no problem
      { clipKey: 'petline.pandaG2Wrong2', text: '我也常常记错～' },
      PANDA_G1.personality.wrong[3]!, // Try again！
    ],
    levelUp: [
      { clipKey: 'petline.pandaG2LevelUp0', text: '我长大了！' },
      PANDA_G1.personality.levelUp[1]!, // I am 变大了！
      PANDA_G1.personality.levelUp[2]!, // 快看看我～
    ],
    comeback: [
      PANDA_G1.personality.comeback[0]!, // 好久不见，I miss you～
      { clipKey: 'petline.pandaG2Comeback1', text: '你回来啦！我好开心' },
      { clipKey: 'petline.pandaG2Comeback2', text: '我一直在等你哦' },
    ],
    archived: [
      PANDA_G1.personality.archived[0]!, // 那一年好开心呀，thank you！——不带名字，直接复用
      { clipKey: 'petline.pandaG2Archived1', text: '我把那时候的单词都记住啦' },
    ],
  },
}

/**
 * 全部宠物定义。
 *
 * 新增年级时在这里追加三只即可——成长逻辑、仓储都不需要改动，
 * UI 只需给新物种加一套 Art 组件并登记进 `PetAvatar` 的 `ART_BY_KEY`。
 */
export const PET_DEFINITIONS: readonly PetDefinition[] = [
  PENGUIN_G1,
  DRAGON_G1,
  PANDA_G1,
  MUNCHKIN_G2,
  SAMOYED_G2,
  SHEEP_G2,
]

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
 *
 * 二年级**只开数学**（64 个知识点，上下册一次做全）。小白和咩咩要睡上一阵子，
 * 这正是本机制存在的理由——二年级语文的「教 vs 练」、英语的新句型
 * 都还是没想清楚的产品决策，硬开出来只会让她点进去发现一片空白。
 * 见 design/08 §10 阶段 8.0。
 */
const OPENED: ReadonlySet<string> = new Set([
  KEY('math', 'G1'),
  KEY('pinyin', 'G1'),
  KEY('english', 'G1'),
  KEY('math', 'G2'),
])

/**
 * 这个科目在这个年级有内容了吗。
 *
 * @example
 * isOpened('math', 'G2')     // true
 * isOpened('pinyin', 'G2')   // false —— 二年级语文还没做，小白在睡觉
 */
export function isOpened(subject: Subject, gradeLevel: GradeLevel): boolean {
  return OPENED.has(KEY(subject, gradeLevel))
}

/**
 * 某个年级已开放的科目，按 `SUBJECT_ORDER` 之外的固定顺序（宠物定义顺序）排列。
 *
 * @example
 * openedSubjectsOf('G1')   // ['math', 'pinyin', 'english']
 * openedSubjectsOf('G2')   // ['math'] —— 小白与咩咩还在睡觉
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
