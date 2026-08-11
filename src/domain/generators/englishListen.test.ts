/**
 * @file 英语听音题的诊断性测试
 * @layer domain
 * @see src/domain/generators/englishListen.ts
 *
 * 契约测试（`index.test.ts`）已经查过「选项唯一、都带标签、不重复」这些结构问题。
 * 这里查的是**教学上的正确性**——一道题结构完美但什么也没考到，
 * 契约测试是发现不了的。拼音那边实测抓到过两次这种废题
 * （四声调题的干扰项给成了不同韵母，孩子靠韵母就排除了）。
 *
 * 英语最容易出这种废题的地方是数字：如果 E2.2 的选项全是 11~20，
 * 孩子听见一串模糊的音随便选也有 25% 蒙对，而真正要诊断的错误
 * （听 `fourteen` 选 `4`）根本没机会发生。
 */

import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '@/data/seed/itemTemplates'
import { generateFromTemplate } from '@/domain/generators'
import { CONFUSABLE_ENGLISH } from '@/domain/generators/confusableEnglish'
import { createRng } from '@/domain/generators/rng'
import type { EnglishWord } from '@/domain/english'
import type { Difficulty, GeneratedItem, ItemTemplate } from '@/domain/types'

const DIFFICULTIES: Difficulty[] = [1, 2, 3]
const SAMPLES = 30

const ENGLISH_TEMPLATES = ITEM_TEMPLATES.filter((t) => t.generator === 'englishListen')

function templateOf(id: string): ItemTemplate {
  const template = ENGLISH_TEMPLATES.find((t) => t.id === id)
  if (template === undefined) throw new Error(`找不到模板 ${id}`)
  return template
}

function sampleAll(template: ItemTemplate, difficulties = DIFFICULTIES): GeneratedItem[] {
  const items: GeneratedItem[] = []
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= SAMPLES; seed += 1) {
      items.push(generateFromTemplate(template, difficulty, createRng(seed)))
    }
  }
  return items
}

/** 从签名反推目标词条 id，如 `'E2.2-listen#fourteen'` → `'fourteen'` */
function targetOf(item: GeneratedItem): string {
  return item.signature.split('#')[1] ?? ''
}

function tagsOf(item: GeneratedItem): string[] {
  return item.options.filter((o) => !o.isCorrect).map((o) => o.misconceptionTag ?? '')
}

describe('听音题基本盘', () => {
  const cases = ENGLISH_TEMPLATES.map((t) => [t.id, t] as const)

  it.each(cases)('%s 恰好 4 个选项 —— 选项少一个，蒙对概率就涨 8 个点', (_id, template) => {
    for (const item of sampleAll(template)) {
      expect(item.options.length, `${template.id}「${item.stem.ttsText}」选项不足`).toBe(4)
    }
  })

  it.each(cases)('%s 题干不显示英文 —— 显示了就变成照着形状配对', (_id, template) => {
    for (const item of sampleAll(template)) {
      expect(item.stem.text, `${template.id} 题干泄露了英文`).not.toMatch(/[A-Za-z]/)
    }
  })

  it.each(cases)('⭐ %s 题干标了英语 —— 兜底 TTS 用中文引擎念会教错发音', (_id, template) => {
    for (const item of sampleAll(template)) {
      expect(item.stem.ttsLang, `${template.id} 没标 en-US`).toBe('en-US')
      expect(item.stem.ttsParts, `${template.id} 缺少词条片段`).toHaveLength(1)
      expect(item.stem.ttsParts?.[0]).toMatch(/^en\./)
    }
  })

  it.each(cases)('⭐ %s 每个选项都能被读出来 —— 孩子不识字', (_id, template) => {
    // 选项主体是 emoji，直接喂给 TTS 等于什么也念不出来。
    // 「每个选项可单独点击朗读」是本项目的无障碍硬要求，不是加分项
    for (const item of sampleAll(template)) {
      for (const option of item.options) {
        expect(option.ttsText, `${template.id} 的选项「${option.text}」念不出来`).toBeTruthy()
        expect(option.caption, `${template.id} 的选项「${option.text}」缺中文小字`).toBeTruthy()
      }
    }
  })
})

describe('⭐⭐ 数字：teen 与个位数', () => {
  it('E5.2 听 fourteen 必须能选到 4 —— 这是本知识点唯一真正在考的东西', () => {
    // 缺了这个干扰项，选项全是 11~20，孩子听见模糊的一串音随便选也有 25% 蒙对，
    // 而真正的错误（词尾 -teen 没听见）根本没机会发生
    const items = sampleAll(templateOf('E5.2-listen'))
    const checked = items.filter((item) => targetOf(item) !== 'eleven')

    expect(checked.length, '采样里没有 eleven 以外的目标').toBeGreaterThan(0)
    for (const item of checked) {
      expect(
        tagsOf(item),
        `听「${item.stem.ttsText}」的选项里没有对应的个位数，` +
          `teen 词尾根本没被考到`,
      ).toContain('number_teen_ty')
    }
  })

  it('E5.1 难度 1 不会混入还没学过的 11~20', () => {
    // 难度 1 的候选池刻意只有本组：孩子刚认识 1~10 就在选项里看到 14，
    // 是在用没教过的内容制造挫败感
    for (const item of sampleAll(templateOf('E5.1-listen'), [1])) {
      for (const option of item.options) {
        expect(Number(option.text), `难度 1 出现了 ${option.text}`).toBeLessThanOrEqual(10)
      }
    }
  })
})

describe('⭐ 字母：镜像混淆', () => {
  /** b/d、p/q 是形状对称的四个字母，一年级最典型的字母错误 */
  const MIRROR_TARGETS = ['letterB', 'letterD', 'letterP', 'letterQ']

  it('E1.8 听到 b/d/p/q 时必须出现 letter_mirror', () => {
    // 这个标签是定向补救的触发条件（remedial.ts: letter_mirror → E1.6），
    // 产不出来整条补救链就断了
    const items = sampleAll(templateOf('E1.8-listen')).filter((item) =>
      MIRROR_TARGETS.includes(targetOf(item)),
    )

    expect(items.length, '采样里没抽到 b/d/p/q').toBeGreaterThan(0)
    for (const item of items) {
      expect(tagsOf(item), `听「${item.stem.ttsText}」时没有镜像干扰项`).toContain(
        'letter_mirror',
      )
    }
  })

  it('E1.1（A~E）难度 1 只在本组里挑干扰项', () => {
    const allowed = new Set(['Aa', 'Bb', 'Cc', 'Dd', 'Ee'])
    for (const item of sampleAll(templateOf('E1.1-listen'), [1])) {
      for (const option of item.options) {
        expect(allowed.has(option.text ?? ''), `难度 1 出现了组外字母 ${option.text}`).toBe(true)
      }
    }
  })
})

describe('⭐ 数量题：数字必须是唯一变量', () => {
  it.each(['E5.3-listen', 'E10.4-listen'])('%s 的干扰项与正确答案同族', (id) => {
    // 「三个苹果」的选项若是「两只猫 / 四只鸭 / 三个苹果」，
    // 孩子听见 apples 就选中了，two/three/four 根本没参与。
    // 同族保证了数量是唯一的变量
    for (const item of sampleAll(templateOf(id))) {
      const faces = item.options.map((o) => o.text ?? '')
      // 同族的图形面由同一个 emoji 重复而成，取首字符即可判断
      const kinds = new Set(faces.map((face) => [...face][0]))
      expect(
        kinds.size,
        `「${item.stem.ttsText}」的选项混了 ${kinds.size} 种东西: ${faces.join(' / ')}`,
      ).toBe(1)
    }
  })
})

describe('⭐ 易混表必须真的被用上', () => {
  it('候选池里存在的易混词，一个都不能漏进选项', () => {
    // 拼音那边实测踩过这个坑：易混表的键名写错，
    // 所有平翘舌辨析题**静默**退化成无诊断的兜底标签——
    // 不报错、不崩溃、题看着也正常，只是诊断能力消失了。
    //
    // 所以这里不看比例，直接复现生成器挑易混词的那一步：
    // 只要目标词登记过易混对照、且对照词在候选池里，它就必须出现在选项里。
    let checked = 0

    for (const template of ENGLISH_TEMPLATES) {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= SAMPLES; seed += 1) {
          const item = generateFromTemplate(template, difficulty, createRng(seed))
          const params = template.params[difficulty]
          const pool = (params.pool ?? params.words) as EnglishWord[]
          const faces = new Set(item.options.map((o) => o.text))

          for (const word of expectedConfusables(item, pool)) {
            expect(
              faces.has(word.face),
              `${template.id} 听「${item.stem.ttsText}」时，` +
                `易混词「${word.en}」在候选池里却没进选项`,
            ).toBe(true)
            checked += 1
          }
        }
      }
    }

    console.info(`\n  易混词进入选项的断言命中 ${checked} 次\n`)
    expect(checked, '一次都没命中，说明易混表的键名对不上词条 id').toBeGreaterThan(0)
  })
})

/**
 * 复现生成器挑易混词的那一步：按表的顺序取，
 * 跳过图形面与正确答案相同的，最多 3 个。
 */
function expectedConfusables(item: GeneratedItem, pool: EnglishWord[]): EnglishWord[] {
  const correctFace = item.options.find((o) => o.isCorrect)?.text ?? ''
  const seen = new Set([correctFace])
  const result: EnglishWord[] = []

  for (const ref of CONFUSABLE_ENGLISH[targetOf(item)] ?? []) {
    if (result.length >= 3) break
    const word = pool.find((w) => w.id === ref.id)
    if (word === undefined || seen.has(word.face)) continue
    seen.add(word.face)
    result.push(word)
  }
  return result
}
