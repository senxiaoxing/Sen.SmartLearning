/**
 * @file 英语短文 —— 用她认得的词连成能读的句子，18 篇分 3 辑
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/englishStory.ts        类型与逐词拆分规则
 * @see src/data/seed/englishSightWords.ts Dolch 高频词表，用词的另一半来源
 * @see design/09-竞品借鉴.md §2.1        语文短文，这一块处处对标它
 *
 * ## 为什么有这一块
 *
 * 短语页（`englishPhrases.ts`）学完，她会说十八组话，但那些话彼此不相连。
 * 这一页把学过的词连成**一小段能从头读到尾的文字**——
 * 从「会说几句」到「**我能读了**」，与识字墙之后有短文是同一步。
 *
 * ## ⛔ 不带朗读（这是这一块最重要的一条）
 *
 * 整篇、整句都不朗读。带上朗读会**削弱它自己的目的**：那会变成中文翻译的
 * 加强版——她听得懂、跟得上，但从来没有独立读过一句英文。
 *
 * 唯一会响的是**单个词**，用的是英语词表早就有的 `en.*` 片段，零新增语音。
 * ⭐ 所以「语音包到二年级为止」那条红线一个字都不用改，`voiceManifest` 不动。
 *
 * ## ⭐ 用词规矩：Dolch 前 N 级 ＋ 她认过的实词
 *
 * 第 N 辑短文只用 Dolch 第 1~N 级的高频词，加上 {@link ENGLISH_STORY_WORDS}
 * （**词汇墙那 180 个词** ＋ 词表里的单词词条 ＋ 字母卡的首字母单词）。
 * ⭐ 词汇墙是这里最名正言顺的一份词源——她真的在墙上一张张点过、听过，
 * 与语文短文用识字 300 是同一个关系。守这条的是 `englishStories.test.ts` 的逐词扫描——
 * **守不住它，这一块就退化成又一堆她读不懂的英文，而「读得懂」正是它唯一的意义。**
 *
 * 这就是为什么第一辑的句子那么短：Pre-Primer 那 40 个词里没有 `have`、
 * 没有 `on`、没有 `like`，能写的只有 `I see a cat. The cat is little.`
 * ——**那正是英语分级读物第一级的样子**，不是把文章写差了。
 *
 * ⚠️ 复数是允许的（`two apples`）：测试会把词尾的 `s` / `es` 去掉再查表。
 * 但**点读不做这个还原**——点 `apples` 不会念 `apple`，
 * 理由见 `domain/englishStory.ts` 文件头：宁可少响一次，
 * 也不能让屏幕上的形状和耳朵里的声音对不上。
 *
 * ## ⛔ 一个字都不许抄教材
 *
 * 选篇参考《Let's Go》《Power Up》以及英语分级读物（Oxford Reading Tree
 * 这一类）的**分级思路与句型骨架**，文本全部自己写。
 * 仓库是公开的，原文进了 `dist/` 就是公开可访问，「纯自用」在那一刻不成立。
 * 这条写进了类型里：`Story.source` 只有 `'自己写的'` 一个取值。
 *
 * ## ⚠️ 加内容 = 追加第四辑，或往某一辑末尾追加一篇
 *
 * ⛔ 不重排辑、不重排辑内顺序 —— 她记的是「小猫那篇在第一个」这种位置。
 * 追加第四辑要连带给 `englishSightWords.ts` 加 Dolch Grade 2。
 */

import { LETTER_CARDS } from '@/data/seed/englishLetters'
import { ALL_ENGLISH_WORDS } from '@/data/seed/englishWords'
import { WORD_CARD_WORDS } from '@/data/seed/englishWordCards'
import { normalizeEnglishWord } from '@/domain/englishStory'
import { wordKey } from '@/domain/english'
import type { EnglishStory, EnglishStoryLine, EnglishStoryVolume } from '@/domain/englishStory'

/**
 * 声明一句短文。
 *
 * @param en - 英文原文，含标点
 * @param zh - 中文意思，说人话的那一句
 */
function s(en: string, zh: string): EnglishStoryLine {
  return { en, zh }
}

/**
 * 词表里**能当积木用**的词条：`en` 是单独一个词的那些。
 *
 * ⚠️ 三类被排除在外，各有各的理由：
 *
 * - **整句词条**（`I like apples.`）—— 它是一道题的题面，不是一个词
 * - **字母词条**（`en` 为 `'A'`）—— 它念出来是「A is for apple.」整句，
 *   点短文里的 `a` 要是念出这一整句，那是把一个虚词变成了一堂字母课
 * - **多词短语**（`Good morning!`）—— 同第一条
 *
 * 字母卡上的首字母单词（sun / kite / queen…）反过来**要收**：
 * 她在字母乐园里已经见过它们，且每个都有现成音频。
 */
const WORD_ENTRIES = ALL_ENGLISH_WORDS.filter(
  (word) => !word.id.startsWith('letter') && !word.en.includes(' '),
)

/**
 * 短文可用的实词表（全小写）。
 *
 * 与 Dolch 高频词一起构成「她读得懂」的边界，见文件头的用词规矩。三个来源：
 *
 * 1. ⭐ **词汇墙的 180 个词** —— 这是主力，也是最名正言顺的一份：
 *    她真的在墙上一张一张点过、听过。这与语文短文用识字 300 是同一个关系
 * 2. 英语词表里的单词词条 —— 出题时见过的
 * 3. 字母卡的首字母单词 —— 字母乐园里见过的
 */
export const ENGLISH_STORY_WORDS: ReadonlySet<string> = new Set([
  ...WORD_CARD_WORDS,
  ...WORD_ENTRIES.map((word) => normalizeEnglishWord(word.en)),
  // 字母卡的首字母单词。`ice cream`（有空格）与 `x-ray`（有连字符）过滤掉：
  // 前者是两个词，后者在这个年龄的短文里用不上
  ...LETTER_CARDS.map((card) => card.word).filter((word) => /^[a-z]+$/.test(word)),
])

/**
 * 这个词有没有现成的语音片段。
 *
 * ⚠️ **精确匹配**，不做复数还原：`cats` 查不到，点了只会得到一声轻响。
 * 见 `domain/englishStory.ts` 文件头。
 *
 * @param word - 已规范化的小写词
 * @returns 片段 key；词表里没有（Dolch 高频词几乎都没有）时返回 `undefined`
 *
 * @example
 * storyWordClipKey('cat')    // 'en.cat'
 * storyWordClipKey('the')    // undefined —— 高频虚词没有片段，点了给轻响
 * storyWordClipKey('cats')   // undefined —— 不做复数还原
 */
export function storyWordClipKey(word: string): string | undefined {
  const entry = WORD_ENTRIES.find((item) => normalizeEnglishWord(item.en) === word)
  return entry === undefined ? undefined : wordKey(entry)
}

/**
 * 第一辑：只用 Dolch Pre-Primer 那 40 个词。
 *
 * 没有 `have`、没有 `on`、没有 `like`、没有 be 动词的复数形式——
 * 能写的只有三五个词的陈述句和祈使句。这一辑的每一篇都能一口气读完。
 */
const VOLUME_1_STORIES: readonly EnglishStory[] = [
  {
    id: 'mylittlecat',
    title: 'My Little Cat',
    titleZh: '我的小猫',
    emoji: '🐱',
    source: '自己写的',
    lines: [
      s('I see a cat.', '我看见一只猫。'),
      s('The cat is little.', '这只猫很小。'),
      s('The cat is funny.', '这只猫很好玩。'),
      s('Look! The cat can jump.', '快看！猫会跳。'),
      s('Jump, jump, jump!', '跳，跳，跳！'),
      s('Come here, little cat.', '过来呀，小猫。'),
    ],
  },
  {
    id: 'bigandlittle',
    title: 'Big and Little',
    titleZh: '大和小',
    emoji: '🐘',
    source: '自己写的',
    lines: [
      s('See the elephant.', '看那只大象。'),
      s('The elephant is big.', '大象很大。'),
      s('See the rabbit.', '看那只兔子。'),
      s('The rabbit is little.', '兔子很小。'),
      s('Big, big elephant!', '好大好大的象！'),
      s('Little, little rabbit!', '好小好小的兔子！'),
    ],
  },
  {
    id: 'onetwothree',
    title: 'One, Two, Three',
    titleZh: '一、二、三',
    emoji: '🍎',
    source: '自己写的',
    lines: [
      s('I see one apple.', '我看见一个苹果。'),
      s('I see two apples.', '我看见两个苹果。'),
      s('I see three apples.', '我看见三个苹果。'),
      s('One, two, three!', '一、二、三！'),
      s('Three red apples.', '三个红苹果。'),
      s('Three red apples for me!', '三个红苹果都是我的！'),
    ],
  },
  {
    id: 'whereismybag',
    title: 'Where Is My Bag?',
    titleZh: '我的书包在哪里',
    emoji: '🎒',
    source: '自己写的',
    lines: [
      s('Where is my bag?', '我的书包在哪里？'),
      s('Is it here?', '在这儿吗？'),
      s('I can not find it.', '我找不到它。'),
      s('Look! Here it is!', '快看！在这儿呢！'),
      s('My bag is yellow.', '我的书包是黄色的。'),
      s('My big yellow bag!', '我的黄色大书包！'),
    ],
  },
  {
    id: 'weplay',
    title: 'We Play',
    titleZh: '我们一起玩',
    emoji: '🏃',
    source: '自己写的',
    lines: [
      s('Come and play!', '快来一起玩！'),
      s('I can run.', '我会跑。'),
      s('You can jump.', '你会跳。'),
      s('Run, run, run!', '跑，跑，跑！'),
      s('Jump, jump, jump!', '跳，跳，跳！'),
      s('We play and play.', '我们玩呀玩。'),
    ],
  },
  {
    id: 'thebigsun',
    title: 'The Big Sun',
    titleZh: '大太阳',
    emoji: '☀️',
    source: '自己写的',
    lines: [
      s('Look up.', '抬头看。'),
      s('The sun is big.', '太阳好大。'),
      s('The sun is red.', '太阳是红色的。'),
      s('See the little bird.', '看那只小鸟。'),
      s('Up, up, up!', '飞上去，上去，上去！'),
      s('Go, little bird, go!', '飞吧，小鸟，飞吧！'),
    ],
  },
]

/**
 * 第二辑：加上 Dolch Primer 那 52 个词。
 *
 * ⭐ be 动词（am/are/was）和介词（on/in/into/under）到这一级才有——
 * 这一辑的句子之所以忽然「像话」了，靠的就是它们，而不是新名词。
 */
const VOLUME_2_STORIES: readonly EnglishStory[] = [
  {
    id: 'mydogandmycat',
    title: 'My Dog and My Cat',
    titleZh: '我的狗和我的猫',
    emoji: '🐶',
    source: '自己写的',
    lines: [
      s('I have a dog.', '我有一只狗。'),
      s('I have a cat.', '我有一只猫。'),
      s('My dog is brown.', '我的狗是棕色的。'),
      s('My cat is white.', '我的猫是白色的。'),
      s('They like to play.', '它们喜欢一起玩。'),
      s('They are so funny!', '它们真好玩！'),
    ],
  },
  {
    id: 'inmybag',
    title: 'In My Bag',
    titleZh: '我的书包里',
    emoji: '✏️',
    source: '自己写的',
    lines: [
      s('What is in my bag?', '我的书包里有什么？'),
      s('A pen and a pencil.', '一支钢笔和一支铅笔。'),
      s('A book and a ruler.', '一本书和一把尺子。'),
      s('A crayon, too.', '还有一支蜡笔。'),
      s('What is that?', '那是什么？'),
      s('It is my little apple!', '是我的小苹果！'),
    ],
  },
  {
    id: 'ilikemilk',
    title: 'I Like Milk',
    titleZh: '我喜欢牛奶',
    emoji: '🥛',
    source: '自己写的',
    lines: [
      s('Do you like milk?', '你喜欢牛奶吗？'),
      s('Yes, I like milk.', '喜欢，我喜欢牛奶。'),
      s('Do you like bread?', '你喜欢面包吗？'),
      s('Yes, please!', '喜欢，请给我！'),
      s('Do you like eggs?', '你喜欢鸡蛋吗？'),
      s('No, I do not. But I like cake!', '不，我不喜欢。但是我喜欢蛋糕！'),
    ],
  },
  {
    id: 'thisismymom',
    title: 'This Is My Mom',
    titleZh: '这是我妈妈',
    emoji: '👩',
    source: '自己写的',
    lines: [
      s('This is my mom.', '这是我妈妈。'),
      s('This is my dad.', '这是我爸爸。'),
      s('He is big.', '他很高大。'),
      s('She is pretty.', '她很漂亮。'),
      s('I have a brother and a sister.', '我有一个哥哥和一个姐姐。'),
      s('We all like cake!', '我们都喜欢蛋糕！'),
    ],
  },
  {
    id: 'thecatonmybag',
    title: 'The Cat on My Bag',
    titleZh: '书包上的猫',
    emoji: '🐈',
    source: '自己写的',
    lines: [
      s('Look at my cat.', '看看我的猫。'),
      s('She is on my bag.', '她坐在我的书包上。'),
      s('Get out, cat!', '出去呀，猫咪！'),
      s('She will not get out.', '她不肯出去。'),
      s('She wants to play.', '她想玩。'),
      s('What a funny cat!', '真是一只好玩的猫！'),
    ],
  },
  {
    id: 'fourlittleducks',
    title: 'Four Little Ducks',
    titleZh: '四只小鸭子',
    emoji: '🦆',
    source: '自己写的',
    lines: [
      s('I saw four little ducks.', '我看见四只小鸭子。'),
      s('They went into the water.', '它们下水去了。'),
      s('One duck came out.', '一只鸭子上来了。'),
      s('Two ducks came out.', '两只鸭子上来了。'),
      s('All four ducks came out.', '四只鸭子都上来了。'),
      s('They ran to me!', '它们朝我跑过来！'),
    ],
  },
]

/**
 * 第三辑：加上 Dolch Grade 1 那 41 个词。
 *
 * ⭐ 到这一级才有 `then`（然后）、`once`（从前）、`again`（又一次）——
 * 有了它们句子之间才有先后，一篇东西才算得上「故事」而不是几句描述。
 */
const VOLUME_3_STORIES: readonly EnglishStory[] = [
  {
    id: 'thelittlebird',
    title: 'The Little Bird',
    titleZh: '小鸟学飞',
    emoji: '🐦',
    source: '自己写的',
    lines: [
      s('Once there was a little bird.', '从前有一只小鸟。'),
      s('She could not fly.', '她还不会飞。'),
      s('She said, "I can fly. I know I can."', '她说：「我会飞的，我知道我可以。」'),
      s('Then she went up, up, up.', '然后她飞了起来，越飞越高。'),
      s('Look! She could fly!', '快看！她会飞了！'),
      s('"I did it!" said the little bird.', '「我做到啦！」小鸟说。'),
    ],
  },
  {
    id: 'myoldkite',
    title: 'My Old Kite',
    titleZh: '我的旧风筝',
    emoji: '🪁',
    source: '自己写的',
    lines: [
      s('I have an old kite.', '我有一个旧风筝。'),
      s('It is red and white.', '它是红白色的。'),
      s('I take it out.', '我把它拿出去。'),
      s('I let it go up.', '我放它飞上天。'),
      s('Up, up, and over!', '越过头顶，飞得好高！'),
      s('My old kite can fly!', '我的旧风筝会飞！'),
    ],
  },
  {
    id: 'acakeforgrandma',
    title: 'A Cake for Grandma',
    titleZh: '给奶奶的蛋糕',
    emoji: '🎂',
    source: '自己写的',
    lines: [
      s('Grandma is old.', '奶奶年纪大了。'),
      s('I have a big cake for her.', '我给她准备了一个大蛋糕。'),
      s('I take the cake to her.', '我把蛋糕送过去。'),
      s('"Thank you," she said.', '「谢谢你。」她说。'),
      s('We eat some of the cake.', '我们吃了一些蛋糕。'),
      s('Then we walk and walk.', '然后我们一起散步。'),
    ],
  },
  {
    id: 'fivelittlemonkeys',
    title: 'Five Little Monkeys',
    titleZh: '五只小猴子',
    emoji: '🐵',
    source: '自己写的',
    lines: [
      s('Look over there!', '看那边！'),
      s('I see some monkeys.', '我看见几只猴子。'),
      s('One, two, three, four, five monkeys!', '一、二、三、四、五只猴子！'),
      s('They jump from here to there.', '它们从这边跳到那边。'),
      s('Then they stop.', '然后它们停下来。'),
      s('They ask me for some bread.', '它们向我要面包。'),
      s('I give them my bread.', '我把面包给它们。'),
    ],
  },
  {
    id: 'mysister',
    title: 'My Sister',
    titleZh: '我的姐姐',
    emoji: '👧',
    source: '自己写的',
    lines: [
      s('My sister is old.', '我姐姐长大了。'),
      s('I am little.', '我还小。'),
      s('She has a pen.', '她有一支钢笔。'),
      s('I have a pencil.', '我有一支铅笔。'),
      s('She looks at my book with me.', '她和我一起看我的书。'),
      s('I think my sister is good.', '我觉得姐姐真好。'),
    ],
  },
  {
    id: 'thesungoesdown',
    title: 'The Sun Goes Down',
    titleZh: '太阳下山了',
    emoji: '🌙',
    source: '自己写的',
    lines: [
      s('The sun is going down.', '太阳下山了。'),
      s('Every bird is going away.', '小鸟都飞回去了。'),
      s('Mom said, "Come in now."', '妈妈说：「快进屋来。」'),
      s('I put my book away.', '我把书收好。'),
      s('"See you again," I said to the sun.', '「明天见。」我对太阳说。'),
      s('Then I go to Mom.', '然后我朝妈妈跑过去。'),
    ],
  },
]

/**
 * 全部短文，按辑。三辑与 Dolch 的三级一一对应。
 *
 * ⚠️ 加内容 = 往这个数组后面追加一辑，或往某一辑的 `stories` 末尾追加一篇。
 * ⛔ 不重排辑、不重排辑内顺序。
 */
export const ENGLISH_STORY_VOLUMES: readonly EnglishStoryVolume[] = [
  {
    id: 'vol1',
    name: '第一辑',
    badge: '1',
    hint: '最短的句子，一口气读得完',
    stories: VOLUME_1_STORIES,
  },
  {
    id: 'vol2',
    name: '第二辑',
    badge: '2',
    hint: '有了 is 和 on，句子像话了',
    stories: VOLUME_2_STORIES,
  },
  {
    id: 'vol3',
    name: '第三辑',
    badge: '3',
    hint: '有先后、有转折，是故事了',
    stories: VOLUME_3_STORIES,
  },
]

/** 全部短文，摊平。测试与查找用 */
export const ALL_ENGLISH_STORIES: readonly EnglishStory[] = ENGLISH_STORY_VOLUMES.flatMap(
  (volume) => volume.stories,
)

/**
 * 按 ID 找一篇短文。
 *
 * @param id - 短文 ID
 * @returns 找到的短文；ID 不存在（乱输 hash）时返回 `undefined`
 *
 * @example
 * englishStoryById('mylittlecat')?.title   // 'My Little Cat'
 * englishStoryById('nope')                 // undefined
 */
export function englishStoryById(id: string): EnglishStory | undefined {
  return ALL_ENGLISH_STORIES.find((story) => story.id === id)
}
