/**
 * @file 从多个称呼里挑一个 —— 「小恩宝」/「恩宝」/「小恩恩」轮着来
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/addressed.ts  挑出来之后怎么拼进一句话
 *
 * ## 为什么要轮换
 *
 * 固定一个称呼，听十遍之后它就不再是「在叫我」，而是提示音的一部分——
 * 和「叮」一样被自动过滤掉。真实的家长本来也不会一天到晚只用一个叫法。
 *
 * ⚠️ 轮换的粒度是**一句话**，不是一次会话：每道题的鼓励语各挑各的，
 * 而首页问候在这一次停留里保持不变（否则重渲染一次标题就跳字）。
 * 由调用方通过 `useMemo` 的依赖决定，见各使用处。
 */

import { NO_NICKNAME, type Nickname } from '@/domain/encourage/addressed'

/**
 * 随机挑一个称呼。
 *
 * @param nicknames - 全部称呼，主昵称在最前。空数组表示没设置昵称
 * @param seed - 随机源，取 `[0, 1)`。⭐ 必须由调用方注入，
 *               在这里直接 `Math.random()` 会让本函数无法测试
 * @returns 挑中的称呼；列表为空时返回 `NO_NICKNAME`（文案退回不带称呼的说法）
 *
 * @example
 * pickNickname([xiaoenbao, enbao, xiaoenen], 0.5)   // enbao
 * pickNickname([], 0.5)                              // NO_NICKNAME
 */
export function pickNickname(nicknames: readonly Nickname[], seed: number): Nickname {
  if (nicknames.length === 0) return NO_NICKNAME
  const index = Math.floor(Math.abs(seed) * nicknames.length) % nicknames.length
  return nicknames[index] ?? NO_NICKNAME
}

/**
 * 主昵称 —— 需要**稳定**称呼的地方用它，不参与轮换。
 *
 * 用在家长区的设置界面、摸底探险的引导语这类「说一次、且要和别处一致」的位置。
 *
 * @param nicknames - 全部称呼，主昵称在最前
 *
 * @example
 * primaryNickname([xiaoenbao, enbao])   // xiaoenbao
 */
export function primaryNickname(nicknames: readonly Nickname[]): Nickname {
  return nicknames[0] ?? NO_NICKNAME
}
