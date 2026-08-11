/**
 * @file 音效生成 —— 纯 Node 合成 WAV，无外部依赖
 *
 * 为什么自己合成而不是找素材：免费音效库的授权条款五花八门，
 * 且「柔和、不刺耳、适合一年级」这个要求很难靠搜索命中——
 * 而这几个音本质上就是几条正弦波加包络，自己算反而更可控：
 * 想让答错的提示音再柔一点，改一个数字重跑就行。
 *
 * ⭐ 产品红线（CLAUDE.md「答错反馈要温和」）：
 * 答错音**绝不能**是刺耳的蜂鸣。这里用的是下行小三度 + 慢起音，
 * 听感接近「嗯…再看看」而不是「错误！」。
 *
 * 输出 WAV 而非 MP3：这几个音总共不到 60KB，省下 MP3 编码器的复杂度；
 * iOS Safari 对 WAV 支持良好。将来要换成真人录制或专业音效，
 * 把同名文件丢进 public/audio/sfx/ 覆盖即可，代码一行不用改。
 *
 * 用法：node scripts/generate-sfx.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio', 'sfx')

/** 采样率。音效都是简单波形，22.05kHz 足够且体积减半 */
const SAMPLE_RATE = 22050

/** 主音量上限。留出余量避免削波，也避免在 iPad 外放上过冲 */
const PEAK = 0.28

// ============================================================================
// WAV 编码（16 位单声道 PCM）
// ============================================================================

function encodeWav(samples) {
  const dataBytes = samples.length * 2
  const buffer = Buffer.alloc(44 + dataBytes)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // fmt chunk 长度
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // 单声道
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // 字节率
  buffer.writeUInt16LE(2, 32) // 块对齐
  buffer.writeUInt16LE(16, 34) // 位深
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }
  return buffer
}

// ============================================================================
// 合成基元
// ============================================================================

const seconds = (n) => Math.round(n * SAMPLE_RATE)

/**
 * 一个带包络的音符。
 *
 * 用正弦波加少量三次谐波：纯正弦听起来太「电子」，
 * 加一点谐波会更接近木琴/钟琴，那是儿童内容里最常见也最不刺耳的音色。
 *
 * @param freq - 基频 Hz
 * @param dur - 时长（秒）
 * @param opts.attack - 起音时长（秒）。越长越柔和
 * @param opts.gain - 相对音量
 */
function note(freq, dur, { attack = 0.008, gain = 1 } = {}) {
  const total = seconds(dur)
  const attackSamples = Math.max(1, seconds(attack))
  const out = new Float32Array(total)

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    const wave =
      Math.sin(2 * Math.PI * freq * t) + 0.22 * Math.sin(2 * Math.PI * freq * 3 * t)

    // 起音线性渐入，衰减指数下落 —— 指数衰减是敲击类音色的关键
    const rise = i < attackSamples ? i / attackSamples : 1
    const decay = Math.exp((-3.5 * i) / total)

    out[i] = wave * rise * decay * gain * PEAK
  }
  return out
}

/** 把若干片段按给定起始时间（秒）叠在一起 */
function mix(parts) {
  const length = Math.max(...parts.map((p) => seconds(p.at) + p.samples.length))
  const out = new Float32Array(length)
  for (const { at, samples } of parts) {
    const offset = seconds(at)
    for (let i = 0; i < samples.length; i++) out[offset + i] += samples[i]
  }
  return out
}

/** 依次排列（前一个结束后再开始下一个），gap 为间隔秒数 */
function sequence(notes, gap = 0) {
  let cursor = 0
  const parts = notes.map(({ freq, dur, ...opts }) => {
    const at = cursor
    cursor += dur + gap
    return { at, samples: note(freq, dur, opts) }
  })
  return mix(parts)
}

// ============================================================================
// 音效定义
// ============================================================================

/** C 大调音高表，儿童内容用大调听感明亮 */
const P = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5 }

const SFX = {
  /** 点击：极短、极轻，只用来确认「点到了」，不能有存在感 */
  tap: () => note(P.A5, 0.06, { attack: 0.004, gain: 0.5 }),

  /** 答对：上行大三度，明亮但不夸张 */
  correct: () => sequence([
    { freq: P.E5, dur: 0.12 },
    { freq: P.G5, dur: 0.12 },
    { freq: P.C6, dur: 0.3 },
  ]),

  /**
   * 答错：⭐ 下行小三度 + 慢起音。
   *
   * 慢起音（40ms）是关键——它去掉了「咔」的攻击感，
   * 听起来像一声轻轻的「嗯…」而不是警报。
   * 音量也压到六成：错误反馈不该比正确反馈更响。
   */
  wrong: () => sequence([
    { freq: P.D5, dur: 0.16, attack: 0.04, gain: 0.6 },
    { freq: 493.88, dur: 0.28, attack: 0.04, gain: 0.6 },
  ]),

  /** 升级：C 大调琶音，是全 App 最「大」的音，留给宠物变身 */
  levelUp: () => sequence([
    { freq: P.C5, dur: 0.1 },
    { freq: P.E5, dur: 0.1 },
    { freq: P.G5, dur: 0.1 },
    { freq: P.C6, dur: 0.14 },
    { freq: P.E6, dur: 0.4 },
  ]),

  /** 一轮完成：比升级克制，两个音收尾 */
  complete: () => sequence([
    { freq: P.G5, dur: 0.14 },
    { freq: P.C6, dur: 0.34 },
  ]),

  /** 卡片放进槽：闷一点的短音，确认「吸住了」 */
  place: () => note(P.C5, 0.09, { attack: 0.006, gain: 0.55 }),
}

// ============================================================================

mkdirSync(OUT_DIR, { recursive: true })

let total = 0
for (const [name, build] of Object.entries(SFX)) {
  const wav = encodeWav(build())
  const file = join(OUT_DIR, `${name}.wav`)
  writeFileSync(file, wav)
  total += wav.length
  console.log(`  ${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`)
}

console.log(`\n已生成 ${Object.keys(SFX).length} 个音效，合计 ${(total / 1024).toFixed(1)} KB`)
console.log(`输出目录：${OUT_DIR}`)
