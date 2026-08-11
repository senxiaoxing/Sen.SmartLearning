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
 * 其余      少女声        题干、鼓励语、昵称，亲切感优先
 * ```
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
const PETS_FILE = join(ROOT, 'src', 'data', 'seed', 'pets.ts')

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

/** 按 key 前缀选音色 */
const EN_PREFIX = 'en.'
const PINYIN_PREFIX = 'pinyin.'

/** 语速。儿童建议略慢，与原来 Web Speech 的 0.85 对齐 */
const RATE = '-15%'
/** 音调略高更亲切，与原 TTS 的 pitch 1.1 对齐 */
const PITCH = '+5%'

/**
 * ⭐ 拼音音节的韵律：更慢、且**不做音高偏移**。
 *
 * 两条都是为声调准确性让路的：
 *
 * 1. `-30%` 让声调有足够时间走完。一声是高平调、三声是降升调，
 *    语速快时后者会被压成「半三声」，孩子听到的就不是课本上那个音。
 * 2. `+0%` —— ⚠️ 音高偏移是可疑因素：中文声调本就是**相对音高的变化**，
 *    而 TTS 的整体升调并非简单平移，一声（本就在音域高处）被抬高后
 *    容易撞顶变形。别处的 `+5%` 只影响亲切感，这里影响对错。
 */
const RATE_PINYIN = '-30%'
const PITCH_PINYIN = '+0%'

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
 */
const TAIL_FIX_KEYS = new Set(['pinyin.wu1', 'pinyin.u1', 'pinyin.e2', 'pinyin.en1'])

/** 尾随标点。用逗号而不是句号——句号本身就是「句末」的强信号 */
const TAIL_MARK = '，'

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
  return voice
}

/** 这个片段用什么语速音调。拼音单独一套，理由见 RATE_PINYIN */
function prosodyFor(key) {
  return key.startsWith(PINYIN_PREFIX)
    ? { rate: RATE_PINYIN, pitch: PITCH_PINYIN }
    : { rate: RATE, pitch: PITCH }
}

/** 实际喂给 TTS 的文本。个别音节要补尾随逗号，见 TAIL_FIX_KEYS */
function spokenTextFor(key, text) {
  return TAIL_FIX_KEYS.has(key) ? `${text}${TAIL_MARK}` : text
}

/**
 * 生成参数的指纹。台账里存它，参数一变就自动触发重生成。
 *
 * ⚠️ 没有这个指纹时，改音色/语速**不会**让音频更新——
 * 台账只比对「念的文本」，而文本没变。与当初「改了载体字音频却不更新」
 * 是同一类坑，那次是靠人肉发现的。
 */
function signatureFor(key) {
  const { rate, pitch } = prosodyFor(key)
  const base = `${voiceFor(key)}|${rate}|${pitch}`
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

  Object.assign(manifest, loadPinyin(), loadEnglish(), loadNicknames(), loadPetLines())
  return manifest
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

const pendingEn = pending.filter(([key]) => key.startsWith(EN_PREFIX))
const pendingPy = pending.filter(([key]) => key.startsWith(PINYIN_PREFIX))
const pendingZh = pending.length - pendingEn.length - pendingPy.length

console.log(`清单共 ${entries.length} 条，待生成 ${pending.length} 条`)
console.log(`  中文 ${pendingZh} 条 · ${voice} · ${RATE} ${PITCH}`)
console.log(`  拼音 ${pendingPy.length} 条 · ${voicePinyin} · ${RATE_PINYIN} ${PITCH_PINYIN}`)
console.log(`  英语 ${pendingEn.length} 条 · ${voiceEn} · ${RATE} ${PITCH}\n`)

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
