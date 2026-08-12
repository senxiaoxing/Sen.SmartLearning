/**
 * @file 语音包索引的一致性测试
 * @layer data
 * @see scripts/bundle-voices.mjs        索引的生成方
 * @see src/data/seed/voiceBundleIndex.ts
 *
 * ⭐ 这个文件守的是**「打包漏了一条」**。
 *
 * 加了新片段却忘记重新打包，运行时会走单文件兜底——听起来一切正常，
 * 但那条片段没进语音包、也就**没进预缓存**，装到 iPad 上离线时它就哑了
 * （降级成机器音）。这类问题在开发机上永远复现不出来，只能靠这里拦。
 *
 * 修法只有一句：`npm run voices:bundle`（`npm run build` 也会自动跑）。
 */

import { describe, expect, it } from 'vitest'
import {
  VOICE_BUNDLES,
  VOICE_BUNDLE_INDEX,
  VOICE_BUNDLE_TOTAL_BYTES,
} from '@/data/seed/voiceBundleIndex'
import { VOICE_MANIFEST } from '@/data/seed/voiceManifest'

describe('语音包索引', () => {
  it('⭐ 清单里的每个片段都打进了包 —— 漏的那条离线会哑', () => {
    const missing = Object.keys(VOICE_MANIFEST).filter(
      (key) => VOICE_BUNDLE_INDEX[key] === undefined,
    )
    expect(
      missing,
      `${missing.length} 条片段不在语音包里，跑 npm run voices:bundle 重新打包：\n  ${missing.slice(0, 12).join('\n  ')}`,
    ).toEqual([])
  })

  it('索引里的每个条目都指向一个真实存在的包', () => {
    const files = new Set(VOICE_BUNDLES.map((b) => b.file))
    for (const [key, [file]] of Object.entries(VOICE_BUNDLE_INDEX)) {
      expect(files.has(file), `${key} 指向不存在的包 ${file}`).toBe(true)
    }
  })

  it('偏移与长度都是正数，且不超出所在包的体积', () => {
    const sizeOf = new Map(VOICE_BUNDLES.map((b) => [b.file, b.bytes]))
    for (const [key, [file, offset, length]] of Object.entries(VOICE_BUNDLE_INDEX)) {
      expect(offset, `${key} 偏移为负`).toBeGreaterThanOrEqual(0)
      expect(length, `${key} 长度为空`).toBeGreaterThan(0)
      expect(offset + length, `${key} 的切片超出了 ${file}`).toBeLessThanOrEqual(
        sizeOf.get(file) ?? 0,
      )
    }
  })

  it('同一个包内的片段互不重叠 —— 重叠说明拼接偏移算错了', () => {
    const byFile = new Map<string, { key: string; from: number; to: number }[]>()
    for (const [key, [file, offset, length]] of Object.entries(VOICE_BUNDLE_INDEX)) {
      byFile.set(file, [
        ...(byFile.get(file) ?? []),
        { key, from: offset, to: offset + length },
      ])
    }

    for (const [file, spans] of byFile) {
      const sorted = [...spans].sort((a, b) => a.from - b.from)
      for (let i = 1; i < sorted.length; i += 1) {
        expect(
          sorted[i]!.from,
          `${file} 里 ${sorted[i - 1]!.key} 与 ${sorted[i]!.key} 的字节区间重叠`,
        ).toBeGreaterThanOrEqual(sorted[i - 1]!.to)
      }
    }
  })

  it('分卷都在 Workbox 的单文件上限内 —— 超了会被静默排除出预缓存', () => {
    // vite.config.ts 的 maximumFileSizeToCacheInBytes
    const LIMIT = 4 * 1024 * 1024
    for (const bundle of VOICE_BUNDLES) {
      expect(bundle.bytes, `${bundle.file} 超过 Workbox 单文件上限`).toBeLessThan(LIMIT)
    }
  })

  it('总字节数与各包之和一致', () => {
    expect(VOICE_BUNDLES.reduce((sum, b) => sum + b.bytes, 0)).toBe(VOICE_BUNDLE_TOTAL_BYTES)
  })
})
