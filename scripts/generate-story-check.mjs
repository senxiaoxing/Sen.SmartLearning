/**
 * @file 情境题试听页生成 —— 把每种说法逐条听一遍
 *
 * ⭐ **为什么需要它**
 *
 * 情境题的知识点（M4.1/M4.3/M9.1~M9.3）order 排在数学最后，
 * 正常答题要把 M1~M8 都推过去才碰得到 —— 想听一句新加的说法，
 * 得先做上百道题。而句式与语音片段是同时改的，改完必须有人耳过一遍：
 * 「吃掉了」接在「原来有 7 个苹果」后面自不自然、有没有拼接断口，
 * `storyProblem.test.ts` 一个字也验不了。
 *
 * 播放方式与 App 完全一致（AudioContext 排程、片段间隔 80ms，
 * 见 platform/speech.ts 的 GAP），因此这里听到的就是 iPad 上听到的。
 *
 * 用法：npm run story:check     生成后用浏览器或 iPad 打开提示的地址
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FRAMES_FILE = join(ROOT, 'src', 'data', 'seed', 'storyFrames.ts')
const COUNTABLES_FILE = join(ROOT, 'src', 'domain', 'generators', 'countables.ts')
const OUT_FILE = join(ROOT, 'public', 'story-check.html')

/** 从 countables.ts 的 COUNTABLES 块里解析出物品 */
function loadThings() {
  const text = readFileSync(COUNTABLES_FILE, 'utf-8')
  const start = text.indexOf('export const COUNTABLES')
  const block = text.slice(start, text.indexOf('\n]', start))

  const pattern =
    /name:\s*'([^']+)',\s*clipKey:\s*'([^']+)',\s*kind:\s*'([^']+)'/g
  return [...block.matchAll(pattern)].map(([, name, clipKey, kind]) => ({ name, clipKey, kind }))
}

/** 从 storyFrames.ts 解析出句式。注释掉的条目不会被匹配到（它们没有 op: 行） */
function loadFrames() {
  const text = readFileSync(FRAMES_FILE, 'utf-8')
  const start = text.indexOf('export const STORY_FRAMES')
  const block = text.slice(start)

  const pattern =
    /op:\s*'(\w+)',\s*\n\s*story:\s*(true|false),\s*\n\s*text:\s*'([^']+)',\s*\n(?:\s*thingKinds:\s*\[([^\]]*)\],\s*\n)?\s*parts:\s*\[([^\]]*)\]/g

  return [...block.matchAll(pattern)].map(([, op, story, text, kinds, parts]) => ({
    op,
    story: story === 'true',
    text,
    thingKinds: kinds === undefined ? null : [...kinds.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    parts: [...parts.matchAll(/'([^']+)'/g)].map((m) => m[1]),
  }))
}

/** 数字片段。与 domain/speech.ts 的 num() 同规则 */
const numClips = (n) =>
  Number.isInteger(n) && n >= 0 && n <= 20
    ? [`num.${n}`]
    : String(n).split('').map((d) => `num.${d}`)

/**
 * 分句开头的片段 —— 它们**前面**是句子里逗号的位置。
 *
 * 其余相邻片段都在同一个语流单元里（「九·个·饼干」「几个·苹果」），
 * 本来就该连读。App 现在对所有拼接点一视同仁用 80ms，
 * 于是词内也被撑开 —— 这正是要试出来的东西。
 */
const CLAUSE_STARTS = new Set([
  'phrase.rightHas',
  'phrase.thenCame',
  'phrase.tookAway',
  'phrase.ateUp',
  'phrase.altogetherHowMany',
  'phrase.togetherIsWhat',
  'phrase.howManyLeft',
])

/**
 * 三组示例数值，按运算分开取。
 *
 * ⚠️ remove 与 compare 必须满足 b < a，否则会摆出「原来有 4 个，吃掉了 5 个」
 * 这种题干 —— 生成器不会产出它（taken 严格小于 total，storyProblem.test.ts 守着），
 * 但试听页若自己摆错，看的人会以为是 App 的 bug。
 */
const SAMPLES_BY_OP = {
  add: [
    [4, 5],
    [7, 2],
    [9, 6],
  ],
  remove: [
    [9, 4],
    [7, 2],
    [6, 5],
  ],
  compare: [
    [9, 4],
    [7, 2],
    [6, 5],
  ],
}

const things = loadThings()
const frames = loadFrames()

/** 每个句式 × 每类允许的物品各取一个 × 三组数值 */
const cards = []
for (const frame of frames) {
  // 不限类别时每类取一个（听感够了）；限了类别就把那一类全列出来，
  // 因为「这个动词配这个东西通不通」正是限了类别的句式唯一要听的事
  const allowed = frame.thingKinds === null
    ? ['edible', 'creature', 'object'].map((k) => things.find((t) => t.kind === k))
    : things.filter((t) => frame.thingKinds.includes(t.kind))

  const pool = SAMPLES_BY_OP[frame.op]
  // 直白提问的句式没有数字槽位，三组数值会产出三条一模一样的卡片
  const samples = frame.text.includes('{a}') ? pool : [pool[0]]

  for (const thing of allowed.filter(Boolean)) {
    for (const [a, b] of samples) {
      const text = frame.text
        .replaceAll('{a}', String(a))
        .replaceAll('{b}', String(b))
        .replaceAll('{thing}', thing.name)

      // 每个片段带上「它前面是不是逗号」，播放时据此选间隔还是停顿
      const clips = []
      for (const p of frame.parts) {
        const keys =
          p === '{a}' ? numClips(a) : p === '{b}' ? numClips(b) : p === '{thing}' ? [thing.clipKey] : [p]
        keys.forEach((key, i) => {
          clips.push({ key, clause: i === 0 && CLAUSE_STARTS.has(p) })
        })
      }

      cards.push({
        id: `${frame.op}-${frame.story}-${thing.clipKey}-${a}-${b}`,
        label: `${frame.op}${frame.story ? ' · 带情境' : ' · 直白提问'}`,
        text,
        clips,
      })
    }
  }
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>情境题试听 · 希恩爱学习</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif;
         margin: 0; padding: 16px 14px 80px; line-height: 1.6; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #888; font-size: 13px; margin: 0 0 16px; }
  .card { border: 2px solid #8884; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; }
  .card.cur { border-color: #4a9eff; background: #4a9eff14; }
  .card.bad { border-color: #e5533d; background: #e5533d14; }
  .tag { font-size: 12px; color: #888; }
  .txt { font-size: 19px; font-weight: 600; margin: 4px 0 6px; }
  .clips { font-size: 12px; color: #999; font-family: ui-monospace, monospace; word-break: break-all; }
  .row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  button { font: inherit; padding: 8px 16px; border-radius: 10px; border: 1px solid #8886;
           background: #8881; cursor: pointer; min-height: 44px; }
  button.play { background: #4a9eff; color: #fff; border-color: transparent; font-weight: 600; }
  button.bad { background: #e5533d; color: #fff; border-color: transparent; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 14px;
         background: Canvas; border-top: 1px solid #8884; display: flex; gap: 10px; align-items: center; }
  .bar span { font-size: 13px; color: #888; }
  .tuner { position: sticky; top: 0; z-index: 5; background: Canvas;
           border: 2px solid #4a9eff66; border-radius: 14px; padding: 12px 14px; margin-bottom: 16px; }
  .tune-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .tune-row b { font-size: 14px; width: 5em; flex-shrink: 0; }
  .tune-row input { flex: 1; min-width: 120px; height: 34px; }
  .tune-row span { font-size: 14px; width: 4.5em; text-align: right;
                   font-family: ui-monospace, monospace; }
  .hint { font-size: 12px; color: #888; margin: 6px 0 10px; line-height: 1.5; }
  .clause { color: #e5533d; font-weight: 700; }
</style>
</head>
<body>
<h1>情境题试听 · ${cards.length} 条</h1>
<p class="sub">
  键盘 ← → 切换，空格重听。标记过的会存在本机，可一键导出。
</p>

<div class="tuner">
  <div class="tune-row">
    <b>片段间隔</b>
    <input type="range" id="gap" min="0" max="150" step="5" value="80">
    <span id="gapv">80ms</span>
  </div>
  <div class="tune-row">
    <b>逗号停顿</b>
    <input type="range" id="pause" min="0" max="400" step="20" value="80">
    <span id="pausev">80ms</span>
  </div>
  <div class="tune-row">
    <b>裁静音</b>
    <label style="flex:1;display:flex;align-items:center;gap:8px;font-size:14px">
      <input type="checkbox" id="trim" style="width:22px;height:22px;flex:none" checked>
      与 App 一致（speechClips.ts 的 findSpeechRange）。<b>取消勾选只为对照</b>
    </label>
  </div>
  <p class="hint">
    Edge TTS 的每条片段都是 1.78 秒，人声只占 0.24~0.64 秒，尾部拖着约 1.2 秒静音。
    App 在解码后就把它裁掉了（<code>speechClips.ts</code>），所以<b>默认勾选才是真实效果</b>；
    取消勾选是「如果没裁会怎样」，那是这一页第一版的错误行为。<br>
    两个滑块才是真正可调的：间隔对应 <code>speech.ts</code> 的 <code>GAP</code>（现 80ms），
    逗号停顿目前 App 还没有（一刀切用 GAP）。
  </p>
  <div class="row">
    <button onclick="preset(80, 80, true)">现在的 App</button>
    <button onclick="preset(80, 200, true)">加分句停顿</button>
    <button onclick="preset(80, 80, false)">对照：不裁静音</button>
  </div>
</div>
<div id="list"></div>
<div class="bar">
  <button onclick="dump()">导出问题清单</button>
  <span id="stat"></span>
</div>
<script>
const CARDS = ${JSON.stringify(cards)};
let cursor = 0;
let marks = JSON.parse(localStorage.getItem('storyMarks') || '{}');
let ctx = null;
let playing = [];

const gapEl = document.getElementById('gap');
const pauseEl = document.getElementById('pause');
const trimEl = document.getElementById('trim');
const gapOf = () => Number(gapEl.value) / 1000;
const pauseOf = () => Number(pauseEl.value) / 1000;

function syncLabels() {
  document.getElementById('gapv').textContent = gapEl.value + 'ms';
  document.getElementById('pausev').textContent = pauseEl.value + 'ms';
}
function preset(g, p, t) {
  gapEl.value = g; pauseEl.value = p; trimEl.checked = t; syncLabels(); play(cursor);
}

/**
 * 找出人声的起止位置（秒）。
 *
 * ⚠️ **这段是从 src/platform/speechClips.ts 的 findSpeechRange 照搬的**，
 * 三个常量也必须跟着那边走。试听页的全部意义是「听到的就是 iPad 上听到的」，
 * 自己另写一套裁剪算法，量出来的就不是 App 的行为 ——
 * 这一页第一版正是这么错的：它压根没裁静音，于是每两个片段之间
 * 凭空多出 1.2 秒死气，听起来像 App 坏了。
 */
const SPEECH_THRESHOLD = 0.03;
const FRAME = 0.01;
const MARGIN = 0.03;

function findSpeechRange(buffer) {
  const data = buffer.getChannelData(0);
  const win = Math.floor(buffer.sampleRate * FRAME);

  const rms = [];
  let peak = 0;
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j += 1) sum += data[j] * data[j];
    const value = Math.sqrt(sum / win);
    rms.push(value);
    if (value > peak) peak = value;
  }
  if (peak === 0) return { start: 0, end: buffer.duration };

  const threshold = peak * SPEECH_THRESHOLD;
  const first = rms.findIndex((v) => v > threshold);
  let last = -1;
  for (let i = rms.length - 1; i >= 0; i -= 1) {
    if (rms[i] > threshold) { last = i; break; }
  }
  if (first < 0 || last < 0) return { start: 0, end: buffer.duration };

  return {
    start: Math.max(0, first * FRAME - MARGIN),
    end: Math.min(buffer.duration, (last + 1) * FRAME + MARGIN),
  };
}
const ms = (s) => Math.round(s * 1000);
gapEl.addEventListener('input', syncLabels);
pauseEl.addEventListener('input', syncLabels);

function render() {
  document.getElementById('list').innerHTML = CARDS.map((c, i) => \`
    <div class="card \${i === cursor ? 'cur' : ''} \${marks[c.id] ? 'bad' : ''}" id="c\${i}">
      <div class="tag">\${c.label}</div>
      <div class="txt">\${c.text}</div>
      <div class="clips">\${c.clips.map((x, k) =>
        (x.clause && k > 0 ? '<span class="clause">， </span>' : '') + x.key).join(' · ')}</div>
      <div class="clips" id="r\${i}" style="color:#4a9eff"></div>
      <div class="row">
        <button class="play" onclick="play(\${i})">▶ 播放</button>
        <button class="\${marks[c.id] ? 'bad' : ''}" onclick="mark(\${i})">
          \${marks[c.id] ? '✓ 已标记有问题' : '标记有问题'}
        </button>
      </div>
    </div>\`).join('');
  const n = Object.keys(marks).filter(k => marks[k]).length;
  document.getElementById('stat').textContent = n > 0 ? \`已标记 \${n} 条\` : '还没标记';
}

async function play(i) {
  cursor = i;
  render();
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  playing.forEach(s => { try { s.stop() } catch {} });
  playing = [];

  const parts = [];
  for (const clip of CARDS[i].clips) {
    try {
      const res = await fetch('audio/voice/' + clip.key + '.mp3');
      if (!res.ok) { console.warn('缺片段', clip.key); continue; }
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      parts.push({ buf, clause: clip.clause, key: clip.key });
    } catch (e) { console.warn('解码失败', clip.key, e); }
  }

  // 排程方式同 platform/speech.ts，只是间隔可调、分句处单独给停顿，
  // 并且可以选择跳过每条 mp3 首尾自带的静音
  const trim = trimEl.checked;
  let at = ctx.currentTime + 0.02;
  const report = [];

  let total = 0;
  parts.forEach((p, idx) => {
    const r = findSpeechRange(p.buf);
    const body = r.end - r.start;
    report.push(
      \`\${p.key.replace(/^(phrase|word|num)\\./, '')} \${ms(p.buf.duration)}→\${ms(body)}\`,
    );

    const src = ctx.createBufferSource();
    src.buffer = p.buf;
    src.connect(ctx.destination);
    // 裁静音：从人声处起播，按人声长度排下一段（尾部静音被下一段自然盖住）。
    // 与 App 里「裁成新 buffer 再整条播」等价
    if (trim) src.start(at, r.start, body);
    else src.start(at);
    playing.push(src);

    const next = parts[idx + 1];
    const step = (trim ? body : p.buf.duration) + (next && next.clause ? pauseOf() : gapOf());
    at += step;
    total += step;
  });

  const el = document.getElementById('r' + i);
  if (el) el.textContent = \`整句 \${ms(total)}ms · \` + report.join('  |  ');
  document.getElementById('c' + i).scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function mark(i) {
  marks[CARDS[i].id] = !marks[CARDS[i].id];
  localStorage.setItem('storyMarks', JSON.stringify(marks));
  render();
}

function dump() {
  const bad = CARDS.filter(c => marks[c.id]);
  const head = '间隔 ' + gapEl.value + 'ms · 逗号停顿 ' + pauseEl.value + 'ms\\n\\n';
  const out = head + (bad.length === 0 ? '（没有标记具体条目）'
    : bad.map(c => c.text + '\\n    ' + c.clips.map(x => x.key).join(' · ')).join('\\n'));
  navigator.clipboard?.writeText(out);
  alert('已复制到剪贴板：\\n\\n' + out);
}

document.addEventListener('keydown', e => {
  // 'Right' / 'Left' 是旧内核的键名，一并收下
  if (e.key === 'ArrowRight' || e.key === 'Right') play(Math.min(CARDS.length - 1, cursor + 1));
  else if (e.key === 'ArrowLeft' || e.key === 'Left') play(Math.max(0, cursor - 1));
  else if (e.key === ' ') { e.preventDefault(); play(cursor); }
});

syncLabels();
render();
</script>
</body>
</html>
`

writeFileSync(OUT_FILE, html, 'utf-8')
console.log(`情境题试听页：${cards.length} 条（${frames.length} 种说法 × 物品 × 数值）`)
console.log(`输出：${OUT_FILE}`)
console.log(`打开：npm run dev -- --host 之后访问 /Sen.SmartLearning/story-check.html`)
