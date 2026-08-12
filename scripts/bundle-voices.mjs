/**
 * 语音打包 —— 把几百条 mp3 片段拼成少数几个「语音包」
 *
 *   node scripts/bundle-voices.mjs        （npm run voices 结束时也会自动执行）
 *
 * ## 为什么要打包
 *
 * 首次安装要下载全部语音。764 个 ~15KB 的小文件，时间几乎都花在
 * 「发请求、等响应」上——在 GitHub Pages + 国内网络（高延迟）下要等好几分钟。
 * 拼成 7 个 1~3MB 的包后，同样的字节数只要不到 10 个请求。
 *
 * ## 原理：mp3 直接首尾相接，切出来就能解码
 *
 * 每条 mp3 本身是完整文件。按字节原样拼接、记下 [包名, 偏移, 长度]，
 * 运行时 `buffer.slice(offset, offset + length)` 得到的就是那个完整 mp3，
 * `decodeAudioData` 直接吃——不需要任何容器格式或重编码。
 *
 * ## 产物
 *
 * - `public/audio/bundles/<组名><卷号>.bin` —— ⚠️ 不进 git（.gitignore），
 *   构建链（npm run build）每次重新生成，保证与 mp3 一致
 * - `src/data/seed/voiceBundleIndex.ts` —— 索引，**要提交**：
 *   运行时靠它定位切片，测试靠它校验「清单里的片段都打进包了」
 *
 * ⚠️ 打包输入是 `public/audio/voice/` 里的**全部 mp3 文件**（不是清单）：
 * 清单驱动的是生成；文件在盘上就打进去，多打的只是死字节，
 * 少打（清单有、文件没有）由 voiceBundleIndex.test.ts 拦下。
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOICE_DIR = join(ROOT, 'public', 'audio', 'voice')
const OUT_DIR = join(ROOT, 'public', 'audio', 'bundles')
const INDEX_FILE = join(ROOT, 'src', 'data', 'seed', 'voiceBundleIndex.ts')

/**
 * 分卷上限。两个约束：
 * - 必须小于 Workbox 预缓存的单文件上限（vite.config 设了 4MB），超了会被静默排除
 * - 包太大会让下载进度长时间不动，太小又回到「请求数爆炸」的老问题
 */
const MAX_PART_BYTES = 3 * 1024 * 1024

/**
 * key 前缀 → 组名。按内容域分组而不是平均切：
 * 同域的片段要么一起用（进拼音页取拼音包），要么一起不用，缓存粒度正好。
 */
const GROUPS = [
  ['pinyin.', 'pinyin'],
  ['en.', 'english'],
  ['hanzi.', 'hanzi'],
  ['poem.', 'poem'],
  ['petline.', 'pet'],
  ['petname.', 'pet'],
  ['pet.', 'pet'],
  ['name.', 'pet'],
  ['explain.', 'explain'],
  // 其余（num/op/phrase/word）都是题干组装件 → core
]

function groupOf(key) {
  for (const [prefix, group] of GROUPS) {
    if (key.startsWith(prefix)) return group
  }
  return 'core'
}

// ── 按组收集，组内按 key 排序：内容不变则字节不变，不产生无谓的重新部署 ──
const files = readdirSync(VOICE_DIR)
  .filter((f) => f.endsWith('.mp3'))
  .sort()

const byGroup = new Map()
for (const file of files) {
  const key = file.slice(0, -'.mp3'.length)
  const group = groupOf(key)
  byGroup.set(group, [...(byGroup.get(group) ?? []), key])
}

// ── 拼接与分卷 ──
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

/** key → [包文件名, 偏移, 长度] */
const index = {}
/** 每个包 `{ file, bytes }`：启动自检门用字节数显示进度（8 个包的计数太粗） */
const bundles = []

for (const [group, keys] of [...byGroup.entries()].sort()) {
  let part = 0
  let chunks = []
  let offset = 0

  const flush = () => {
    if (chunks.length === 0) return
    const name = `${group}${part}.bin`
    const bytes = Buffer.concat(chunks)
    writeFileSync(join(OUT_DIR, name), bytes)
    bundles.push({ file: name, bytes: bytes.length })
    part += 1
    chunks = []
    offset = 0
  }

  for (const key of keys) {
    const bytes = readFileSync(join(VOICE_DIR, `${key}.mp3`))
    // 单条就超限的文件不该存在（最长的讲解句也远小于 1MB），真出现就让它独占一卷
    if (offset > 0 && offset + bytes.length > MAX_PART_BYTES) flush()
    index[key] = [`${group}${part}.bin`, offset, bytes.length]
    chunks.push(bytes)
    offset += bytes.length
  }
  flush()
}

// ── 生成索引模块（要提交；运行时与测试都读它）──
const entries = Object.keys(index)
  .sort()
  .map((key) => `  '${key}': ['${index[key][0]}', ${index[key][1]}, ${index[key][2]}],`)
  .join('\n')

const indexSource = `/**
 * @file 语音包索引 —— 每个片段在哪个包的哪一段
 * @layer data  静态内容，随 App 版本内置
 * @see scripts/bundle-voices.mjs     ⚠️ 本文件由它生成，手改会在下次打包时被覆盖
 * @see src/platform/voiceBundles.ts  运行时怎么按索引切片
 *
 * 首次安装只需下载这 ${bundles.length} 个包（共 ${files.length} 条片段），
 * 而不是几百个小文件——请求数才是首装耗时的大头，字节数不是。
 */

/** [包文件名, 字节偏移, 字节长度]。按这三个数切出来的就是一个完整 mp3 */
export type VoiceBundleEntry = readonly [file: string, offset: number, length: number]

/** 一个语音包。\`bytes\` 供启动自检门按体积显示下载进度 */
export interface VoiceBundle {
  file: string
  bytes: number
}

/** 全部语音包。启动自检门按它审计缓存、补录 */
export const VOICE_BUNDLES: readonly VoiceBundle[] = ${JSON.stringify(bundles, null, 2)}

/** 全部语音包的总字节数 */
export const VOICE_BUNDLE_TOTAL_BYTES = ${bundles.reduce((s, b) => s + b.bytes, 0)}

export const VOICE_BUNDLE_INDEX: Readonly<Record<string, VoiceBundleEntry>> = {
${entries}
}
`

writeFileSync(INDEX_FILE, indexSource, 'utf-8')

const totalMb = (bundles.reduce((sum, b) => sum + b.bytes, 0) / 1024 / 1024).toFixed(1)
console.log(`语音包：${files.length} 条片段 → ${bundles.length} 个包（${totalMb}MB）`)
console.log(`  ${bundles.map((b) => b.file).join('  ')}`)
