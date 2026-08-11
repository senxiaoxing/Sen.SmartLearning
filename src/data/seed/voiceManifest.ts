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
import { ALL_SYLLABLES, syllableKey } from '@/data/seed/pinyinSyllables'
import { spokenText, wordKey } from '@/domain/english'

/** 每个片段：key → 要念的文本 */
export type VoiceManifest = Readonly<Record<string, string>>

/** 数字 0~20。数学题的绝对主力，出现频率远超其他任何片段 */
const NUMBERS: VoiceManifest = Object.fromEntries(
  Array.from({ length: 21 }, (_, n) => [`num.${n}`, String(n)]),
)

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
  // —— 记忆翻牌（E1.6 / E1.9）
  'phrase.matchUpperLower': '把大写和小写配成一对',
  'phrase.matchLetterWord': '把字母和它开头的东西配成一对',

  // —— 反馈（答对轮换用，避免每次同一句）
  'phrase.praise1': '太棒了',
  'phrase.praise2': '答对啦',
  'phrase.praise3': '真厉害',
  'phrase.praise4': '就是这样',
  'phrase.praise5': '好厉害呀',
  'phrase.lookAgain': '再看看，答案是',

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
}

/** 数数题里可数物体的名称。与 `domain/generators/counting.ts` 的清单一一对应 */
const WORDS: VoiceManifest = {
  'word.apple': '苹果',
  'word.cat': '小猫',
  'word.dog': '小狗',
  'word.star': '星星',
  'word.flower': '花',
  'word.car': '汽车',
  'word.duck': '小鸭',
  'word.fish': '小鱼',
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
  ...ENGLISH,
}

export const VOICE_CLIP_COUNT = Object.keys(VOICE_MANIFEST).length

/** 该片段是否在清单里。播放器据此决定播片段还是走 TTS 兜底 */
export function hasClip(key: string): boolean {
  return key in VOICE_MANIFEST
}

/**
 * 开场就该预热的片段 —— 数字与运算词。
 *
 * ⭐ 不预热会出现「有的数字没读出来」：片段按需加载，
 * 而新的朗读会打断加载中的片段，低频数字（如 15）经常整个被吞掉。
 * 这是孩子实测反馈的问题。
 *
 * 只预热数学的高频片段（约 27 个、300KB），拼音音节按需加载即可——
 * 它们在一轮里只出现几个，且拼音题的节奏本来就慢一些。
 */
export const WARMUP_CLIPS: readonly string[] = [
  ...Object.keys(NUMBERS),
  ...Object.keys(OPERATORS),
  'phrase.equalsWhat',
  'phrase.canSplitInto',
  'phrase.andWhat',
  'phrase.togetherIsWhat',
]
