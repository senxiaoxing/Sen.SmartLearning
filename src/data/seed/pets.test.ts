/**
 * @file 宠物定义完整性测试
 * @layer data
 *
 * 宠物定义写错了在 UI 上表现为「某个形态显示不出来」或「升级后没变化」，
 * 而这要养到那个等级才能发现。这些检查让配置错误在开发期就暴露。
 */

import { describe, expect, it } from 'vitest'
import {
  PET_DEFINITIONS,
  PET_LINE_MOMENTS,
  isOpened,
  openedGradeLevels,
  openedSubjectsOf,
  petDefinitionOf,
  petsOfGrade,
} from '@/data/seed/pets'
import { ITEM_TEMPLATE_BY_KP } from '@/data/seed/itemTemplates'
import { KNOWLEDGE_POINTS } from '@/data/seed/knowledgePoints'
import { petNameClipKey, VOICE_MANIFEST } from '@/data/seed/voiceManifest'
import { speakerOfParts } from '@/domain/encourage/petSpeaker'
import { STAGE_COUNT } from '@/domain/pet/levelCurves'
import { GRADE_LEVELS, gradeLevelOf, type Subject } from '@/domain/types'
import type { AccessorySlot, PetDefinition } from '@/data/seed/pets'

const ALL_SUBJECTS: Subject[] = ['math', 'pinyin', 'english']

/** 已经有伙伴的年级。加一批新的，下面几条自动跟着覆盖 */
const GRADES_WITH_PETS = GRADE_LEVELS.filter((g) => petsOfGrade(g).length > 0)

/** 一只伙伴的全部台词片段 key（含口头禅） */
const clipKeysOf = (def: PetDefinition): string[] => [
  def.personality.catchphrase.clipKey,
  ...PET_LINE_MOMENTS.flatMap((m) => def.personality[m].map((l) => l.clipKey)),
]

describe('⭐ 每只宠物的默认名都有语音片段', () => {
  /**
   * 守的是升级那一句的音色。
   *
   * `voiceManifest.ts` 的 `PET_NAMES` 里抄了一份宠物名，改了这边的 `defaultName`
   * 却没同步过去的后果是：升级播报整句降级为机器音，
   * 而这只有真的养到升级那一刻才会暴露。
   */
  it.each(PET_DEFINITIONS.map((p) => [p.id, p] as const))('%s', (_id, def) => {
    const clipKey = petNameClipKey(def.defaultName)

    expect(clipKey, `${def.defaultName} 在 voiceManifest 的 PET_NAMES 里没有片段`).toBeDefined()
    expect(VOICE_MANIFEST[clipKey!], '片段念的文本必须与 defaultName 逐字一致').toBe(
      def.defaultName,
    )
  })

  // 起名已改成预设选择器：候选池里的名字（如「毛毛」）也有片段，
  // 详见 petNamePresets.test.ts。查不到片段只剩旧档案的键盘名一种情况
  it('旧档案里键盘起的名字查不到片段 —— 那时应整句走 TTS', () => {
    expect(petNameClipKey('阿旺')).toBeUndefined()
  })
})

describe('宠物定义', () => {
  it('⭐ 有伙伴的年级必须三科齐全 —— 缺一只，那一科的位置就是空的', () => {
    // 「某一科这一年没有伙伴」和「有伙伴但还在睡觉」是两回事：
    // 后者说的是「课程还没做好」，前者在孩子那里没有任何解释。
    expect(GRADES_WITH_PETS).toEqual(['G1', 'G2'])

    for (const grade of GRADES_WITH_PETS) {
      expect(petsOfGrade(grade), `${grade} 不是三只`).toHaveLength(3)
      for (const subject of ALL_SUBJECTS) {
        expect(petDefinitionOf(subject, grade), `${subject} 缺少 ${grade} 宠物`).toBeDefined()
      }
    }
  })

  it('⭐ 每只伙伴有自己的形体 —— 两只共用一套画法，「换了新伙伴」就是句空话', () => {
    const arts = PET_DEFINITIONS.map((d) => d.art)
    expect(new Set(arts).size, `形体重复：${arts.join(', ')}`).toBe(arts.length)
  })

  it('⭐ 每只都恰好有 6 个形态，与 STAGE_COUNT 一致', () => {
    for (const def of PET_DEFINITIONS) {
      expect(def.stages, `${def.id} 形态数不对`).toHaveLength(STAGE_COUNT)
    }
  })

  it('形态尺寸随成长递增，最终形态才有光效', () => {
    for (const def of PET_DEFINITIONS) {
      for (let i = 1; i < def.stages.length; i++) {
        expect(
          def.stages[i]!.scale,
          `${def.id} 形态 ${i} 没有比前一个大`,
        ).toBeGreaterThanOrEqual(def.stages[i - 1]!.scale)
      }
      // 光效留给最终形态才有分量
      const glowing = def.stages.filter((s) => s.glow === true)
      expect(glowing).toHaveLength(1)
      expect(def.stages[STAGE_COUNT - 1]!.glow).toBe(true)
    }
  })

  it('每个形态都有独立的名称，进阶时说得出「现在是什么」', () => {
    for (const def of PET_DEFINITIONS) {
      const labels = def.stages.map((s) => s.label)
      expect(new Set(labels).size, `${def.id} 形态名有重复`).toBe(labels.length)
    }
  })

  it('中间形态靠装饰区分，避免只是同一个 emoji 变大', () => {
    for (const def of PET_DEFINITIONS) {
      // 除了蛋和刚破壳，成长期各形态应有可辨识的差异（装饰组合或不同 emoji）
      const grown = def.stages.slice(2)
      const signatures = grown.map(
        (s) =>
          `${s.emoji}|${s.accessories
            .map((a) => `${a.slot}:${a.kind}`)
            .sort()
            .join(',')}`,
      )
      expect(new Set(signatures).size, `${def.id} 成长期形态视觉上无法区分`).toBe(
        signatures.length,
      )
    }
  })

  it('⭐ 一个槽位只能挂一件 —— 两顶帽子会直接叠在一起', () => {
    for (const def of PET_DEFINITIONS) {
      for (const stage of def.stages) {
        const slots = stage.accessories.map((a) => a.slot)
        expect(
          new Set(slots).size,
          `${def.id} 的「${stage.label}」在同一槽位挂了多件：${slots.join(', ')}`,
        ).toBe(slots.length)
      }
    }
  })

  it('⭐ 装扮只增不减 —— 已经占上的槽位不会在下一级空掉', () => {
    // 累加式成长是刻意的选择：孩子攒到的东西一直挂在身上，
    // 比每进阶一次就换掉上一件的成长感强得多。
    //
    // 约束落在**槽位**而不是 kind 上：同一槽位允许升级
    // （墨墨的小翅膀换成大翅膀），但不允许空出来。
    // 破壳的蛋壳是唯一例外——那是要脱掉的，不是攒到的。
    for (const def of PET_DEFINITIONS) {
      const slotsAt = (i: number): Set<AccessorySlot> =>
        new Set(
          def.stages[i]!.accessories.filter((a) => a.kind !== 'eggshell').map((a) => a.slot),
        )

      for (let i = 3; i < def.stages.length; i++) {
        const prev = slotsAt(i - 1)
        const curr = slotsAt(i)
        for (const slot of prev) {
          expect(
            curr.has(slot),
            `${def.id} 的「${def.stages[i]!.label}」空出了上一形态的 ${slot} 槽位`,
          ).toBe(true)
        }
      }
    }
  })

  it('每个形态的配饰槽位都是合法值', () => {
    const VALID: AccessorySlot[] = ['head', 'face', 'neck', 'back']
    for (const def of PET_DEFINITIONS) {
      for (const stage of def.stages) {
        for (const acc of stage.accessories) {
          expect(VALID, `${def.id}/${stage.label} 的 slot「${acc.slot}」不认识`).toContain(acc.slot)
          expect(acc.kind.length, `${def.id}/${stage.label} 有配饰缺 kind`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('ID 唯一', () => {
    const ids = PET_DEFINITIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('台词', () => {
  it('每个场景的台词池都不为空', () => {
    for (const def of PET_DEFINITIONS) {
      const p = def.personality
      expect(p.catchphrase.text.length, `${def.id} 缺口头禅`).toBeGreaterThan(0)
      for (const moment of PET_LINE_MOMENTS) {
        expect(p[moment].length, `${def.id} 的 ${moment} 台词池为空`).toBeGreaterThan(0)
      }
    }
  })

  it('⭐ 答错、久别重逢与往届的台词不含责备用词', () => {
    // 产品红线：绝不能让孩子对宠物产生负罪感
    const forbidden = ['错了', '错误', '不理', '饿', '死', '生气', '讨厌', '笨']
    for (const def of PET_DEFINITIONS) {
      const risky = [
        ...def.personality.wrong,
        ...def.personality.comeback,
        ...def.personality.archived,
      ]
      for (const line of risky) {
        for (const word of forbidden) {
          expect(line.text.includes(word), `${def.id} 台词「${line.text}」含禁用词「${word}」`).toBe(
            false,
          )
        }
      }
    }
  })

  /**
   * ⭐ 往届台词最容易写坏的不是责备，是**把她拽回一个还没完成的约定**。
   *
   * 「我一直在等你」「常来看看我」听起来温柔，但往届伙伴按定义不会再有下一次——
   * 一句指向将来的话，会让她每次翻回忆都欠着点什么。§5.2 造出这个地方
   * 是为了让升年级不带负罪感，而不是换个地方再挂一笔。
   *
   * 同样拦掉成绩与等级：往届只说陪伴，不说养到了第几阶。
   */
  it('⭐ 往届台词不指向将来、不提成绩', () => {
    const forbidden = ['等你', '常来', '再来', '下次', '等级', '满级', '升级', '第几']
    for (const def of PET_DEFINITIONS) {
      for (const line of def.personality.archived) {
        for (const word of forbidden) {
          expect(
            line.text.includes(word),
            `${def.id} 往届台词「${line.text}」含「${word}」——那是个还没完成的约定`,
          ).toBe(false)
        }
      }
    }
  })

  /**
   * ⭐ 台词现在会出现在**每一次答对**的反馈里，是全 App 最高频的语音之一。
   * 少一个片段就意味着那一句掉回机器音，而它是随机轮换的——
   * 可能好几轮才撞上一次，肉眼（耳）根本抓不住。
   */
  it('每一句台词都有语音片段，且片段念的就是这句话', () => {
    for (const def of PET_DEFINITIONS) {
      const all = [def.personality.catchphrase, ...PET_LINE_MOMENTS.flatMap((m) => def.personality[m])]

      for (const line of all) {
        expect(VOICE_MANIFEST[line.clipKey], `${line.clipKey}（${line.text}）不在清单里`).toBe(
          line.text,
        )
      }
    }
  })

  it('⭐ 同一年级内片段 key 唯一 —— 撞了会让并排的两只共用同一段录音', () => {
    // 约束落在**年级内**而不是全局：跨年级复用是刻意的，见下一条。
    // 同屏出现的永远只有同一年级的三只，它们之间才是真的不能撞。
    for (const grade of GRADES_WITH_PETS) {
      const keys = petsOfGrade(grade).flatMap(clipKeysOf)
      expect(new Set(keys).size, `${grade} 有两只伙伴共用了同一条台词片段`).toBe(keys.length)
    }
  })

  it('⭐ 喵喵整套沿用团团的台词 —— 一条新音频都不多花', () => {
    // 团团那 19 句里没有一句提到「企鹅」或「团团」，全是通用的数学口吻，
    // 换成猫照样成立。复制文本再起一套新 key 会白白多出 19 条 mp3，
    // 念的还是一模一样的话——这条断言就是拦那个的。
    expect(clipKeysOf(petDefinitionOf('math', 'G2')!)).toEqual(
      clipKeysOf(petDefinitionOf('math', 'G1')!),
    )
  })

  it('⭐ 小白与咩咩改写的那几句，不能再提到龙或波波', () => {
    // 一只狗说「又长了一片鳞」、一只羊自称「波波」，
    // 传给孩子的是一条明确错误的信息，而不是「换了个伙伴」。
    const forbidden = ['本龙', '鳞', '波波']
    for (const def of [petDefinitionOf('pinyin', 'G2')!, petDefinitionOf('english', 'G2')!]) {
      const all = [def.personality.catchphrase, ...PET_LINE_MOMENTS.flatMap((m) => def.personality[m])]
      for (const line of all) {
        for (const word of forbidden) {
          expect(line.text.includes(word), `${def.id} 台词「${line.text}」还带着上一只的痕迹`).toBe(
            false,
          )
        }
      }
    }
  })
})

describe('⭐ 声部', () => {
  /**
   * 台词 key 里的 `penguin` / `dragon` / `panda` 是**声部**不是物种：
   * 二年级换了物种但沿用同一批声音，孩子闭着眼也知道现在是哪一科在说话。
   * 认这三个词的正则写在三处（`petSpeaker.ts` 与生成脚本的两处），
   * 新伙伴的 key 若不沿用同科目的那个词，整句会静默掉回旁白少女声。
   */
  it('一只伙伴的全部台词同属一个声部 —— 一只宠物只能有一个声音', () => {
    for (const def of PET_DEFINITIONS) {
      const speakers = clipKeysOf(def).map((key) => speakerOfParts([key]))
      expect(new Set(speakers).size, `${def.id} 的台词分属多个声部：${speakers.join(', ')}`).toBe(1)
      expect(speakers[0], `${def.id} 的台词认不出声部，会掉回旁白少女声`).toBeDefined()
    }
  })

  it('同科目跨年级声部相同 —— 数学的伙伴永远是那个声音', () => {
    for (const subject of ALL_SUBJECTS) {
      const speakers = GRADES_WITH_PETS.map((g) =>
        speakerOfParts([petDefinitionOf(subject, g)!.personality.catchphrase.clipKey]),
      )
      expect(new Set(speakers).size, `${subject} 升年级时换了声音：${speakers.join(', ')}`).toBe(1)
    }
  })
})

describe('科目开放状态', () => {
  it('一年级三科题库齐备，三只宠物都醒着', () => {
    expect(isOpened('math', 'G1')).toBe(true)
    expect(isOpened('pinyin', 'G1'), '阶段 ⑧ 已建拼音题库').toBe(true)
    expect(isOpened('english', 'G1'), '阶段 ⑨ 已建英语题库').toBe(true)
  })

  it('⭐ 二年级只开数学 —— 小白与咩咩还在睡觉', () => {
    // 二年级语文的「教 vs 练」、英语的新句型都还是没想清楚的产品决策。
    // 硬开出来的后果是她点进去发现一片空白，那比睡着更让人失望。
    expect(openedSubjectsOf('G2')).toEqual(['math'])
    expect(isOpened('pinyin', 'G2')).toBe(false)
    expect(isOpened('english', 'G2')).toBe(false)
  })

  it('尚未做内容的年级一律未开放', () => {
    for (const grade of GRADE_LEVELS.filter((g) => g !== 'G1' && g !== 'G2')) {
      expect(openedSubjectsOf(grade), `${grade} 还没有内容，不该开放`).toEqual([])
    }
    expect(openedGradeLevels()).toEqual(['G1', 'G2'])
  })

  it('⭐ 开放的「科目 × 年级」必须真的出得了题 —— 否则宠物醒了却没内容', () => {
    // 「醒着但一道题都出不来」比「还在睡觉」更糟：
    // 孩子点进去发现什么都没有，那是明确的失望，
    // 而睡觉状态至少给了「还没做好」的诚实预期。
    for (const grade of openedGradeLevels()) {
      for (const subject of openedSubjectsOf(grade)) {
        const answerable = KNOWLEDGE_POINTS.filter(
          (kp) =>
            kp.subject === subject &&
            gradeLevelOf(kp.grade) === grade &&
            ITEM_TEMPLATE_BY_KP.has(kp.id),
        )
        expect(
          answerable.length,
          `${subject} ${grade} 已开放但没有任何可出题的知识点`,
        ).toBeGreaterThan(0)
      }
    }
  })
})
