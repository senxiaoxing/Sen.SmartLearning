/**
 * @file 语音片段生成 —— 用 Edge 神经语音批量合成 mp3
 *
 * ⚠️ **构建期联网，运行时纯本地。**
 * 生成好的 mp3 随包发布，App 跑起来不碰任何网络，
 * 符合 CLAUDE.md「纯本地存储，不上云」的硬约束。
 *
 * **为什么用 msedge-tts 而不是自己实现协议**：
 * 本来照 scripts/generate-icons.mjs 的路子手写了一版（Node 24 自带全局
 * WebSocket，协议看起来只有「握手 → 发 SSML → 收音频帧」三步）。
 * 实测**一律 403**：微软已经给这个端点加了 `Sec-MS-GEC` 时间戳签名，
 * 而且比公开资料描述的更严——补上签名仍然被拒（已排除时钟偏差，
 * 本机与服务器时间一致）。这是个**私有且在持续加固**的协议，
 * 手写实现等于给自己埋一颗随时会响的雷。
 * 交给一个跟进协议变化的包来扛，是这里唯一理性的选择。
 *
 * 用法：
 *   npm run voices                          只补缺失的与文本/参数变了的
 *   npm run voices -- --force               全部重生成
 *   npm run voices -- --force=pinyin.       只重生成拼音（调音色/韵律后用这个）
 *   npm run voices -- --voice-pinyin=zh-CN-XiaoyiNeural
 *   npm run voices -- --voice-en=en-GB-MaisieNeural
 *
 * ⭐ **三套音色，按 key 前缀分**：
 * ```
 * en.*      英语童声      用中文音色念 apple 会教错发音
 * pinyin.*  标准播音音色  ⭐ 孤立单字的声调最容易读飘，标准优先于亲切
 * 其余      少女声        题干、鼓励语、昵称、宠物台词、讲解、识字、古诗
 * ```
 * ⭐ `hanzi.*` 与 `poem.*` 刻意**不跟拼音那套播音音色**：那边念的是孤立单字，
 * 这两类念的都是完整句子（「天。蓝天的天。」「床前明月光，」），
 * 少女声在句子上一向稳，而亲切感对这种会被反复翻看的内容更重要。
 *
 * 语速另有三处放慢：`pinyin.*`（声调要走完）、`en.letter*`（字母卡要听清）、
 * `hanzi.*` 与 `poem.*`（要跟着念），见 RATE_PINYIN / RATE_LETTER / RATE_RECITE。
 * ⚠️ `name.*`（昵称）必须留在默认音色里：它拼在鼓励语的**同一句话**前面，
 * 换音色就等于一句话里有两个人在说。
 * 发音教错比没有声音严重得多（拼音那边已经付过一次学费，见 design/07 §3.3）。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'audio', 'voice')
const MANIFEST_FILE = join(ROOT, 'src', 'data', 'seed', 'voiceManifest.ts')
const SYLLABLES_FILE = join(ROOT, 'src', 'data', 'seed', 'pinyinSyllables.ts')
const ENGLISH_FILE = join(ROOT, 'src', 'data', 'seed', 'englishWords.ts')
const LETTERS_FILE = join(ROOT, 'src', 'data', 'seed', 'englishLetters.ts')
const NICKNAMES_FILE = join(ROOT, 'src', 'data', 'seed', 'nicknamePresets.ts')
const PETNAMES_FILE = join(ROOT, 'src', 'data', 'seed', 'petNamePresets.ts')
const PETS_FILE = join(ROOT, 'src', 'data', 'seed', 'pets.ts')
const HANZI_FILE = join(ROOT, 'src', 'data', 'seed', 'hanziCards.ts')
const POEMS_FILE = join(ROOT, 'src', 'data', 'seed', 'poems.ts')
const SHOP_FILE = join(ROOT, 'src', 'data', 'seed', 'shopItems.ts')
const REAL_REWARDS_FILE = join(ROOT, 'src', 'data', 'seed', 'realRewards.ts')

/**
 * 默认音色。
 *
 * `XiaoyiNeural` 是少女声，比默认的 `XiaoxiaoNeural`（成年女声播音腔）
 * 更贴近儿童内容。想要童声可以试 `zh-CN-YunxiaNeural`（男童）。
 * ⚠️ 换音色后必须带 `--force` 重跑，否则新旧音色混在一起，
 * 同一句话里两个声音是最出戏的。
 */
const DEFAULT_VOICE = 'zh-CN-XiaoyiNeural'

/**
 * 英语音色。
 *
 * `AnaNeural` 是微软的**儿童**女声，与中文侧的少女声风格接近，
 * 两种语言切换时不会有明显的年龄断层。
 * 想要英式发音可以换 `en-GB-MaisieNeural`（同样是童声）。
 */
const DEFAULT_VOICE_EN = 'en-US-AnaNeural'

/**
 * 拼音音节专用音色。
 *
 * ⭐ **发音标准优先于亲切感**——这是全项目唯一为此破例的地方。
 *
 * `XiaoyiNeural`（少女声）念题干、鼓励语很合适，但念**孤立单字**时
 * 声调不够稳（实测 `pō mō kē hē āo ōu ēn wēn āng` 等一声字读得发飘）。
 * `XiaoxiaoNeural` 是微软中文的旗舰播音音色，播音腔在别处是缺点，
 * 在「教孩子这个音该怎么念」这件事上恰恰是优点。
 *
 * 换回少女声：`npm run voices -- --voice-pinyin=zh-CN-XiaoyiNeural --force=pinyin.`
 */
const DEFAULT_VOICE_PINYIN = 'zh-CN-XiaoxiaoNeural'

/**
 * ⭐ 三个声部的专属音色 —— 孩子一耳朵就能分出「谁在说话」。
 *
 * | 声部 | 音色 | 听感 | 谁在用 |
 * |---|---|---|---|
 * | `penguin` 数学 | `YunxiaNeural` | 男童声，像同班的小男孩 | 团团 · 喵喵 |
 * | `dragon` 语文 | `YunxiNeural` | 阳光青年男声，「妙哉妙哉」的小学者 | 墨墨 · 小白 |
 * | `panda` 英语 | `XiaoxiaoNeural` | 温暖女声，软乎乎的大姐姐 | 波波 · 咩咩 |
 *
 * 与旁白（Xiaoyi 少女声）合计四个声部：男童 / 青年男 / 温暖女 / 少女，
 * 音域各不相同，不靠上下文也能分辨。
 *
 * ⚠️ **这三个 key 是「声部」，不是物种。** 二年级换了物种但沿用同一批声音——
 * `petline.dragonG2Greet0` 是萨摩耶小白的台词，走的仍是语文那个青年男声。
 * 数学的伙伴永远是男童声，这条线索不该每升一个年级就重置一次。
 * 名字保留是因为改它要重命名全部现存片段并整包重生成，
 * 而这三个词只出现在 key 里，孩子看不见。
 *
 * ⚠️ 英语声部与拼音共用 Xiaoxiao 底色，但韵律完全不同（拼音是 -30% +0% 的播音腔，
 * 它是 -20% +10% 的软语），且语境一个是孤立单字、一个是台词，听感差别很大。
 *
 * 路由的 key 形态有两种（见 `petSpeakerOf`）：
 * - `petline.<声部>…`  —— 台词本体
 * - `name.<声部>Xxx…`  —— 昵称的音色变体：宠物叫「小恩宝」时名字也得是它的声音，
 *   key 构造规则与 `domain/encourage/petSpeaker.ts` 的 `nicknameClipFor` **逐字一致**
 */
const PET_VOICES = {
  penguin: 'zh-CN-YunxiaNeural',
  dragon: 'zh-CN-YunxiNeural',
  panda: 'zh-CN-XiaoxiaoNeural',
}

/**
 * 伙伴台词的韵律 —— 在音色之外再拉开一点性格辨识度。
 *
 * ⚠️ 语文声部（男声）不抬音高：+5% 在女声上是「亲切」，在男声上是「捏着嗓子」。
 */
const PET_PROSODY = {
  penguin: { rate: '-8%', pitch: '+5%' }, // 活泼，比旁白稍快
  dragon: { rate: '-15%', pitch: '+0%' }, // 稳重念白
  panda: { rate: '-20%', pitch: '+10%' }, // 又软又慢
}

/**
 * 这个片段属于哪个声部。不是伙伴内容返回 null。
 *
 * ⚠️ `name.` 分支必须要求声部段后面跟大写字母（`name.penguinXiaoenbao`），
 * 否则旁白昵称若恰好以声部名开头（如 `name.pandan…`）会被误路由。
 */
function petSpeakerOf(key) {
  let m = /^petline\.(penguin|dragon|panda)/.exec(key)
  if (m === null) m = /^name\.(penguin|dragon|panda)(?=[A-Z])/.exec(key)
  return m === null ? null : m[1]
}

/** 按 key 前缀选音色 */
const EN_PREFIX = 'en.'
const PINYIN_PREFIX = 'pinyin.'
/** 字母卡。⚠️ 是 `en.` 的子集，音色跟英语走，只有语速单独一套 */
const LETTER_PREFIX = 'en.letter'
/**
 * 识字卡与古诗。
 *
 * ⭐ 音色走**默认的中文少女声**——刻意不跟 `pinyin.*` 那套播音音色：
 * 那边念的是孤立单字，声调稳定压倒一切；这两类念的都是完整句子
 * （「天。蓝天的天。」「床前明月光，」），少女声在句子上一向稳，
 * 而亲切感对这种会被反复翻看的内容更重要。
 * 只有语速单独放慢，见 RATE_RECITE。
 */
const HANZI_PREFIX = 'hanzi.'
const POEM_PREFIX = 'poem.'

/**
 * 识字卡的总字数，3 辑 × 10 组 × 10 字。
 *
 * `loadHanzi()` 拿它做硬失败断言——字表加辑了就同步改这里，
 * 与 `hanziCards.test.ts` 的「3 辑，每辑 10 组 100 字」是同一条约束的两半。
 */
const EXPECTED_HANZI_COUNT = 300

/**
 * 古诗的总首数，3 辑 × 20 首。
 *
 * 与 `EXPECTED_HANZI_COUNT` 同一个用途：`loadPoems()` 拿它做硬失败断言，
 * 加辑了就同步改这里，另一半在 `poems.test.ts` 的「3 辑，每辑 20 首」。
 */
const EXPECTED_POEM_COUNT = 60

/** 辑声明的 id 前缀。⚠️ 见 loadPoems()：诗与辑都写 `id:`，靠它区分 */
const POEM_VOLUME_ID_PREFIX = 'vol'

/** 语速。儿童建议略慢，与原来 Web Speech 的 0.85 对齐 */
const RATE = '-15%'
/** 音调略高更亲切，与原 TTS 的 pitch 1.1 对齐 */
const PITCH = '+5%'

/**
 * ⭐ 拼音音节的韵律：更慢、且**不做音高偏移**。
 *
 * 两条都是为声调准确性让路的：
 *
 * 1. 慢，让声调有足够时间走完。一声是高平调、三声是降升调，
 *    语速快时后者会被压成「半三声」，孩子听到的就不是课本上那个音。
 * 2. `+0%` —— ⚠️ 音高偏移是可疑因素：中文声调本就是**相对音高的变化**，
 *    而 TTS 的整体升调并非简单平移，一声（本就在音域高处）被抬高后
 *    容易撞顶变形。别处的 `+5%` 只影响亲切感，这里影响对错。
 *
 * ⭐ **2026-08-31 从 -30% 再放慢到 -40%**（孩子真机反馈，design/05）：
 * 「n 和 l 听不出来」「má 和 mǎ 很容易搞混」。这两组恰好是拼音里
 * **区别最短促**的两处，而它们要的都是同一样东西——时间：
 *
 * - `n`/`l` 的差别只在音节开头那几十毫秒（鼻音 vs 边音），
 *   后面的韵母一模一样。辅音段拉长，那一下才抓得住。
 * - `má`/`mǎ` 的差别在调型（升 vs 先降后升）。三声的**前半段（降）**
 *   是唯一的分辨点，语速一快它就被吃掉，剩下的后半段两个调都在升。
 *
 * ⚠️ 全局放慢而不是给这几条单开一档：`pinyinOddOne` 的四个选项要**挨个点着比**
 * （P7.4 就是 n/l 那一组），一快一慢摆在一起，孩子听到的差别就不再是声母了，
 * 而「更慢的那个」还可能变成猜答案的线索。同一道题里的音节必须同一档语速。
 */
const RATE_PINYIN = '-40%'
const PITCH_PINYIN = '+0%'

/**
 * ⭐ 字母卡（`en.letter*`）的语速：比其他英语内容更慢。
 *
 * 念的是「A is for apple.」，而对一个刚开始接触英语的孩子来说，
 * 这句话里**每一个音都是新的**——她既要抓住字母名 /eɪ/，
 * 又要听清后面那个单词。常速下这两件事会糊在一起。
 *
 * 与拼音那边同一个道理（见 RATE_PINYIN）：孤立的、要「听清楚」的教学内容，
 * 慢比自然更重要。⚠️ 只放慢语速、不动音高——音高偏移在英语里没有必要，
 * 而任何多余的改动都是在赌已经念对的那些。
 */
const RATE_LETTER = '-30%'

/**
 * ⭐ 识字卡与古诗的语速：比常速慢，但不像字母那么慢。
 *
 * 这两类内容孩子是**跟着念**的，不是听个大概——「天。蓝天的天。」要她跟着说一遍，
 * 「床前明月光」要她跟着背。常速下她跟不上，只能听完再回想，
 * 那就从「跟读」退化成「听广播」了。
 *
 * 没有用字母卡那档 `-30%`：字母慢是因为每个音都陌生，
 * 而这里念的是她天天听的中文，过慢反而拖沓、像在哄小小孩——
 * 那正是「像幼儿园小朋友做的题目」那句反馈要避开的调子。
 */
const RATE_RECITE = '-25%'

/**
 * ⭐ 少数「怎么调参数都读不稳」的音节，靠一个**尾随逗号**救。
 *
 * 原理：TTS 把孤立单字当成一整句处理，句末天然带降调。
 * 补一个逗号之后那个字不再位于句末，韵律模型就不给它加收尾的降调了。
 * （多出来的停顿是静音，播放时听不出来。）
 *
 * ⚠️ **刻意只对清单里的几个用，不全局开。**
 * 换标准音色 + 放慢语速之后，102 个拼音里已经有 98 个读准了；
 * 全局加逗号等于把那 98 个也重新赌一次，可能把好的弄坏。
 * 人工复听（`npm run pinyin:check`）发现新的读不准，再往这里加。
 *
 * 清单来源：第二轮复听报回的 4 条。
 * - `wu1` / `u1`（屋）· `en1`（恩）—— 这两个字几乎不单独使用，
 *   TTS 训练数据里缺少它们作为独立句子的样本
 * - `e2`（鹅）—— 顺带一起试；⚠️ 它其实**不影响教学**：
 *   只用于单韵母 e，而那一组按设计不教声调（见 pinyinSyllables.ts 的 SINGLE_FINALS）
 *
 * ⚠️ 识字卡那两条读错的**不在这里**，它们要整句重写，见 {@link SPOKEN_OVERRIDE}。
 */
const TAIL_FIX_KEYS = new Set(['pinyin.wu1', 'pinyin.u1', 'pinyin.e2', 'pinyin.en1'])

/** 尾随标点。用逗号而不是句号——句号本身就是「句末」的强信号 */
const TAIL_MARK = '，'

/**
 * ⭐⭐ 整句改写喂给 TTS 的文本。屏幕上显示的**不受影响**。
 *
 * 与 {@link TAIL_FIX_KEYS} 的分工：那边是规则化的小修（补个逗号），
 * 这边是「怎么修都不行，只能重写整句」的少数条目。
 *
 * ## 来源：2026-09-05 上机复听，一声字被念成四声
 *
 * 识字卡念的是「X。词的X。」。**孤立成句的那个 X 会被 TTS 的收尾降调压一下，
 * 而一声是高平调，压完就成了四声。** 四声字本来就降、三声本来就带拐弯，
 * 都不受影响——这解释了为什么只有个别一声字翻车。
 *
 * 两个字的解法不同，是**逐条试听**定的（临时脚本调 msedge-tts
 * 把几种候选各生成一条，人听完选一种，脚本随即删掉）：
 *
 * | 字 | 听下来 | 用的写法 |
 * |---|---|---|
 * | 多 duō | 只要不落句末就对 | 两个句号都换逗号 |
 * | 黑 hēi | ⚠️ 换标点、换同音字（嘿）**全都是四声** | 干脆去掉开头那个孤字 |
 *
 * ⚠️ 「黑」是音节级的偏差，不是韵律问题：`hēi` 孤立成句时必翻。
 * 而「**黑色的黑**」里那两个都是一声——它在词里是好的，所以只留组词句。
 *
 * ⛔ **代价要认**：`黑色的黑，` 少了开头报字那一下，而那个「先报字、
 * 再用组词解释」的结构是刻意的（见 domain/hanzi.ts 的 hanziSpokenText）。
 * 对个别字破例划得来——**念错比少报一次字严重得多**，
 * 何况她听「黑色的黑」照样知道这个字念 hēi。
 *
 * ⛔ SSML 那条路走不通：`<phoneme alphabet="sapi" ph="hei 1">` 这类标注
 * 会让 Edge 端点**直接断开连接**（msedge-tts 本身支持传 SSML，是服务端不收）。
 * 别再试了。
 *
 * ⚠️ 加条目前**先听，别凭猜**——这次五种改法里只有一种对，
 * 而「换同音字」这种看着最靠谱的一路全军覆没。
 * 其余一声字（天三七八山花猫鸡书刀衣开飞青…）复听正常，**不要顺手全改**：
 * 那等于把已经念对的重新赌一次。
 */
const SPOKEN_OVERRIDE = {
  // 黑：孤立的「黑。」必成四声，去掉它
  'hanzi.u9ed1': '黑色的黑，',
  // 多：不落句末就对，两个句号都换成逗号
  'hanzi.u591a': '多，多少的多，',
}

/** 并发数。太高会被限流，4 条实测稳定且够快 */
const CONCURRENCY = 4

const args = process.argv.slice(2)
const force = args.includes('--force')
const voice = args.find((a) => a.startsWith('--voice='))?.split('=')[1] ?? DEFAULT_VOICE
const voiceEn = args.find((a) => a.startsWith('--voice-en='))?.split('=')[1] ?? DEFAULT_VOICE_EN
const voicePinyin =
  args.find((a) => a.startsWith('--voice-pinyin='))?.split('=')[1] ?? DEFAULT_VOICE_PINYIN

/**
 * 按前缀强制重生成，如 `--force=pinyin.`。
 *
 * 比 `--force` 精确得多：调了拼音的音色或韵律时，
 * 没必要把 300 多条英语和题干也重跑一遍（那要好几分钟且都是无谓的网络请求）。
 */
const forcePrefix = args.find((a) => a.startsWith('--force='))?.split('=')[1] ?? null

/** 这个片段该用哪个音色念 */
function voiceFor(key) {
  if (key.startsWith(EN_PREFIX)) return voiceEn
  if (key.startsWith(PINYIN_PREFIX)) return voicePinyin
  const pet = petSpeakerOf(key)
  if (pet !== null) return PET_VOICES[pet]
  return voice
}

/**
 * 这个片段用什么语速音调。
 *
 * ⚠️ 字母的判断必须排在英语前面——`en.letterA` 同时匹配两者，
 * 而它要的是更慢的那一套。理由见 RATE_PINYIN 与 RATE_LETTER。
 */
function prosodyFor(key) {
  if (key.startsWith(PINYIN_PREFIX)) return { rate: RATE_PINYIN, pitch: PITCH_PINYIN }
  if (key.startsWith(LETTER_PREFIX)) return { rate: RATE_LETTER, pitch: PITCH }
  if (key.startsWith(HANZI_PREFIX) || key.startsWith(POEM_PREFIX)) {
    return { rate: RATE_RECITE, pitch: PITCH }
  }
  const pet = petSpeakerOf(key)
  if (pet !== null) return PET_PROSODY[pet]
  return { rate: RATE, pitch: PITCH }
}

/**
 * 实际喂给 TTS 的文本。
 *
 * 整句重写优先（{@link SPOKEN_OVERRIDE}），其次是补尾随逗号（{@link TAIL_FIX_KEYS}），
 * 都不沾的原样送。屏幕上显示的永远是清单里那份，与这里无关。
 */
function spokenTextFor(key, text) {
  const override = SPOKEN_OVERRIDE[key]
  if (override !== undefined) return override
  return TAIL_FIX_KEYS.has(key) ? `${text}${TAIL_MARK}` : text
}

/**
 * 生成参数的指纹。台账里存它，参数一变就自动触发重生成。
 *
 * ⚠️ 没有这个指纹时，改音色/语速**不会**让音频更新——
 * 台账只比对「念的文本」，而文本没变。与当初「改了载体字音频却不更新」
 * 是同一类坑，那次是靠人肉发现的。
 *
 * ⭐ **改写过的条目，指纹里带上实际喂入的那句话。**
 * 台账比对的 `text` 是清单原文，而 {@link SPOKEN_OVERRIDE} 改的是喂入文本——
 * 不把它算进指纹的话，调整改写方式**不会触发重生成**，
 * 表现是「明明改了喂法，播出来还是上一版」。2026-09-05 实测踩到过：
 * 当时只能靠手工删 mp3 才跑得起来。
 */
function signatureFor(key) {
  const { rate, pitch } = prosodyFor(key)
  const base = `${voiceFor(key)}|${rate}|${pitch}`
  const override = SPOKEN_OVERRIDE[key]
  if (override !== undefined) return `${base}|ov:${override}`
  /**
   * ⚠️ 没有尾随逗号时**不加尾段**，保持与旧签名逐字节相同。
   *
   * 写成 `${base}|${tail ? 'tail' : ''}` 会给所有条目多出一个空段，
   * 于是 102 条拼音全部被判定「参数变了」而重跑一遍——
   * 而它们的音色语速其实一个字都没改。神经 TTS 未必每次输出一致，
   * 那等于把已经调好的 98 个重新赌一次。
   */
  return TAIL_FIX_KEYS.has(key) ? `${base}|tail` : base
}

/**
 * 从 TypeScript 清单里读出片段表。
 *
 * 用正则而不是引入 TS 编译：这个脚本只需要「key → 文本」这一组字面量，
 * 为它拉一整条 ts-node/tsx 工具链不划算。
 * 数字片段是 `Array.from` 生成的、正则扫不到，按同样规则补上即可——
 * `voiceManifest.test.ts` 会校验两边数量一致，漂移跑不掉。
 */
function loadManifest() {
  const text = readFileSync(MANIFEST_FILE, 'utf-8')
  const manifest = {}

  for (let n = 0; n <= 20; n++) manifest[`num.${n}`] = String(n)
  for (const [, key, value] of text.matchAll(/'([a-z]+\.[A-Za-z0-9]+)':\s*'([^']*)'/g)) {
    manifest[key] = value
  }

  Object.assign(
    manifest,
    loadPinyin(),
    loadEnglish(),
    loadNicknames(),
    loadPetNames(),
    loadPetLines(),
    loadHanzi(),
    loadPoems(),
    loadShopItems(),
  )
  return manifest
}

/**
 * 识字卡的 300 个字（3 辑 × 10 组 × 10 字）。
 *
 * ⭐ 念的是「天。蓝天的天。」而**不是孤立的「天」**，句式必须与
 * `domain/hanzi.ts` 的 `hanziSpokenText()` 逐字一致——两边不一致时台账会判定
 * 「文本变了」而每次都重生成，更糟的是屏幕与耳朵对不上。
 *
 * 孤立单字为什么不行见那个函数的说明：多音字挑不准、声调读得飘。
 * 这是拼音那边用学费换来的同一条结论。
 *
 * key 用汉字的 Unicode 码点（`hanzi.u5929`），与 `hanziClipKey()` 同规则：
 * 拼音会撞车（十/石、木/目、师/狮/诗），码点不会。
 */
function loadHanzi() {
  const text = readFileSync(HANZI_FILE, 'utf-8')
  const out = {}

  // 形如：  h('天', 'tiān', '蓝天', '🌤️'),   末尾的 emoji 可省
  // ⚠️ 锚定行首，免得扫到注释或文档里的同名片段
  for (const [, char, , word] of text.matchAll(/^\s*h\('([^']+)',\s*'([^']+)',\s*'([^']+)'/gm)) {
    out[`hanzi.u${char.codePointAt(0).toString(16)}`] = `${char}。${word}的${char}。`
  }

  // ⚠️ 硬失败而不是警告：字表结构变了却不同步这里，后果是识字卡**整片没有音频**，
  //    而孩子不识字，这一页的全部内容都是听的——等于这一页作废。
  //    与英语字母、宠物台词几处的处理保持一致
  //
  // ⚠️ 加辑之后要同步改这个数：字表是 3 辑 × 100 字，
  //    hanziCards.test.ts 的「3 辑，每辑 10 组 100 字」是同一条约束的另一半
  if (Object.keys(out).length !== EXPECTED_HANZI_COUNT) {
    console.error('✗ hanziCards.ts 的结构变了，本脚本的 loadHanzi() 必须同步：')
    console.error(`  解析出 ${Object.keys(out).length} 个字（应为 ${EXPECTED_HANZI_COUNT}）`)
    process.exit(1)
  }

  return out
}

/**
 * 古诗：诗题、逐句、译文。
 *
 * ⚠️ **逐行状态机而不是一条大正则**：句子的片段 key 里带序号
 * （`poem.jingyesiL2`），而序号是「这一句在这首诗里排第几」——
 * 正则匹配拿不到这个上下文。逐行扫描时遇到 `id:` 就换一首、清零计数，
 * 遇到一行 `l(...)` 就 +1，与文件里的书写顺序严格对应。
 * 这也是 `poems.ts` 要求每句独占一行的原因。
 *
 * ⭐ 念的是 `spoken ?? text`：极少数句子送去合成的文本与屏幕上的原文**不同**
 * （「曲项」喂「屈项」、「见牛羊」喂「现牛羊」、「少小」喂「绍小」），
 * 因为 TTS 会把这些古音字念成现代常用音。取错字段的话，
 * 孩子听到的是错读音，而屏幕上一切正常——这类问题没人会主动去核对。
 */
function loadPoems() {
  const text = readFileSync(POEMS_FILE, 'utf-8')
  const out = {}

  let id = null
  let lineIndex = 0
  /** `meaning:` 后面换行才写字符串，见到它就等下一行 */
  let awaitingMeaning = false
  /** 诗题那一条要念「诗名。朝代，作者。」，三个字段分散在三行，先攒着 */
  let title = null
  let dynasty = null

  for (const raw of text.split('\n')) {
    const idMatch = raw.match(/^\s*id:\s*'([a-z0-9]+)',/)
    if (idMatch !== null) {
      // ⚠️ 辑的声明里也有 `id: 'vol1',`，它后面跟的是 name/badge/hint 而不是诗。
      //    不跳过的话，`title:` 拿不到、`author:` 也拿不到，倒不会产出错片段，
      //    但下一首诗的 id 会被这一行覆盖成 vol1 —— 那首诗的片段全落到 poem.vol1L0 上。
      //    诗的 id 不许以 vol 开头，由 poems.test.ts 拦
      if (idMatch[1].startsWith(POEM_VOLUME_ID_PREFIX)) {
        id = null
        continue
      }
      id = idMatch[1]
      lineIndex = 0
      awaitingMeaning = false
      title = null
      dynasty = null
      continue
    }
    if (id === null) continue

    const titleMatch = raw.match(/^\s*title:\s*'([^']+)',/)
    if (titleMatch !== null) {
      title = titleMatch[1]
      continue
    }

    const dynastyMatch = raw.match(/^\s*dynasty:\s*'([^']+)',/)
    if (dynastyMatch !== null) {
      dynasty = dynastyMatch[1]
      continue
    }

    // ⚠️ 拼法必须与 domain/poem.ts 的 poemHeadText() **逐字相同**，
    //    差一个标点就会让 60 首诗每次都被判定「文本变了」而重新合成
    const authorMatch = raw.match(/^\s*author:\s*'([^']+)',/)
    if (authorMatch !== null) {
      out[`poem.${id}Title`] = `${title}。${dynasty}，${authorMatch[1]}。`
      continue
    }

    // ⭐ headSpoken 覆盖刚刚拼好的报题句：诗名与作者里的多音字
    //   （咏华山的华 huà · 汉乐府的乐 yuè · 李峤的峤 qiáo · 韦应物的应 yìng）
    //   只有换字才念得对，见 domain/poem.ts 的 poemHeadSpokenText。
    //   ⚠️ 它必须写在 author 之后 —— 这里是「后写的赢」，写在前面会被覆盖掉
    const headMatch = raw.match(/^\s*headSpoken:\s*'([^']+)',/)
    if (headMatch !== null) {
      out[`poem.${id}Title`] = headMatch[1]
      continue
    }

    // 形如：  l('床前明月光，', 'chuáng qián míng yuè guāng'),
    //   或：  l('曲项向天歌。', 'qū xiàng xiàng tiān gē', '屈项向天歌。'),
    const lineMatch = raw.match(/^\s*l\('([^']*)',\s*'[^']*'(?:,\s*'([^']*)')?\s*\)/)
    if (lineMatch !== null) {
      out[`poem.${id}L${lineIndex}`] = lineMatch[2] ?? lineMatch[1]
      lineIndex += 1
      continue
    }

    if (/^\s*meaning:\s*$/.test(raw)) {
      awaitingMeaning = true
      continue
    }
    if (awaitingMeaning) {
      const meaningMatch = raw.match(/^\s*'([^']+)'/)
      if (meaningMatch !== null) {
        out[`poem.${id}Meaning`] = meaningMatch[1]
        awaitingMeaning = false
      }
      continue
    }
  }

  const titles = Object.keys(out).filter((k) => k.endsWith('Title')).length
  const meanings = Object.keys(out).filter((k) => k.endsWith('Meaning')).length
  const lines = Object.keys(out).length - titles - meanings

  // ⚠️ 硬失败：与 loadHanzi() 同一个理由。另外**诗题、译文、诗句三者必须都在**——
  //    只有诗句而没有诗题，表现是点进一首诗、标题不出声，很容易被当成没点到
  if (titles !== EXPECTED_POEM_COUNT || meanings !== EXPECTED_POEM_COUNT || lines === 0) {
    console.error('✗ poems.ts 的结构变了，本脚本的 loadPoems() 必须同步：')
    console.error(
      `  诗题 ${titles} 首（应为 ${EXPECTED_POEM_COUNT}）· ` +
        `译文 ${meanings} 条（应为 ${EXPECTED_POEM_COUNT}）· 诗句 ${lines} 句`,
    )
    process.exit(1)
  }

  return out
}

/**
 * 宠物台词。
 *
 * 台词在 `pets.ts` 里就是 `{ clipKey, text }` 的字面量（见那里的 `PetLine` 说明），
 * 所以这里用的正则和昵称那条**几乎一样**——把 key 写在台词旁边，
 * 换来的正是这个：不需要为宠物再发明一套解析。
 *
 * ⚠️ 文本要认单引号和双引号两种：波波有句台词是 `"Let's go！我们开始吧"`，
 * 里面的撇号逼得它必须用双引号包。英语词表那边同理。
 */
function loadPetLines() {
  const text = readFileSync(PETS_FILE, 'utf-8')
  const out = {}

  for (const [, clipKey, single, double] of text.matchAll(
    /\{\s*clipKey:\s*'(petline\.[A-Za-z0-9]+)',\s*text:\s*(?:'([^']*)'|"([^"]*)")/g,
  )) {
    out[clipKey] = single ?? double
  }

  // ⚠️ 硬失败而不是警告：台词结构变了却不同步这里，后果是宠物台词整句掉回机器音，
  //    而它现在出现在**每一次答对**的反馈里——最该保住音色的位置。
  //    与英语字母、昵称两处的处理保持一致
  if (Object.keys(out).length === 0) {
    console.error('✗ pets.ts 的 PetLine 结构变了，本脚本的 loadPetLines() 必须同步：')
    console.error('  一条 petline.* 都没解析出来')
    process.exit(1)
  }

  return out
}

/**
 * 昵称单独解析 —— 与拼音、英语同理，它在 `nicknamePresets.ts` 里是结构化的
 * `{ clipKey, text }` 对象，不是 `voiceManifest.ts` 那样的字面量键值对。
 *
 * 用默认的中文少女声念，与鼓励语同一个音色 —— 昵称就拼在鼓励语前面，
 * 两者音色一旦不同，一句话里就有两个声音。
 */
function loadNicknames() {
  const text = readFileSync(NICKNAMES_FILE, 'utf-8')
  const out = {}

  for (const [, clipKey, spoken] of text.matchAll(
    /\{\s*clipKey:\s*'(name\.[A-Za-z0-9]+)',\s*text:\s*'([^']+)'/g,
  )) {
    out[clipKey] = spoken

    // ⭐ 每个昵称按三只伙伴的音色再各生成一份变体（name.penguinXiaoenbao …）。
    //    宠物叫名字时整句都得是它的声音，见 PET_VOICES 的说明。
    //    key 构造与 domain/encourage/petSpeaker.ts 的 nicknameClipFor 逐字一致，
    //    对不上的后果是变体文件生成了、运行时却引用不到，整句默默降级成 TTS
    const slug = clipKey.slice('name.'.length)
    const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1)
    for (const species of Object.keys(PET_VOICES)) {
      out[`name.${species}${capitalized}`] = spoken
    }
  }

  // ⚠️ 硬失败而不是警告：清单结构变了却不同步这里，后果是新昵称**没有音频**，
  //    而它的表现是「换了个昵称，声音忽然变成机器音」——静默、且极易被当成 iOS 的毛病。
  //    英语字母那边踩过同类的坑，处理方式保持一致
  if (Object.keys(out).length === 0) {
    console.error('✗ nicknamePresets.ts 的结构变了，本脚本的 loadNicknames() 必须同步：')
    console.error('  一条 name.* 都没解析出来')
    process.exit(1)
  }

  return out
}

/**
 * 宠物起名的候选池（petname.*）—— 与昵称同款的结构化清单，
 * 起名改成「预录名单里挑」之后，改名的宠物照样有专属片段。
 */
function loadPetNames() {
  const text = readFileSync(PETNAMES_FILE, 'utf-8')
  const out = {}

  for (const [, clipKey, spoken] of text.matchAll(
    /\{\s*clipKey:\s*'(petname\.[A-Za-z0-9]+)',\s*text:\s*'([^']+)'/g,
  )) {
    out[clipKey] = spoken
  }

  // ⚠️ 硬失败而不是警告，理由与 loadNicknames 完全一致：
  //    静默漏生成的表现是「孩子给宠物改了名，升级那句忽然变机器音」
  if (Object.keys(out).length === 0) {
    console.error('✗ petNamePresets.ts 的结构变了，本脚本的 loadPetNames() 必须同步：')
    console.error('  一条 petname.* 都没解析出来')
    process.exit(1)
  }

  return out
}

/**
 * 商店商品名（shop.*）—— 小屋家具、宠物零食、现实兑换券三份表。
 *
 * ⭐ 商品名必须能朗读，孩子不识字，念不出来等于这件东西没有名字。
 * 这也正是现实券只能从预设里挑、家长不能自由输入的原因：
 * 自由输入没有预生成音频，只能整句降级 TTS，和同一页的少女音混在一起。
 *
 * 音色走默认中文（`voiceFor` 的兜底分支）——商品名就是普通中文短语，
 * 和界面其余部分同一把嗓子。
 *
 * 正则按**整个对象字面量**匹配而非「label 后面跟着 clipKey」：
 * 这两个字段在三份表里的排列顺序不一定一致，而 `[^{}]*` 在没有嵌套花括号的
 * 对象里能安全圈出一条记录，字段怎么排都认。
 */
function loadShopItems() {
  const out = {}

  for (const file of [SHOP_FILE, REAL_REWARDS_FILE]) {
    const text = readFileSync(file, 'utf-8')
    for (const [chunk, clipKey] of text.matchAll(
      /\{[^{}]*clipKey:\s*'(shop\.[A-Za-z0-9]+)'[^{}]*\}/g,
    )) {
      const label = chunk.match(/label:\s*'([^']+)'/)
      if (label !== null) out[clipKey] = label[1]
    }
  }

  // ⚠️ 硬失败而不是警告，理由与 loadNicknames / loadPetNames 完全一致：
  //    静默漏生成的表现是「商店里那件东西点了不出声」，而孩子只能靠听
  if (Object.keys(out).length === 0) {
    console.error('✗ shopItems.ts / realRewards.ts 的结构变了，本脚本的 loadShopItems() 必须同步：')
    console.error('  一条 shop.* 都没解析出来')
    process.exit(1)
  }

  return out
}

/**
 * 英语词条单独解析 —— 与拼音同理，它在 `englishWords.ts` 里是结构化的
 * `w('apple', 'Apple', '苹果', '🍎')` 调用，不是字面量键值对。
 *
 * 英文原文可能用双引号包（`"I'm fine."` 里含撇号），两种都要认。
 */
function loadEnglish() {
  const text = readFileSync(ENGLISH_FILE, 'utf-8')
  const out = {}

  for (const [, id, single, double] of text.matchAll(
    /w\('([A-Za-z0-9]+)',\s*(?:'([^']*)'|"([^"]*)")/g,
  )) {
    out[`en.${id}`] = single ?? double
  }

  Object.assign(out, loadLetters())
  return out
}

/**
 * 字母单独解析 —— 它在 `englishLetters.ts` 里由 `LETTER_CARDS` 按规则拼出，
 * 不是可直接扫到的字面量。
 *
 * ⭐ 念的是**整句**「A is for apple.」而不是孤立的 `A`：
 * 孤立字母有歧义（`A` 既是字母名 /eɪ/ 也是冠词 /ə/），
 * 而放进整句后那个 A 只可能是字母名。见 englishLetters.ts 的说明。
 */
function loadLetters() {
  const text = readFileSync(LETTERS_FILE, 'utf-8')
  const out = {}

  // WORDS 表的形式：  A: ['apple', '苹果', '🍎'],
  for (const [, upper, word] of text.matchAll(/^\s*([A-Z]):\s*\['([^']+)'/gm)) {
    out[`en.letter${upper}`] = `${upper} is for ${word}.`
  }

  // ⚠️ 硬失败而不是警告：句式或表结构变了却不同步这里，
  //    后果是「代码改了、播出来还是旧的」——静默、且极难发现。
  //    拼音那边已经踩过一次（改了载体字，文件还在，脚本直接跳过）
  if (!text.includes(' is for ') || Object.keys(out).length !== 26) {
    console.error('✗ englishLetters.ts 的结构变了，本脚本的 loadLetters() 必须同步：')
    console.error(`  解析出 ${Object.keys(out).length} 个字母（应为 26），句式检查 ${
      text.includes(' is for ') ? '通过' : '失败'
    }`)
    process.exit(1)
  }

  return out
}

/**
 * 拼音音节单独解析 —— 它在 `pinyinSyllables.ts` 里是结构化对象，
 * 不是 `voiceManifest.ts` 那样的字面量键值对。
 *
 * ⭐ 朗读内容优先取 `char`（汉字载体）而不是 `pinyin`：
 * TTS 是文本转语音，喂「八」必然读对，喂「bā」只能靠它猜。
 * 没有载体字的退回念拼音，那些音节必须人工试听（见 npm run pinyin:check）。
 */
function loadPinyin() {
  const text = readFileSync(SYLLABLES_FILE, 'utf-8')
  const out = {}

  const pattern =
    /\{\s*pinyin:\s*'([^']+)',\s*base:\s*'([^']+)',\s*tone:\s*(\d)(?:,\s*char:\s*'([^']+)')?/g

  for (const [, pinyin, base, tone, char] of text.matchAll(pattern)) {
    const key = `pinyin.${base.replace(/ü/g, 'v')}${tone}`
    // 先出现的优先，与 pinyinSyllables.ts 的 dedupe 规则保持一致
    if (!(key in out)) out[key] = char ?? pinyin
  }
  return out
}

/** 合成一条，返回 mp3 Buffer */
async function synthesize(tts, text, prosody) {
  const { audioStream } = await tts.toStream(text, prosody)
  const chunks = []
  for await (const chunk of audioStream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// ============================================================================

const manifest = loadManifest()
const entries = Object.entries(manifest)
mkdirSync(OUT_DIR, { recursive: true })

if (force) {
  for (const f of readdirSync(OUT_DIR)) unlinkSync(join(OUT_DIR, f))
  console.log('已清空旧音频（--force）')
}

/**
 * 上一次生成时每个 key 念的是什么。
 *
 * ⭐ 没有这张表就会踩到一个隐蔽的坑：**改了载体字，音频却不会更新**。
 * 脚本原本只补「文件不存在」的 key，于是把 `pinyin.a1` 的载体从裸拼音「ā」
 * 换成汉字「啊」之后，文件还在，脚本直接跳过——表里写着「啊」，
 * 播出来还是那个读错声调的旧音频。实测踩到过。
 *
 * 现在按「念的文本变没变」判断，改字必然触发重生成。
 */
const LEDGER_FILE = join(OUT_DIR, '.spoken-text.json')
const previous = existsSync(LEDGER_FILE)
  ? JSON.parse(readFileSync(LEDGER_FILE, 'utf-8'))
  : {}

/** 台账兼容两种格式：老版本只存文本字符串，新版本存 `{ text, sig }` */
function prevOf(key) {
  const entry = previous[key]
  if (typeof entry === 'string') return { text: entry, sig: null }
  return { text: entry?.text, sig: entry?.sig ?? null }
}

const pending = entries.filter(([key, text]) => {
  if (forcePrefix !== null && key.startsWith(forcePrefix)) return true
  if (!existsSync(join(OUT_DIR, `${key}.mp3`))) return true

  const prev = prevOf(key)
  if (prev.text !== text) return true
  // 老台账没有指纹，不据此重生成——否则升级脚本后会把全部音频重跑一遍
  return prev.sig !== null && prev.sig !== signatureFor(key)
})

const changed = pending.filter(([key]) => existsSync(join(OUT_DIR, `${key}.mp3`)))
if (changed.length > 0) {
  console.log(`其中 ${changed.length} 条是已有音频、需要重生成：`)
  for (const [key, text] of changed.slice(0, 12)) {
    const prev = prevOf(key)
    const why =
      prev.text !== text ? `文本「${prev.text ?? '(未记录)'}」→「${text}」` : '生成参数变了'
    console.log(`  ${key}: ${why}`)
  }
  if (changed.length > 12) console.log(`  …… 共 ${changed.length} 条`)
  console.log()
}

// ⚠️ 字母要先从英语里摘出来单独统计：它俩共用 en. 前缀但语速不同，
//    合在一起报会打印出一个根本没用上的语速，下次调参时必然被误导
const pendingLetter = pending.filter(([key]) => key.startsWith(LETTER_PREFIX))
const pendingEn = pending.filter(
  ([key]) => key.startsWith(EN_PREFIX) && !key.startsWith(LETTER_PREFIX),
)
const pendingPy = pending.filter(([key]) => key.startsWith(PINYIN_PREFIX))
// ⚠️ 识字与古诗同样要单独统计：它们和其他中文内容共用少女音，但语速是 RATE_RECITE。
//    与字母那条同一个理由——混在一起报会打印出一个根本没用上的语速
const pendingRecite = pending.filter(
  ([key]) => key.startsWith(HANZI_PREFIX) || key.startsWith(POEM_PREFIX),
)
// 伙伴内容（台词 + 昵称音色变体）按三只各自统计——音色韵律都不同，混着报会误导调参
const pendingPet = pending.filter(([key]) => petSpeakerOf(key) !== null)
const pendingZh =
  pending.length -
  pendingEn.length -
  pendingPy.length -
  pendingLetter.length -
  pendingRecite.length -
  pendingPet.length

console.log(`清单共 ${entries.length} 条，待生成 ${pending.length} 条`)
console.log(`  中文 ${pendingZh} 条 · ${voice} · ${RATE} ${PITCH}`)
console.log(`  识字古诗 ${pendingRecite.length} 条 · ${voice} · ${RATE_RECITE} ${PITCH}`)
console.log(`  拼音 ${pendingPy.length} 条 · ${voicePinyin} · ${RATE_PINYIN} ${PITCH_PINYIN}`)
console.log(`  英语 ${pendingEn.length} 条 · ${voiceEn} · ${RATE} ${PITCH}`)
console.log(`  字母 ${pendingLetter.length} 条 · ${voiceEn} · ${RATE_LETTER} ${PITCH}`)
for (const species of Object.keys(PET_VOICES)) {
  const count = pendingPet.filter(([key]) => petSpeakerOf(key) === species).length
  const { rate, pitch } = PET_PROSODY[species]
  console.log(`  伙伴(${species}) ${count} 条 · ${PET_VOICES[species]} · ${rate} ${pitch}`)
}
console.log()

if (pending.length === 0) {
  console.log('全部已存在，无需生成。换音色请加 --force')
  process.exit(0)
}

let done = 0
const failures = []

/**
 * 一个 worker 绑定一个音色。
 *
 * MsEdgeTTS 的音色是连接级设置（`setMetadata`），中途换音色要重建连接，
 * 所以按音色分批跑，而不是让 worker 边取边切。
 */
async function worker(voiceName, queue) {
  const tts = new MsEdgeTTS()
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

  while (queue.length > 0) {
    const [key, text] = queue.shift()
    try {
      const mp3 = await synthesize(tts, spokenTextFor(key, text), prosodyFor(key))
      if (mp3.length === 0) throw new Error('返回空音频')
      writeFileSync(join(OUT_DIR, `${key}.mp3`), mp3)
      done += 1
      process.stdout.write(`\r  已生成 ${done}/${pending.length}  `)
    } catch (error) {
      failures.push({ key, text, message: error.message ?? String(error) })
    }
  }
}

for (const voiceName of new Set(pending.map(([key]) => voiceFor(key)))) {
  const queue = pending.filter(([key]) => voiceFor(key) === voiceName)
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(voiceName, queue)))
}

// 记录这一轮每个 key 念的是什么，下次据此判断载体有没有改过。
// 只记成功的：失败的下次还要重试
const ledger = { ...previous }
for (const [key, text] of pending) {
  if (!failures.some((f) => f.key === key)) ledger[key] = { text, sig: signatureFor(key) }
}
writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 1), 'utf-8')

console.log(`\n\n完成：成功 ${done} 条，失败 ${failures.length} 条`)
for (const f of failures) console.error(`  ✗ ${f.key}（${f.text}）: ${f.message}`)
console.log(`输出目录：${OUT_DIR}`)

if (failures.length > 0) {
  console.log('\n失败的重跑一次即可 —— 脚本只补缺失的，不会重做已成功的')
  process.exit(1)
}

// ⚠️ 必须显式退出：MsEdgeTTS 的 WebSocket 会一直挂着，
// Node 事件循环因此永不为空，脚本跑完后会卡住不返回（实测踩到过）。
// 这个包没有暴露 close()，只能这样收场。
process.exit(0)
