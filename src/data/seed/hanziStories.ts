/**
 * @file 短文 —— 识字墙的下一步：把认得的字连成能读的句子
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/story.ts  类型与逐字拆分规则
 * @see design/09-竞品借鉴.md §2.1  学自洪恩识字的分级绘本，但**不带语音**
 *
 * ## 为什么有这一块
 *
 * 识字 300 是一面墙，**字学完就到头，没有下一步**。
 * 洪恩最强的设计不是识字卡，是那 130 本分级绘本：每本只用孩子已经学过的字，
 * 于是识字从「认字」变成「**我能读了**」。
 *
 * ## ⛔ 不带朗读
 *
 * 整篇、整句都不朗读，这是这个模块最重要的一条。带上朗读会**削弱它自己的目的**——
 * 那会变成拼音依赖的加强版：她听得懂、跟得上，但从来没有独立读过一句。
 *
 * 唯一会响的是**单个字**（点一下听那个字），用的是识字墙早就有的
 * `hanziClipKey()`，零新增语音。她卡住时的退路是**一个字**，不是一整句。
 *
 * ⭐ 所以「语音包到二年级为止」那条红线一个字都不用改，`voiceManifest` 不动。
 *
 * ## ⭐ 用字规矩：只用**本辑及之前**学过的字
 *
 * 第 N 辑短文只用识字第 1~N 辑的字，所以她学完第一辑 100 字，
 * 第一辑短文当天就读得了。守这条的是 `hanziStories.test.ts` 的逐字扫描——
 * **守不住它，这一块就退化成又一堆她读不懂的课文，而「读得懂」正是它唯一的意义。**
 *
 * 例外只有 {@link STORY_GLUE}，见那里。
 *
 * ## ⚠️ 第一辑为什么全是「自己写的」
 *
 * design/09 §2.1 定的优先级是「文言文、古诗、寓言优先，现代课文自己写」——
 * 那是**版权**排序，不是文体排序。而第一辑只有 100 个字可用，
 * 文言和寓言的用字远在这之外，一篇都写不了。
 *
 * 这不是偷懒，是内容本身的性质：能用 100 字讲完的故事，只能是自己编的日常。
 * 寓言、古文从第二辑起才谈得上。
 *
 * ⛔ **任何时候都不要放人教版现代课文原文**：仓库是公开的，
 * 原文进了 `dist/` 就是公开可访问，「纯自用」在那一刻不成立。
 *
 * ## 分辑规矩与识字墙、诗单完全一致
 *
 * ✅ 加内容 = 追加下一辑，或往当前辑末尾追加一篇
 * ⛔ 不重排辑、不重排辑内顺序 —— 她记的是「小猫那篇在第四个」这种位置
 */

import { ALL_HANZI_CARDS, HANZI_VOLUMES } from '@/data/seed/hanziCards'
import type { Story, StoryVolume } from '@/domain/story'

/**
 * ⭐ 粘合虚词白名单 —— 唯一允许出现在识字 300 表**之外**的字。
 *
 * 没有它们中文写不成句：「的」「了」「在」「和」这些字**一个都不在识字表里**
 * （轻声字被 `hanziCards.ts` 明确排除，「在」「和」「都」则是整表就没收）。
 * 而「是」「有」「不」「很」「只」偏偏都排在**第三辑**，第一辑短文一个也用不了。
 *
 * 所以粘合剂只能从表外来。它们在屏幕上**不标色、不可点**——
 * 这与 `StoryChar.known` 是同一件事：标色的意思是「这个字你学过」，
 * 而这些字她确实没在墙上见过。
 *
 * ⚠️ **每个字都必须真的不在识字 300 表内**，由 `hanziStories.test.ts` 强制。
 * 把一个表内字写进这里，后果是那个字在短文里失去颜色和读音——
 * 等于把她学过的字藏了起来。
 *
 * ⚠️ 这里的拼音是**这些字在短文里实际的读法**：「了」取 le 不取 liǎo。
 * 真要用到 liǎo 那个音，该换个词，不该改这张表。
 */
export const STORY_GLUE: Readonly<Record<string, string>> = {
  的: 'de',
  了: 'le',
  着: 'zhe',
  在: 'zài',
  和: 'hé',
  也: 'yě',
  就: 'jiù',
  都: 'dōu',
  个: 'gè',
  们: 'men',
  条: 'tiáo',
  吗: 'ma',
  呢: 'ne',
}

/**
 * 第一辑：只用识字第一辑那 100 个字。
 *
 * 可用的动词只有「看听说走坐站飞吃来去开关」十来个，形容词只有颜色和大小长短。
 * 所以这一辑的句子必然短、必然具体——**那正是她这个阶段读得动的东西**，
 * 不是把文章写差了。
 */
const VOLUME_1_STORIES: readonly Story[] = [
  {
    id: 'daxue',
    title: '大雪',
    titlePinyin: 'dà xuě',
    emoji: '❄️',
    source: '自己写的',
    lines: [
      { text: '天上下大雪了。', pinyin: 'tiān shàng xià dà xuě le' },
      { text: '大雪白白的。', pinyin: 'dà xuě bái bái de' },
      { text: '山白了，田也白了。', pinyin: 'shān bái le tián yě bái le' },
      { text: '小猫走来走去。', pinyin: 'xiǎo māo zǒu lái zǒu qù' },
      { text: '小狗也来了。', pinyin: 'xiǎo gǒu yě lái le' },
      { text: '我和弟弟看大雪。', pinyin: 'wǒ hé dì dì kàn dà xuě' },
      { text: '好看！', pinyin: 'hǎo kàn' },
    ],
  },
  {
    id: 'wojia',
    title: '我家',
    titlePinyin: 'wǒ jiā',
    emoji: '🏠',
    source: '自己写的',
    lines: [
      { text: '我家门口开花了。', pinyin: 'wǒ jiā mén kǒu kāi huā le' },
      { text: '红花，黄花，白花。', pinyin: 'hóng huā huáng huā bái huā' },
      { text: '花上飞来小鸟。', pinyin: 'huā shàng fēi lái xiǎo niǎo' },
      { text: '小鸟站着，看花。', pinyin: 'xiǎo niǎo zhàn zhe kàn huā' },
      { text: '妈妈说：花好看。', pinyin: 'mā mā shuō huā hǎo kàn' },
      { text: '我也说：好看！', pinyin: 'wǒ yě shuō hǎo kàn' },
    ],
  },
  {
    id: 'sangeren',
    title: '三个人',
    titlePinyin: 'sān gè rén',
    emoji: '👨‍👩‍👧',
    source: '自己写的',
    lines: [
      { text: '爸爸、妈妈和我。', pinyin: 'bà bà mā mā hé wǒ' },
      { text: '爸爸大，我小。', pinyin: 'bà bà dà wǒ xiǎo' },
      { text: '爸爸站着，我坐着。', pinyin: 'bà bà zhàn zhe wǒ zuò zhe' },
      { text: '爸爸说：你好！', pinyin: 'bà bà shuō nǐ hǎo' },
      { text: '我也说：你好！', pinyin: 'wǒ yě shuō nǐ hǎo' },
      { text: '我们都好。', pinyin: 'wǒ men dōu hǎo' },
    ],
  },
  {
    id: 'xiaomao',
    title: '小猫',
    titlePinyin: 'xiǎo māo',
    emoji: '🐱',
    source: '自己写的',
    lines: [
      { text: '我家小猫黑黑的。', pinyin: 'wǒ jiā xiǎo māo hēi hēi de' },
      { text: '小猫看水。', pinyin: 'xiǎo māo kàn shuǐ' },
      { text: '水上一条鱼。', pinyin: 'shuǐ shàng yī tiáo yú' },
      { text: '小猫吃鱼。', pinyin: 'xiǎo māo chī yú' },
      { text: '小猫开心。', pinyin: 'xiǎo māo kāi xīn' },
      { text: '我也开心。', pinyin: 'wǒ yě kāi xīn' },
    ],
  },
  {
    id: 'riheyue',
    title: '日和月',
    titlePinyin: 'rì hé yuè',
    emoji: '🌗',
    source: '自己写的',
    lines: [
      { text: '白天，天上一个大日头。', pinyin: 'bái tiān tiān shàng yī gè dà rì tóu' },
      { text: '天黑了，月来了。', pinyin: 'tiān hēi le yuè lái le' },
      { text: '月白白的，星也白白的。', pinyin: 'yuè bái bái de xīng yě bái bái de' },
      { text: '我看月，也看星。', pinyin: 'wǒ kàn yuè yě kàn xīng' },
      { text: '月和星都好看。', pinyin: 'yuè hé xīng dōu hǎo kàn' },
    ],
  },
  {
    id: 'niuhema',
    title: '牛和马',
    titlePinyin: 'niú hé mǎ',
    emoji: '🐮',
    source: '自己写的',
    lines: [
      { text: '田上一头牛，牛吃禾。', pinyin: 'tián shàng yī tóu niú niú chī hé' },
      { text: '山上一马，马走来走去。', pinyin: 'shān shàng yī mǎ mǎ zǒu lái zǒu qù' },
      { text: '牛大，马也大。', pinyin: 'niú dà mǎ yě dà' },
      { text: '羊小，羊也吃禾。', pinyin: 'yáng xiǎo yáng yě chī hé' },
      { text: '牛、马和羊，都在山上。', pinyin: 'niú mǎ hé yáng dōu zài shān shàng' },
    ],
  },
  {
    id: 'wodeshubao',
    title: '我的书包',
    titlePinyin: 'wǒ de shū bāo',
    emoji: '🎒',
    source: '自己写的',
    lines: [
      { text: '我的书包红红的。', pinyin: 'wǒ de shū bāo hóng hóng de' },
      { text: '书包上一个小马。', pinyin: 'shū bāo shàng yī gè xiǎo mǎ' },
      { text: '我的笔，我的书，都在书包。', pinyin: 'wǒ de bǐ wǒ de shū dōu zài shū bāo' },
      { text: '哥哥的书包黑黑的。', pinyin: 'gē gē de shū bāo hēi hēi de' },
      { text: '我们的书包都好看。', pinyin: 'wǒ men de shū bāo dōu hǎo kàn' },
    ],
  },
  {
    id: 'chuntian',
    title: '春天',
    titlePinyin: 'chūn tiān',
    emoji: '🌸',
    source: '自己写的',
    lines: [
      { text: '春天来了。', pinyin: 'chūn tiān lái le' },
      { text: '花开了，花红红的。', pinyin: 'huā kāi le huā hóng hóng de' },
      { text: '小鸟飞来飞去。', pinyin: 'xiǎo niǎo fēi lái fēi qù' },
      { text: '山青了，田也青了。', pinyin: 'shān qīng le tián yě qīng le' },
      { text: '爷爷、奶奶和我，看花去。', pinyin: 'yé yé nǎi nǎi hé wǒ kàn huā qù' },
      { text: '春天好。', pinyin: 'chūn tiān hǎo' },
    ],
  },
]

/**
 * 全部短文，按辑。
 *
 * ⚠️ 目前只有第一辑。第二、三辑要等**写出来**，不是等代码——
 * 加辑就是往这个数组后面追加一个 {@link StoryVolume}，UI 自动多一个按钮。
 */
export const STORY_VOLUMES: readonly StoryVolume[] = [
  {
    id: 'vol1',
    name: '第一辑',
    badge: '1',
    hint: '只用第一辑那 100 个字',
    stories: VOLUME_1_STORIES,
  },
]

/**
 * 识字 300 表里的全部字。
 *
 * 短文里的字在不在这里面，决定它**标不标色、能不能点、点了有没有音**——
 * 三件事是同一件，见 `domain/story.ts` 的 `StoryChar.known`。
 */
export const KNOWN_HANZI: ReadonlySet<string> = new Set(ALL_HANZI_CARDS.map((c) => c.char))

/**
 * 累积到第 `index` 辑（含）为止学过的字。给 `hanziStories.test.ts` 的越界扫描用。
 *
 * @param index - 辑的下标，从 0 起
 * @returns 该辑及之前全部辑的字
 *
 * @example
 * charsUpToVolume(0).has('天')   // true   第一辑就有
 * charsUpToVolume(0).has('是')   // false  「是」在第三辑
 */
export function charsUpToVolume(index: number): ReadonlySet<string> {
  return new Set(
    HANZI_VOLUMES.slice(0, index + 1).flatMap((v) =>
      v.groups.flatMap((g) => g.cards.map((c) => c.char)),
    ),
  )
}

/**
 * 全部短文，摊平。测试与查找用。
 */
export const ALL_STORIES: readonly Story[] = STORY_VOLUMES.flatMap((v) => v.stories)

/**
 * 按 ID 找一篇短文。
 *
 * @param id - 短文 ID
 * @returns 找到的短文，没有则 undefined
 *
 * @example
 * storyById('daxue')?.title   // '大雪'
 */
export function storyById(id: string): Story | undefined {
  return ALL_STORIES.find((s) => s.id === id)
}
