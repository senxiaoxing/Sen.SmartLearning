/**
 * @file ⭐ 题干配图必须真的画得出来 —— 声明了 visual 却没人渲染 = 题目无解
 * @layer data
 *
 * ## 为什么需要这条
 *
 * `visual` 是生成器交给渲染层的题干配图数据，但**只有 `ChoiceImage` 渲染 `StemFigure`**。
 * 其余题型（`input_number` / `choice_text` / …）拿到 visual 会**静默丢掉**——
 * 不报错、不白屏，就是那幅图没画。
 *
 * 后果分两档，第二档是致命的：
 *
 * | | 表现 |
 * |---|---|
 * | 题干文字里有全部条件 | 少一幅解释性的图，题还做得了 |
 * | ⭐ 条件**只在图里** | 「一共有几个？」＋ 四个数字，**没有图**——这道题无解 |
 *
 * `equalGroups` 的 `buildTimes` 正是第二档：它的 JSDoc 写着「题干只有一句话，
 * 物品全靠图」。二年级开放前 App 里进不去，所以一直没人看见。
 *
 * ⚠️ 这条断言只能拦住「类型层面画不出来」。图**画得对不对**仍然只有渲染出来才知道，
 * 见 design/06 §6「画完必须渲染出来看」。
 */

import { describe, expect, it } from 'vitest'
import { GENERATORS } from '@/domain/generators/index'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { createRng } from '@/domain/generators/rng'
import type { Difficulty } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]

/**
 * 每种题型画得出哪些配图。
 *
 * ⭐ 判据是「题型 × 配图种类」而不是光看题型：多数题型不走 `StemFigure`，
 * 而是**只认自己那一种**配图（`InputNumber` 认 `tenFrame`、
 * `TapCount` 认 `countable`、`DragOrder` 认 `ordering`…），
 * 其余一律静默丢掉。只按题型判会把这些正常情况全报成错。
 *
 * ⚠️ 改 `src/items/*.tsx` 的渲染逻辑时必须同步这里——
 * 这份名单是手抄的，抄错的后果是这条断言放行一道无解的题。
 */
/** `StemFigure` 画得出的全部种类，与它的 `STEM_FIGURE_KINDS` 一致 */
const STEM_FIGURE = [
  'figure',
  'shapeScene',
  'ordinalRow',
  'spatialPair',
  'storyGroups',
  'equalGroups',
  'barChart',
  'braceGroups',
] as const

const RENDERABLE: Readonly<Record<string, ReadonlySet<string>>> = {
  choice_image: new Set([...STEM_FIGURE, 'tenFrame', 'countable']),
  // 这两个既画题干配图，也各自有专属脚手架
  input_number: new Set([...STEM_FIGURE, 'tenFrame']),
  choice_text: new Set([...STEM_FIGURE]),
  tap_count: new Set(['countable']),
  drag_order: new Set(['ordering']),
  drag_match: new Set(['matching']),
  drag_combine: new Set(['splitting', 'blending']),
  memory_pair: new Set(['memoryPairs']),
  choice_audio: new Set<string>(),
}

describe('⭐ 声明了题干配图的题，题型必须真的画得出来', () => {
  it('每条模板的三档都不会产出「有 visual 但画不出来」的题', () => {
    const broken: string[] = []

    for (const tpl of ITEM_TEMPLATES) {
      const generator = GENERATORS[tpl.generator]
      if (generator === undefined) continue

      for (const difficulty of DIFFICULTIES) {
        // 固定种子即可：模板产出的 type 由参数决定，不随种子变
        const item = generator({
          kpId: tpl.kpId,
          difficulty,
          params: tpl.params[difficulty],
          rng: createRng(7),
          exclude: [],
        })

        if (item.visual !== undefined && RENDERABLE[item.type]?.has(item.visual.kind) !== true) {
          broken.push(
            `${tpl.kpId} 档${String(difficulty)} · ${tpl.generator} → ${item.type} ` +
              `画不出 ${item.visual.kind} 配图（题干：${item.stem.text ?? ''}）`,
          )
        }
      }
    }

    expect(broken, `${broken.length} 处配图画不出来：\n  ${broken.join('\n  ')}`).toEqual([])
  })
})
