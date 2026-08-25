/**
 * @file 语音片段清单 —— 「有哪些片段、每个片段念什么」的唯一事实源
 * @layer data  静态内容，随 App 版本内置
 * @see design/07-音频方案.md
 * @see src/domain/speech.ts        片段怎么组成一句话
 * @see scripts/generate-voices.mjs 按本清单批量生成 mp3
 *
 * ⭐ 生成脚本和运行时读的是**同一份清单**。
 *
 * 如果生成脚本自己维护一份「要生成哪些音频」的列表，它迟早会和代码里
 * 实际用到的片段对不上——多生成的是死文件（浪费体积），少生成的是**静音**
 * （孩子不识字，等于这道题做不了）。两边共用一份清单，
 * 再加上 `voiceManifest.test.ts` 校验「代码里用到的片段都在清单里」，
 * 这类漂移就不可能发生。
 */

import { ALL_ENGLISH_WORDS } from '@/data/seed/englishWords'
import { EXPLAINERS } from '@/data/seed/explainers'
import { nicknameClipFor, PET_SPEAKERS } from '@/domain/encourage/petSpeaker'
import { ALL_HANZI_CARDS } from '@/data/seed/hanziCards'
import { NICKNAME_PRESETS } from '@/data/seed/nicknamePresets'
import { PET_NAME_PRESETS } from '@/data/seed/petNamePresets'
import { PET_DEFINITIONS, PET_LINE_MOMENTS } from '@/data/seed/pets'
import { REAL_REWARD_PRESETS } from '@/data/seed/realRewards'
import { ROOM_ITEMS, TREAT_ITEMS } from '@/data/seed/shopItems'
import { ALL_SYLLABLES, syllableKey } from '@/data/seed/pinyinSyllables'
import { POEMS } from '@/data/seed/poems'
import { spokenText, wordKey } from '@/domain/english'
import { hanziClipKey, hanziSpokenText } from '@/domain/hanzi'
import {
  poemHeadSpokenText,
  poemLineClipKey,
  poemMeaningClipKey,
  poemTitleClipKey,
} from '@/domain/poem'

/** 每个片段：key → 要念的文本 */
export type VoiceManifest = Readonly<Record<string, string>>

/**
 * 数字 0~20，加两条位值片段。数学题的绝对主力，出现频率远超其他任何片段。
 *
 * ⭐ **位值片段念的是「百」「千」，不是「一百」「一千」**。
 * `num()` 把 300 拼成 `num.3` + `num.hundred`，片段若念「一百」就成了「三一百」。
 * 也正因为文本不等于 key 里的数字，这两条才没有并进上面那个 `Array.from`——
 * 混进去会被下一个人「顺手」改成 `String(n)`，而错法只有听才发现。
 * 见 `domain/speech.ts` 的 `num()`。
 */
const NUMBERS: VoiceManifest = {
  ...Object.fromEntries(Array.from({ length: 21 }, (_, n) => [`num.${n}`, String(n)])),
  'num.hundred': '百',
  'num.thousand': '千',
}

/**
 * 运算词。
 *
 * 单独念「加」而不是把整个算式录成一条，是这套方案能成立的关键：
 * 8×8 种进位加法组合只要 `num` + `op` 两类片段就能全部拼出来。
 */
const OPERATORS: VoiceManifest = {
  'op.plus': '加',
  'op.minus': '减',
  'op.equals': '等于',
  'op.and': '和',
  'op.he': '合起来是',
  // —— 二年级：乘除法。加这两条就够整个表内乘除法用，题干骨架复用
  //    现成的 `phrase.equalsWhat`——这正是 §4.2 说的「只换那个动词」
  'op.times': '乘',
  'op.dividedBy': '除以',
  /**
   * 有余数除法答案里的「余」（`3 余 1`）。⚠️ 孤立单字，同 `phrase.at`、
   * `phrase.unitGe`——生成后要复听，读飘就进 `TAIL_FIX_KEYS`。
   * 加这一条是为了让答错反馈能拼出完整答案，而不是整句降级成 TTS。
   */
  'op.remainder': '余',
  /**
   * 带括号的混合运算念作「20 减 左括号 5 加 3 右括号 等于几」。
   *
   * 念「5 加 3 的和」更像人话，但那要给每种外层运算各配一句尾巴
   * （的和 / 的差 / 倍…），而念括号只要两条片段，且**和屏幕上的算式一一对应**——
   * 她正在学的就是「看见括号先算里面」，听到「括号」两个字是对的提示。
   */
  'op.parenL': '左括号',
  'op.parenR': '右括号',
  // —— 二年级：计量单位。「3 米等于几厘米」的骨架是
  //    num + 单位 + `phrase.equalsWhat` + 单位，等于几那句直接复用加减法的
  'unit.m': '米',
  'unit.cm': '厘米',
  'unit.kg': '千克',
  'unit.g': '克',
  'unit.hour': '时',
  'unit.min': '分',
  // 比较符号的名字（M1.6/M1.8）：屏幕上是「>」，念出来是「大于号」——
  // 裸符号喂给 TTS 读不读、怎么读全凭运气
  'op.greaterSign': '大于号',
  'op.lessSign': '小于号',
  'op.equalsSign': '等于号',
}

/**
 * 固定短语。
 *
 * ⚠️ 加新短语时**优先复用已有的**：短语越少，拼接的自然度越一致。
 * 与其加「把它们从大到小排好」，不如拆成 `phrase.arrange` + `phrase.descending`。
 */
const PHRASES: VoiceManifest = {
  // —— 题干
  'phrase.equalsWhat': '等于几',
  'phrase.howMany': '有几个',
  'phrase.countThem': '数一数',
  'phrase.noneAtAll': '一个也没有，是几个',
  'phrase.canSplitInto': '可以分成',
  'phrase.andWhat': '和几',
  'phrase.togetherIsWhat': '合起来是几',
  'phrase.whatSymbol': '中间该填什么符号',
  'phrase.whichBigger': '哪个更大',
  'phrase.arrangeAsc': '请把这些数从小到大排好',
  'phrase.arrangeDesc': '请把这些数从大到小排好',
  'phrase.connectPairs': '把左边和右边连起来，每一组合起来都要是',
  'phrase.splitIntoTwo': '分成两份',
  'phrase.oneGoesTo': '一份补给',
  'phrase.toMakeTen': '凑成 10',
  'phrase.theRestLeft': '另一份剩下',
  'phrase.takeToSubtract': '一份拿来减',
  'phrase.hasOneTenAnd': '里面有 1 个十和几个一',
  'phrase.firstSplit': '先把',
  'phrase.intoAndWhat': '分成几和几',
  'phrase.firstCompute': '先算',
  'phrase.splitInto': '分成',

  // —— 题干：乘除法求未知数（M2-4 / M2-9）。
  //    「3 乘几等于 12」不拆成「乘」+「几」+「等于」三条：孤立的单字「几」
  //    读起来会飘（同 phrase.at 的教训），三字短语的韵律稳得多
  'phrase.timesWhatEquals': '乘几等于',
  'phrase.dividedByWhatEquals': '除以几等于',
  'phrase.equalsWhatRemainder': '等于几余几',
  /** 只问余数那一档（商已给出）：「13 除以 4 等于 3 余几」 */
  'phrase.remainderWhat': '余几',
  // 量感题（M2-1.4 / M2-14.3）。长短和轻重各一条，因为它们接的量词不同
  'phrase.whichIsAboutLong': '哪个大约长',
  'phrase.whichIsAboutHeavy': '哪个大约重',

  // —— 题干：数序 / 比较 / 数位（M1.x）
  'phrase.afterIsWhat': '的后面是几',
  'phrase.beforeIsWhat': '的前面是几',
  'phrase.betweenIsWhat': '中间是几',
  'phrase.compareWhatSymbol': '比，中间该填什么符号',
  'phrase.tensDigitWhat': '的十位上是几',
  'phrase.onesDigitWhat': '的个位上是几',
  // —— 二年级：万以内数的读写与组成（M2-13.x）
  'phrase.hundredsDigitWhat': '的百位上是几',
  'phrase.thousandsDigitWhat': '的千位上是几',
  'phrase.writtenAsWhat': '写作几',
  /**
   * ⭐ 只说「这个数」，**不念题干里的那个数**——念出来就等于把答案告诉她了。
   * 同 `phrase.toneMark1` 的处理：考写法的题，题干只能给提示语。
   */
  'phrase.howToReadThis': '这个数读作什么',
  'phrase.countOnes': '个一',
  'phrase.countTens': '个十',
  'phrase.countHundreds': '个百',
  'phrase.countThousands': '个千',
  'phrase.aboutHowManyHundreds': '大约是几百',
  'phrase.aboutHowManyThousands': '大约是几千',

  // —— 题干：序数与位置（M1.4 / M2.x）
  // ⚠️ 'phrase.at' 是孤立单字「在」，生成后要复听，读飘就进 TAIL_FIX_KEYS
  'phrase.fromLeftCount': '从左边数',
  'phrase.fromRightCount': '从右边数',
  'phrase.rankWhich': '排第几',
  // —— 二年级数学广角（M2-7 搭配 · M2-15 推理）
  //    搭配题固定「上衣配裤子」、排列题只用数字，都不做物品词表：
  //    换成十几种物品要十几条 mp3，换来的只是题干看着热闹一点
  'phrase.topsAnd': '件上衣和',
  'phrase.bottomsHowMany': '条裤子，一共有几种穿法',
  'phrase.usingTheseDigits': '用这几个数字',
  'phrase.howManyTwoDigits': '能组成几个不同的两位数',
  'phrase.animalsLineUp': '小动物们排成一排',
  'phrase.isNotAt': '不排',
  'phrase.whoRanksAt': '谁排',
  'ord.first': '第一',
  'ord.second': '第二',
  'ord.third': '第三',
  'ord.fourth': '第四',
  'phrase.at': '在',
  'phrase.whatPosition': '的什么位置',

  // —— 题干：情境题（M4.1/M4.3/M9.x）。'phrase.unitGe' 同上，孤立「个」要复听
  'phrase.leftHas': '左边有',
  'phrase.rightHas': '右边有',
  'phrase.unitGe': '个',
  'phrase.altogetherHowMany': '一共有几个',
  'phrase.originallyHas': '原来有',
  'phrase.tookAway': '拿走了',
  // ⭐ 只为换一种说法而加的动词，见 data/seed/storyFrames.ts：
  //    骨架不动、只换动词，是加句式最省语音的做法
  'phrase.thenCame': '又来了',
  /** ⚠️ 只配 `edible` 的物品——「吃掉了 3 颗星星」不成话 */
  'phrase.ateUp': '吃掉了',
  'phrase.howManyLeft': '还剩几个',
  // ⭐ 二年级文字应用题（M2-2.6 / 9.6 / 11.4 / 12.4）。
  //    尽量复用一年级已有的收尾句：「又来了」「吃掉了」「还剩几个」
  //    「一共有几个」四条一条没新加，只补了各自开头那半句
  'phrase.shareEqually': '平均分给',
  // 「几个几」的平均分（M2-9.1）。分的是「份」不是「小朋友」，
  // 因此不能复用上面那条——图上是几个圈，说「分给几个小朋友」对不上图
  'phrase.equallyIntoParts': '平均分成',
  'phrase.partsEachHowMany': '份，每份几个',
  'phrase.kidsEachGets': '个小朋友，每人分几个',
  'phrase.kidsShareEqually': '个小朋友平均分，每人分几个',
  'phrase.perBoxCanPack': '个装一盒，能装几盒',
  'phrase.perGroupCanMake': '个分一组，能分几组',
  'phrase.xiaomingHas': '小明有',
  'phrase.xiaohongMore': '小红比他多',
  'phrase.xiaohongLess': '小红比他少',
  'phrase.xiaohongHasHowMany': '小红有几个',
  /** ⚠️ 孤立单字，同 `phrase.unitGe`——生成后要复听 */
  'phrase.boxesOf': '盒',
  'phrase.eachBoxHas': '每盒有',
  'phrase.kidsTakeBoat': '个小朋友坐船，每条船坐',
  'phrase.atLeastBoats': '个，至少要几条船',
  'phrase.eachBoxHolds': '每个盒子装',
  'phrase.atLeastBoxes': '个，至少要几个盒子',
  'phrase.topMoreHowMany': '上面比下面多几个',
  'phrase.questionGroupHas': '问号那一组有几个',
  'phrase.whichEquationFits': '哪个算式说的是这幅图',

  // —— 题干：图形（M7.x）
  'phrase.whichIs': '哪个是',
  'phrase.sameKindSolid': '哪个和它一样，也是立体图形',
  'phrase.sameKindPlane': '哪个和它一样，也是平面图形',
  'phrase.howManyBlocks': '一共有几块积木',
  'phrase.howManyInPicture': '图里有几个',
  // —— 二年级：角（M2-3.x）。图形名复用 word.* 那一批，这里只加问句
  'phrase.howManyCorners': '有几个角',
  'phrase.totalCornersHowMany': '一共有几个角',
  'phrase.whichRightAngle': '哪个是直角',
  'phrase.whichAcuteAngle': '哪个是锐角',
  'phrase.whichObtuseAngle': '哪个是钝角',

  // —— 题干：钟表（M8.x）。认指针题的分钟恒为 0，只需「点整」；
  //    「点半」给答错反馈念半时答案用（M8.3）
  'phrase.whatTimeNow': '现在是几点',
  'phrase.whichClockShows': '哪个钟面是',
  'phrase.oclockSharp': '点整',
  'phrase.halfPast': '点半',
  // —— 二年级「几时几分」（M2-6.x）。「3 点 15 分」= 3 + 点 + 15 + 分，
  //    末尾的「分」复用单位换算那条 `unit.min`
  /** ⚠️ 孤立单字，同 `phrase.at`——生成后要复听，读飘就进 `TAIL_FIX_KEYS` */
  'phrase.oclock': '点',
  'phrase.minuteHandAt': '分针指着',
  'phrase.howManyMinutes': '是多少分',
  'phrase.afterMinutes': '再过',
  'phrase.whatTimeThen': '分是几点几分',

  // —— 题干：拼音固定题干（P 系列，整句一条，不拼接）
  'phrase.oddInitial': '点一点听一听，哪个的声母和其他三个不一样',
  'phrase.oddFinal': '点一点听一听，哪个的韵母和其他三个不一样',
  'phrase.oddTone': '点一点听一听，哪个的声调和其他三个不一样',
  'phrase.pickPinyin': '这是什么，选出它的拼音',
  'phrase.whichIntegral': '哪个是整体认读音节，就是不能拆开拼的那个',
  /**
   * ⭐ 念的是「迂」不是「ü」：喂裸字母给中文 TTS 读音全凭运气（§3.3 的教训），
   * 而 ü 的呼读音正是 yū，「迂」是它唯一的常用一声载体字。
   * 前半个音（j/q/x/y 的呼读音）由拼音片段（pinyin.ji1 等）拼在前面。
   */
  'phrase.umlautAsk': '和迂拼在一起，应该怎么写',
  /**
   * ⭐ 说「这个音节」而不念题干里的裸拼音（hao/jia…）：
   * 裸拼音喂给 TTS 会读错声调——P3.4 考的是标调位置，音节写在屏幕上即可。
   * 四个声调各一条整句，不用「第 + 数字 + 声」拼接——整句韵律更稳。
   */
  'phrase.toneMark1': '这个音节读第一声，声调该标在哪里',
  'phrase.toneMark2': '这个音节读第二声，声调该标在哪里',
  'phrase.toneMark3': '这个音节读第三声，声调该标在哪里',
  'phrase.toneMark4': '这个音节读第四声，声调该标在哪里',
  // —— 记忆翻牌（E1.6 / E1.9）
  'phrase.matchUpperLower': '把大写和小写配成一对',
  'phrase.matchLetterWord': '把字母和它开头的东西配成一对',

  // —— 首页问候。时段词拼在「今天想学点什么」前面，见 domain/encourage/timeOfDay.ts
  'phrase.whatToLearn': '今天想学点什么',
  'phrase.goodMorning': '早上好呀',
  'phrase.goodNoon': '中午好呀',
  'phrase.goodAfternoon': '下午好呀',
  'phrase.goodEvening': '晚上好呀',
  /** 一年只播一天。⚠️ 生日不给任何奖励，见 domain/encourage/birthdayLine.ts */
  'phrase.happyBirthday': '生日快乐',

  // —— 反馈（答对轮换用，避免每次同一句）
  'phrase.praise1': '太棒了',
  'phrase.praise2': '答对啦',
  'phrase.praise3': '真厉害',
  'phrase.praise4': '就是这样',
  'phrase.praise5': '好厉害呀',
  'phrase.lookAgain': '再看看，答案是',
  // 有伙伴安慰语在前时接的后半句：「（安慰），答案是 X」
  'phrase.answerIs': '答案是',

  // —— 升级（拼在小结后面，合成一句话说完）
  'phrase.transformed': '变身啦',
  'phrase.leveledTo': '升到',
  'phrase.levelUnit': '级啦',

  // —— 小结
  'phrase.allCorrect': '全部答对，太棒了',
  'phrase.nothingToday': '今天没有需要练习的内容',
  'phrase.youGot': '答对了',
  'phrase.questions': '题',
  'phrase.reviewWrong': '我们一起看看错的题目',
  'phrase.roundDone': '这一轮完成啦',

  // —— 摸底测评
  'phrase.keepGoing': '走对啦，继续往前',
  'phrase.tooHardHere': '这里有点难，我们回头再来',
  'phrase.finishedAll': '你全部都走完了，太厉害了',
  'phrase.startHere': '找到啦，我们从这里开始练习',

  // —— 商店庆祝语的后半句（拼在商品名后面，合成一句话说完）。
  //    ⚠️ 文本必须与 `domain/economy/celebrationLine.ts` 的 TAIL 逐字一致，
  //    由 celebrationLine.test.ts 校验。对不上会「屏幕写着 A、耳朵听到 B」
  'phrase.itsYours': '是你的啦',
  'phrase.feastThanks': '大家一起吃，谢谢你',
  'phrase.toldParents': '已经告诉爸爸妈妈啦',
}

/**
 * 名词片段。
 *
 * 与三份 domain 清单一一对应，**改那边必须同步这边**（漂移由
 * `voiceManifest.test.ts` 的生成器采样用例兜底抓出）：
 * - `domain/generators/countables.ts` 的 COUNTABLES / ORDINAL_LINEUP / SPATIAL_PAIRS
 * - `domain/generators/shapeKinds.ts` 的图形名（key 直接用图形 kind：`word.cube`）
 * - `domain/generators/position.ts` 的方位词（选项点读与错题本用）
 *
 * ⚠️ 单字词（花/球/圆）是孤立短音，声调可能读飘（见 §3.3 拼音的教训），
 * 生成后要复听；读不稳就在生成脚本的 TAIL_FIX_KEYS 里补尾随逗号。
 */
const WORDS: VoiceManifest = {
  // —— 可数物体（COUNTABLES）
  'word.apple': '苹果',
  'word.cat': '小猫',
  'word.star': '星星',
  'word.flower': '花',
  'word.car': '小汽车',
  'word.fish': '小鱼',
  'word.strawberry': '草莓',
  'word.balloon': '气球',
  'word.duck': '小鸭子',
  'word.rabbit': '小兔子',
  'word.cookie': '饼干',
  'word.sunflower': '向日葵',
  // —— 序数队伍（ORDINAL_LINEUP）
  'word.dog': '小狗',
  'word.bear': '小熊',
  'word.panda': '熊猫',
  'word.fox': '小狐狸',
  'word.frog': '小青蛙',
  'word.pig': '小猪',
  // —— 位置题的参照物与目标（SPATIAL_PAIRS）
  'word.tree': '大树',
  'word.house': '房子',
  'word.chair': '椅子',
  'word.box': '箱子',
  'word.bird': '小鸟',
  'word.teddy': '玩具熊',
  'word.ball': '皮球',
  'word.butterfly': '蝴蝶',
  // —— 方位词（M2.x 选项）
  'word.above': '上面',
  'word.below': '下面',
  'word.front': '前面',
  'word.behind': '后面',
  'word.left': '左边',
  'word.right': '右边',
  // —— 图形名（M7.x，key 与 shapeKinds 的 kind 同名）
  'word.cube': '正方体',
  'word.cuboid': '长方体',
  'word.cylinder': '圆柱',
  'word.sphere': '球',
  'word.square': '正方形',
  'word.rect': '长方形',
  'word.triangle': '三角形',
  'word.circle': '圆',
}

/**
 * 拼音音节。
 *
 * ⭐ 朗读内容优先用**汉字载体**而不是拼音串：Edge TTS 是文本转语音，
 * 喂「八」必然读对，喂「bā」只能靠它猜。没有载体字的音节退回念拼音本身，
 * 那些必须人工试听确认，见 `pinyinSyllables.ts` 的 `SYLLABLES_NEEDING_REVIEW`。
 */
const PINYIN: VoiceManifest = Object.fromEntries(
  ALL_SYLLABLES.map((s) => [syllableKey(s.base, s.tone), s.char ?? s.pinyin]),
)

/**
 * 英语词、短语与字母。
 *
 * ⚠️ **必须用英语音色生成**，这是与其他所有分组的关键差别：
 * 中文音色念 `apple` 得到的是一个孩子听不懂、也学不对的音。
 * 生成脚本按 `en.` 前缀切音色，见 `scripts/generate-voices.mjs`。
 *
 * 与拼音相反，英语**不需要发音载体**：喂英文单词给英语音色是母语场景，
 * 必然读对。唯一要人工试听的是字母——孤立的 `A` 有可能被读成冠词而非字母名，
 * 见 `englishLetters.ts`。
 */
const ENGLISH: VoiceManifest = Object.fromEntries(
  ALL_ENGLISH_WORDS.map((word) => [wordKey(word), spokenText(word)]),
)

/**
 * 识字卡的 300 个字（3 辑 × 100）。
 *
 * ⭐ 念的是「天。蓝天的天。」而**不是孤立的「天」**——理由见 `domain/hanzi.ts`
 * 的 {@link hanziSpokenText}：孤立单字既挑不准多音字的读音，声调也读得发飘。
 * 这是拼音那边用学费换来的同一条结论，只是那边的解法是换汉字载体，
 * 这边的解法是把字放进一句话里。
 *
 * ⚠️ 用**默认的中文少女声**，不走拼音那套播音音色：这里念的是完整句子，
 * 少女声在句子上一向稳，而亲切感对识字这种反复翻看的内容更重要。
 */
const HANZI: VoiceManifest = Object.fromEntries(
  ALL_HANZI_CARDS.map((card) => [hanziClipKey(card.char), hanziSpokenText(card)]),
)

/**
 * 古诗：诗题、逐句、译文。
 *
 * ⭐ **一句一条**而不是整首一条。整首朗读由播放器把这些片段按顺序排出来
 * （见 `domain/poem.ts` 的 `poemLineClipKeys`），单句朗读直接取其中一条——
 * 同一份素材两种用法，不必为整首再合成一遍。
 *
 * ⚠️ 念的是 `line.spoken ?? line.text`：极少数句子送去合成的文本与屏幕上的原文
 * **不同**（「曲项」喂「屈项」、「见牛羊」喂「现牛羊」），
 * 因为 TTS 会把这些古音字念成现代常用音。见 `poems.ts` 文件头。
 * 抓错字段的话，孩子听到的就是错的读音，而屏幕上一切正常。
 */
const POEM_LINES: VoiceManifest = Object.fromEntries(
  POEMS.flatMap((poem) => [
    // ⭐ 诗题那一条念的是「静夜思。唐，李白。」整句 —— 读整首从它开始。
    //    走 poemHeadSpokenText 而不是 poemHeadText：诗名与作者里的多音字
    //    （咏华山的华 huà、汉乐府的乐 yuè）只有换字才念得对，见 domain/poem.ts
    [poemTitleClipKey(poem.id), poemHeadSpokenText(poem)] as const,
    ...poem.lines.map(
      (line, index) => [poemLineClipKey(poem.id, index), line.spoken ?? line.text] as const,
    ),
    [poemMeaningClipKey(poem.id), poem.meaning] as const,
  ]),
)

/**
 * 三只伙伴的**默认**名字。
 *
 * 与昵称同一个套路：孩子给宠物改过名就没有专属片段，整句降级为 TTS；
 * 没改过（绝大多数情况）就是少女音，和小结语拼成完整的一句话。
 *
 * ⚠️ 这里的文本必须与 `data/seed/pets.ts` 的 `defaultName` 逐字一致，
 * 由 `pets.test.ts`「每只宠物的默认名都有语音片段」强制校验——
 * 对不上的后果是升级那一句忽然变成机器音，而且只在升级时才暴露。
 */
const PET_NAMES: VoiceManifest = {
  'pet.tuantuan': '团团',
  'pet.momo': '墨墨',
  'pet.bobo': '波波',
}

/**
 * 起名选择器的共享候选池（petname.*）。
 *
 * 起名只能从「默认名 + 这个池子」里挑（PetNamePicker），
 * 因此**改过名的宠物照样有专属片段**——升级那句再也不会降级成机器音。
 */
const PET_NAME_PRESET_CLIPS: VoiceManifest = Object.fromEntries(
  PET_NAME_PRESETS.map((preset) => [preset.clipKey, preset.text]),
)

/**
 * 查宠物名的专属片段：默认名（pet.*）与预设候选名（petname.*）都在内。
 *
 * 起名改成预设选择器之后正常路径永远查得到；查不到只剩一种情况——
 * 旧档案里遗留的自由输入名字，那时调用方应整句走 TTS（绝不混播）。
 *
 * @param name - 宠物当前的名字
 * @returns 片段 key；旧档案的自由输入名返回 `undefined`
 *
 * @example
 * petNameClipKey('团团')   // 'pet.tuantuan'
 * petNameClipKey('毛毛')   // 'petname.maomao'
 * petNameClipKey('阿旺')   // undefined —— 改版前用键盘起的名字
 */
export function petNameClipKey(name: string): string | undefined {
  const trimmed = name.trim()
  return (
    Object.keys(PET_NAMES).find((key) => PET_NAMES[key] === trimmed) ??
    PET_NAME_PRESETS.find((preset) => preset.text === trimmed)?.clipKey
  )
}

/**
 * 昵称。
 *
 * ⭐ 唯一一组「内容由家长决定」的片段：孩子听到的是自己的名字，
 * 而不是「小朋友」。只有 {@link NICKNAME_PRESETS} 里的昵称有专属音频，
 * 其余昵称（旧档案遗留）整句降级为实时 TTS。
 * 为什么不混播见 `nicknamePresets.ts` 的文件头。
 *
 * ⭐ **每个昵称按音色生成四份**：旁白一份 + 三只伙伴各一份
 * （`name.xiaoenbao` / `name.penguinXiaoenbao` / …）。
 * 宠物用自己的音色说「小恩宝，我有点想你」时，名字也必须是它的声音——
 * 一句话一个音色。变体的挑选逻辑在 `domain/encourage/petSpeaker.ts`，
 * key 的构造规则与生成脚本的 `loadNicknames()` 逐字一致。
 */
const NICKNAMES: VoiceManifest = Object.fromEntries(
  NICKNAME_PRESETS.flatMap((preset) => [
    [preset.clipKey, preset.text] as const,
    ...PET_SPEAKERS.map(
      (speaker) => [nicknameClipFor(preset.clipKey, speaker), preset.text] as const,
    ),
  ]),
)

/**
 * 宠物台词。
 *
 * ⭐ 台词是**静态内容**，因此完全可以预生成——这一点直到接入答对反馈时才显出分量：
 * 那个位置每题必播，机器音在那里格外刺耳。
 * 台词与它的 clipKey 写在一起（见 `pets.ts` 的 `PetLine`），这里只是摊平。
 */
const PET_LINES: VoiceManifest = Object.fromEntries(
  PET_DEFINITIONS.flatMap((def) => [
    [def.personality.catchphrase.clipKey, def.personality.catchphrase.text] as const,
    ...PET_LINE_MOMENTS.flatMap((moment) =>
      def.personality[moment].map((line) => [line.clipKey, line.text] as const),
    ),
  ]),
)

/**
 * 讲解脚本。
 *
 * ⭐ 这里是全 App 最该用真人音色的地方：讲解的全部价值在于「听懂原理」，
 * 而机械合成音念一段三十来个字的推理，孩子听两句就走神了——
 * 那道讲解就白做了。脚本是静态内容，整句预生成没有任何障碍。
 */
const EXPLAINER_LINES: VoiceManifest = Object.fromEntries(
  [...EXPLAINERS.values()].flatMap((explainer) => [
    [explainer.titleClipKey, explainer.title] as const,
    ...explainer.steps.map((step) => [step.clipKey, step.ttsText] as const),
  ]),
)

/**
 * 商店商品名（shop.*）。
 *
 * ⭐ 孩子不识字，**商品名必须能朗读**——这也正是现实券只能从预设里挑、
 * 家长不能自由输入的原因：自由输入的名字没有预生成音频，只能整句降级
 * 成实时 TTS，和同一页里其余的少女音混在一起。
 * 绝不做「片段 + TTS 混播」（design/07 §2.5b），与昵称、宠物名同一条铁律。
 */
const SHOP_ITEMS: VoiceManifest = Object.fromEntries([
  ...ROOM_ITEMS.map((item) => [item.clipKey, item.label] as const),
  ...TREAT_ITEMS.map((item) => [item.clipKey, item.label] as const),
  ...REAL_REWARD_PRESETS.map((preset) => [preset.clipKey, preset.label] as const),
])

/**
 * 全部语音片段。
 *
 * 当前约 {@link VOICE_CLIP_COUNT} 条，三科齐全。
 */
export const VOICE_MANIFEST: VoiceManifest = {
  ...NUMBERS,
  ...OPERATORS,
  ...PHRASES,
  ...WORDS,
  ...PINYIN,
  ...HANZI,
  ...POEM_LINES,
  ...ENGLISH,
  ...NICKNAMES,
  ...PET_NAMES,
  ...PET_NAME_PRESET_CLIPS,
  ...PET_LINES,
  ...EXPLAINER_LINES,
  ...SHOP_ITEMS,
}

export const VOICE_CLIP_COUNT = Object.keys(VOICE_MANIFEST).length

/** 一句鼓励语：片段 key 与它念的文本 */
export interface PraiseClip {
  clipKey: string
  text: string
}

/**
 * 答对时轮换的鼓励语池。
 *
 * ⭐ 从 {@link PHRASES} 派生而不是另抄一份字符串数组。
 * 原先 `Feedback.tsx` 里就有一份手写的 `['太棒了！', …]`，和这里的
 * `phrase.praise*` 是两套各自维护的文本——加一句、改一个字都要记得改两处，
 * 而漏改的表现是「屏幕上写着 A、耳朵里听到 B」，谁也不会主动去核对。
 *
 * 加第 6 句只需在 PHRASES 里加 `'phrase.praise6'`，
 * 鼓励语池、预热清单、生成脚本会同时跟上。
 */
export const PRAISE_POOL: readonly PraiseClip[] = Object.entries(PHRASES)
  .filter(([key]) => key.startsWith('phrase.praise'))
  .map(([clipKey, text]) => ({ clipKey, text }))

/** 该片段是否在清单里。播放器据此决定播片段还是走 TTS 兜底 */
export function hasClip(key: string): boolean {
  return key in VOICE_MANIFEST
}

/**
 * 开场就该预热的片段。
 *
 * ⭐ 不预热会出现「有的数字没读出来」：片段按需加载，
 * 而新的朗读会打断加载中的片段，低频数字（如 15）经常整个被吞掉。
 * 这是孩子实测反馈的问题。
 *
 * ⚠️ 由 `App.tsx` 在**挂载时**就开始预取，不等第一次点击——
 * 解码本身要几十毫秒，等到点下去才开始，那一下就是「按了没反应」。
 * 手势里的 `unlockAllAudio` 会再传一次，`loadClip` 有缓存，重复无代价。
 *
 * 拼音音节与英语词不在此列（按需加载即可）：它们在一轮里只出现几个，
 * 而字母乐园那 26 条由 `LetterWall` 进页面时自己预取。
 */
export const WARMUP_CLIPS: readonly string[] = [
  ...Object.keys(NUMBERS),
  ...Object.keys(OPERATORS),
  'phrase.equalsWhat',
  'phrase.canSplitInto',
  'phrase.andWhat',
  'phrase.togetherIsWhat',
  // 鼓励语：每答对一题必播，比任何一个数字都高频。
  // 首次答对距离解锁只有十几秒，不预热的话第一声「太棒了」会迟到
  ...PRAISE_POOL.map((praise) => praise.clipKey),
  // 首页问候 —— 打开 App 听到的第一句话，最不该卡的就是它。
  // 昵称片段全预取（含三只伙伴音色的变体：答对反馈抽到宠物台词时马上要用），
  // 每条才十来 KB，全取比判断该取哪个省事
  ...Object.keys(NICKNAMES),
  'phrase.whatToLearn',
  'phrase.goodMorning',
  'phrase.goodNoon',
  'phrase.goodAfternoon',
  'phrase.goodEvening',
  'phrase.happyBirthday',
  // ⭐ 三只伙伴的全部台词。出现在两个「点了就该响」的位置：
  // 宠物页的见面语在挂载瞬间就播（等不了进页再取），
  // 答对反馈的轮换池里一半是台词（首次答对距开始只有十几秒）。
  // 57 条约 700KB，App 挂载时在首页停留的那几秒足够取完
  ...Object.keys(PET_LINES),
]

/**
 * 进入学习会话就该预取的片段（`LearningSession` 挂载时取）。
 *
 * 会话里**必然或大概率**要播、而首屏预热又覆盖不到的：
 * 答错反馈的引导语、小结语、升级播报的组装片段与宠物名字。
 * 不并进 WARMUP_CLIPS：没开始学习就不需要它们，首屏预热要保持「首屏必需」的语义。
 *
 * ⚠️ 本轮题目的题干/选项片段不在这里——它们随题而变，
 * 由 LearningSession 按 `items` 现算（见那边的预取 effect）。
 */
export const SESSION_CLIPS: readonly string[] = [
  // 答错反馈：「再看看，答案是 X」/「（伙伴安慰），答案是 X」
  'phrase.lookAgain',
  'phrase.answerIs',
  // 小结语（summaryLine.ts 的全部组装件）
  'phrase.allCorrect',
  'phrase.youGot',
  'phrase.questions',
  'phrase.reviewWrong',
  'phrase.roundDone',
  'phrase.nothingToday',
  // 升级播报（levelUpLine.ts：拼在小结语后面）+ 念得出任何一个宠物名字
  'phrase.transformed',
  'phrase.leveledTo',
  'phrase.levelUnit',
  ...Object.keys(PET_NAMES),
  ...PET_NAME_PRESETS.map((preset) => preset.clipKey),
]
