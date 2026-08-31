/**
 * @file 听音选图生成器 —— 英语全部知识点的主力题型
 * @layer domain  纯函数
 * @see design/01-知识点图谱.md §5 英语知识点与误区清单
 * @see src/data/seed/englishWords.ts  词表（图形面与释义）
 * @see src/domain/generators/confusableEnglish.ts  易混对照表
 *
 * ⭐ **这是英语唯一站得住的考法。**
 * 孩子一个英文字母都不认识，看字选、拼写、跟读都掺进了别的能力；
 * 「听到一串声音、指出那个东西」才是纯粹在考英语听力本身。
 *
 * 词、短语、整句共用这一个生成器：对孩子来说 `apple` 和 `It's a cat.`
 * 都只是「听到一串声音，选出对应的图」，区别只在这串声音长一点。
 */

import { CONFUSABLE_ENGLISH } from '@/domain/generators/confusableEnglish'
import { buildFaceOptions, type FaceCandidate } from '@/domain/generators/faceOptions'
import { randomPick, shuffle } from '@/domain/generators/rng'
import { spokenText, wordKey, type EnglishWord } from '@/domain/english'
import type { Generator } from '@/domain/types'

/** 一道题固定 4 个选项，因此最多需要 3 个干扰项 */
const DISTRACTOR_COUNT = 3

/**
 * 生成一道听音选图题。
 *
 * 题干**只有音频没有英文**：显示英文单词等于让孩子照着形状配对，听力完全不参与。
 *
 * 干扰项优先级（顺序即诊断价值高低）：
 * 1. **易混词**（{@link CONFUSABLE_ENGLISH}）—— 带具体误区标签
 * 2. **同族词** —— 让「数量」或「颜色」成为唯一变量，见 `EnglishWord.family`
 * 3. **同组词** —— 本知识点内的其他词，标 `similar_sound`
 * 4. **候选池兜底** —— 保证选项永远凑得满 4 个
 *
 * @param ctx - 生成上下文。`ctx.params.words` 由模板注入本知识点的词组，
 *              `ctx.params.pool` 是可选的更宽候选池（难度越高越宽）
 * @returns `choice_audio` 题目，题干音频即目标词，选项是 emoji + 中文小字
 *
 * @example
 * // E5.2「11~20」听到 fourteen：
 * //   14 正确
 * //    4 number_teen_ty  词尾 -teen 没听见 ⭐ 这一条是本知识点真正在考的东西
 * //   15 similar_sound
 * //   13 similar_sound
 *
 * @see design/01-知识点图谱.md §5 misconceptions（英语通用）
 */
export const englishListen: Generator = ({ kpId, difficulty, params, rng }) => {
  const words = readWords(params, 'words')
  const pool = readPool(params, words)
  const target = randomPick(rng, words)

  return {
    signature: `${kpId}-listen#${target.id}`,
    kpId,
    type: 'choice_audio',
    difficulty,
    stem: {
      // ⚠️ 题面刻意不显示英文，否则这道题变成「照着形状配对」
      text: '听一听，是哪一个？',
      ttsText: spokenText(target),
      // ⭐ 必须标英语：片段缺失时整句降级到实时 TTS，
      //    用中文引擎念 apple 会念出一个学不对的音
      ttsLang: 'en-US',
      ttsParts: [wordKey(target)],
    },
    options: buildFaceOptions(target, pickDistractors(target, words, pool, rng), rng),
    answer: target.face,
    /**
     * ⭐ 答错时那句「答案是 apple」念**英语**，而点选项念的是中文
     * （见 `faceOptions.ts`：题还没答完，念英文等于报答案）。
     * 答完之后正相反——她刚才没听出来的就是这个音，这时候把它再念一遍
     * 才是这道题的补救；屏幕上同时高亮着 🍎，音和物就对上了。
     *
     * ⚠️ 兜底文本用中文释义：片段万一缺失，整句会走**中文** TTS，
     * 那时念 `apple` 得到的是一个学不对的音——发音教错比没有声音严重得多。
     */
    answerSpeech: { parts: [wordKey(target)], text: target.zh },
  }
}

/**
 * 挑干扰项。
 *
 * ⚠️ 按**图形面**去重而不是按词条 id：`cat` 与 `It's a cat.` 是两个词条，
 * 图形面却都是 `🐱`——两个一样的选项等于让孩子做一道无解题。
 */
function pickDistractors(
  target: EnglishWord,
  words: readonly EnglishWord[],
  pool: readonly EnglishWord[],
  rng: () => number,
): FaceCandidate[] {
  const picked: FaceCandidate[] = []
  const usedFaces = new Set<string>([target.face])

  const take = (word: EnglishWord, tag: FaceCandidate['tag']) => {
    if (usedFaces.has(word.face) || picked.length >= DISTRACTOR_COUNT) return
    usedFaces.add(word.face)
    picked.push({ word, tag })
  }

  // ① 易混词优先 —— 唯一带具体诊断标签的一档
  for (const ref of CONFUSABLE_ENGLISH[target.id] ?? []) {
    const hit = pool.find((word) => word.id === ref.id)
    if (hit !== undefined) take(hit, ref.tag)
  }

  // ② 同族词。⭐ 对 E5.3「三个苹果」这类题，同族保证了数量是唯一变量——
  //    否则孩子听见 apples 就选中了，two/three/four 根本没参与
  if (target.family !== undefined) {
    const family = pool.filter((word) => word.family === target.family)
    for (const word of shuffle(rng, family)) take(word, 'similar_sound')
  }

  // ③ 同组词兜底。标 similar_sound 比不带标签强：
  //    至少知道「她在这一组词上还听不准」，能定位到知识点
  for (const word of shuffle(rng, words)) take(word, 'similar_sound')

  // ④ 仍然不够就放宽到整个候选池。宁可干扰项容易一点，
  //    也不能出只有两三个选项的题——那会让蒙对概率飙升，污染掌握度
  for (const word of shuffle(rng, pool)) take(word, 'similar_sound')

  return picked
}

/** 从模板参数里取词表。⚠️ 由 data 层注入，domain 不 import seed 数据 */
function readWords(params: Record<string, unknown>, key: string): readonly EnglishWord[] {
  const raw = params[key]
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`englishListen 需要非空的 ${key} 参数`)
  }
  return raw as EnglishWord[]
}

/** 干扰项候选池。缺省时就用本知识点的词组——难度 1 不该跨组取词 */
function readPool(
  params: Record<string, unknown>,
  words: readonly EnglishWord[],
): readonly EnglishWord[] {
  return params.pool === undefined ? words : readWords(params, 'pool')
}
