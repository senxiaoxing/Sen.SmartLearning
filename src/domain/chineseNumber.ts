/**
 * @file 汉字数字 —— 把 3005 写成「三千零五」
 * @layer domain  纯函数，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/speech.ts  `num()`：同一个数的**念法**，两边规则必须一致
 *
 * 二年级「万以内数的认识」要考读数写数，题干上得摆出汉字数字。
 *
 * ⚠️ **这里的写法和 `num()` 的念法必须一一对应**，否则屏幕上写着「三千零五」、
 * 耳朵里听到的却是「三千五」，孩子会以为自己听错了。
 * 两边没有共用实现（`num()` 对 0~20 走单条片段的捷径，这里 15 要写成「十五」），
 * 因此由 `chineseNumber.test.ts` 拿关键例子逐个对齐。
 */

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const

/** 能写的上限，与 `MAX_SPOKEN_NUMBER` 一致 —— 二年级到万为止 */
export const MAX_CHINESE_NUMBER = 9999

/**
 * 把整数写成汉字数字。
 *
 * 中文数字的三个坑，与 `num()` 处理的是同样三个：
 * - **零占位**：3005 是「三千零五」，漏掉那个零就和 305 一样了
 * - **一十**：110 是「一百一十」，而单独的 10 只写「十」
 * - **整十不带尾**：30 是「三十」，不是「三十零」
 *
 * @param n - 0 ~ {@link MAX_CHINESE_NUMBER} 的整数
 * @returns 汉字数字
 * @throws 超出范围或不是整数时抛错 —— 静默写错的数会被孩子当成正确读法记住
 *
 * @example
 * chineseNumber(15)     // '十五'
 * chineseNumber(30)     // '三十'
 * chineseNumber(110)    // '一百一十'
 * chineseNumber(305)    // '三百零五'
 * chineseNumber(3005)   // '三千零五'
 * chineseNumber(3050)   // '三千零五十'
 */
export function chineseNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_CHINESE_NUMBER) {
    throw new Error(`chineseNumber: 超出可写范围 0~${MAX_CHINESE_NUMBER}，实际为 ${n}`)
  }

  if (n <= 10) return DIGITS[n]!
  // 十一~十九单独一档：口语和教材都写「十五」，不是「一十五」
  if (n < 20) return `十${DIGITS[n % 10]}`
  if (n < 100) return tensText(n)

  if (n < 1000) {
    const rest = n % 100
    const head = `${DIGITS[Math.floor(n / 100)]}百`
    if (rest === 0) return head
    if (rest < 10) return `${head}零${DIGITS[rest]}`
    // ⚠️ 这里用 tensText 而不是递归：110 要写「一百一十」，
    // 而 chineseNumber(10) 只会给出「十」
    return head + tensText(rest)
  }

  const rest = n % 1000
  const head = `${DIGITS[Math.floor(n / 1000)]}千`
  if (rest === 0) return head
  if (rest < 10) return `${head}零${DIGITS[rest]}`
  if (rest < 100) return `${head}零${tensText(rest)}`
  return head + chineseNumber(rest)
}

/** 10~99 夹在更大的数里时的写法：一十、二十五、九十 */
function tensText(n: number): string {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${DIGITS[tens]}十${ones === 0 ? '' : DIGITS[ones]}`
}
