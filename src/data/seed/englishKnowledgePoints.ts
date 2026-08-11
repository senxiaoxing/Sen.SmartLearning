/**
 * @file 英语知识点 seed 数据 —— 零基础启蒙，共 30 个，约 160 词/句
 * @layer data  静态内容，随 App 版本内置，备份时不导出
 * @see design/01-知识点图谱.md §5 英语（English）
 *
 * ⚠️ **不绑教材**：一年级英语各地教材不统一（PEP 三年级起点 / 新起点 / 外研社 / 牛津上海版），
 * 且课标只要求听说、不要求读写。因此做通用启蒙，全部题型零阅读门槛，
 * 主力题型为 `choice_audio`（听音选图，选项是 emoji）。
 *
 * ## ⭐ 为什么字母排在最前（E1）
 *
 * 课标路径是「听说优先」，字母通常放到一下才系统教，本文件原先也照此排：
 * 问候语 → 数字 → … → 字母（标 1B）。**但那个顺序对零基础自学不成立**：
 *
 * - 问候语学完了，孩子说不清「我学到哪了」——它没有边界
 * - 字母是英语里**唯一有边界、可数、可收集**的东西：26 个，学完就是学完
 *
 * 所以改成字母打头，配字母卡收集墙（26 张卡点亮就是进度条）。
 * 后面紧跟具体名词（动物 → 食物 → 颜色），它们有 emoji、好认、
 * 而且首字母单词已经在字母卡里见过一次（A is for **apple**）。
 * 抽象的问候语与句型排到最后。
 *
 * ⚠️ **顺序由 `order` 决定，不是由前置依赖决定。**
 * 字母与词汇是并行的两条线：学 cat 不必先学完 26 个字母，
 * 所以动物、颜色这些单元一律无前置——排在字母之后靠的是 `order`。
 * 把它们设成依赖字母会变成「字母没学完就锁死一切」，那是另一回事。
 */

import { buildKnowledgePoints, type KpSpec } from '@/data/seed/kpBuilder'
import type { KnowledgePoint } from '@/domain/types'

const UNIT_NAMES: Record<string, string> = {
  E1: '字母',
  E2: '动物',
  E3: '食物与水果',
  E4: '颜色',
  E5: '数字',
  E6: '身体部位',
  E7: '家庭成员',
  E8: '学习用品',
  E9: '问候与日常用语',
  E10: '简单句型',
}

const SPECS: KpSpec[] = [
  // ── E1 字母 ⭐ 零基础的起点 ───────────────────────────────────────
  // 难度 1：这是孩子接触英语的第一件事，不该一上来就标难。
  // 五个一组而不是一次 26 个：一组学完就有一次「完成」，
  // 与「一轮 10 题」是同一个道理（design/05 第 6 条）。
  { id: 'E1.1', name: 'Aa–Ee', mis: ['letter_mirror'] },
  { id: 'E1.2', name: 'Ff–Jj', pre: ['E1.1'] },
  { id: 'E1.3', name: 'Kk–Oo', pre: ['E1.2'] },
  { id: 'E1.4', name: 'Pp–Tt', pre: ['E1.3'], mis: ['letter_mirror'] },
  { id: 'E1.5', name: 'Uu–Zz', pre: ['E1.4'] },
  // ⭐ 记忆翻牌：翻开两张找配对，全 App 仅此两处用 memory_pair
  { id: 'E1.6', name: '大小写配对', pre: ['E1.5'], types: ['memory_pair'], diff: 2,
    mis: ['letter_mirror', 'letter_pairing_weak'] },
  // 字母歌暂无题库：它要的是歌曲音频与跟唱交互，不是任何现有题型
  { id: 'E1.7', name: '字母歌 ABC song', pre: ['E1.1'] },
  // ⭐ 听音辨字母：候选池是整张字母表，难度全部来自「26 选 1」
  { id: 'E1.8', name: '听音辨字母', pre: ['E1.5'], diff: 3, mis: ['letter_mirror'] },
  // ⚠️ 不依赖动物单元：字母卡里已经见过 A is for apple，
  //    再挂个跨单元前置只会把这个知识点锁死在很后面
  { id: 'E1.9', name: '首字母对应单词（A-apple / B-bird）', pre: ['E1.5'],
    types: ['memory_pair'], diff: 2, mis: ['letter_pairing_weak'] },

  // ── E2 动物 ──────────────────────────────────────────────────────
  // 排在字母之后的第一批词：动物是这个年龄段吸引力最高的一类，
  // 而且 cat / dog / bird 在字母卡里已经露过面
  { id: 'E2.1', name: 'Pets（cat / dog / bird / fish / rabbit）', mis: ['similar_sound'] },
  { id: 'E2.2', name: 'Farm animals（cow / pig / duck / chicken / horse / sheep）',
    pre: ['E2.1'], diff: 2, mis: ['similar_sound'] },
  { id: 'E2.3', name: 'Wild animals（lion / tiger / elephant / monkey / panda / bear）',
    pre: ['E2.2'], diff: 2, mis: ['similar_sound'] },

  // ── E3 食物与水果 ────────────────────────────────────────────────
  { id: 'E3.1', name: 'Fruits（apple / banana / orange / pear / grape / watermelon）' },
  { id: 'E3.2', name: 'Food & drinks（bread / rice / noodles / egg / cake / milk）',
    pre: ['E3.1'], diff: 2 },

  // ── E4 颜色 ──────────────────────────────────────────────────────
  { id: 'E4.1', name: 'Basic colors（red / blue / yellow / green / black / white）' },
  { id: 'E4.2', name: 'More colors（orange / pink / purple / brown / grey）', pre: ['E4.1'],
    diff: 2 },

  // ── E5 数字 ──────────────────────────────────────────────────────
  { id: 'E5.1', name: 'Numbers 1–10' },
  // ⭐ number_teen_ty 是这个知识点唯一真正在考的东西：
  //    听 fourteen 选 4。见 domain/generators/confusableEnglish.ts
  { id: 'E5.2', name: 'Numbers 11–20', pre: ['E5.1'], diff: 2, mis: ['number_teen_ty'] },
  { id: 'E5.3', name: 'How many? — Four.', pre: ['E5.2'], diff: 3 },

  // ── E6 身体部位 ──────────────────────────────────────────────────
  { id: 'E6.1', name: 'Face（eye / ear / nose / mouth / face）' },
  { id: 'E6.2', name: 'Body（head / hand / arm / leg / foot）', pre: ['E6.1'], diff: 2 },

  // ── E7 家庭成员 ──────────────────────────────────────────────────
  { id: 'E7.1', name: 'Family（dad / mom / brother / sister / grandpa / grandma）' },

  // ── E8 学习用品 ──────────────────────────────────────────────────
  { id: 'E8.1', name: 'School things（pen / pencil / book / bag / ruler / eraser）', diff: 2 },

  // ── E9 问候与日常用语 ────────────────────────────────────────────
  // ⚠️ 排到后面不是因为它不重要，而是因为它**没有可指的实物**：
  // 「你好」只能靠场景 emoji（🙋）表达，对零基础孩子比 🐱 难得多
  { id: 'E9.1', name: 'Greetings（hello / good morning / goodbye）' },
  { id: 'E9.2', name: 'Self-introduction（I\'m… / How are you?）', pre: ['E9.1'], diff: 2 },
  { id: 'E9.3', name: 'Polite words（thank you / sorry / please）', pre: ['E9.1'], diff: 2 },

  // ── E10 简单句型 ─────────────────────────────────────────────────
  { id: 'E10.1', name: "What's this? — It's a cat.", pre: ['E2.1'], diff: 2 },
  { id: 'E10.2', name: 'I like apples.', pre: ['E3.1'], diff: 2 },
  { id: 'E10.3', name: "It's red.", pre: ['E4.1', 'E10.1'], diff: 2 },
  { id: 'E10.4', name: 'How many dogs? — Three.', pre: ['E5.3', 'E2.1'], diff: 3 },
]

/** 英语知识点，共 30 个。`order` 占用 201~230。 */
export const englishKnowledgePoints: KnowledgePoint[] = buildKnowledgePoints(
  'english',
  UNIT_NAMES,
  SPECS,
  201,
)
