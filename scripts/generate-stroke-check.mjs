/**
 * @file 笔顺校验页生成 —— 把「300 个字的笔顺对不对」变成「翻十几次课本」
 *
 * ⭐⭐ **为什么必须有这个东西**
 *
 * 笔顺数据来自 hanzi-writer-data（上游 makemeahanzi）。那个项目**明确以大陆
 * (PRC) 笔顺为目标**，所以方向是对的；但笔顺是从字体数据**提取**的、不是人工
 * 逐字录入，而它自述的人工校验主要覆盖繁体字。**目标对了，不保证每个字都对。**
 *
 * 而写错笔顺是这个项目里代价最高的一类错误（与古诗读音同构，见 poem:check）：
 * 改代码能修好，孩子手上的肌肉记忆要很久才纠正得过来。
 *
 * ## ⭐ 核心：验收单位是**部件**，不是字
 *
 * 笔顺分歧不是随机撒在 100 个字里的，它集中在特定部件与特定字形上。
 * 「忄」在快、慢、情、怕里完全一样——验一次「忄」等于验了所有含忄的字。
 * 所以这一页做的是**排序与筛选**，不是替人做判断：
 *
 *   ① 已知多标准分歧的字（火、田这类）           排最前
 *   ② 简化字特有字形（马、鸟、书、长……）         次之——繁体字体里没有对应，
 *                                                提取路径与其他字不同，风险更高
 *   ③ 同部件字之间笔顺**不一致**的（自动检出）    数据一定有错，必看
 *   ④ 先中间后两边 / 先外后内再封口 的字          规则明确但提取易错
 *   ⑤ 其余                                        抽查即可
 *
 * ## ⭐ 每笔起点标了序号 —— 这一页真正好用的地方
 *
 * 核对笔顺不该靠盯动画。标了序号之后，一年级课本的生字表摊在旁边，
 * **一眼就能比完一个字**。动画是给「看不出这一笔是哪一笔」时用的补充。
 *
 * ⚠️ 页面上的「笔画类型」（横竖撇捺折）是从中线坐标**推导**的，
 * 只用于展示和同部件比对，**不能当判定依据**——它分不开点与捺、提与横。
 *
 * ## ⛔ 分寸
 *
 * 这个脚本负责筛选、排序、把权威参考摆到手边。
 * **它不判定任何一个字的笔顺对不对**——那要人对着教材看。
 * 没通过的字将来在 `hanziCards` 上标 `strokeOrderVerified: false`，
 * 只显示田字格与字形、不演示笔顺。见 design/09 §6.4。
 *
 * 用法：npm run stroke:check          第一辑（默认）
 *       npm run stroke:check -- 2    第二辑
 *       npm run stroke:check -- 3    第三辑
 *
 * 每一辑生成各自的页面（`stroke-check.html` / `stroke-check-vol2.html` …），
 * ⚠️ **不要让它们互相覆盖**：核对是分次做的，把上一辑的页面冲掉
 * 等于让已经核对过的那批无从回看。
 *
 * @see design/09-竞品借鉴.md §6  验收方案（验部件不是验字）
 * @see src/data/seed/hanziCards.ts  三辑字表
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

/**
 * 要核对第几辑。`npm run stroke:check -- 2`
 *
 * 默认第一辑：它已经核对完了，重跑一次是最常见的用法（回看某个字）。
 */
const VOLUME = (() => {
  const arg = process.argv[2]
  if (arg === undefined) return 1
  const n = Number(arg)
  if (!Number.isInteger(n) || n < 1 || n > 3) {
    throw new Error(`辑号只能是 1、2、3，收到「${arg}」`)
  }
  return n
})()

/** ⚠️ 每辑各自一个文件，别互相覆盖——见文件头 */
const OUT_FILE = join(ROOT, 'public', VOLUME === 1 ? 'stroke-check.html' : `stroke-check-vol${VOLUME}.html`)

/** 笔顺数据源。⚠️ 版本要钉死：换版本笔顺可能变，而变了没有任何提示 */
const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1'

/**
 * ① 已知多标准分歧的字形。
 *
 * 这几处大陆与台湾/香港/日本的规范**真的不同**，而数据的字形来源是台湾字体，
 * 正是最可能残留另一套顺序的地方。
 *
 * ⚠️ 宁可宽、不要窄（与 poem-check 的多音字表同一条规矩）：
 * 多列一个字的代价只是多看一眼，漏一个则是教错。
 */
const DIVERGENT = {
  火: '大陆 点·撇·撇·捺；台湾 撇·点·撇·捺 —— 最经典的一处分歧',
  秋: '含「火」作左偏旁，跟着「火」一起验',
  田: '先外后内再封口：竖·横折·横·竖·横。封口那一横必须最后',
  四: '同「田」：封口的横在最后，不是写完框就封',
  果: '上半是「田」，跟着「田」一起验',
  日: '先外后内再封口，三笔顺序易错',
  目: '同「日」，中间两横在封口之前',
  月: '先撇后横折钩，里面两横最后',
  口: '竖·横折·横 —— 所有含口的字都依赖它',
  白: '撇在最前，然后才是「日」的框',
  // —— 第二辑
  灯: '含「火」作左偏旁，跟着「火」一起验',
  瓜: '5 笔：撇·撇·竖提·点·捺 —— 起笔与中间的先后两岸有出入',
  象: '下半是「豕」，与「家」同一个难点，两个一起验',
  面: '9 笔，中间先外后内，封口那一横在最后',
  // —— 第三辑
  里: '含「田」，跟着「田」一起验',
  男: '上「田」下「力」，跟着「田」一起验',
  是: '上「日」下「疋」，跟着「日」一起验',
  音: '上「立」下「日」，跟着「日」一起验',
  阳: '左「阝」右「日」，「阝」两笔的顺序易错',
}

/**
 * ② 简化字特有字形。
 *
 * ⭐ 这一类单列，是因为**风险来源和 ① 不同**：数据的图形来自两套 Arphic 繁体
 * 字体，简化字在那里没有直接对应，简体那部分的提取路径与繁体不是一回事，
 * 而上游自述的人工校验主要覆盖的正是繁体。
 */
const SIMPLIFIED = {
  马: '简化字 3 笔：横折·竖折折钩·横',
  鸟: '简化字 5 笔，第一笔是撇不是竖',
  鸭: '右半「鸟」，跟着「鸟」一起验',
  鸡: '右半「鸟」，跟着「鸟」一起验',
  长: '简化字 4 笔：撇·横·竖提·捺 —— 常被写成先横',
  飞: '简化字 3 笔：横斜钩·点·提',
  书: '简化字 4 笔：横折·横折钩·竖·点',
  头: '简化字 5 笔，上面两点先左后右，再横·撇·点',
  门: '简化字 3 笔：点·竖·横折钩 —— 第一笔是点，常被写成竖',
  车: '简化字 4 笔：横·撇折·竖·横',
  风: '简化字 4 笔：撇·横斜钩·撇·点',
  关: '上面「丷」先点后撇，共 6 笔',
  鱼: '简化字 8 笔，下面一横最后',
  笔: '竹字头 + 毛，下半「毛」末笔竖弯钩',
  黄: '简化字中部结构，11 笔里最容易错的一批',
  尺: '尸 + 撇捺，4 笔',
  儿: '撇 + 竖弯钩',
  // —— 第二辑。⚠️ 部件类只留一个代表字（讠·纟·钅·饣 各一个），
  //    其余同旁的字由 ③ 层同部件一致性自动兜住，不必都摆进必看清单
  汤: '简化字 6 笔，右半不是繁体的「昜」',
  学: '简化字 8 笔，上面三点的顺序易错',
  写: '简化字 5 笔，上面是「冖」不是「宀」',
  画: '简化字 8 笔，先外后内再封口',
  电: '简化字 5 笔，末笔竖弯钩',
  读: '讠旁简化字 2 笔：点·横折提 —— 讠旁代表字',
  给: '纟旁简化字 3 笔：撇折·撇折·提 —— 纟旁代表字',
  镜: '钅旁简化字 5 笔 —— 钅旁代表字',
  饭: '饣旁简化字 3 笔：撇·横钩·竖提 —— 饣旁代表字',
  师: '简化字 6 笔',
  楼: '右半「娄」是简化字形',
  树: '简化字 9 笔，中间是「又」',
  叶: '简化字 5 笔：口 + 十',
  伞: '简化字 6 笔',
  表: '简化字 8 笔',
  骑: '马字旁，跟着「马」一起验',
  // —— 第三辑
  见: '简化字 4 笔',
  乐: '简化字 5 笔，常被写成先写中间那一竖',
  欢: '简化字 6 笔，左「又」右「欠」',
  爱: '简化字 10 笔，中间「冖」下面是「友」不是「爫」',
  万: '简化字 3 笔：横·横折钩·撇',
  双: '简化字 4 笔，两个「又」',
  只: '简化字 5 笔',
  声: '简化字 7 笔',
  响: '简化字 9 笔',
  丽: '简化字 7 笔',
  气: '4 笔：撇·横·横·横斜钩',
  圆: '简化字，先外后内再封口',
}

/**
 * ④ 规则明确、但提取容易出错的两类。
 *
 * 「先中间后两边」和「先外后内再封口」是笔顺规范里最硬的两条规则，
 * 也正因为硬，一旦数据错了就是明显的错。
 */
const RULE_RISK = {
  水: '先中间后两边：竖钩·横撇·撇·捺',
  小: '先中间后两边：竖钩·撇·点',
  少: '先中间：竖·撇·点·撇',
  山: '先中间：竖·竖折·竖',
  米: '上两点 → 横 → 竖 → 下两笔',
  雨: '先横·竖·横折钩，四点最后且左两点先',
  雪: '雨字头，跟着「雨」一起验',
  包: '先外「勹」后内「巳」',
  心: '点·卧钩·点·点 —— 卧钩在第二笔',
  牙: '4 笔，第一笔是横不是竖',
  兔: '最后那一点单独一笔，常被漏或提前',
  坐: '两个「人」在上、「土」在下，共 7 笔',
  来: '横 → 两点 → 横 → 竖 → 撇 → 捺',
  看: '上半是「手」的变形，第一笔是撇',
  衣: '点·横·撇·竖提·撇·捺',
  羊: '上面两点先左后右，末笔竖',
  开: '横·横·撇·竖',
  弟: '7 笔，上面两点与中间竖的先后易错',
  家: '宀 + 豕，「豕」的笔顺是这个字的难点',
  春: '上面三横一撇一捺，然后「日」',
  青: '上半「龶」三横一竖，然后「月」',
  黑: '12 笔，下面四点最后',
  虎: '虍字头，笔顺易错',
  石: '横·撇·竖·横折·横',
  九: '撇 + 横折弯钩',
  七: '横 + 竖弯钩',
  // —— 第二辑
  快: '⭐ 忄旁：先左点·再右点·后竖 —— 所有含忄的字都依赖它',
  沙: '氵 + 少，「少」先中间后两边，跟着「少」一起验',
  冰: '两点水（不是三点水）+ 水，「水」先中间',
  光: '先中间那一竖，6 笔',
  用: '先外后内：撇·横折钩·横·横·竖',
  园: '先外后内再封口，封口的横在最后',
  舌: '撇·横·竖·横折·横',
  鼻: '14 笔，上「自」中「田」下「廾」',
  熊: '下面四点最后，与「黑」同一条规则',
  年: '6 笔，末笔是竖',
  生: '5 笔，先撇后横',
  找: '扌 + 戈，斜钩与那一点的先后易错',
  拿: '上「合」下「手」，8 笔',
  停: '亻 + 亭，「亭」的结构是难点',
  窗: '穴 + 囱，先外后内',
  夏: '10 笔，中间「自」下面「夂」',
  病: '疒字头 5 笔：点·横·撇·点·提',
  睡: '目 + 垂，「垂」的横竖顺序易错',
  // —— 第三辑
  半: '先两点后横，末笔是竖',
  尖: '上「小」下「大」，「小」先中间后两边',
  亮: '9 笔，先外后内',
  高: '10 笔，先外后内',
  女: '⭐ 女旁三笔的基准字，所有含女的字都依赖它',
  王: '4 笔：横·横·竖·横 —— 「球」「琴」都靠它',
  美: '9 笔，上面两点先左后右',
  真: '10 笔，中间三横，下面两点最后',
  舞: '14 笔，中间四竖是难点',
  戏: '又 + 戈，戈上那一点在最后',
  热: '简化字，下面四点最后',
  友: '4 笔：横·撇·横撇·捺',
  名: '夕 + 口，「夕」先撇后横撇',
  喜: '12 笔，上「士」中「口」下「豆」',
  彩: '左「采」右「彡」，「彡」三撇从上到下',
  紫: '上「此」下「糸」，「糸」的顺序易错',
}

/**
 * ⚠️ 这张表刻意**没有**收「走·足·多·好·奶·本」这类。
 *
 * 它们不是不会错，是**结构清晰、错了一眼看得出来**，而这一页的成本全在人工核对上：
 * 标红 60 个和标红 25 个，后者才有人真的一个一个看完。宁可让它们落进「抽查即可」，
 * 也不要把必看清单撑到没人看。
 *
 * ——这与 poem-check 的多音字表「宁可宽、不要窄」正好相反，因为两者的瓶颈不同：
 * 那边漏一条就永远听不到，这边漏一条仍然会出现在页面上，只是排在后面。
 */

/**
 * ③ 同部件字的内部一致性检查。
 *
 * ⭐ 这是这一页唯一**自动**的判据，而且不需要任何外部数据源：
 * 含同一个偏旁的字，那个偏旁的笔画类型序列必须一模一样。
 * 对不上说明数据本身就有错——不需要懂笔顺也能断定。
 *
 * `at` 说的是**取前 n 笔还是后 n 笔**：`'left'` 取前 n（左偏旁、字头都算），
 * `'right'` 取后 n（右偏旁、字底）。
 *
 * ⚠️ 比的是每笔**首末点的方向角**，不是推导出的笔画类型——
 * 分类有边界抖动，角度没有。实测同一个偏旁在不同字里的角度差在 5° 以内，
 * 而笔顺真的不同会差几十度，{@link ANGLE_TOLERANCE} 取 25° 留足余量。
 *
 * ⚠️ `chars` 把**三辑的字都列全**，脚本只比当前辑里存在的那些。
 * 一组在某一辑里凑不满 2 个字就自动跳过——所以看到「全部通过」时，
 * 要先确认它真的比了东西，见 main() 末尾打印的组数。
 */
const PART_GROUPS = [
  { part: '女', at: 'left', n: 3, chars: ['妈', '姐', '妹', '好', '奶', '她', '姓'] },
  { part: '口', at: 'left', n: 3, chars: ['吃', '听', '唱', '喊', '叫'] },
  { part: '犭', at: 'left', n: 3, chars: ['猫', '狗', '猴', '狮', '猪'] },
  { part: '鸟', at: 'right', n: 5, chars: ['鸭', '鸡'] },
  { part: '木', at: 'left', n: 4, chars: ['桃', '桥', '村', '林', '树', '校', '楼', '棋', '杯'] },
  { part: '亻', at: 'left', n: 2, chars: ['他', '停'] },
  // —— 以下是第二、三辑带进来的新部件。⭐「忄」正是 design/09 §6.2 举的例子：
  //    验一次它，等于验了所有含忄的字
  { part: '忄', at: 'left', n: 3, chars: ['快', '慢'] },
  { part: '氵', at: 'left', n: 3, chars: ['汤', '洗', '汗', '海', '河', '沙', '游', '泡', '温'] },
  { part: '艹', at: 'left', n: 3, chars: ['草', '菜', '蓝'] },
  { part: '虫', at: 'left', n: 6, chars: ['蛇', '蜂', '蝶', '蚁', '虾'] },
  { part: '饣', at: 'left', n: 3, chars: ['饭', '饿'] },
  { part: '衤', at: 'left', n: 5, chars: ['袜', '裤'] },
  { part: '足', at: 'left', n: 7, chars: ['跑', '跳', '路'] },
  { part: '讠', at: 'left', n: 2, chars: ['读', '课', '谢', '请', '话', '语', '诗'] },
  { part: '纟', at: 'left', n: 3, chars: ['给', '线', '绿'] },
  { part: '钅', at: 'left', n: 5, chars: ['镜', '钱', '钥', '锁', '铃'] },
  { part: '目', at: 'left', n: 5, chars: ['眼', '睛', '睡'] },
  { part: '日', at: 'left', n: 4, chars: ['明', '晚', '阳'] },
  { part: '穴', at: 'left', n: 5, chars: ['穿', '窗', '空'] },
  { part: '竹', at: 'left', n: 6, chars: ['笔', '筷', '筝'] },
  { part: '宀', at: 'left', n: 3, chars: ['家', '字', '安'] },
  { part: '冫', at: 'left', n: 2, chars: ['冰', '冷', '凉'] },
  { part: '雨', at: 'left', n: 8, chars: ['雪', '雷', '零'] },
]

/** 同部件角度差超过它才算不一致。见 {@link PART_GROUPS} 的说明 */
const ANGLE_TOLERANCE = 25

/**
 * 第 `n` 辑 100 字：扫 `VOLUME_n_GROUPS` 到下一辑之间的 `h(...)` 声明。
 *
 * 最后一辑没有「下一个 VOLUME_」可当终点，改用 `HANZI_VOLUMES` 那行——
 * 它紧跟在三辑声明之后，是文件里稳定的分界。
 */
function loadVolume(n) {
  const text = readFileSync(HANZI_FILE, 'utf-8')
  const start = text.indexOf(`const VOLUME_${n}_GROUPS`)
  const next = text.indexOf(`const VOLUME_${n + 1}_GROUPS`)
  const end = next >= 0 ? next : text.indexOf('export const HANZI_VOLUMES')
  if (start < 0 || end < 0) throw new Error(`没找到第 ${n} 辑的字表`)

  const cards = []
  let group = ''
  for (const raw of text.slice(start, end).split('\n')) {
    const nameMatch = raw.match(/^\s*name:\s*'([^']+)',/)
    if (nameMatch !== null) { group = nameMatch[1]; continue }
    // ⚠️ 与 generate-voices.mjs 的 loadHanzi() 同一条正则约定：
    //    h(...) 必须独占一行、参数顺序为「字, 拼音, 组词, 图」
    const m = raw.match(/^\s*h\('(.)',\s*'([^']+)',\s*'([^']+)'/)
    if (m !== null) cards.push({ char: m[1], pinyin: m[2], word: m[3], group })
  }
  return cards
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

const angleOf = ([x0, y0], [x1, y1]) => (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI

/** 中线的实际长度（折线各段之和） */
function pathLen(median) {
  let len = 0
  for (let i = 1; i < median.length; i++) {
    len += Math.hypot(median[i][0] - median[i - 1][0], median[i][1] - median[i - 1][1])
  }
  return len
}

/**
 * ⭐ 是不是带转折的笔画，看**弯曲度**：中线实际长度 ÷ 首末直线距离。
 *
 * ⚠️ 第一版用「首段方向 vs 末段方向的夹角」，**误报了 3 组**（女旁 5 字、
 * 口旁、鸟旁全被判成笔顺不一致）。原因是点数少的笔画（提只有 4~5 个采样点）
 * 首末两小段就是全部，末端一点点上翘就足以把夹角推过阈值。
 *
 * 弯曲度稳得多：直笔（横竖撇捺提）拐不了弯，比值恒在 1.0 附近；
 * 而横折这类直角拐弯，两条直角边之和显著大于斜边（实测「吃」的横折是 1.41）。
 */
const BEND_RATIO = 1.15

/**
 * 从中线推导笔画类型。
 *
 * ⚠️ **只用于展示，不是判定依据**，同部件一致性也不走它（见 {@link main}）：
 * 它分不开点与捺、提与横，也把所有带转折的笔画笼统归为「折」。
 * 真正的判据是人对着教材看序号。
 *
 * ⚠️ 坐标系 y 轴**向上**（makemeahanzi 的约定），所以向下书写时 dy < 0。
 */
function strokeType(median) {
  if (median.length < 2) return '?'
  const [x0, y0] = median[0]
  const [x1, y1] = median[median.length - 1]
  const straight = Math.hypot(x1 - x0, y1 - y0)
  if (straight > 0 && pathLen(median) / straight > BEND_RATIO) return '折'

  const dx = x1 - x0
  const dy = y1 - y0
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (adx > ady * 2.5) return '横'
  if (ady > adx * 2.5) return '竖'
  if (dx < 0) return '撇'
  return dy < 0 ? '捺' : '提'
}

const CACHE_MISS_HINT = '（首次运行要联网拉 100 个字的笔顺数据，之后走 .cache/ 本地缓存）'

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cards = loadVolume(VOLUME)
  const firstCached = existsSync(join(CACHE_DIR, `${cards[0].char.codePointAt(0).toString(16)}.json`))
  console.log(`第${'一二三'[VOLUME - 1]}辑 ${cards.length} 字 ${firstCached ? '' : CACHE_MISS_HINT}`)

  // 分批拉，避免一次开 100 个连接
  for (let i = 0; i < cards.length; i += 10) {
    const batch = cards.slice(i, i + 10)
    await Promise.all(
      batch.map(async (c) => {
        const data = await fetchChar(c.char)
        c.strokes = data.strokes
        c.medians = data.medians
        c.types = data.medians.map(strokeType)
        // 「点2」→「点」，「横撇|横钩」→「横撇」，与 generate-stroke-data.mjs 同一套清理
        c.names = (cnchar.stroke(c.char, 'order', 'name')[0] ?? []).map((n) =>
          String(n).split('|')[0].replace(/\d+$/, ''),
        )
      }),
    )
    process.stdout.write(`\r拉取中 ${Math.min(i + 10, cards.length)}/${cards.length}`)
  }
  console.log('')

  const byChar = new Map(cards.map((c) => [c.char, c]))

  // ③ 同部件一致性
  const partIssues = []
  /** ⚠️ 实际比过的组。见下面打印处：不数它的话，「全部通过」和「一组都没比」长得一样 */
  const partsChecked = []
  for (const g of PART_GROUPS) {
    const present = g.chars
      .map((ch) => byChar.get(ch))
      .filter((c) => c !== undefined && c.medians.length >= g.n)
    if (present.length < 2) continue
    partsChecked.push(`${g.part}×${present.length}`)

    const anglesOf = (c) =>
      (g.at === 'left' ? c.medians.slice(0, g.n) : c.medians.slice(-g.n)).map((m) =>
        angleOf(m[0], m[m.length - 1]),
      )

    const base = anglesOf(present[0])
    const off = []
    for (const c of present.slice(1)) {
      const maxDiff = Math.max(
        ...anglesOf(c).map((v, i) => {
          const d = Math.abs(v - base[i])
          return d > 180 ? 360 - d : d
        }),
      )
      if (maxDiff > ANGLE_TOLERANCE) off.push(`${c.char}（偏离 ${Math.round(maxDiff)}°）`)
    }
    if (off.length > 0) {
      const detail = `以「${present[0].char}」为基准，${off.join('、')}`
      partIssues.push({ part: g.part, detail })
      for (const c of present) c.inconsistent = `「${g.part}」旁笔顺与同组字不一致：${detail}`
    }
  }

  for (const c of cards) {
    c.divergent = DIVERGENT[c.char] ?? null
    c.simplified = SIMPLIFIED[c.char] ?? null
    c.ruleRisk = RULE_RISK[c.char] ?? null
    c.rank = c.inconsistent
      ? 0
      : c.divergent
        ? 1
        : c.simplified
          ? 2
          : c.ruleRisk
            ? 3
            : 4
  }

  const ordered = [...cards].sort((a, b) => a.rank - b.rank)
  const counts = [0, 1, 2, 3, 4].map((r) => cards.filter((c) => c.rank === r).length)
  const mustSee = counts[0] + counts[1] + counts[2] + counts[3]

  writeFileSync(OUT_FILE, renderHtml(ordered, counts, mustSee, partIssues), 'utf-8')

  console.log(`\n✅ 已生成 ${OUT_FILE}`)
  console.log(`   需要人工核对 ${mustSee} 个，其余 ${counts[4]} 个抽查即可`)
  if (partIssues.length > 0) {
    console.log(`\n⚠️ 自动检出 ${partIssues.length} 处同部件笔顺不一致（数据一定有错）：`)
    for (const p of partIssues) console.log(`   「${p.part}」旁：${p.detail}`)
  } else if (partsChecked.length > 0) {
    console.log(`   同部件一致性：${partsChecked.length} 组全部通过（${partsChecked.join(' ')}）`)
  } else {
    // ⚠️ 这不是好消息，是筛子没网到东西。第二辑第一次跑就是这样：
    // PART_GROUPS 里全是第一辑的字，一组都凑不满 2 个，而输出看着像「通过」
    console.log('   ⚠️ 同部件一致性：一组都没比上 —— 这一辑的部件不在 PART_GROUPS 里，不是通过')
  }
  if (mustSee === 0) {
    console.log('   ⚠️ 必看清单是空的 —— 多半是 DIVERGENT/SIMPLIFIED/RULE_RISK 还没覆盖这一辑')
  }
  console.log(
    `\n   npm run dev 后打开 http://localhost:5173/Sen.SmartLearning/${OUT_FILE.split(/[\\/]/).pop()}`,
  )
}

function renderHtml(ordered, counts, mustSee, partIssues) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>笔顺校验 · 希恩爱学习</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif;
         margin: 0; padding: 24px; background: #FFF8E7; color: #3D3A38; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #3D3A38aa; font-size: 14px; margin-bottom: 20px; line-height: 1.7; }
  .warn { background: #FFB84D22; border-left: 4px solid #FFB84D; padding: 12px 16px;
          border-radius: 8px; margin-bottom: 16px; font-size: 14px; line-height: 1.8; }
  .bad-auto { background: #FF7A6B18; border-left: 4px solid #FF7A6B; padding: 12px 16px;
              border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.8; }
  .bar { position: sticky; top: 0; background: #FFF8E7; padding: 12px 0; display: flex;
         gap: 10px; align-items: center; flex-wrap: wrap;
         border-bottom: 2px solid #3D3A3818; margin-bottom: 16px; z-index: 10; }
  button { font: inherit; padding: 8px 14px; border-radius: 10px; border: none;
           background: #fff; box-shadow: 0 2px 0 #E8DFCC; cursor: pointer; }
  button.primary { background: #FFB84D; color: #fff; box-shadow: 0 2px 0 #E09A2E; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .card { background: #fff; border-radius: 14px; padding: 14px; display: flex;
          flex-direction: column; gap: 8px; border: 3px solid transparent; }
  .card.r0 { border-color: #FF7A6B; box-shadow: 0 0 0 4px #FF7A6B22; }
  .card.r1 { border-color: #FF7A6B88; }
  .card.r2 { border-color: #FFB84D88; }
  .card.r3 { border-color: #8FB8FF66; }
  .card.bad { border-color: #FF7A6B; background: #FF7A6B18; }
  .card.ok  { border-color: #5FD3A6; }
  .head { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
  .ch { font-size: 20px; font-weight: 700; }
  .py { color: #3D3A3899; font-size: 13px; }
  .tag { font-size: 11px; padding: 2px 7px; border-radius: 20px; color: #fff; }
  .t0 { background: #FF7A6B; } .t1 { background: #E0522E; }
  .t2 { background: #E09A2E; } .t3 { background: #6C97DE; } .t4 { background: #9C9C9C; }
  .why { font-size: 12.5px; line-height: 1.6; color: #3D3A38cc;
         background: #3D3A380A; padding: 6px 8px; border-radius: 7px; }
  .why.hard { color: #C0392B; background: #FF7A6B15; }
  svg { display: block; width: 100%; height: auto; background: #fff; border-radius: 8px; }
  /* 笔顺跟随：一排小图，第 k 格画前 k 笔。取代了原来压在笔画上的红色序号 */
  .steps { display: flex; flex-wrap: wrap; gap: 4px; }
  .step { width: 46px; text-align: center; }
  .step svg { background: #FCFAF5; border: 1px solid #EFEAE0; border-radius: 5px; }
  .step b { display: block; font-size: 9px; line-height: 1.2; color: #3D3A3899; font-weight: 600; }
  .seq { font-size: 12px; color: #3D3A3899; letter-spacing: .5px; line-height: 1.5; }
  .links { font-size: 12px; }
  .links a { color: #6C97DE; margin-right: 10px; }
  .row { display: flex; gap: 6px; }
  .row button { flex: 1; padding: 6px; font-size: 13px; }
  #out { width: 100%; height: 130px; margin-top: 16px;
         font-family: ui-monospace, monospace; font-size: 12px; }
</style>
</head>
<body>
<h1>笔顺校验 · 识字第${'一二三'[VOLUME - 1]}辑</h1>
<p class="sub">
  100 个字，已按风险排好序。田字格下面那排是<b>笔顺跟随</b>——第 k 格画到第 k 笔，
  最新一笔标红。把语文书的生字表摊在旁边，一眼就能比完一个字，不用盯动画。<br>
  键盘：<b>→ ←</b> 翻卡 · <b>空格</b> 重播这个字 · <b>1</b> 笔顺错 · <b>2</b> 没问题
</p>

<div class="warn">
  <b>⚠️ 只核对一件事：序号的顺序，和课本上的笔顺是不是一样。</b><br>
  ① <b style="color:#E0522E">${counts[1]}</b> 个是<b>已知两岸分歧</b>的字形（火、田这类）——数据的字形来自台湾字体，这里最可能残留另一套顺序<br>
  ② <b style="color:#E09A2E">${counts[2]}</b> 个是<b>简化字特有</b>字形（马、鸟、书、长……）——繁体字体里没有对应，提取路径不同，上游的人工校验也主要覆盖繁体<br>
  ③ <b style="color:#6C97DE">${counts[3]}</b> 个撞「先中间后两边 / 先外后内再封口」这两条硬规则<br>
  ④ 余下 <b>${counts[4]}</b> 个风险低，<b>抽查即可</b><br>
  <b>核对 ①②③ 共 ${mustSee} 个就够了。</b>发现错的按 <b>1</b>，最后点「导出问题清单」贴回给我。
</div>

${
  partIssues.length > 0
    ? `<div class="bad-auto"><b>🔴 自动检出 ${partIssues.length} 处同部件笔顺不一致 —— 这些数据一定有错，不需要懂笔顺也能断定：</b><br>
${partIssues.map((p) => `「<b>${p.part}</b>」旁：${p.detail}`).join('<br>')}
<br>它们已排在最前面。</div>`
    : `<div class="warn" style="border-color:#5FD3A6;background:#5FD3A618">
✅ <b>同部件一致性检查全部通过</b>：女旁 5 字、口旁、犭旁、鸟旁的笔顺各自完全一致。
这说明数据内部没有明显错乱，但它<b>证明不了</b>笔顺符合大陆规范——那仍然要人对着课本看。</div>`
}

<div class="bar">
  <button class="primary" onclick="playAll()">▶ 依次播放需核对的</button>
  <button onclick="exportBad()">导出问题清单</button>
  <button onclick="resetMarks()">清空标记</button>
  <span id="stat" style="margin-left:auto;font-size:14px"></span>
</div>

<div class="grid" id="grid"></div>
<textarea id="out" placeholder="点「导出问题清单」后，结果出现在这里"></textarea>

<script>
const CARDS = ${JSON.stringify(ordered.map((c) => ({
  char: c.char, pinyin: c.pinyin, word: c.word, group: c.group,
  // ⚠️ names 别漏：浏览器端的 steps 要用它，漏掉会在 forEach 里抛错，
  //    表现是**整页一张卡片都不渲染**（页头和按钮照常显示，所以很容易看漏）
  strokes: c.strokes, medians: c.medians, types: c.types, names: c.names, rank: c.rank,
  why: c.inconsistent ?? c.divergent ?? c.simplified ?? c.ruleRisk ?? null,
  hard: Boolean(c.inconsistent),
})))};

const marks = JSON.parse(localStorage.getItem('strokeMarks') || '{}');
let cursor = 0;
const TAGS = ['数据不一致 · 必看', '两岸分歧', '简化字', '规则易错', '低风险'];

/** makemeahanzi 坐标系：1024×1024，y 轴向上，字形下沿到 -124。官方推荐的翻转 */
const FLIP = 'translate(0, 900) scale(1, -1)';

function medianPath(m) {
  return 'M ' + m.map(p => p[0] + ' ' + p[1]).join(' L ');
}
function medianLen(m) {
  let len = 0;
  for (let i = 1; i < m.length; i++) {
    len += Math.hypot(m[i][0] - m[i-1][0], m[i][1] - m[i-1][1]);
  }
  return len;
}

const grid = document.getElementById('grid');

CARDS.forEach((c, i) => {
  const lens = c.medians.map(medianLen);
  // ⛔ 序号不再画进田字格里 —— 圈再小也压着笔画，而这一页要看的正是笔画本身。
  //    顺序改由下面那排「笔顺跟随」小图承担：第 k 格显示写到第 k 笔为止的样子，
  //    最新的一笔加深。这也是课本与字帖的通行画法。
  const guides = \`
    <rect x="2" y="2" width="1020" height="1020" fill="none" stroke="#E8DFCC" stroke-width="4"/>
    <line x1="512" y1="2" x2="512" y2="1022" stroke="#E8DFCC" stroke-width="3" stroke-dasharray="18 14"/>
    <line x1="2" y1="512" x2="1022" y2="512" stroke="#E8DFCC" stroke-width="3" stroke-dasharray="18 14"/>
    <line x1="2" y1="2" x2="1022" y2="1022" stroke="#F2EBDA" stroke-width="3" stroke-dasharray="18 14"/>
    <line x1="1022" y1="2" x2="2" y2="1022" stroke="#F2EBDA" stroke-width="3" stroke-dasharray="18 14"/>\`;

  const clips = c.strokes.map((d, k) =>
    '<clipPath id="clip' + i + '-' + k + '"><path d="' + d + '"/></clipPath>').join('');

  // 每笔：轮廓浅灰打底（看得见字形），中线粗线被轮廓裁住 → 描画动画
  const outlines = c.strokes.map(d =>
    '<path d="' + d + '" fill="#EFEAE0"/>').join('');
  const anims = c.medians.map((m, k) =>
    '<path class="ink" id="ink' + i + '-' + k + '" d="' + medianPath(m) + '"' +
    ' clip-path="url(#clip' + i + '-' + k + ')" fill="none" stroke="#3D3A38"' +
    ' stroke-width="160" stroke-linecap="round" stroke-linejoin="round"' +
    ' stroke-dasharray="' + (lens[k] + 160) + '" stroke-dashoffset="' + (lens[k] + 160) + '"/>').join('');
  // 序号贴在每笔起点 —— ⭐ 核对时真正用的就是这个
  //
  // ⚠️ 不能直接摆在起点上：「日」「月」「四」这类字的头两笔起点几乎重合
  //    （竖和横折都从左上角起笔），两个圈会叠成一个，而那恰恰是最要看清的地方。
  //    沿「起笔的来时方向」往外推一段，两笔方向不同，圈就自然分开了。
  // 笔顺跟随：一排小格，第 k 格画前 k 笔，最新那笔加深，底下是这一笔的名称。
  // ⚠️ 名称来自 cnchar（第二个数据源），与笔顺图形各来一处 —— 一并摆出来核对
  const steps = c.strokes.map((_, k) =>
    '<div class="step"><svg viewBox="0 0 1024 1024"><g transform="' + FLIP + '">' +
    c.strokes.slice(0, k + 1).map((d, j) =>
      '<path d="' + d + '" fill="' + (j === k ? '#E0522E' : '#8C857D') + '"/>').join('') +
    '</g></svg><b>' + (k + 1) + ' ' + (c.names[k] ?? '?') + '</b></div>').join('');

  const card = document.createElement('div');
  card.id = 'c' + i;
  card.className = 'card r' + c.rank;
  card.innerHTML = \`
    <div class="head">
      <span><span class="ch">\${c.char}</span> <span class="py">\${c.pinyin}· \${c.word}</span></span>
      <span class="tag t\${c.rank}">\${TAGS[c.rank]}</span>
    </div>
    <svg viewBox="0 0 1024 1024" onclick="play(\${i})">
      \${guides}
      <g transform="\${FLIP}">\${clips}\${outlines}\${anims}</g>
    </svg>
    <div class="steps">\${steps}</div>
    <div class="seq">\${c.medians.length} 笔 · \${c.types.map((t,k)=>(k+1)+t).join(' ')}</div>
    \${c.why ? '<div class="why' + (c.hard ? ' hard' : '') + '">' + c.why + '</div>' : ''}
    <div class="links">
      <a href="https://www.zdic.net/hans/\${encodeURIComponent(c.char)}" target="_blank">汉典</a>
      <a href="https://hanyu.baidu.com/s?wd=\${encodeURIComponent(c.char)}" target="_blank">百度汉语</a>
      <span style="color:#3D3A3866">\${c.group}</span>
    </div>
    <div class="row">
      <button onclick="play(\${i})">▶ 重播</button>
      <button onclick="mark(\${i},'bad')">✗ 笔顺错</button>
      <button onclick="mark(\${i},'ok')">✓ 没问题</button>
    </div>\`;
  grid.appendChild(card);
});

/**
 * 每笔时长按中线长度成比例 —— 等时会让「点」和「长横」一样久，看着很假。
 *
 * ⭐ 节奏要和 App 里的 TianGrid 保持一致（src/components/TianGrid.tsx 的
 * STROKE_MS / STROKE_GAP_MS）：这一页是拿来判断「写得对不对」的，
 * 快慢不同就不是在看她将来会看到的东西。
 */
function play(i) {
  cursor = i;
  const c = CARDS[i];
  const lens = c.medians.map(medianLen);
  const avg = lens.reduce((a,b) => a+b, 0) / lens.length;

  // ① 全部拉回隐藏，这一步不要有过渡
  c.medians.forEach((m, k) => {
    const el = document.getElementById('ink' + i + '-' + k);
    el.style.transition = 'none';
    el.style.strokeDashoffset = lens[k] + 160;
  });

  // ② ⭐ 等浏览器真把 ① 画出去，再排期。**这两帧不能省**。
  //    第一笔的延迟是 0，不等的话「拉回隐藏」和「推到 0」会被合并成一次
  //    没有变化的样式变更，transition 不触发 —— 表现是**重播时第一笔
  //    凭空出现、没有书写过程**（首播不受影响，那时本来就是隐藏的）。
  //    ⛔ 别改成 getComputedStyle 那种强制同步布局的写法：这一页 100 个字、
  //       上千个 path，每次重播强制一次全文档 reflow 会卡。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let t = 0;
      c.medians.forEach((m, k) => {
        const el = document.getElementById('ink' + i + '-' + k);
        const dur = Math.max(180, 420 * (lens[k] / avg));
        setTimeout(() => {
          el.style.transition = 'stroke-dashoffset ' + dur + 'ms linear';
          el.style.strokeDashoffset = 0;
        }, t);
        t += dur + 90;
      });
    });
  });
}
function playAll() {
  const todo = CARDS.map((c,i) => [c,i]).filter(([c]) => c.rank < 4);
  let n = 0;
  const step = () => {
    if (n >= todo.length) return;
    const [c, i] = todo[n++];
    document.getElementById('c' + i).scrollIntoView({ block: 'center', behavior: 'smooth' });
    play(i);
    setTimeout(step, c.medians.length * 520 + 700);
  };
  step();
}
function mark(i, v) {
  marks[CARDS[i].char] = v;
  localStorage.setItem('strokeMarks', JSON.stringify(marks));
  render();
}
function render() {
  CARDS.forEach((c, i) => {
    const el = document.getElementById('c' + i);
    el.classList.remove('bad', 'ok');
    if (marks[c.char]) el.classList.add(marks[c.char]);
  });
  const bad = Object.values(marks).filter(v => v === 'bad').length;
  const done = Object.keys(marks).length;
  document.getElementById('stat').textContent =
    '已看 ' + done + ' / ' + CARDS.length + '，其中 ' + bad + ' 个笔顺有问题';
}
function exportBad() {
  const bad = CARDS.filter(c => marks[c.char] === 'bad');
  document.getElementById('out').value = bad.length === 0
    ? '（没有标记出问题的字）'
    : '笔顺有问题的字（共 ' + bad.length + ' 个）：\\n' +
      bad.map(c => c.char + '（' + c.pinyin + '，' + c.medians.length + ' 笔）' +
                   (c.why ? ' —— ' + c.why : '')).join('\\n');
}
function resetMarks() {
  if (!confirm('清空所有标记？')) return;
  for (const k of Object.keys(marks)) delete marks[k];
  localStorage.setItem('strokeMarks', '{}');
  render();
}
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { cursor = Math.min(cursor+1, CARDS.length-1); play(cursor); document.getElementById('c'+cursor).scrollIntoView({block:'center',behavior:'smooth'}); }
  if (e.key === 'ArrowLeft')  { cursor = Math.max(cursor-1, 0); play(cursor); document.getElementById('c'+cursor).scrollIntoView({block:'center',behavior:'smooth'}); }
  if (e.key === ' ') { e.preventDefault(); play(cursor); }
  if (e.key === '1') mark(cursor, 'bad');
  if (e.key === '2') mark(cursor, 'ok');
});
render();
</script>
</body>
</html>
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
