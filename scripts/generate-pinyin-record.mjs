/**
 * @file 拼音录音页生成 —— 给没有汉字载体的音节录真人音频
 *
 * ⭐ **为什么这几个只能录**
 *
 * TTS 是文本转语音：喂汉字「八」必然读对，喂拼音串「bā」只能靠它猜——
 * 实测大面积读错声调（`á` 读成 `ā`、`ē` 读成 `è`）。
 * 而这几个音节在汉语里**本来就没有干净的单音字**可挂：
 * 要么不能独立成音节（eng / ong），要么只有多音字（诶 ēi/éi/ěi/èi、晕 yūn/yùn）。
 *
 * 它们目前已被排除在题库之外（宁可少几个韵母，也不能教错读音）。
 * 录好之后放进 `public/audio/voice/` 即可启用。
 *
 * 页面用 MediaRecorder 直接在浏览器里录，录完自动按正确文件名下载，
 * 不需要装任何音频软件。
 *
 * 用法：npm run pinyin:record
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SYLLABLES_FILE = join(ROOT, 'src', 'data', 'seed', 'pinyinSyllables.ts')
const OUT_FILE = join(ROOT, 'public', 'pinyin-record.html')

/** 只取没有 char 的音节 —— 那些正是 TTS 读不准、必须人声的 */
function loadNeedRecording() {
  const text = readFileSync(SYLLABLES_FILE, 'utf-8')
  const pattern =
    /\{\s*pinyin:\s*'([^']+)',\s*base:\s*'([^']+)',\s*tone:\s*(\d)(?:,\s*char:\s*'([^']+)')?/g

  const seen = new Set()
  const out = []
  for (const [, pinyin, base, tone, char] of text.matchAll(pattern)) {
    const key = `pinyin.${base.replace(/ü/g, 'v')}${tone}`
    if (seen.has(key)) continue
    seen.add(key)
    if (char === undefined) out.push({ key, pinyin, base, tone: Number(tone) })
  }
  return out
}

const items = loadNeedRecording()

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>拼音录音 · 希恩爱学习</title>
<style>
 body{font-family:system-ui,"Microsoft YaHei",sans-serif;margin:0;padding:24px;background:#FFF8E7;color:#3D3A38}
 h1{font-size:22px;margin:0 0 6px}
 .sub{color:#3D3A38aa;font-size:14px;line-height:1.8;margin-bottom:18px}
 .warn{background:#FFB84D22;border-left:4px solid #FFB84D;padding:12px 16px;border-radius:8px;
       margin-bottom:20px;font-size:14px;line-height:1.8}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
 .card{background:#fff;border-radius:14px;padding:16px;border:3px solid transparent}
 .card.done{border-color:#5FD3A6}
 .card.rec{border-color:#FF7A6B}
 .py{font-size:40px;font-weight:700;text-align:center;margin-bottom:4px}
 .hint{font-size:13px;color:#3D3A38aa;text-align:center;margin-bottom:10px;min-height:34px;line-height:1.5}
 .row{display:flex;gap:6px}
 button{font:inherit;flex:1;padding:9px 6px;border-radius:10px;border:none;background:#F3EEE2;
        cursor:pointer;font-size:14px}
 button.primary{background:#FFB84D;color:#fff}
 button:disabled{opacity:.4;cursor:default}
 #stat{font-size:15px;margin:14px 0}
</style>
</head>
<body>
<h1>拼音录音</h1>
<p class="sub">
  这 <b>${items.length}</b> 个音节在汉语里没有干净的单音字可以挂，TTS 只能念拼音串、会读错声调，
  所以必须录真人音频。它们目前**不出现在题库里**，录好之后才启用。
</p>

<div class="warn">
  <b>录音要点：</b><br>
  ① 安静环境，离麦克风约一拳距离<br>
  ② <b>一个音节读一遍就好</b>，读完停半秒再点停止（末尾留点余量）<br>
  ③ 声调要读足：一声平、二声升、三声降升、四声降<br>
  ④ 录完点「试听」确认，不满意就重录<br>
  ⑤ 全部录完点「下载全部」，把文件放进 <code>public/audio/voice/</code>（同名覆盖）<br>
  ⑥ 最后在 <code>src/data/seed/pinyinSyllables.ts</code> 里把对应条目标上 <code>char</code> 或改用录音标记，
     它们才会进题库
</div>

<div id="stat"></div>
<div class="grid" id="grid"></div>

<script>
const ITEMS = ${JSON.stringify(items)};
const TONE_HINT = {1:'一声：又高又平，像拉长的「妈」',2:'二声：由中往上扬，像疑问「啊？」',
                   3:'三声：先降下去再升上来',4:'四声：从高快速降下来，像「不！」'};
const blobs = {};
let recorder = null, chunks = [], current = -1;

const grid = document.getElementById('grid');
ITEMS.forEach((it, i) => {
  const d = document.createElement('div');
  d.className = 'card'; d.id = 'c'+i;
  d.innerHTML = \`<div class="py">\${it.pinyin}</div>
    <div class="hint">\${TONE_HINT[it.tone] ?? ''}</div>
    <div class="row">
      <button class="primary" id="r\${i}" onclick="toggle(\${i})">● 录音</button>
      <button id="p\${i}" onclick="playBack(\${i})" disabled>试听</button>
    </div>\`;
  grid.appendChild(d);
});

async function toggle(i) {
  if (recorder && current === i) { recorder.stop(); return; }
  if (recorder) { alert('请先停止当前录音'); return; }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = []; current = i;
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    blobs[ITEMS[i].key] = new Blob(chunks, { type: recorder.mimeType });
    stream.getTracks().forEach(t => t.stop());
    recorder = null; current = -1;
    document.getElementById('r'+i).textContent = '● 重录';
    document.getElementById('p'+i).disabled = false;
    document.getElementById('c'+i).className = 'card done';
    render();
  };
  recorder.start();
  document.getElementById('r'+i).textContent = '■ 停止';
  document.getElementById('c'+i).className = 'card rec';
}

function playBack(i) {
  const b = blobs[ITEMS[i].key]; if (!b) return;
  new Audio(URL.createObjectURL(b)).play();
}

function downloadAll() {
  for (const it of ITEMS) {
    const b = blobs[it.key]; if (!b) continue;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    // ⚠️ MediaRecorder 产出的是 webm，不是 mp3。文件名照 key 走，
    //    扩展名保留 webm —— 浏览器与 iOS Safari 都能播 webm/opus，
    //    播放器按 key 找文件时需要同步改扩展名（见 platform/speech.ts）
    a.download = it.key + '.webm';
    a.click();
  }
}

function render() {
  const n = Object.keys(blobs).length;
  document.getElementById('stat').innerHTML =
    \`已录 <b>\${n}/\${ITEMS.length}</b>　\` +
    (n === ITEMS.length
      ? '<button class="primary" style="max-width:160px" onclick="downloadAll()">⬇ 下载全部</button>'
      : (n > 0 ? '<button style="max-width:160px" onclick="downloadAll()">⬇ 下载已录的</button>' : ''));
}
render();
</script>
</body>
</html>
`

writeFileSync(OUT_FILE, html, 'utf-8')
console.log(`已生成录音页：${OUT_FILE}`)
console.log(`需要录 ${items.length} 个音节：${items.map((i) => i.pinyin).join(' ')}`)
console.log('\n打开：npm run dev  然后访问  http://localhost:5173/pinyin-record.html')
