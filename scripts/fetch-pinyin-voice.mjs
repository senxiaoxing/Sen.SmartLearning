/**
 * @file 拼音真人录音素材获取 —— 从 cmguo/PinYinSound 拉取并改名落盘
 *
 * ⭐ **为什么拼音要换真人录音**：Edge TTS 是文本转语音，喂 `f` 只能靠它猜，
 * 所以 `pinyinSyllables.ts` 给每个音节挂一个汉字载体（声母 f → 「佛」）。
 * 于是 TTS 念出的是**饱满的 fó**（实测：0.37s 人声里 84% 是元音），
 * 而人教版教材要求声母「**读得轻短些**」——孩子听到的成了一个完整音节。
 *
 * 本脚本产出两类片段，见 design/11-拼音真人录音方案.md §3：
 *
 * ```
 * pinyin.<base><tone>.mp3   118 条  带调音节，题目用（选项显示 fó，播 fó）
 * pinyinbare.<letter>.mp3    47 条  无调本音，拼音墙与「答案是 X」用（播纯 /f/）
 * ```
 *
 * ⚠️ **两条轨道是刻意的，不是冗余**：`pinyin.fo2` 同时被题目当作「一个音节」使用
 * （`itemTemplates.ts` 的 P2.x / P8.1 / P8.3），选项显示带调拼音，
 * 就地换成纯辅音会让那些题变成没有正确答案。见 design/11 §3.1。
 *
 * 用法：
 *   npm run pinyin:voice            补缺失的（已就绪的跳过）
 *   npm run pinyin:voice -- --force 全部重下
 *   npm run pinyin:voice -- --check 只校验，不下载
 *
 * ⚠️ **上游没有 license**（仓库来源不明），用户已决定保留在仓库里并把仓库改 private，
 * 风险自担。pin 住 commit 是为了防上游改名/删除——**不要改成随分支走**。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'audio', 'voice')
const SYLLABLES_FILE = join(ROOT, 'src', 'data', 'seed', 'pinyinSyllables.ts')
const LOCK_FILE = join(ROOT, 'scripts', 'pinyin-voice.lock.json')

/**
 * 上游 commit —— 2026-09-18 的 `master` HEAD。
 * ⚠️ 换 commit 意味着全部重下（台账会判定哈希不符），别随手改。
 */
const COMMIT = '62453b2a5ca6873eac1f4293b6e9794715d0fc8a'
const BASE = `https://raw.githubusercontent.com/cmguo/PinYinSound/${COMMIT}`

/** 并发数。太高会被 GitHub 限流 */
const CONCURRENCY = 6

/**
 * 最小可信体积。
 * ⚠️ 取不到文件时 GitHub 返回的是 14 字节的 `404: Not Found` 文本，
 * 不拦下来的话会把它当音频写进盘，表现是「某几条拼音静默无声」。
 */
const MIN_BYTES = 1024

/**
 * 声母表，**按长度降序**——`zh` 必须排在 `z` 前面匹配。
 *
 * ⚠️ 与 `src/domain/pinyin.ts` 的 `INITIAL_PATTERNS` **逐字一致**：
 * 那边是运行时用的，脚本不能 import TS，只能复制一份。
 * 改了一边必须改另一边，否则 `pinyinbare.*` 的 key 会和拼音墙引用不上。
 */
const INITIAL_PATTERNS = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w',
]

const initialOf = (base) => INITIAL_PATTERNS.find((p) => base.startsWith(p)) ?? ''

/** 参与「带调音节」的音节表，顺序与 `pinyinSyllables.ts` 的 dedupe 优先级一致 */
const GROUP_ORDER = [
  'INITIALS', 'SINGLE_FINALS', 'TONE_SET', 'COMPOUND_FINALS',
  'INTEGRAL_SYLLABLES', 'BLEND_SYLLABLES', 'TRIPLE_SYLLABLES',
]

/**
 * 这份素材要产出哪些片段。见 design/11 §3.2 的映射规则。
 *
 * @returns `{ key, src }[]` —— key 是本项目的片段 key，src 是上游文件名（不含扩展名）
 */
function planClips() {
  const groups = parseSyllableGroups()

  /** 118 条带调音节。先出现者优先，与 pinyinSyllables.ts 的 dedupe 同规则 */
  const syllable = new Set()
  for (const name of GROUP_ORDER) {
    for (const s of groups[name] ?? []) {
      syllable.add(`${s.base.replace(/ü/g, 'v')}${s.tone}`)
    }
  }

  /**
   * 47 条本音：声母用 `initialOf(base)`（`fo` → `f`），韵母用 base 本身。
   * ⚠️ 只有声母表与韵母表参与——`TONE_SET`（mā má mǎ mà）是**声调教学**，
   * 四个字必须各带各的调；`BLEND`/`TRIPLE`/`INTEGRAL` 本就念音节。
   */
  const bare = new Set()
  for (const s of groups.INITIALS ?? []) bare.add(initialOf(s.base))
  for (const name of ['SINGLE_FINALS', 'COMPOUND_FINALS']) {
    for (const s of groups[name] ?? []) bare.add(s.base.replace(/ü/g, 'v'))
  }

  return [
    ...[...syllable].map((k) => ({ key: `pinyin.${k}`, src: `${k}.mp3` })),
    ...[...bare].map((k) => ({ key: `pinyinbare.${k}`, src: `${k}.mp3` })),
  ]
}

/**
 * 逐行状态机解析 `pinyinSyllables.ts` 的分组。
 *
 * ⚠️ 不是一条大正则：这里要的是「这条属于哪张表」，
 * 而 `ALL_SYLLABLES` 是 `dedupe([...])` 拼出来的、`SYLLABLES_NEEDING_RECORDING`
 * 是 filter 出来的，正则拿不到分组归属。逐行扫描时遇到
 * `export const XXX: readonly` 就切组，遇到行首 `]` 就收尾。
 */
function parseSyllableGroups() {
  const text = readFileSync(SYLLABLES_FILE, 'utf-8')
  const groups = {}
  let current = null

  for (const raw of text.split('\n')) {
    const head = raw.match(/^export const ([A-Z_]+): readonly/)
    if (head !== null) {
      current = head[1]
      groups[current] = []
      continue
    }
    if (current === null) continue
    if (/^\]/.test(raw)) {
      current = null
      continue
    }
    // 形如：  { pinyin: 'bō', base: 'bo', tone: 1, char: '玻' },
    //  后面可能跟 soundOnly / toneless / initial 等，这里不需要
    const item = raw.match(/\{\s*pinyin:\s*'[^']+',\s*base:\s*'([^']+)',\s*tone:\s*(\d)/)
    if (item !== null) groups[current].push({ base: item[1], tone: Number(item[2]) })
  }

  // ⚠️ 硬失败而不是警告：结构变了却不同步这里，后果是拼音整片没有音频
  const expected = { INITIALS: 23, SINGLE_FINALS: 6, TONE_SET: 4, COMPOUND_FINALS: 18 }
  for (const [name, count] of Object.entries(expected)) {
    const got = groups[name]?.length ?? 0
    if (got !== count) {
      console.error(`✗ pinyinSyllables.ts 的 ${name} 解析出 ${got} 条（应为 ${count}），本脚本必须同步`)
      process.exit(1)
    }
  }
  return groups
}

/** 是不是一个像样的 mp3 —— ID3 标签，或 MPEG 帧同步头（`FF Ex` / `FF Fx`） */
function isMp3(buf) {
  if (buf.length < MIN_BYTES) return false
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const checkOnly = args.includes('--check')

const wanted = planClips()
const lock = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, 'utf-8')) : {}
mkdirSync(OUT_DIR, { recursive: true })

/** 文件已存在、台账哈希也对得上 → 无需再下 */
function isReady({ key }) {
  if (force) return false
  const file = join(OUT_DIR, `${key}.mp3`)
  if (!existsSync(file)) return false
  const expected = lock[key]
  if (expected === undefined) return false
  return createHash('sha256').update(readFileSync(file)).digest('hex') === expected
}

const pending = wanted.filter((w) => !isReady(w))

console.log(`拼音素材共 ${wanted.length} 条（带调音节 118 · 本音 47）`)
for (const name of ['pinyin.', 'pinyinbare.']) {
  const n = wanted.filter((w) => w.key.startsWith(name)).length
  const p = pending.filter((w) => w.key.startsWith(name)).length
  console.log(`  ${name}* ${n} 条，待获取 ${p} 条`)
}

if (checkOnly) {
  const missing = wanted.filter((w) => !existsSync(join(OUT_DIR, `${w.key}.mp3`)))
  if (missing.length > 0) {
    console.error(`\n✗ 缺少 ${missing.length} 条：${missing.slice(0, 8).map((m) => m.key).join(' ')}…`)
    process.exit(1)
  }
  console.log('\n✓ 全部就绪')
  process.exit(0)
}

if (pending.length === 0) {
  console.log('\n全部已就绪，无需下载。要重下请加 --force')
  process.exit(0)
}

let done = 0
const failures = []

async function worker(queue) {
  while (queue.length > 0) {
    const item = queue.shift()
    try {
      const res = await fetch(`${BASE}/${item.src}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (!isMp3(buf)) throw new Error(`不是有效 mp3（${buf.length} 字节）`)
      writeFileSync(join(OUT_DIR, `${item.key}.mp3`), buf)
      lock[item.key] = createHash('sha256').update(buf).digest('hex')
      done += 1
      process.stdout.write(`\r  已获取 ${done}/${pending.length}  `)
    } catch (error) {
      failures.push({ key: item.key, message: error.message ?? String(error) })
    }
  }
}

const queue = [...pending]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

// 只记成功的：失败的留在旧记录上，下次重试
writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 1), 'utf-8')

console.log(`\n\n完成：成功 ${done} 条，失败 ${failures.length} 条`)
for (const f of failures) console.error(`  ✗ ${f.key}: ${f.message}`)
if (failures.length > 0) {
  console.log('\n失败的重跑一次即可 —— 脚本只补缺失的')
  process.exit(1)
}
console.log(`输出目录：${OUT_DIR}`)
