/**
 * @file 拼音真人录音素材的齐全性测试
 * @layer data
 * @see scripts/fetch-pinyin-voice.mjs  产出这些文件的脚本
 * @see design/11-拼音真人录音方案.md
 *
 * ⭐ 这个文件守的是**盘上真有那 165 个 mp3**。
 *
 * 为什么 `voiceBundleIndex.test.ts` 拦不住：
 * 索引是打包时按盘上**实际存在的文件**生成的——文件没了，
 * 索引跟着一起变小，那条「清单里每条都在索引里」于是永远成立。
 * 它保证的是打包的一致性，不是文件的齐全性。
 *
 * 真正会出事的两个场景：
 *
 * 1. 有人跑 `npm run voices -- --force`，而 `generate-voices.mjs` 的白名单
 *    没拦住拼音 —— 那是 TTS 脚本，它一条真人录音也补不回来
 * 2. 换机器后忘了跑 `npm run pinyin:voice`
 *
 * 两者的表现都是**某几条拼音静默无声**：`say()` 发现片段缺失就整句降级成
 * 实时 TTS，不报错、不白屏，只有耳朵听得出音色不对。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALL_SYLLABLES,
  COMPOUND_FINALS,
  INITIALS,
  SINGLE_FINALS,
} from '@/data/seed/pinyinSyllables'
import { bareKey, initialOf, syllableKey } from '@/domain/pinyin'
import { PINYIN_CHART } from '@/data/seed/pinyinChart'

const VOICE_DIR = join(process.cwd(), 'public', 'audio', 'voice')

/**
 * 最小可信体积，与 `scripts/fetch-pinyin-voice.mjs` 的 `MIN_BYTES` 一致。
 * 取不到文件时 GitHub 返回的是 14 字节的 `404: Not Found` 文本。
 */
const MIN_BYTES = 1024

/** 是不是一个像样的 mp3 —— ID3 标签，或 MPEG 帧同步头（`FF Ex` / `FF Fx`） */
function isMp3(buf: Buffer): boolean {
  if (buf.length < MIN_BYTES) return false
  // 长度已经查过，这三次读必然有值；`?? 0` 是为了 noUncheckedIndexedAccess
  const [b0, b1, b2] = [buf[0] ?? 0, buf[1] ?? 0, buf[2] ?? 0]
  if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) return true // 'ID3'
  return b0 === 0xff && (b1 & 0xe0) === 0xe0
}

/** 取不到就抛，交给用例汇总成一条可读的失败信息 */
function readVoiceClip(key: string): Buffer {
  const file = join(VOICE_DIR, `${key}.mp3`)
  if (!existsSync(file)) {
    throw new Error(`${key}.mp3 不在盘上 —— 跑一次 npm run pinyin:voice`)
  }
  return readFileSync(file)
}

function expectAllClipsValid(keys: readonly string[]): void {
  const broken: string[] = []
  for (const key of keys) {
    try {
      if (!isMp3(readVoiceClip(key))) broken.push(`${key}（不是有效 mp3）`)
    } catch (error) {
      broken.push((error as Error).message)
    }
  }
  expect(broken, '缺失或损坏的拼音音频').toEqual([])
}

/** 47 条本音的 key —— 与 fetch 脚本的 `planClips()` 同一条规则 */
const BARE_KEYS: readonly string[] = [
  ...INITIALS.map((s) => bareKey(initialOf(s.base))),
  ...[...SINGLE_FINALS, ...COMPOUND_FINALS].map((s) => bareKey(s.base)),
]

describe('⭐ 拼音真人录音素材齐全', () => {
  it(`${ALL_SYLLABLES.length} 条带调音节的音频都在盘上`, () => {
    expectAllClipsValid(ALL_SYLLABLES.map((s) => syllableKey(s.base, s.tone)))
  })

  it(`${BARE_KEYS.length} 条声母韵母本音的音频都在盘上`, () => {
    expect(BARE_KEYS).toHaveLength(47)
    expectAllClipsValid(BARE_KEYS)
  })

  /**
   * ⭐ 拼音墙实际在播的那 63 条（权威音源，2026-09-23 起）。
   *
   * 直接取墙上每张卡的 `clipKey`，不另算一遍——这条守的正是
   * 「卡片指向了一个盘上没有的片段」，那种错误在页面上是**静默**的：
   * 点下去没声音，而其余卡照常。
   */
  it('拼音墙 63 张卡的音频都在盘上', () => {
    const keys = PINYIN_CHART.flatMap((group) => group.cards).map((card) => card.clipKey)
    expect(keys).toHaveLength(63)
    expectAllClipsValid(keys)
  })

  /**
   * ⭐ 本音清单必须正好是「声母表 + 韵母表」——多一条是死文件，
   * 少一条是拼音墙上某个音**没有声音**（而那面墙的全部内容都是听的）。
   */
  it('本音清单恰好覆盖声母表与韵母表', () => {
    expect(INITIALS).toHaveLength(23)
    expect([...SINGLE_FINALS, ...COMPOUND_FINALS]).toHaveLength(24)
    expect(new Set(BARE_KEYS).size, '本音 key 有重复').toBe(BARE_KEYS.length)
  })
})
