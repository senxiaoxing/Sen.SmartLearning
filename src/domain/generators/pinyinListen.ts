/**
 * @file 听音选拼音生成器 —— P1/P2/P4/P5/P6 的 choice_audio 主力题型
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §P 拼音知识点与误区清单
 * @see src/data/seed/pinyinSyllables.ts  音节表（发音载体）
 *
 * ⚠️ **这是拼音唯一零阅读门槛的题型**，因此是拼音板块的主力。
 * 一年级上学期孩子不识字，看图选、看字选都有额外门槛，
 * 「听一个音、从几个拼音里挑出来」才是纯粹在考拼音本身。
 *
 * ⭐ 干扰项**必须是易混音节**，不能随机抽。
 * 听到 `bā` 时，把 `pā`（送气/不送气）和 `dā`（b/d 形近）摆在一起才有诊断价值；
 * 摆 `xīng` 这种毫不相干的，孩子闭着眼也能排除，这道题就白出了。
 */

import { CONFUSABLE_PINYIN } from '@/domain/generators/confusablePinyin'
import { buildTextOptions } from '@/domain/generators/distractors'
import { readEnum } from '@/domain/generators/params'
import { randomPick, shuffle } from '@/domain/generators/rng'
import { displayForm, syllableKey, type Syllable } from '@/domain/pinyin'
import type { Generator, MisconceptionTag } from '@/domain/types'

/** 易混对照表在独立文件里 —— 它是教学经验的编码，与出题逻辑是两件事 */
const CONFUSABLE = CONFUSABLE_PINYIN

/**
 * 生成一道听音选拼音题。
 *
 * 题干**只有音频没有文字**：孩子点喇叭听到一个音节，从 4 个拼音里选出来。
 * 这样考的就是「听到的音 ↔ 拼音写法」这一条对应关系本身。
 *
 * 干扰项优先级：
 * 1. **易混音节**（{@link CONFUSABLE}）—— 带具体误区标签，有诊断价值
 * 2. **同组其他音节** —— 易混表覆盖不到时的兜底，标 `spell_integral`
 *
 * @param ctx - 生成上下文。`ctx.params.syllables` 由模板注入本知识点的音节集合
 * @returns `choice_audio` 题目，题干音频即目标音节
 *
 * @example
 * // P2.1「声母 b p m f」听到 bā：
 * //   bā 正确 / dā bd_confusion / pā pq_confusion / mā（兜底）
 *
 * @see design/01-知识点图谱.md §P7 易混辨析
 */
export const pinyinListen: Generator = ({ kpId, difficulty, params, rng }) => {
  const pool = readSyllables(params)
  const mode = readEnum(params, 'mode', ['syllable', 'tone'] as const, 'syllable')
  const target = pickTarget(rng, pool, mode)

  // ⭐ 单韵母显示不带调的 `a o e`，其余显示带调拼音。
  // 标了调就等于对声调作了声明——而单韵母那一组的音频不保证声调，
  // 显示 `ā` 却播出 `à` 是在明确地教错。见 domain/pinyin.ts 的 displayForm。
  const options = buildTextOptions(
    displayForm(target),
    mode === 'tone' ? pickToneDistractors(target, pool) : pickDistractors(target, pool, rng),
    rng,
  )

  return {
    signature: `${kpId}-listen#${target.base}${target.tone}`,
    kpId,
    type: 'choice_audio',
    difficulty,
    stem: {
      // ⚠️ 题面刻意不显示拼音，否则这道题变成「照着抄」
      text: '听一听，是哪一个？',
      ttsText: target.pinyin,
      // 题干音频就是那个音节本身
      ttsParts: [syllableKey(target.base, target.tone)],
    },
    options,
    answer: displayForm(target),
  }
}

/**
 * 挑目标音节。
 *
 * 声调模式下只挑**四声齐全**的音节：少了任何一声就凑不出「同一个音的四个调」，
 * 干扰项会混进别的韵母，这道题就又变回考音不考调了。
 */
function pickTarget(
  rng: () => number,
  pool: readonly Syllable[],
  mode: 'syllable' | 'tone',
): Syllable {
  if (mode !== 'tone') return randomPick(rng, pool)

  const complete = pool.filter(
    (s) => pool.filter((o) => o.base === s.base).length === 4,
  )
  return randomPick(rng, complete.length > 0 ? complete : pool)
}

/**
 * 声调模式的干扰项：**同一个音，另外三个声调**。
 *
 * ⭐ P1.3 考的是「听出这是第几声」，所以干扰项必须只在声调上不同。
 * 早先版本用的是通用逻辑，给 `wú` 配了 `yí é yú`——
 * 那是在考「听出这是哪个韵母」，孩子靠韵母就排除掉了，声调根本没练到。
 */
function pickToneDistractors(
  target: Syllable,
  pool: readonly Syllable[],
): Array<{ text: string; tag: MisconceptionTag }> {
  return pool
    .filter((s) => s.base === target.base && s.tone !== target.tone)
    .map((s) => ({ text: displayForm(s), tag: 'tone_confusion' as const }))
}

/**
 * 挑干扰项。
 *
 * **优先同声调**：不同声调的音节孩子一听就知道不是，干扰项会退化成送分项，
 * 声调本身的辨析交给 P1.3 专门的题去考。
 *
 * ⚠️ 但只要同声调的不够，就必须放宽到全池 —— 声母组的呼读音**声调本来就不齐**
 * （bō pō mō 是一声，fó 是二声，tè nè lè 是四声）。
 * 早先版本死守同声调，结果 P2.1 抽到 `fó` 时一个干扰项都凑不出来，
 * 产出了**只有一个选项**的题：孩子点哪个都对，掌握度还会被记一笔。
 * 这是生成器契约测试实际抓到的。
 */
function pickDistractors(
  target: Syllable,
  pool: readonly Syllable[],
  rng: () => number,
): Array<{ text: string; tag: MisconceptionTag }> {
  const others = pool.filter((s) => s.base !== target.base)
  const sameTone = others.filter((s) => s.tone === target.tone)
  const picked: Array<{ text: string; tag: MisconceptionTag }> = []
  const used = new Set<string>()

  const take = (s: Syllable, tag: MisconceptionTag) => {
    if (used.has(s.base) || picked.length >= 3) return
    used.add(s.base)
    picked.push({ text: displayForm(s), tag })
  }

  // ① 易混音节优先，同声调的更好
  const confusable = CONFUSABLE[target.base]
  if (confusable !== undefined) {
    for (const base of confusable.with) {
      const hit = sameTone.find((s) => s.base === base) ?? others.find((s) => s.base === base)
      if (hit !== undefined) take(hit, confusable.tag)
    }
  }

  // ② 同声调的同组音节兜底。标 spell_integral（音节整体辨认不清）——
  //    比不带标签强：至少知道「她在这个知识点上还认不准」
  for (const s of shuffle(rng, sameTone)) take(s, 'spell_integral')

  // ③ 仍然不够就放宽声调限制。宁可干扰项容易一点，也不能出只有一个选项的题
  for (const s of shuffle(rng, others)) take(s, 'spell_integral')

  return picked
}

/** 从模板参数里取音节集合。⚠️ 由 data 层注入，domain 不 import seed 数据 */
function readSyllables(params: Record<string, unknown>): readonly Syllable[] {
  const raw = params.syllables
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('pinyinListen 需要非空的 syllables 参数')
  }
  return raw as Syllable[]
}

