/**
 * @file newId 的单测 —— 重点是**降级路径**
 *
 * 原生路径几乎不可能坏，会坏的是局域网 http 调试下那条手工拼装的路径。
 * 而它一旦坏了，症状不是「ID 不好看」，是 bootstrap 建档案失败、
 * 首页整块空掉 —— 所以这里逐位校验 UUID v4 的格式。
 */

import { afterEach, describe, expect, it } from 'vitest'
import { newId } from '@/platform/newId'

/** 标准 UUID v4：第 3 段以 4 开头，第 4 段以 8/9/a/b 开头 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const originalRandomUUID = crypto.randomUUID

/** 模拟非安全上下文（`http://192.168.x.x`）：该 API 在那里就是 undefined */
function simulateInsecureContext(): void {
  Object.defineProperty(crypto, 'randomUUID', {
    value: undefined,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  Object.defineProperty(crypto, 'randomUUID', {
    value: originalRandomUUID,
    configurable: true,
    writable: true,
  })
})

describe('newId', () => {
  it('安全上下文下走原生实现，返回合法 UUID v4', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('⭐ 非安全上下文下降级，仍返回合法 UUID v4', () => {
    simulateInsecureContext()
    expect(crypto.randomUUID).toBeUndefined()

    for (let i = 0; i < 200; i += 1) {
      expect(newId()).toMatch(UUID_V4)
    }
  })

  it('降级路径生成的 ID 不重复', () => {
    simulateInsecureContext()

    const ids = new Set<string>()
    for (let i = 0; i < 2000; i += 1) ids.add(newId())

    // 2000 个 122 位随机数撞车的概率可以忽略，撞了就说明随机源接错了
    expect(ids.size).toBe(2000)
  })

  it('降级路径不抛异常 —— 它是 bootstrap 的第一步，抛了整个 App 就起不来', () => {
    simulateInsecureContext()
    expect(() => newId()).not.toThrow()
  })
})
