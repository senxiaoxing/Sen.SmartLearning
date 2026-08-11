/**
 * @file 知识点讲解脚本 —— 「先教再练」的内容定义
 * @layer data  静态内容
 * @see design/05-孩子反馈与响应.md 第 5 条反馈
 *
 * 来自孩子的原话：**「复杂点的题目，建议先走一个简短的动画讲解，告诉她答题原理」**。
 *
 * 这是把 App 从「题库」推向「学习工具」的关键——也是「智慧学习」这个名字
 * 真正该兑现的地方。普通题库只会在答错后再出一道同类题，孩子继续错；
 * 讲解让她先建立心理模型，再去练。
 *
 * 只给**三个双关键节点**做：它们是整个一年级数学的地基，
 * 也正好是最需要「理解原理」而非「记住答案」的地方。
 */

/** 讲解的一步。视觉状态由这些字段驱动，Framer Motion 在步骤间自动过渡 */
export interface ExplainerStep {
  /** 屏幕上的说明文字 */
  text: string
  /** 朗读文本。孩子不识字，这才是主要信息通道 */
  ttsText: string
  /** 十格阵内的点数 */
  frame: number
  /** 十格阵旁的散点数 */
  loose: number
  /** 强调部位。`gap` 会让空位闪烁，提示「还差几个」 */
  emphasis?: 'none' | 'frame' | 'gap' | 'loose'
  /** 底部算式提示，如 `'9 + 1 = 10'` */
  formula?: string
}

export interface Explainer {
  kpId: string
  title: string
  steps: ExplainerStep[]
}

/**
 * 凑十法（M5.1）—— 以 9 + 5 为例。
 *
 * 核心是让「十格还空 1 个」变成看得见的事实，
 * 孩子就不需要理解抽象的进位规则。
 */
const MAKE_TEN: Explainer = {
  kpId: 'M5.1',
  title: '凑十法',
  steps: [
    {
      text: '9 加 5，我们先把 9 放进十格里',
      ttsText: '9 加 5。我们先把 9 个放进十格里，旁边还有 5 个',
      frame: 9,
      loose: 5,
      emphasis: 'none',
      formula: '9 + 5 = ?',
    },
    {
      text: '看，十格里还空着 1 个位置',
      ttsText: '看，十格里还空着 1 个位置。再放 1 个就满十啦',
      frame: 9,
      loose: 5,
      emphasis: 'gap',
      formula: '9 + 1 = 10',
    },
    {
      text: '从 5 里拿 1 个补进去，凑成 10',
      ttsText: '从旁边的 5 个里拿 1 个补进去，就凑成 10 了。5 分成了 1 和 4',
      frame: 10,
      loose: 4,
      emphasis: 'frame',
      formula: '5 = 1 + 4',
    },
    {
      text: '10 再加剩下的 4，就是 14',
      ttsText: '现在是 10 加剩下的 4，等于 14。所以 9 加 5 等于 14',
      frame: 10,
      loose: 4,
      emphasis: 'loose',
      formula: '10 + 4 = 14',
    },
  ],
}

/**
 * 破十法（M6.1）—— 以 13 - 9 为例。
 *
 * 与凑十法对称：先看清「13 是 1 个十和 3 个一」，
 * 个位不够减时就从十里减。
 */
const BREAK_TEN: Explainer = {
  kpId: 'M6.1',
  title: '破十法',
  steps: [
    {
      text: '13 就是 1 个十，和 3 个一',
      ttsText: '13 减 9。13 就是 1 个十，和旁边 3 个一',
      frame: 10,
      loose: 3,
      emphasis: 'none',
      formula: '13 - 9 = ?',
    },
    {
      text: '旁边只有 3 个，不够减 9',
      ttsText: '要减掉 9 个，可是旁边只有 3 个，不够减',
      frame: 10,
      loose: 3,
      emphasis: 'loose',
      formula: '3 < 9',
    },
    {
      text: '那就从十格里减，10 减 9 剩 1',
      ttsText: '那我们从十格里减。10 减 9，剩下 1 个',
      frame: 1,
      loose: 3,
      emphasis: 'frame',
      formula: '10 - 9 = 1',
    },
    {
      text: '剩下的 1 和 3 合起来是 4',
      ttsText: '十格里剩的 1 个，和旁边的 3 个合起来是 4。所以 13 减 9 等于 4',
      frame: 0,
      loose: 4,
      emphasis: 'loose',
      formula: '1 + 3 = 4',
    },
  ],
}

/**
 * 十的分与合（M3.3）—— 全局唯一的双关键节点。
 *
 * 凑十法和破十法都建立在它之上，必须练到条件反射。
 * 讲解重点是「10 可以拆成两部分，一部分变大另一部分就变小」。
 */
const TEN_DECOMPOSITION: Explainer = {
  kpId: 'M3.3',
  title: '10 的分与合',
  steps: [
    {
      text: '十格装满就是 10 个',
      ttsText: '十格装满，就是 10 个',
      frame: 10,
      loose: 0,
      emphasis: 'frame',
      formula: '10',
    },
    {
      text: '拿出 3 个放旁边',
      ttsText: '我们拿出 3 个放到旁边',
      frame: 7,
      loose: 3,
      emphasis: 'loose',
      formula: '10 = 7 + 3',
    },
    {
      text: '再多拿 3 个，格子里就更少了',
      ttsText: '再多拿 3 个出来，格子里剩 4 个，旁边有 6 个',
      frame: 4,
      loose: 6,
      emphasis: 'none',
      formula: '10 = 4 + 6',
    },
    {
      text: '不管怎么分，两边合起来都是 10',
      ttsText: '不管怎么分，两边合起来永远都是 10。记住这个，后面的题目就容易啦',
      frame: 5,
      loose: 5,
      emphasis: 'frame',
      formula: '10 = 5 + 5',
    },
  ],
}

/** 全部讲解脚本，按知识点索引 */
export const EXPLAINERS: ReadonlyMap<string, Explainer> = new Map(
  [TEN_DECOMPOSITION, MAKE_TEN, BREAK_TEN].map((e) => [e.kpId, e]),
)

/** 该知识点是否有讲解内容 */
export function hasExplainer(kpId: string): boolean {
  return EXPLAINERS.has(kpId)
}
