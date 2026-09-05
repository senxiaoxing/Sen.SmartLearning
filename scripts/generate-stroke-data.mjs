/**
 * @file 把笔顺数据打进 App —— 只打**人工核对通过**的那些字
 *
 * ## ⭐ 数据文件本身就是白名单
 *
 * design/09 §6.4 的兜底是「验不了的字就不给笔顺」。实现方式不是加一个
 * `strokeOrderVerified: false` 字段，而是**根本不把它放进这个 JSON**——
 * 查不到的字，写字墙上就不会出现。
 *
 * 这样不存在「标了 true 却没有数据」或者「有数据但忘了标」这类自相矛盾的状态，
 * 而笔顺写错给一年级孩子看，是要靠手上的肌肉记忆去改的，代价比读音还高。
 *
 * ## 三辑 300 字都已核对通过
 *
 * 第一辑 2026-09-04、第二三辑 2026-09-05，都是 `npm run stroke:check` 生成校验页、
 * 人对着课本逐字比序号过的。
 *
 * 加辑的流程：`npm run stroke:check -- N` → 人工核对 → 通过后把那一辑加进
 * {@link VERIFIED_VOLUMES} → `npm run stroke:data`。
 * ⚠️ 写字墙是**按辑**摆的，加辑不会把滚动接长，见 `StrokeWall.tsx`。
 *
 * 用法：npm run stroke:data
 *
 * @see design/09-竞品借鉴.md §6  验收方案（验部件不是验字）
 * @see src/components/TianGrid.tsx  运行时怎么画
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cnchar from 'cnchar'
import order from 'cnchar-order'

cnchar.use(order)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HANZI_FILE = join(ROOT, 'src', 'data', 'seed', 'hanziCards.ts')
const CACHE_DIR = join(ROOT, '.cache', 'strokes')
const OUT_FILE = join(ROOT, 'src', 'data', 'seed', 'strokeOrder.json')

/** ⚠️ 与 generate-stroke-check.mjs 必须钉同一个版本，否则校验过的和打进去的不是一批数据 */
const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1'

/**
 * 已经人工核对通过的辑。**只有列在这里的才会进 App。**
 *
 * ⛔ 不要凭「上游声称遵循大陆笔顺」就往里加——那只是目标，不是保证。
 * 加之前必须真的用 `npm run stroke:check` 对着课本过一遍。
 */
const VERIFIED_VOLUMES = ['vol1', 'vol2', 'vol3']

/** 扫 hanziCards.ts，按辑攒出字表 */
function loadVolumes() {
  const text = readFileSync(HANZI_FILE, 'utf-8')
  const volumes = []

  // 三辑的字表各自声明在 VOLUME_N_GROUPS 里，按声明顺序对应 vol1/vol2/vol3
  for (let n = 1; n <= 9; n += 1) {
    const start = text.indexOf(`const VOLUME_${n}_GROUPS`)
    if (start < 0) break
    const next = text.indexOf(`const VOLUME_${n + 1}_GROUPS`)
    const body = text.slice(start, next < 0 ? undefined : next)

    const chars = []
    for (const raw of body.split('\n')) {
      // ⚠️ 与 generate-voices.mjs 的 loadHanzi() 同一条正则约定：
      //    h(...) 独占一行，参数顺序为「字, 拼音, 组词, 图」
      const m = raw.match(/^\s*h\('(.)',/)
      if (m !== null) chars.push(m[1])
    }
    if (chars.length > 0) volumes.push({ id: `vol${n}`, chars })
  }
  return volumes
}

/**
 * 取一个字每一笔的名称（「横」「竖折折钩」…），给孩子书空时念。
 *
 * ⚠️ **这是第二个数据源**（cnchar），与笔顺图形（makemeahanzi）各来一处。
 * 两者的笔数必须逐字相等，否则名称会整体错位——那比没有名称更糟。
 * {@link main} 里对此有硬校验，对不上就中止，不会悄悄产出半套数据。
 *
 * 清理两种写法：
 * - `点2` → `点`：cnchar 用尾缀数字区分同名笔画的变体，孩子不需要
 * - `横撇|横钩` → `横撇`：一笔两种叫法时取前一种，竖杠她读不出来
 */
function strokeNames(char) {
  const raw = cnchar.stroke(char, 'order', 'name')[0] ?? []
  return raw.map((name) => String(name).split('|')[0].replace(/\d+$/, ''))
}

/** 拉一个字的笔顺数据，带本地缓存（`.cache/` 已 gitignore） */
async function fetchChar(char) {
  const cached = join(CACHE_DIR, `${char.codePointAt(0).toString(16)}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf-8'))

  const res = await fetch(`${CDN}/${encodeURIComponent(char)}.json`)
  if (!res.ok) throw new Error(`${char} 拉取失败：HTTP ${res.status}`)
  const data = await res.json()
  writeFileSync(cached, JSON.stringify(data), 'utf-8')
  return data
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true })

  const volumes = loadVolumes()
  const chars = volumes.filter((v) => VERIFIED_VOLUMES.includes(v.id)).flatMap((v) => v.chars)
  const skipped = volumes.filter((v) => !VERIFIED_VOLUMES.includes(v.id))

  console.log(`已核对的辑：${VERIFIED_VOLUMES.join('、')} —— 共 ${chars.length} 字`)
  for (const v of skipped) {
    console.log(`⏸ ${v.id}（${v.chars.length} 字）未核对，不打进 App`)
  }

  const out = {}
  const nameMismatch = []
  for (let i = 0; i < chars.length; i += 10) {
    await Promise.all(
      chars.slice(i, i + 10).map(async (char) => {
        const data = await fetchChar(char)
        const names = strokeNames(char)
        if (names.length !== data.strokes.length) {
          nameMismatch.push(`${char}（图形 ${data.strokes.length} 笔，名称 ${names.length} 个）`)
          return
        }
        // ⚠️ 只留画得出动画的字段。radStrokes（部首笔画索引）用不上，
        //    而这份数据是要随包发布的，每个字段都要乘以 100
        out[char] = { strokes: data.strokes, medians: data.medians, names }
      }),
    )
    process.stdout.write(`\r处理中 ${Math.min(i + 10, chars.length)}/${chars.length}`)
  }
  console.log('')

  // ⛔ 一个都不许错位：名称与笔画对不上，孩子书空时念的就是别的笔
  if (nameMismatch.length > 0) {
    console.error(`\n❌ ${nameMismatch.length} 个字的笔画名称与图形笔数不一致，已中止：`)
    for (const line of nameMismatch) console.error(`   ${line}`)
    process.exit(1)
  }

  // ⚠️ 按字表顺序写，不要用对象字面量的插入顺序碰运气 —— diff 要稳定
  const ordered = {}
  for (const char of chars) if (out[char] !== undefined) ordered[char] = out[char]

  writeFileSync(OUT_FILE, JSON.stringify(ordered), 'utf-8')

  const kb = Math.round(readFileSync(OUT_FILE).length / 1024)
  console.log(`\n✅ ${Object.keys(ordered).length} 字 → ${OUT_FILE}（${kb} KB）`)
  console.log('   它由动态 import() 懒加载，进独立 chunk，不压首屏也不影响离线')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
