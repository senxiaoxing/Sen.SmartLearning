/**
 * @file 拼音发音校验页生成 —— 让「听一遍全部拼音」变成几分钟的事
 *
 * ⭐⭐ **为什么必须有这个东西**
 *
 * 拼音音频读得对不对，**机器验不了**。
 * `pinyinSyllables.test.ts` 只能查表自身是否自洽（声调标记与 tone 对不对得上、
 * 有没有重复用字），`pinyinVoice.test.ts` 只能查文件在不在、是不是有效 mp3——
 * 查不了「这一条真的好听/好念吗」，那需要人耳。
 *
 * 而发音错误是这个项目里**代价最高**的一类错误：改代码能修好，
 * 孩子学错的发音要花很久才纠正得过来。所以宁可多花力气，
 * 也要让「全部听一遍」这件事的成本低到真的会去做。
 *
 * ## ⭐ 2026-09 起，拼音全部是真人录音
 *
 * 素材来自 `npm run pinyin:voice`（见 design/11-拼音真人录音方案.md），
 * TTS 那条路已经断了。所以这一页现在验的是**素材本身**：
 *
 * ```
 * 声母·韵母本音  47 条  pinyinbare.*  ⭐ 拼音墙播的就是这些，最该听
 * 带调音节      118 条  pinyin.*      题目用
 * ```
 *
 * 页面特性：
 * - 键盘 ← → 切换、空格重听，可以盲操作一路听下去
 * - 本音 47 条**排在最前并标红**——它们直接决定孩子听到的声母是什么
 * - 标记「有问题」的条目会存进 localStorage，最后可一键导出清单
 *
 * 用法：npm run pinyin:check     生成后用浏览器打开提示的地址
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SYLLABLES_FILE = join(ROOT, 'src', 'data', 'seed', 'pinyinSyllables.ts')
const VOICE_DIR = join(ROOT, 'public', 'audio', 'voice')
const OUT_FILE = join(ROOT, 'public', 'pinyin-check.html')

/** 从音节表里解析出 { pinyin, base, tone, char, group } */
function loadSyllables() {
  const text = readFileSync(SYLLABLES_FILE, 'utf-8')
  const groups = [
    ['INITIALS', '声母'],
    ['SINGLE_FINALS', '单韵母'],
    ['TONE_SET', '四声调'],
    ['COMPOUND_FINALS', '复韵母·鼻韵母'],
    ['INTEGRAL_SYLLABLES', '整体认读'],
    ['BLEND_SYLLABLES', '两拼音节'],
    ['TRIPLE_SYLLABLES', '三拼音节'],
  ]

  const seen = new Set()
  const out = []

  for (const [constName, label] of groups) {
    const start = text.indexOf(`export const ${constName}`)
    if (start < 0) continue
    const end = text.indexOf('\n]', start)
    const block = text.slice(start, end)

    const pattern =
      /\{\s*pinyin:\s*'([^']+)',\s*base:\s*'([^']+)',\s*tone:\s*(\d)(?:,\s*char:\s*'([^']+)')?/g
    for (const [, pinyin, base, tone, char] of block.matchAll(pattern)) {
      const key = `pinyin.${base.replace(/ü/g, 'v')}${tone}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ key, pinyin, base, tone: Number(tone), char: char ?? null, group: label })
    }
  }
  return out
}

/**
 * ⭐ 47 条声母韵母**本音** —— 拼音墙上播的就是这些。
 *
 * 直接扫目录拿：key 由 `initialOf(base) || base` 推出（见 `pinyinChart.ts` 的
 * `bareCard`），而这边是 .mjs 不能 import TS，复制一份 `initialOf` 又要多一处
 * 同步点。扫目录既准确，也不必知道那条规则。
 */
function loadBareClips() {
  return readdirSync(VOICE_DIR)
    .filter((f) => f.startsWith('pinyinbare.') && f.endsWith('.mp3'))
    .map((f) => f.slice(0, -'.mp3'.length))
    .sort()
    .map((key) => ({
      key,
      pinyin: key.slice('pinyinbare.'.length),
      base: '',
      tone: 0,
      char: null,
      bare: true,
      group: '声母·韵母本音',
    }))
}

const bare = loadBareClips()
const syllables = loadSyllables()
// ⭐ 本音排最前：它们直接决定孩子听到的声母是什么，最该先听
const ordered = [...bare, ...syllables]

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>拼音发音校验 · 希恩爱学习</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif;
         margin: 0; padding: 24px; background: #FFF8E7; color: #3D3A38; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #3D3A38aa; font-size: 14px; margin-bottom: 20px; line-height: 1.7; }
  .warn { background: #FFB84D22; border-left: 4px solid #FFB84D;
          padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.7; }
  .bar { position: sticky; top: 0; background: #FFF8E7; padding: 12px 0;
         display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
         border-bottom: 2px solid #3D3A3818; margin-bottom: 16px; z-index: 10; }
  button { font: inherit; padding: 8px 16px; border-radius: 10px; border: none;
           background: #fff; box-shadow: 0 2px 0 #E8DFCC; cursor: pointer; }
  button.primary { background: #FFB84D; color: #fff; box-shadow: 0 2px 0 #E09A2E; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  .card { background: #fff; border-radius: 14px; padding: 14px; display: flex;
          flex-direction: column; gap: 8px; border: 3px solid transparent; }
  .card.risk { border-color: #FF7A6B88; }
  .card.bad  { border-color: #FF7A6B; background: #FF7A6B18; }
  .card.ok   { border-color: #5FD3A6; }
  .py { font-size: 30px; font-weight: 700; letter-spacing: 1px; }
  .meta { font-size: 13px; color: #3D3A38aa; display: flex; justify-content: space-between; }
  .char { font-size: 22px; font-weight: 700; }
  .nochar { color: #FF7A6B; font-weight: 700; font-size: 13px; }
  .row { display: flex; gap: 6px; }
  .row button { flex: 1; padding: 6px; font-size: 13px; }
  .group { grid-column: 1/-1; font-weight: 700; margin: 14px 0 2px; font-size: 15px; }
  #out { width: 100%; height: 120px; margin-top: 16px; font-family: ui-monospace, monospace; font-size: 12px; }
</style>
</head>
<body>
<h1>拼音发音校验</h1>
<p class="sub">
  共 <b>${ordered.length}</b> 条：<b style="color:#FF7A6B">${bare.length}</b> 条声母韵母本音（排在最前、红框标出）+ <b>${syllables.length}</b> 条带调音节。<br>
  键盘：<b>→</b> 下一个并播放 · <b>←</b> 上一个 · <b>空格</b> 重听 · <b>1</b> 标记有问题 · <b>2</b> 标记正常
</p>

<div class="warn">
  <b>⚠️ 请重点听这几类：</b><br>
  ① <b>声母韵母本音</b>（红框，${bare.length} 条）—— <b>拼音墙上播的就是这些，最该先听</b>。<br>
  &nbsp;&nbsp;&nbsp;声母要<b>轻短</b>，听不出明显的元音和声调：<code>f</code> 是唇齿摩擦音，
  <b>不该是「佛 fó」</b>；<code>s</code>/<code>sh</code>/<code>x</code>/<code>h</code> 同理<br>
  ② <b>声调分明</b> —— 尤其四声调那组 <code>mā má mǎ mà</code>，四个调要一耳朵分得出<br>
  ③ <b>前后鼻音</b> —— <code>en/eng</code>、<code>in/ing</code> 是否读得出区别<br>
  ④ <b>平翘舌</b> —— <code>z/zh</code>、<code>c/ch</code>、<code>s/sh</code> 是否读得出区别<br>
  ⑤ <b>n / l</b> —— 孩子明确反馈过这两组听不出来，得能分辨<br>
  发现问题的标记出来，最后点「导出问题清单」，把结果贴回给我即可。
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
const SYLLABLES = ${JSON.stringify(ordered)};
const marks = JSON.parse(localStorage.getItem('pinyinMarks') || '{}');
let cursor = 0, playing = false;

const grid = document.getElementById('grid');
let lastGroup = null;

SYLLABLES.forEach((s, i) => {
  if (s.group !== lastGroup) {
    lastGroup = s.group;
    const h = document.createElement('div');
    h.className = 'group';
    h.textContent = s.group;
    grid.appendChild(h);
  }
  const card = document.createElement('div');
  card.id = 'c' + i;
  card.className = 'card' + (s.bare ? ' risk' : '');
  card.innerHTML = \`
    <div class="py">\${s.pinyin}</div>
    <div class="meta"><span>\${s.bare ? '本音' : s.base + ' · ' + s.tone + '声'}</span>
      \${s.char ? '<span class="char">' + s.char + '</span>'
        : '<span class="nochar">' + (s.bare ? '拼音墙' : '念拼音') + '</span>'}</div>
    <audio id="a\${i}" src="/audio/voice/\${s.key}.mp3" preload="none"></audio>
    <div class="row">
      <button onclick="play(\${i})">▶ 听</button>
      <button onclick="mark(\${i},'bad')">✗ 有问题</button>
      <button onclick="mark(\${i},'ok')">✓ 正常</button>
    </div>\`;
  grid.appendChild(card);
});

function play(i) {
  cursor = i;
  document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
  const el = document.getElementById('a' + i);
  el.play();
  document.getElementById('c' + i).scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function mark(i, v) {
  marks[SYLLABLES[i].key] = v;
  localStorage.setItem('pinyinMarks', JSON.stringify(marks));
  render();
}
function render() {
  SYLLABLES.forEach((s, i) => {
    const c = document.getElementById('c' + i);
    c.classList.remove('bad', 'ok');
    if (marks[s.key]) c.classList.add(marks[s.key]);
  });
  const bad = Object.values(marks).filter(v => v === 'bad').length;
  const done = Object.keys(marks).length;
  document.getElementById('stat').textContent =
    \`已听 \${done}/\${SYLLABLES.length}　有问题 \${bad}\`;
}
async function playAll() {
  playing = true;
  for (let i = cursor; i < SYLLABLES.length && playing; i++) {
    play(i);
    await new Promise(r => setTimeout(r, 1400));
  }
  playing = false;
}
function stopAll() { playing = false; document.querySelectorAll('audio').forEach(a => a.pause()); }
function exportBad() {
  const bad = SYLLABLES.filter(s => marks[s.key] === 'bad');
  document.getElementById('out').value = bad.length === 0
    ? '（没有标记出问题的音节）'
    : '发音有问题的拼音：\\n' + bad.map(s =>
        \`  \${s.pinyin}  (\${s.group}, key=\${s.key})\`).join('\\n');
}
function resetMarks() {
  if (!confirm('清空全部标记？')) return;
  for (const k of Object.keys(marks)) delete marks[k];
  localStorage.setItem('pinyinMarks', '{}');
  render();
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { play(Math.min(cursor + 1, SYLLABLES.length - 1)); e.preventDefault(); }
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
console.log(`共 ${ordered.length} 条：声母韵母本音 ${bare.length} 条（排在最前）+ 带调音节 ${syllables.length} 条\n`)
console.log('打开方式：')
console.log('  npm run dev  然后浏览器访问  http://localhost:5173/pinyin-check.html')
