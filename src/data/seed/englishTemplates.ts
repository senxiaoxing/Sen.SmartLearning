/**
 * @file 英语题目模板 —— 把英语知识点映射到生成器与三档难度参数
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/itemTemplates.ts  总注册表（本文件的产出在那里展开）
 * @see src/domain/generators/englishListen.ts  唯一用到的生成器
 * @see src/data/seed/englishWords.ts  词表
 *
 * 单独成文件是因为 `itemTemplates.ts` 已经 400 行、装着数学与拼音两科；
 * 再塞一科进去就成了「万能文件」，AI 与人都得翻半天才找到英语在哪。
 *
 * ## 难度三档 = 候选池由窄到宽
 *
 * 英语的难度不该靠「换更长的单词」——`watermelon` 并不比 `apple` 难听懂，
 * 它只是更长。真正变难的是**干扰项离得多近**：
 *
 * ```
 * 难度 1  干扰项只在本组里挑        cat 的对手是 dog / bird / fish
 * 难度 2  放宽到同单元             cat 的对手多了 cow / horse / lion
 * 难度 3  同上，但优先音近词        cat 的对手是 cake / cow —— 必须真听清才行
 * ```
 *
 * 与拼音模板同一个思路（见 `itemTemplates.ts` 的 `pinyinTemplates`），
 * 因为两科的题型本质相同：都是「听一个音，从几个候选里挑出来」。
 */

import { LETTER_CARDS } from '@/data/seed/englishLetters'
import { ENGLISH_WORDS_BY_KP } from '@/data/seed/englishWords'
import type { EnglishWord } from '@/domain/english'
import type { Difficulty, ItemTemplate } from '@/domain/types'

/** 合并多个知识点的词，作为更宽的干扰项候选池 */
function union(...kpIds: string[]): readonly EnglishWord[] {
  return kpIds.flatMap((id) => ENGLISH_WORDS_BY_KP[id] ?? [])
}

/**
 * 构造一条英语听音题模板。
 *
 * @param kpId - 知识点 ID
 * @param wider - 更宽的干扰项候选池。省略则三档都只用本组词
 * @param widenFrom - 从哪一档开始启用宽池。默认 2 —— 难度 1 只在本组里挑，
 *                    刚学会 1~10 的孩子不该在选项里看到还没教过的 14
 * @throws 知识点没有配词时抛错——这属于 seed 配置错误，必须显式失败而不是出空题
 */
function listen(
  kpId: string,
  wider?: readonly EnglishWord[],
  widenFrom: Difficulty = 2,
): ItemTemplate {
  const words = ENGLISH_WORDS_BY_KP[kpId]
  if (words === undefined || words.length === 0) {
    throw new Error(`英语知识点 ${kpId} 没有配词表`)
  }
  const pool = wider ?? words
  const params = (difficulty: Difficulty) =>
    difficulty >= widenFrom ? { words, pool } : { words }

  return {
    id: `${kpId}-listen`,
    kpId,
    generator: 'englishListen',
    type: 'choice_audio',
    params: { 1: params(1), 2: params(2), 3: params(3) },
  }
}

// 同单元的候选池。在模块顶层算一次，不必每条模板重算
const LETTER_POOL = union('E1.8')
const ANIMAL_POOL = union('E2.1', 'E2.2', 'E2.3')
const FOOD_POOL = union('E3.1', 'E3.2')
const COLOR_POOL = union('E4.1', 'E4.2')
const BODY_POOL = union('E6.1', 'E6.2')
const GREETING_POOL = union('E9.1', 'E9.2', 'E9.3')

/**
 * ⭐⭐ 数字的候选池**跨了两个知识点**，而且**难度 1 就跨**。
 *
 * 别的组是「难度越高干扰项越近」，数字这里不一样：
 * `fourteen` 与 `four` 的混淆（`number_teen_ty`）**就是 E5.2 要考的东西本身**。
 * 如果难度 1 的选项只有 11~20，孩子听见词尾模糊的一串音，
 * 在四个 teen 里随便选一个也有 25% 蒙对——而真正的错误（选 `4`）
 * 压根没机会发生，这个知识点的诊断等于没做。
 *
 * 见 design/01-知识点图谱.md §5 misconceptions 与 `confusableEnglish.ts`。
 */
const NUMBER_POOL = union('E5.1', 'E5.2')

/** 字母 → `[单词, 中文, emoji]`，供 `memory_pair` 的 `initial` 模式用 */
const LETTER_WORDS: Record<string, readonly [string, string, string]> = Object.fromEntries(
  LETTER_CARDS.map((c) => [c.upper, [c.word, c.wordZh, c.emoji] as const]),
)

/**
 * 构造一条记忆翻牌模板。
 *
 * 难度靠**对数**递增而非换更难的字母：`W` 并不比 `A` 难认，
 * 真正变难的是要同时记住几张牌的位置。
 *
 * @param kpId - 知识点 ID
 * @param mode - `'case'` 大小写配对 / `'initial'` 字母配首字母单词
 * @param letters - 候选字母，省略则用整张字母表
 */
function memory(
  kpId: string,
  mode: 'case' | 'initial',
  letters?: readonly string[],
): ItemTemplate {
  const base = {
    mode,
    ...(letters === undefined ? {} : { letters: [...letters] }),
    ...(mode === 'initial' ? { words: LETTER_WORDS } : {}),
  }
  return {
    id: `${kpId}-memory`,
    kpId,
    generator: 'memoryPair',
    type: 'memory_pair',
    params: {
      1: { ...base, pairCount: 3, mistakeBudget: 3 },
      2: { ...base, pairCount: 4, mistakeBudget: 3 },
      3: { ...base, pairCount: 5, mistakeBudget: 4 },
    },
  }
}

/**
 * 英语全部模板，覆盖 29 个知识点。
 *
 * 主力是 `choice_audio`：一年级孩子一个英文字母都不认识，
 * 看字选、拼写、跟读都掺进了别的能力，
 * 「听到一串声音、指出那个东西」是目前唯一站得住的考法。
 *
 * E1.6 / E1.9 走 `memory_pair`——⚠️ 翻牌本质考记忆力而非学科能力，
 * 只有字母是例外：「A 和 a 是同一个字母」本身就是要学的东西，
 * 配对机制刚好同构。理由详见 `domain/generators/memoryPair.ts` 文件头。
 *
 * 仍缺 E1.7 字母歌：它要的是一段歌曲音频与跟唱交互，不是任何现有题型。
 */
export const ENGLISH_TEMPLATES: ItemTemplate[] = [
  // ── E1 字母 ⭐ 零基础的起点 ──────────────────────────────────────
  // 难度 2/3 把候选池放宽到整张字母表 —— 那正是 E1.8「听音辨字母」的难度，
  // 分组学到后期本来就该往那里过渡
  listen('E1.1', LETTER_POOL),
  listen('E1.2', LETTER_POOL),
  listen('E1.3', LETTER_POOL),
  listen('E1.4', LETTER_POOL),
  listen('E1.5', LETTER_POOL),
  listen('E1.8'),

  // ⭐ 大小写配对与首字母对应：全 App 仅有的两条 memory_pair
  memory('E1.6', 'case'),
  memory('E1.9', 'initial'),

  listen('E2.1', ANIMAL_POOL),
  listen('E2.2', ANIMAL_POOL),
  listen('E2.3', ANIMAL_POOL),

  listen('E3.1', FOOD_POOL),
  listen('E3.2', FOOD_POOL),

  listen('E4.1', COLOR_POOL),
  listen('E4.2', COLOR_POOL),

  listen('E5.1', NUMBER_POOL),
  // ⭐ 唯一一条难度 1 就用宽池的模板，理由见 NUMBER_POOL 的说明
  listen('E5.2', NUMBER_POOL, 1),
  listen('E5.3'),

  listen('E6.1', BODY_POOL),
  listen('E6.2', BODY_POOL),

  listen('E7.1'),
  listen('E8.1'),

  listen('E9.1', GREETING_POOL),
  listen('E9.2', GREETING_POOL),
  listen('E9.3', GREETING_POOL),

  // 句型组：候选池就是本组。跨组会把「It's a cat.」的对手换成单词 `cow`，
  // 而句型题要练的是「听完整句、抓住句尾的关键词」，对手也该是同结构的句子
  listen('E10.1'),
  listen('E10.2'),
  listen('E10.3'),
  listen('E10.4'),
]
