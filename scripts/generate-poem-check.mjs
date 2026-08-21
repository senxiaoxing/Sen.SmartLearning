/**
 * @file 古诗读音校验页生成 —— 把「多音字念对了没有」变成十分钟能过一遍的事
 *
 * ⭐⭐ **为什么必须有这个东西**
 *
 * 这套 TTS 念古诗时会主动往**古音**上靠：实测《回乡偶书》「鬓毛衰」
 * 念出来是 cuī（这首诗的古押韵音），而教材注 shuāi。也就是说，
 * 「此处读的正是现代最高频音」根本不能当作安全——只有耳朵能验。
 *
 * 而发音错误是这个项目里**代价最高**的一类错误（与拼音校验页同一个理由）：
 * 改代码能修好，孩子学错的音要很久才纠正得过来。
 *
 * 页面把 60 首里所有**含多音字**的句子挑出来，按风险排序：
 * - ① 还没改写的排最前并标红 —— 它们完全靠 TTS 自己猜
 * - ② 已经改写的排在后面 —— 也要听，确认换的那个字真的把音掰回来了
 *
 * 用法：npm run poem:check     生成后用浏览器打开提示的地址
 *
 * @see src/data/seed/poems.ts  改写方针（多音字一律改写）与两处无字可换的例外
 * @see design/07-音频方案.md §3.5
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const POEMS_FILE = join(ROOT, 'src', 'data', 'seed', 'poems.ts')
const OUT_FILE = join(ROOT, 'public', 'poem-check.html')

/**
 * 多音字表。读音按**现代汉语使用频率**排序，第一个是 TTS 的默认倾向。
 *
 * ⚠️ 这张表宁可宽、不要窄：漏一个字，那一句就永远不会被端到耳朵前面
 * （「笼盖四野」的笼就是第一版漏掉的，它此处读 lǒng 而默认是 lóng）。
 * 多列几个字的代价只是多听几条。
 */
const POLYPHONES = {
  行: ['xíng', 'háng'], 重: ['zhòng', 'chóng'], 朝: ['cháo', 'zhāo'],
  长: ['cháng', 'zhǎng'], 数: ['shù', 'shǔ'], 为: ['wéi', 'wèi'],
  还: ['hái', 'huán'], 看: ['kàn', 'kān'], 少: ['shǎo', 'shào'],
  发: ['fā', 'fà'], 和: ['hé', 'hè', 'huò'], 乐: ['lè', 'yuè'],
  曲: ['qū', 'qǔ'], 见: ['jiàn', 'xiàn'], 露: ['lù', 'lòu'],
  衰: ['shuāi', 'cuī'], 散: ['sàn', 'sǎn'], 应: ['yīng', 'yìng'],
  占: ['zhàn', 'zhān'], 当: ['dāng', 'dàng'], 缝: ['féng', 'fèng'],
  泊: ['bó', 'pō'], 挑: ['tiāo', 'tiǎo'], 陂: ['bēi', 'pō'],
  中: ['zhōng', 'zhòng'], 间: ['jiān', 'jiàn'], 空: ['kōng', 'kòng'],
  觉: ['jué', 'jiào'], 教: ['jiào', 'jiāo'], 藏: ['cáng', 'zàng'],
  相: ['xiāng', 'xiàng'], 处: ['chù', 'chǔ'], 只: ['zhǐ', 'zhī'],
  几: ['jǐ', 'jī'], 更: ['gèng', 'gēng'], 冠: ['guān', 'guàn'],
  将: ['jiāng', 'jiàng'], 兴: ['xìng', 'xīng'], 分: ['fēn', 'fèn'],
  种: ['zhǒng', 'zhòng'], 背: ['bèi', 'bēi'], 参: ['cān', 'shēn'],
  差: ['chà', 'chā', 'chāi'], 便: ['biàn', 'pián'], 宁: ['níng', 'nìng'],
  强: ['qiáng', 'qiǎng'], 卷: ['juǎn', 'juàn'], 载: ['zài', 'zǎi'],
  传: ['chuán', 'zhuàn'], 系: ['xì', 'jì'], 转: ['zhuǎn', 'zhuàn'],
  提: ['tí', 'dī'], 落: ['luò', 'là', 'lào'], 磨: ['mó', 'mò'],
  抹: ['mǒ', 'mā', 'mò'], 度: ['dù', 'duó'], 供: ['gōng', 'gòng'],
  好: ['hǎo', 'hào'], 号: ['hào', 'háo'], 华: ['huá', 'huà'],
  会: ['huì', 'kuài'], 假: ['jiǎ', 'jià'], 尽: ['jìn', 'jǐn'],
  没: ['méi', 'mò'], 难: ['nán', 'nàn'], 宿: ['sù', 'xiǔ', 'xiù'],
  弹: ['dàn', 'tán'], 调: ['diào', 'tiáo'], 咽: ['yān', 'yàn', 'yè'],
  燕: ['yàn', 'yān'], 与: ['yǔ', 'yù'], 折: ['zhé', 'shé'],
  着: ['zhe', 'zháo', 'zhuó'], 都: ['dōu', 'dū'], 干: ['gān', 'gàn'],
  蒙: ['méng', 'mēng', 'měng'], 冲: ['chōng', 'chòng'], 率: ['lǜ', 'shuài'],
  血: ['xuè', 'xiě'], 石: ['shí', 'dàn'], 斗: ['dòu', 'dǒu'],
  薄: ['báo', 'bó'], 量: ['liàng', 'liáng'], 曾: ['céng', 'zēng'],
  正: ['zhèng', 'zhēng'], 屏: ['píng', 'bǐng'], 奇: ['qí', 'jī'],
  得: ['dé', 'de', 'děi'], 称: ['chēng', 'chèn'], 盛: ['shèng', 'chéng'],
  省: ['shěng', 'xǐng'], 识: ['shí', 'zhì'], 禁: ['jìn', 'jīn'],
  王: ['wáng', 'wàng'], 蹊: ['xī', 'qī'], 纶: ['lún', 'guān'],
  翘: ['qiáo', 'qiào'], 澄: ['chéng', 'dèng'], 骑: ['qí', 'jì'],
  斜: ['xié', 'xiá'], 思: ['sī', 'sāi'], 食: ['shí', 'sì'],
  汗: ['hàn', 'hán'], 峤: ['jiào', 'qiáo'], 令: ['lìng', 'líng'],
  荷: ['hé', 'hè'], 笼: ['lóng', 'lǒng'], 乘: ['chéng', 'shèng'],
  铺: ['pū', 'pù'], 塞: ['sāi', 'sài', 'sè'], 弄: ['nòng', 'lòng'],
  勒: ['lè', 'lēi'], 荫: ['yīn', 'yìn'], 涨: ['zhǎng', 'zhàng'],
  场: ['chǎng', 'cháng'], 巷: ['xiàng', 'hàng'], 扇: ['shàn', 'shān'],
  舍: ['shě', 'shè'], 泥: ['ní', 'nì'], 单: ['dān', 'shàn', 'chán'],
  圈: ['quān', 'juàn'], 遗: ['yí', 'wèi'], 畜: ['chù', 'xù'],
}

/**
 * 汉语里找不到第二个同音字的那几个音——改写这条路根本走不通。
 *
 * `sàn` 只有「散」、`mǒ` 只有「抹」、`lè`（勒）的同音字只剩生僻的「泐」
 * （换上去 TTS 更可能按声旁乱读，反而更糟）。这几条永远排在最前：
 * 它们是这一页真正非听不可的部分。
 */
const NO_HOMOPHONE = { 散: 'sàn', 抹: 'mǒ', 勒: 'lè' }

const PUNCT = /[，。？！、；：]/g

/** 逐行扫 poems.ts，攒出 { id, title, dynasty, author, headSpoken, lines[] } */
function loadPoems() {
  const text = readFileSync(POEMS_FILE, 'utf-8')
  const poems = []
  let current = null

  for (const raw of text.split('\n')) {
    const idMatch = raw.match(/^\s*id:\s*'([a-z0-9]+)',/)
    if (idMatch !== null) {
      // 辑的声明也写 `id:`，靠 vol 前缀跳过 —— 与 generate-voices.mjs 同一条规矩
      if (idMatch[1].startsWith('vol')) {
        current = null
        continue
      }
      current = { id: idMatch[1], title: '', dynasty: '', author: '', headSpoken: null, lines: [] }
      poems.push(current)
      continue
    }
    if (current === null) continue

    const titleMatch = raw.match(/^\s*title:\s*'([^']+)',/)
    if (titleMatch !== null) { current.title = titleMatch[1]; continue }

    const dynastyMatch = raw.match(/^\s*dynasty:\s*'([^']+)',/)
    if (dynastyMatch !== null) { current.dynasty = dynastyMatch[1]; continue }

    const authorMatch = raw.match(/^\s*author:\s*'([^']+)',/)
    if (authorMatch !== null) { current.author = authorMatch[1]; continue }

    const headMatch = raw.match(/^\s*headSpoken:\s*'([^']+)',/)
    if (headMatch !== null) { current.headSpoken = headMatch[1]; continue }

    const lineMatch = raw.match(/^\s*l\('([^']*)',\s*'([^']*)'(?:,\s*'([^']*)')?\s*\)/)
    if (lineMatch !== null) {
      current.lines.push({ text: lineMatch[1], pinyin: lineMatch[2], spoken: lineMatch[3] ?? null })
    }
  }
  return poems
}

const poems = loadPoems()
const cards = []

for (const poem of poems) {
  // ── 诗题那一条：标题与作者里的多音字（「咏华山」的华、「汉乐府」的乐）
  const headChars = [...(poem.title + poem.author)].filter((ch) => ch in POLYPHONES)
  if (headChars.length > 0) {
    cards.push({
      key: `poem.${poem.id}Title`,
      poem: poem.title,
      kind: '诗题',
      text: `${poem.title}。${poem.dynasty}，${poem.author}。`,
      pinyin: '',
      spoken: poem.headSpoken,
      targets: headChars.map((ch) => ({ ch, here: '？', others: POLYPHONES[ch].join(' / ') })),
      rewritten: poem.headSpoken !== null,
      // 诗题里没有逐字拼音可比，只能按「这个字在不在无解表里」判断
      noFix: poem.headSpoken === null && headChars.some((ch) => ch in NO_HOMOPHONE),
    })
  }

  // ── 逐句：拿标注拼音与字对齐，命中多音字表就生成一条
  poem.lines.forEach((line, index) => {
    const chars = [...line.text.replace(PUNCT, '')]
    const syllables = line.pinyin.trim().split(/\s+/)
    const targets = []

    chars.forEach((ch, i) => {
      const readings = POLYPHONES[ch]
      if (readings === undefined) return
      const here = syllables[i] ?? '？'
      targets.push({
        ch,
        here,
        others: readings.filter((r) => r !== here).join(' / '),
        // 此处读的不是首选音 —— TTS 最可能栽的地方
        offDefault: here !== readings[0],
      })
    })

    if (targets.length === 0) return
    cards.push({
      key: `poem.${poem.id}L${index}`,
      poem: poem.title,
      kind: `第 ${index + 1} 句`,
      text: line.text,
      pinyin: line.pinyin,
      spoken: line.spoken,
      targets,
      rewritten: line.spoken !== null,
      noFix:
        line.spoken === null &&
        targets.some((t) => NO_HOMOPHONE[t.ch] !== undefined && NO_HOMOPHONE[t.ch] === t.here),
    })
  })
}

/**
 * 排序即优先级，从「非听不可」到「抽查就行」：
 *
 * 0. 没有同音字可换的 —— 改写救不了它们，只有耳朵能判
 * 1. 此处不是首选音、却还没改写的 —— 漏网的高危（正常情况下应该是空的）
 * 2. 已经改写的 —— 要验证换上去的字真把音掰回来了
 * 3. 其余 —— 此处读的就是最常用音，风险低，抽查即可
 */
const ordered = [...cards].sort((a, b) => {
  const rank = (c) =>
    c.noFix ? 0 : !c.rewritten && c.targets.some((t) => t.offDefault) ? 1 : c.rewritten ? 2 : 3
  return rank(a) - rank(b)
})
const noFixCount = cards.filter((c) => c.noFix).length
const rewrittenCount = cards.filter((c) => c.rewritten).length
const leakedCount = cards.filter(
  (c) => !c.noFix && !c.rewritten && c.targets.some((t) => t.offDefault),
).length

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>古诗读音校验 · 希恩爱学习</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif;
         margin: 0; padding: 24px; background: #FFF8E7; color: #3D3A38; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #3D3A38aa; font-size: 14px; margin-bottom: 20px; line-height: 1.7; }
  .warn { background: #FFB84D22; border-left: 4px solid #FFB84D;
          padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.8; }
  .bar { position: sticky; top: 0; background: #FFF8E7; padding: 12px 0;
         display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
         border-bottom: 2px solid #3D3A3818; margin-bottom: 16px; z-index: 10; }
  button { font: inherit; padding: 8px 16px; border-radius: 10px; border: none;
           background: #fff; box-shadow: 0 2px 0 #E8DFCC; cursor: pointer; }
  button.primary { background: #FFB84D; color: #fff; box-shadow: 0 2px 0 #E09A2E; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .card { background: #fff; border-radius: 14px; padding: 14px; display: flex;
          flex-direction: column; gap: 8px; border: 3px solid transparent; }
  .card.risk { border-color: #FF7A6B88; }
  .card.nofix { border-color: #FF7A6B; box-shadow: 0 0 0 4px #FF7A6B22; }
  .card.done { border-color: #5FD3A644; }
  .tag { font-size: 11px; padding: 2px 7px; border-radius: 20px; background: #FF7A6B; color: #fff; }
  .card.bad  { border-color: #FF7A6B; background: #FF7A6B18; }
  .card.ok   { border-color: #5FD3A6; }
  .head { font-size: 13px; color: #3D3A38aa; display: flex; justify-content: space-between; }
  .line { font-size: 21px; font-weight: 700; letter-spacing: 1px; line-height: 1.5; }
  .line .hit { color: #E0522E; }
  .py { font-size: 12px; color: #3D3A3899; letter-spacing: .5px; }
  .targets { font-size: 13px; line-height: 1.7; }
  .targets b { color: #E0522E; }
  .fed { font-size: 12px; color: #2E8B57; background: #5FD3A618;
         padding: 5px 8px; border-radius: 7px; }
  .nofed { font-size: 12px; color: #E0522E; background: #FF7A6B18;
           padding: 5px 8px; border-radius: 7px; }
  .row { display: flex; gap: 6px; }
  .row button { flex: 1; padding: 6px; font-size: 13px; }
  #out { width: 100%; height: 140px; margin-top: 16px; font-family: ui-monospace, monospace; font-size: 12px; }
</style>
</head>
<body>
<h1>古诗读音校验</h1>
<p class="sub">
  60 首里含多音字的共 <b>${cards.length}</b> 条，已按「非听不可 → 抽查就行」排好序。<br>
  键盘：<b>→</b> 下一条并播放 · <b>←</b> 上一条 · <b>空格</b> 重听 · <b>1</b> 读错了 · <b>2</b> 没问题
</p>

<div class="warn">
  <b>⚠️ 只听一件事：标红的那个字，念的是不是拼音上标的那个音。</b><br>
  ① 最前面 <b>${noFixCount}</b> 条带「无字可换」标签 —— 汉语里没有第二个同音字，
     改写救不了，<b>只有这几条非听不可</b><br>
  ② 接着 <b>${rewrittenCount}</b> 条是<b>已改写</b>的（绿框，卡片底部写着实际喂进去的文本）——
     听一下换上去的字有没有把音掰回来<br>
  ③ 余下的此处读的就是最常用音，风险低，<b>抽查即可</b>${
    leakedCount > 0 ? `（另有 <b style="color:#FF7A6B">${leakedCount}</b> 条是漏网的高危，排在第 ② 组前面）` : ''
  }<br>
  ④ 这套 TTS 念古诗会往<b>古音</b>上靠（「鬓毛衰」念成过 cuī），别默认它会走常用音<br>
  听出问题的按 <b>1</b> 标记，最后点「导出问题清单」，把结果贴回给我。
</div>

<div class="bar">
  <button class="primary" onclick="playAll()">▶ 从头连播</button>
  <button onclick="stopAll()">■ 停止</button>
  <button onclick="exportBad()">导出问题清单</button>
  <button onclick="resetMarks()">清空标记</button>
  <span id="stat" style="margin-left:auto;font-size:14px"></span>
</div>

<div class="grid" id="grid"></div>
<textarea id="out" placeholder="点「导出问题清单」后，结果出现在这里"></textarea>

<script>
const CARDS = ${JSON.stringify(ordered)};
const marks = JSON.parse(localStorage.getItem('poemMarks') || '{}');
let cursor = 0, playing = false;

const grid = document.getElementById('grid');

CARDS.forEach((c, i) => {
  const hits = new Set(c.targets.map(t => t.ch));
  const marked = [...c.text].map(ch => hits.has(ch) ? '<span class="hit">' + ch + '</span>' : ch).join('');
  const targetList = c.targets.map(t =>
    '「<b>' + t.ch + '</b>」这里读 <b>' + t.here + '</b>' +
    (t.others ? '（另有 ' + t.others + '）' : '')).join('<br>');

  const card = document.createElement('div');
  card.id = 'c' + i;
  card.className = 'card ' + (c.noFix ? 'nofix' : c.rewritten ? 'done' : 'risk');
  const badge = c.noFix
    ? '<span class="tag">无字可换 · 必听</span>'
    : '<span>' + (c.rewritten ? '已改写' : '未改写') + '</span>';
  card.innerHTML = \`
    <div class="head"><span>\${c.poem} · \${c.kind}</span>\${badge}</div>
    <div class="line">\${marked}</div>
    \${c.pinyin ? '<div class="py">' + c.pinyin + '</div>' : ''}
    <div class="targets">\${targetList}</div>
    <div class="\${c.rewritten ? 'fed' : 'nofed'}">喂给 TTS：\${c.spoken ?? c.text}</div>
    \${/* ⚠️ 相对路径，不是 /audio/…：dev 下整站挂在 base（/Sen.SmartLearning/）底下，
          绝对路径会解析到站点根、全部 404 —— 而表现只是「点了没声音」 */''}
    <audio id="a\${i}" src="audio/voice/\${c.key}.mp3" preload="none"></audio>
    <div class="row">
      <button onclick="play(\${i})">▶ 听</button>
      <button onclick="mark(\${i},'bad')">✗ 读错了</button>
      <button onclick="mark(\${i},'ok')">✓ 没问题</button>
    </div>\`;
  grid.appendChild(card);
});

function play(i) {
  cursor = i;
  document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
  document.getElementById('a' + i).play();
  document.getElementById('c' + i).scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function mark(i, v) {
  marks[CARDS[i].key] = v;
  localStorage.setItem('poemMarks', JSON.stringify(marks));
  render();
}
function render() {
  CARDS.forEach((c, i) => {
    const el = document.getElementById('c' + i);
    el.classList.remove('bad', 'ok');
    if (marks[c.key]) el.classList.add(marks[c.key]);
  });
  const bad = Object.values(marks).filter(v => v === 'bad').length;
  document.getElementById('stat').textContent =
    \`已听 \${Object.keys(marks).length}/\${CARDS.length}　读错 \${bad}\`;
}
async function playAll() {
  playing = true;
  for (let i = cursor; i < CARDS.length && playing; i++) {
    play(i);
    await new Promise(r => setTimeout(r, 3200));
  }
  playing = false;
}
function stopAll() { playing = false; document.querySelectorAll('audio').forEach(a => a.pause()); }
function exportBad() {
  const bad = CARDS.filter(c => marks[c.key] === 'bad');
  document.getElementById('out').value = bad.length === 0
    ? '（没有标记出读错的句子）'
    : '读错的句子：\\n' + bad.map(c =>
        '  ' + c.poem + ' ' + c.kind + '「' + c.text + '」' +
        ' 该读 ' + c.targets.map(t => t.ch + '=' + t.here).join('、') +
        ' (key=' + c.key + ')').join('\\n');
}
function resetMarks() {
  if (!confirm('清空全部标记？')) return;
  for (const k of Object.keys(marks)) delete marks[k];
  localStorage.setItem('poemMarks', '{}');
  render();
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { play(Math.min(cursor + 1, CARDS.length - 1)); e.preventDefault(); }
  if (e.key === 'ArrowLeft')  { play(Math.max(cursor - 1, 0)); e.preventDefault(); }
  if (e.key === ' ')          { play(cursor); e.preventDefault(); }
  if (e.key === '1')          { mark(cursor, 'bad'); }
  if (e.key === '2')          { mark(cursor, 'ok'); }
});
render();
</script>
</body>
</html>
`

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, html, 'utf-8')

console.log(`已生成校验页：${OUT_FILE}`)
console.log(
  `含多音字的条目 ${cards.length} 条：` +
    `无字可换 ${noFixCount} 条（必听，排最前）· 已改写 ${rewrittenCount} 条（验证换字有没有生效）` +
    `${leakedCount > 0 ? ` · ⚠️ 漏网的高危 ${leakedCount} 条` : ''}\n`,
)
console.log('打开方式：')
console.log('  npm run dev  然后浏览器访问  http://localhost:5173/Sen.SmartLearning/poem-check.html')
