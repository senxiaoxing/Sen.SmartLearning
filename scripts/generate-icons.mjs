/**
 * @file PWA 图标生成 —— 纯 Node 实现，无外部依赖
 *
 * 为什么自己写 PNG 编码器：只为生成 4 个占位图标而引入 sharp/canvas
 * （几十 MB 的原生依赖、需要编译）不划算。Node 内置 zlib 已经够用，
 * PNG 格式本身只需要三个 chunk。
 *
 * 图标是**占位设计**：橙色渐变 + 白色五角星。
 * 阶段 ⑥ 宠物形象确定后，换成宠物头像重跑本脚本即可。
 *
 * 用法：node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

/** 品牌色，与 tailwind.config.js 的 honey 保持一致 */
const GRADIENT_TOP = [255, 190, 96]
const GRADIENT_BOTTOM = [255, 150, 40]
const STAR_COLOR = [255, 255, 255]

/** 超采样倍数。3×3 足以消除星角的锯齿，且生成速度可接受 */
const SUPERSAMPLE = 3

// ============================================================================
// PNG 编码
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

/** 把 RGBA 像素数组编码为 PNG。`rgba` 长度须为 width*height*4 */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  // 10~12 为 compression / filter / interlace，全部取默认值 0

  // 每个扫描行前置一个 filter 字节（0 = None）
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ============================================================================
// 图形绘制
// ============================================================================

/** 生成五角星的 10 个顶点（外角与内角交替） */
function starVertices(cx, cy, outerRadius) {
  const innerRadius = outerRadius * 0.382 // 正五角星的内外半径比
  const points = []
  for (let i = 0; i < 10; i++) {
    const angle = (-90 + i * 36) * (Math.PI / 180)
    const r = i % 2 === 0 ? outerRadius : innerRadius
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return points
}

/** 射线法判断点是否在多边形内 */
function isInside(px, py, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * 渲染一张图标。
 *
 * @param size - 边长（像素）
 * @param starRatio - 星星直径占边长的比例。maskable 图标需留安全区，取更小的值
 */
function renderIcon(size, starRatio) {
  const rgba = Buffer.alloc(size * size * 4)
  const star = starVertices(size / 2, size / 2, (size * starRatio) / 2)
  const step = 1 / SUPERSAMPLE

  for (let y = 0; y < size; y++) {
    // 背景垂直渐变
    const t = y / (size - 1)
    const bg = [
      Math.round(GRADIENT_TOP[0] + (GRADIENT_BOTTOM[0] - GRADIENT_TOP[0]) * t),
      Math.round(GRADIENT_TOP[1] + (GRADIENT_BOTTOM[1] - GRADIENT_TOP[1]) * t),
      Math.round(GRADIENT_TOP[2] + (GRADIENT_BOTTOM[2] - GRADIENT_TOP[2]) * t),
    ]

    for (let x = 0; x < size; x++) {
      // 超采样求星星覆盖率，消除锯齿
      let hits = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          if (isInside(x + (sx + 0.5) * step, y + (sy + 0.5) * step, star)) hits++
        }
      }
      const coverage = hits / (SUPERSAMPLE * SUPERSAMPLE)

      const offset = (y * size + x) * 4
      for (let c = 0; c < 3; c++) {
        rgba[offset + c] = Math.round(bg[c] + (STAR_COLOR[c] - bg[c]) * coverage)
      }
      rgba[offset + 3] = 255
    }
  }

  return encodePng(size, size, rgba)
}

// ============================================================================
// 输出
// ============================================================================

const TARGETS = [
  // iOS「添加到主屏幕」图标。系统自动加圆角，因此这里画满幅
  { name: 'apple-touch-icon-180.png', size: 180, starRatio: 0.62 },
  { name: 'icon-192.png', size: 192, starRatio: 0.62 },
  { name: 'icon-512.png', size: 512, starRatio: 0.62 },
  // maskable 图标会被系统裁成圆形/水滴等形状，内容须收在中心安全区内
  { name: 'icon-512-maskable.png', size: 512, starRatio: 0.46 },
]

mkdirSync(OUT_DIR, { recursive: true })

for (const { name, size, starRatio } of TARGETS) {
  const png = renderIcon(size, starRatio)
  writeFileSync(join(OUT_DIR, name), png)
  console.log(`${name}  ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`)
}

console.log(`\n图标已输出到 public/icons/`)
