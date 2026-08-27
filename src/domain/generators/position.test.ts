/**
 * @file 位置生成器单测 —— M2.1 上下 · M2.2 前后 · M2.3 左右
 * @layer domain
 * @see src/domain/generators/position.ts
 *
 * ⭐ 这里守的头号问题是**答案唯一性**，不是数值正确性。
 *
 * 2026-08-27 真机上打回一道题：「小狗在小汽车的什么位置？」正确答案是「前面」，
 * 而画面上小狗**同时**真的在小汽车右边——「右边」也在选项里。
 * 孩子答右边被判错，却完全不知道自己错在哪，这是所有题里最伤人的一种错。
 *
 * 根因是补充干扰项从另外两根轴里**随机**抽，抽到左右就和横向布局撞车。
 */

import { describe, expect, it } from 'vitest'
import { createRng } from '@/domain/generators/rng'
import { position } from '@/domain/generators/position'
import type { GeneratedItem } from '@/domain/types'

const AXIS_KP = { updown: 'M2.1', frontback: 'M2.2', leftright: 'M2.3' } as const

function gen(axis: keyof typeof AXIS_KP, seed: number): GeneratedItem {
  return position({
    kpId: AXIS_KP[axis],
    difficulty: 2,
    params: { axis },
    rng: createRng(seed),
  })
}

const many = (axis: keyof typeof AXIS_KP, n = 60): GeneratedItem[] =>
  Array.from({ length: n }, (_, i) => gen(axis, i + 1))

const labelsOf = (item: GeneratedItem): string[] => item.options.map((o) => o.text ?? '')

describe('位置题', () => {
  it('固定种子可复现', () => {
    expect(gen('frontback', 7).signature).toBe(gen('frontback', 7).signature)
  })

  it('恰好一个正确选项，且与 answer 一致', () => {
    for (const axis of ['updown', 'frontback', 'leftright'] as const) {
      for (const item of many(axis)) {
        const correct = item.options.filter((o) => o.isCorrect)
        expect(correct, item.signature).toHaveLength(1)
        expect(correct[0]!.text).toBe(item.answer)
      }
    }
  })

  it('选项互不重复', () => {
    for (const axis of ['updown', 'frontback', 'leftright'] as const) {
      for (const item of many(axis)) {
        const labels = labelsOf(item)
        expect(new Set(labels).size, `${item.signature} 有重复选项`).toBe(labels.length)
      }
    }
  })

  it('每个错误选项都带 misconceptionTag', () => {
    for (const axis of ['updown', 'frontback', 'leftright'] as const) {
      for (const item of many(axis)) {
        for (const o of item.options.filter((x) => !x.isCorrect)) {
          expect(o.misconceptionTag, `${item.signature} 的「${o.text}」没有诊断标签`).toBeDefined()
        }
      }
    }
  })

  it('本轴的反方向必须在选项里 —— 否则 lr_mirror 无从诊断', () => {
    const opposite: Record<string, string> = {
      上面: '下面',
      下面: '上面',
      前面: '后面',
      后面: '前面',
      左边: '右边',
      右边: '左边',
    }
    for (const axis of ['updown', 'frontback', 'leftright'] as const) {
      for (const item of many(axis)) {
        expect(labelsOf(item), `${item.signature} 少了反方向`).toContain(opposite[item.answer]!)
      }
    }
  })
})

/**
 * ⭐ 答案唯一性 —— 这一组是真机打回那道题的回归测试。
 *
 * 判据不是「选项对不对」，而是**画面上会不会同时成立第二个说法**。
 * 见 design/08 §10「画图形这批的三条经验」第 ③ 条。
 */
describe('⭐ 绝不能出现第二个说得通的答案', () => {
  it('⭐ 前后题里绝不出现「左边 / 右边」', () => {
    // 前后只能靠遮挡表达，而遮挡必然让两个物体一左一右 ——
    // 「小狗在小汽车前面」的同时，小狗真的也在小汽车右边
    for (const item of many('frontback', 120)) {
      const labels = labelsOf(item)
      expect(labels, `${item.signature} 掺了左右，这道题有两个答案`).not.toContain('左边')
      expect(labels, `${item.signature} 掺了左右，这道题有两个答案`).not.toContain('右边')
    }
  })

  it('左右题里绝不出现「前面 / 后面」', () => {
    // 反过来同样成立：并排的两个物体，说「在右边」和说「在前面」都讲得通
    for (const item of many('leftright', 120)) {
      const labels = labelsOf(item)
      expect(labels, `${item.signature} 掺了前后`).not.toContain('前面')
      expect(labels, `${item.signature} 掺了前后`).not.toContain('后面')
    }
  })

  it('上下题掺左右是安全的 —— 垂直排列谈不上左右', () => {
    for (const item of many('updown', 60)) {
      const labels = labelsOf(item)
      expect(labels.some((l) => l === '左边' || l === '右边')).toBe(true)
    }
  })

  it('干扰轴是固定的，不随种子变 —— 随机抽正是那个 bug 的根因', () => {
    const shapes = new Set(many('frontback', 60).map((i) => [...labelsOf(i)].sort().join('/')))
    expect(shapes.size, '前后题的选项集合应当只有一种').toBe(1)
  })

  /**
   * ⭐ 前后只能靠遮挡表达，而遮挡必然把两个物体摆成一左一右。
   *
   * 如果靠前的那个永远画在同一侧，「前面」就退化成「在右边」：
   * 孩子不看遮挡、只看位置就能全对——这道题既考不到空间关系，
   * 还会把「前后」和「左右」在她脑子里焊死。
   */
  it('⭐ 靠前的那个不能总在同一边', () => {
    const sides = new Set(
      many('frontback', 60).map((i) =>
        i.visual?.kind === 'spatialPair' ? i.visual.frontOnRight : undefined,
      ),
    )
    expect(sides, '左右两种摆法都要出得到，否则看位置就能作答').toEqual(new Set([true, false]))
  })

  it('同一个种子的左右摆法必须稳定 —— 否则重渲染时图会跳', () => {
    for (const seed of [1, 5, 13, 27]) {
      const a = gen('frontback', seed)
      const b = gen('frontback', seed)
      const sideOf = (i: GeneratedItem): boolean | undefined =>
        i.visual?.kind === 'spatialPair' ? i.visual.frontOnRight : undefined
      expect(sideOf(a)).toBe(sideOf(b))
    }
  })
})

describe('题干与配图', () => {
  it('配图带的是生成时那个关系，四种都出得到', () => {
    const relations = new Set(
      [...many('updown'), ...many('frontback'), ...many('leftright')].map((i) =>
        i.visual?.kind === 'spatialPair' ? i.visual.relation : '?',
      ),
    )
    expect(relations).toEqual(
      new Set(['above', 'below', 'front', 'behind', 'left', 'right']),
    )
  })

  it('题干问的就是配图里那个物体', () => {
    for (const item of many('frontback')) {
      expect(item.visual?.kind).toBe('spatialPair')
      if (item.visual?.kind !== 'spatialPair') continue
      expect(item.stem.text.startsWith(item.stem.text.slice(0, 1))).toBe(true)
      // 题干形如「小狗在小汽车的什么位置？」，两个名字都要在
      expect(item.stem.text).toContain('的什么位置')
    }
  })

  it('选项都能点读 —— 孩子不识字，方位词全靠听', () => {
    for (const axis of ['updown', 'frontback', 'leftright'] as const) {
      for (const item of many(axis, 20)) {
        for (const o of item.options) {
          expect(o.ttsParts?.length, `${o.text} 没有语音片段`).toBeGreaterThan(0)
        }
      }
    }
  })
})
