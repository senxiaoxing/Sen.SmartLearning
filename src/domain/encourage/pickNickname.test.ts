/**
 * @file 称呼轮换测试
 * @layer domain
 * @see src/domain/encourage/pickNickname.ts
 */

import { describe, expect, it } from 'vitest'
import { NO_NICKNAME } from '@/domain/encourage/addressed'
import { pickNickname, primaryNickname } from '@/domain/encourage/pickNickname'

const XIAOENBAO = { text: '小恩宝', clipKey: 'name.xiaoenbao' }
const ENBAO = { text: '恩宝', clipKey: 'name.enbao' }
const XIAOENEN = { text: '小恩恩', clipKey: 'name.xiaoenen' }
const ALL = [XIAOENBAO, ENBAO, XIAOENEN]

describe('pickNickname', () => {
  it('轮换：足够多次抽样能覆盖到列表里每一个称呼', () => {
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => pickNickname(ALL, i / 60).text),
    )

    expect(seen).toEqual(new Set(['小恩宝', '恩宝', '小恩恩']))
  })

  it('种子取到边界值也不越界', () => {
    for (const seed of [0, 0.999999, 1]) {
      expect(ALL).toContain(pickNickname(ALL, seed))
    }
  })

  it('只有一个称呼时永远返回它', () => {
    expect(pickNickname([XIAOENBAO], 0.7)).toBe(XIAOENBAO)
  })

  it('一个都没有时退回 NO_NICKNAME —— 文案会整体去掉称呼', () => {
    expect(pickNickname([], 0.5)).toBe(NO_NICKNAME)
  })
})

describe('primaryNickname', () => {
  it('永远是列表里的第一个 —— 备份文件名和家长区用的就是它', () => {
    expect(primaryNickname(ALL)).toBe(XIAOENBAO)
  })

  it('空列表退回 NO_NICKNAME', () => {
    expect(primaryNickname([])).toBe(NO_NICKNAME)
  })
})
