/**
 * @file UUID 生成 —— 全部用户数据主键的唯一来源
 * @layer platform  浏览器 API 封装，不含业务逻辑
 * @see CLAUDE.md 代码规范「ID」：用户数据用 UUID，静态内容用语义 ID
 *
 * ## 为什么不直接用 `crypto.randomUUID()`
 *
 * 它**要求安全上下文**（HTTPS / localhost / 127.0.0.1）。
 * 局域网调试地址 `http://192.168.x.x:5173` 不满足，那里 `crypto.randomUUID`
 * 直接是 `undefined`。
 *
 * 后果不是「ID 生成失败」这么局部——`bootstrap()` 建档案时第一行就调它，
 * 抛异常后 `profileId` 永远为 null，宠物和题目全都加载不出来，
 * 首页会空掉一大块。而这正是 CLAUDE.md 推荐的 iPad 调试方式
 * （`npm run dev -- --host`），等于那条路一直是断的。
 *
 * `crypto.getRandomValues()` 没有安全上下文要求，任何地方都能用，
 * 所以降级路径用它手工拼一个标准的 UUID v4。
 */

import type { Uuid } from '@/domain/types'

/**
 * 生成一个 UUID v4。
 *
 * 优先用原生 `crypto.randomUUID()`；在非安全上下文（局域网 http 调试）
 * 自动降级到 `crypto.getRandomValues()` 手工拼装，格式完全一致。
 *
 * @returns 形如 `'9f1c3b2a-5d4e-4f8a-b7c6-1e2d3f4a5b6c'` 的 UUID v4
 *
 * @example
 * const id = newId() // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export function newId(): Uuid {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // UUID v4 的两处固定位：第 7 字节高 4 位为版本号 4，第 9 字节高 2 位为变体 10
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}
