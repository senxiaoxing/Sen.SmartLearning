/**
 * @file 算式的文本表示 —— 怎么念、成不成立
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/generators/fourFacts.ts     加减版一图四式
 * @see src/domain/generators/mulDivFacts.ts   乘除版一图四式
 *
 * 一图四式这类题的选项**本身就是算式文本**（`3 × 4 = 12`），
 * 而算式文本要做三件事：显示、朗读、判断成不成立。
 *
 * ⭐ 三件事都从**同一份文本**反解，而不是让每个候选各带一份片段与念法——
 * 带两份迟早漂移，而算式文本本身就是唯一事实源。
 */

import type { ClipKey } from '@/domain/speech'
import { num } from '@/domain/speech'

/** 运算符的念法与片段。键是屏幕上的符号 */
const OPERATORS = {
  '+': { spoken: '加', clip: 'op.plus' },
  '-': { spoken: '减', clip: 'op.minus' },
  '×': { spoken: '乘', clip: 'op.times' },
  '÷': { spoken: '除以', clip: 'op.dividedBy' },
} as const

type Operator = keyof typeof OPERATORS

/** `3 × 4 = 12` → `{ left: 3, op: '×', right: 4, result: 12 }`；解析不了返回 undefined */
function parse(
  text: string,
): { left: number; op: Operator; right: number; result: number } | undefined {
  const m = /^(\d+) ([+\-×÷]) (\d+) = (\d+)$/.exec(text)
  if (m === null) return undefined
  return {
    left: Number(m[1]),
    op: m[2] as Operator,
    right: Number(m[3]),
    result: Number(m[4]),
  }
}

/**
 * 把算式文本解析成语音片段序列（选项点读与错题本用）。
 *
 * @param text - 形如 `'3 × 4 = 12'`，运算符可以是 `+ - × ÷`
 * @returns 片段序列；格式不对或数值超出 `num()` 能念的范围时返回 `undefined`，
 *          由调用方整句降级——⛔ 宁可整句 TTS 也不能拼出漏词的句子
 *
 * @example
 * equationParts('3 × 4 = 12')   // ['num.3', 'op.times', 'num.4', 'op.equals', 'num.12']
 * equationParts('正方体')        // undefined
 */
export function equationParts(text: string): ClipKey[] | undefined {
  const eq = parse(text)
  if (eq === undefined) return undefined
  return [
    ...num(eq.left),
    OPERATORS[eq.op].clip,
    ...num(eq.right),
    'op.equals',
    ...num(eq.result),
  ]
}

/**
 * 把算式文本转成念法。
 *
 * @example
 * equationSpoken('12 ÷ 3 = 4')   // '12 除以 3 等于 4'
 */
export function equationSpoken(text: string): string {
  const eq = parse(text)
  if (eq === undefined) return text
  return `${eq.left} ${OPERATORS[eq.op].spoken} ${eq.right} 等于 ${eq.result}`
}

/**
 * 这个算式成不成立。
 *
 * ⭐ 一图四式的干扰项要用它**筛掉恰好成立的那些**。
 *
 * 「哪个算式说的是这幅图」这种问法有个陷阱：一幅「2 组、每组 2 个」的图，
 * `4 - 2 = 2` 既成立、又说得通（4 个拿走 2 个剩 2 个），
 * 把它当干扰项等于把一个讲得通的答案判成错。
 * 只要干扰项本身是**不成立的等式**，就永远不会有这种歧义。
 *
 * @param text - 算式文本
 * @returns 成立为 `true`；解析不了也返回 `false`（当作不可信，宁可弃用）
 *
 * @example
 * isTrueEquation('3 × 4 = 12')   // true
 * isTrueEquation('3 + 4 = 12')   // false
 */
export function isTrueEquation(text: string): boolean {
  const eq = parse(text)
  if (eq === undefined) return false

  const value =
    eq.op === '+'
      ? eq.left + eq.right
      : eq.op === '-'
        ? eq.left - eq.right
        : eq.op === '×'
          ? eq.left * eq.right
          : eq.right === 0
            ? Number.NaN
            : eq.left / eq.right

  return value === eq.result
}
