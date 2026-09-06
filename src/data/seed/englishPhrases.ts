/**
 * @file 英语短语短句 —— 18 个话题 × 6 句，分 3 辑
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/englishPhrase.ts  类型与 key 规则
 * @see src/features/english/PhraseLibrary.tsx  话题单
 *
 * ## 这一块对标的是**古诗**，不是词表
 *
 * 一个话题就是一首诗的位置：一组固定的句子，可以逐句听、也可以整组连着听，
 * 全部可点、没有对错判定、随时可走（CLAUDE.md 产品红线「是教不是练」）。
 * ⛔ 不出题、不落 attempts、不记 mastery、不给积分、不影响宠物经验。
 *
 * 与词表（`englishWords.ts`）的分工：那边是**题库素材**，
 * 每个词条要配图形面、要挂同族标记、要能生成有诊断性的干扰项；
 * 这边是**说得出口的话**，只要念得准、听得懂、当场用得上。
 *
 * ## 选篇依据
 *
 * 句型与话题顺序参考《牛津少儿英语 Let's Go》第 1 册与剑桥《Power Up》
 * Starter 的单元大纲——两套教材开头几个单元几乎一致，说明这是
 * 零基础起步公认的顺序：**先能打招呼说自己，再指认身边的东西，最后说一天里的事**。
 *
 * ⛔ 只参考大纲与句型，**文本全部自己写**：教材课文有版权，而仓库是公开的。
 * 好在这个层级的句子（`How are you?` `It's a pencil.`）本来就是公共句式，
 * 不存在「谁的原文」这回事。
 *
 * - **第一辑**：见面就说得出的话。Let's Go 1 Unit 1 + Power Up「Hello!」——
 *   问候、自我介绍、礼貌用语、课堂指令。这一辑她**当天就能对着爸爸妈妈用**。
 * - **第二辑**：指认身边的东西和人。`What's this?` / 颜色 / 数量 / 家人 /
 *   喜欢吃什么 / 身体部位，全部与词表里已学的名词咬合。
 * - **第三辑**：一天里的话。会不会做某事、东西在哪里、天气、心情、
 *   在家里的一天、一起玩。句子长了一点，但骨架仍是前两辑那几个。
 *
 * ## ⭐ 句子成对排列
 *
 * 一问一答，所以「全部读一遍」听起来是**一段对话**而不是六条清单。
 * 祈使句那几组（老师说、在家里）则按一天里发生的顺序排。
 * ⚠️ 别把同一话题内的句子按字母序或长度重排——那会把对话拆散。
 *
 * ## ⚠️ 加内容 = 追加第四辑，或往某一辑末尾追加一个话题
 *
 * ⛔ 不重排辑、不重排辑内话题顺序，也不把句子接在现有话题后面——
 * 她记的是「打招呼在第一个」这种位置，理由与识字分辑、诗单分辑完全一致。
 *
 * 加内容之后要同步改三处数量断言：`englishPhrases.test.ts` ·
 * `scripts/generate-voices.mjs` 的 `EXPECTED_PHRASE_COUNT` ·
 * design/07 §3.5a 的条数，然后 `npm run voices`。
 */

import type { PhraseLine, PhraseTopic, PhraseVolume } from '@/domain/englishPhrase'

/**
 * 声明一条短语。
 *
 * ⚠️ 必须**独占一行**书写：`scripts/generate-voices.mjs` 的 `loadPhrases()`
 * 是逐行扫描并按出现顺序给句子编号的，折行会让编号错位，
 * 后果是「点第三句、念出第二句」。与 `poems.ts` 的 `l()` 同一条约定。
 *
 * @param en - 英文原文，喂给 TTS 的文本
 * @param zh - 中文意思，说人话的那一句
 */
function p(en: string, zh: string): PhraseLine {
  return { en, zh }
}

/**
 * 第一辑：见面就说得出的话。
 *
 * ⚠️ 顺序即难度梯度：前四组是三五个词的固定说法，
 * 到「老师说」才出现动词开头的祈使句，「是和不是」才出现一问一答的完整轮次。
 */
const VOLUME_1_TOPICS: readonly PhraseTopic[] = [
  {
    id: 'greetings',
    title: '打招呼',
    titleEn: 'Say Hello',
    emoji: '👋',
    lines: [
      p('Hello!', '你好！'),
      p('Good morning!', '早上好！'),
      p('Good afternoon!', '下午好！'),
      p('Good evening!', '晚上好！'),
      p('Good night!', '晚安！'),
      p('Goodbye!', '再见！'),
    ],
  },
  {
    id: 'myName',
    title: '我叫什么',
    titleEn: 'My Name',
    // 🧒 而不是 📛（名牌）：那个红徽章在 Windows 上是一团红色，
    // 她认不出那是「名字」。一个小孩的脸更接近「说说我自己」
    emoji: '🧒',
    lines: [
      p("What's your name?", '你叫什么名字？'),
      p('My name is Anna.', '我叫安娜。'),
      p('How old are you?', '你几岁啦？'),
      p("I'm six.", '我六岁。'),
      p('Nice to meet you!', '很高兴认识你！'),
      p('Nice to meet you, too!', '我也很高兴认识你！'),
    ],
  },
  {
    id: 'howAreYou',
    title: '你好吗',
    titleEn: 'How Are You',
    emoji: '😊',
    lines: [
      p('How are you?', '你好吗？'),
      p("I'm fine, thank you.", '我很好，谢谢。'),
      p('And you?', '你呢？'),
      p("I'm OK.", '我还不错。'),
      p('See you tomorrow!', '明天见！'),
      p('Have a nice day!', '祝你今天开开心心！'),
    ],
  },
  {
    id: 'politeWords',
    title: '有礼貌',
    titleEn: 'Magic Words',
    emoji: '🙏',
    lines: [
      p('Thank you!', '谢谢你！'),
      p("You're welcome.", '不客气。'),
      p("I'm sorry.", '对不起。'),
      p("That's OK.", '没关系。'),
      p('Excuse me.', '打扰一下。'),
      p('Please help me.', '请帮帮我。'),
    ],
  },
  {
    id: 'inClass',
    title: '老师说',
    titleEn: 'In Class',
    emoji: '🏫',
    lines: [
      p('Stand up, please.', '请起立。'),
      p('Sit down, please.', '请坐下。'),
      p('Look at me.', '看着我。'),
      p('Listen to me.', '听我说。'),
      p('Open your book.', '打开你的书。'),
      p("Let's begin!", '我们开始吧！'),
    ],
  },
  {
    id: 'yesOrNo',
    title: '是和不是',
    titleEn: 'Yes or No',
    emoji: '✅',
    lines: [
      p('Is it a cat?', '它是一只猫吗？'),
      p('Yes, it is.', '是的，它是。'),
      p("No, it isn't.", '不，它不是。'),
      p('Do you like milk?', '你喜欢牛奶吗？'),
      p('Yes, I do.', '是的，我喜欢。'),
      p("No, I don't.", '不，我不喜欢。'),
    ],
  },
]

/**
 * 第二辑：指认身边的东西和人。
 *
 * ⭐ 名词全部取自英语词表（`englishWords.ts`）里她已经学过的那些——
 * 这一辑的新东西是**句子的骨架**，不是新词。
 * 一句里既是新句型又是新词，那就有两样东西要同时猜。
 */
const VOLUME_2_TOPICS: readonly PhraseTopic[] = [
  {
    id: 'whatsThis',
    title: '这是什么',
    titleEn: "What's This",
    emoji: '❓',
    lines: [
      p("What's this?", '这是什么？'),
      p("It's a pencil.", '这是一支铅笔。'),
      p("What's that?", '那是什么？'),
      p("It's a bird.", '那是一只小鸟。'),
      p('Is this your bag?', '这是你的书包吗？'),
      p("Yes, it's my bag.", '是的，这是我的书包。'),
    ],
  },
  {
    id: 'whatColor',
    title: '什么颜色',
    titleEn: 'What Color',
    emoji: '🎨',
    lines: [
      p('What color is it?', '它是什么颜色？'),
      p("It's red.", '它是红色的。'),
      p('I like blue.', '我喜欢蓝色。'),
      p('The sky is blue.', '天空是蓝色的。'),
      p('My bag is yellow.', '我的书包是黄色的。'),
      p('Look at the green tree!', '快看那棵绿色的树！'),
    ],
  },
  {
    id: 'howMany',
    title: '有几个',
    titleEn: 'How Many',
    emoji: '🔢',
    lines: [
      p('How many cats?', '有几只猫？'),
      p('Three cats.', '三只猫。'),
      p('How many apples?', '有几个苹果？'),
      p('I have two apples.', '我有两个苹果。'),
      p("Let's count together.", '我们一起数一数。'),
      p('One, two, three, four, five.', '一、二、三、四、五。'),
    ],
  },
  {
    id: 'myFamily',
    title: '我的家人',
    titleEn: 'My Family',
    emoji: '👨‍👩‍👧',
    lines: [
      p('This is my mom.', '这是我妈妈。'),
      p('This is my dad.', '这是我爸爸。'),
      p('Who is he?', '他是谁？'),
      p('He is my brother.', '他是我哥哥。'),
      p('Who is she?', '她是谁？'),
      p('She is my sister.', '她是我姐姐。'),
    ],
  },
  {
    id: 'iLikeIt',
    title: '我喜欢吃',
    titleEn: 'I Like It',
    emoji: '🍎',
    lines: [
      p('I like apples.', '我喜欢吃苹果。'),
      p("I don't like eggs.", '我不喜欢吃鸡蛋。'),
      p('Do you like bread?', '你喜欢吃面包吗？'),
      p('Yes, please.', '好呀，谢谢。'),
      p('No, thank you.', '不用了，谢谢。'),
      p("It's yummy!", '真好吃！'),
    ],
  },
  {
    id: 'myBody',
    title: '我的身体',
    titleEn: 'My Body',
    emoji: '🖐️',
    lines: [
      p('Touch your nose.', '摸摸你的鼻子。'),
      p('Touch your ears.', '摸摸你的耳朵。'),
      p('Clap your hands.', '拍拍手。'),
      p('Wash your hands.', '洗洗手。'),
      p('Open your eyes.', '睁开眼睛。'),
      p('This is my face.', '这是我的脸。'),
    ],
  },
]

/**
 * 第三辑：一天里的话。
 *
 * 句子长了一点，但骨架还是前两辑那几个（`It's …` / `I'm …` / `Can you …?`）——
 * 长度上的台阶要小，**新的是场景，不是语法**。
 */
const VOLUME_3_TOPICS: readonly PhraseTopic[] = [
  {
    id: 'iCanDoIt',
    title: '我会做',
    titleEn: 'I Can Do It',
    emoji: '💪',
    lines: [
      p('Can you swim?', '你会游泳吗？'),
      p('Yes, I can.', '会呀，我会。'),
      p("No, I can't.", '不，我还不会。'),
      p('I can run fast.', '我跑得很快。'),
      p('Can you help me?', '你能帮帮我吗？'),
      p("Let's try again!", '我们再试一次！'),
    ],
  },
  {
    id: 'whereIsIt',
    title: '在哪里',
    titleEn: 'Where Is It',
    emoji: '📍',
    lines: [
      p('Where is my bag?', '我的书包在哪里？'),
      p("It's on the desk.", '在桌子上。'),
      p("It's in the box.", '在盒子里。'),
      p("It's under the chair.", '在椅子下面。'),
      p('Here it is!', '在这儿呢！'),
      p('Thank you very much!', '太谢谢你啦！'),
    ],
  },
  {
    id: 'theWeather',
    title: '今天天气',
    titleEn: 'The Weather',
    emoji: '☀️',
    lines: [
      p("How's the weather?", '今天天气怎么样？'),
      p("It's sunny.", '今天是晴天。'),
      p("It's rainy.", '今天下雨。'),
      p("It's windy.", '今天有风。'),
      p("It's hot today.", '今天很热。'),
      p("It's cold today.", '今天很冷。'),
    ],
  },
  {
    id: 'howIFeel',
    title: '我的心情',
    titleEn: 'How I Feel',
    emoji: '🙂',
    lines: [
      p("I'm happy.", '我很开心。'),
      p("I'm sad.", '我有点难过。'),
      p("I'm hungry.", '我饿了。'),
      p("I'm thirsty.", '我渴了。'),
      p('Are you tired?', '你累了吗？'),
      p("Yes, I'm tired.", '是的，我累了。'),
    ],
  },
  {
    id: 'atHome',
    title: '在家里',
    titleEn: 'At Home',
    emoji: '🏠',
    lines: [
      p('Good morning, Mom!', '早上好，妈妈！'),
      p("It's time to get up.", '该起床啦。'),
      p("Let's have breakfast.", '我们吃早饭吧。'),
      p("I'm going to school.", '我去上学啦。'),
      p("I'm home!", '我回来啦！'),
      p('Good night, Dad.', '晚安，爸爸。'),
    ],
  },
  {
    id: 'letsPlay',
    title: '一起玩',
    titleEn: "Let's Play",
    emoji: '🧸',
    lines: [
      p("Let's play together!", '我们一起玩吧！'),
      p('Come with me.', '跟我来。'),
      p("It's your turn.", '轮到你啦。'),
      p("It's my turn.", '轮到我啦。'),
      p("That's fun!", '真好玩！'),
      p('Great job!', '做得真棒！'),
    ],
  },
]

/**
 * 全部话题，按辑。
 *
 * ⚠️ 加内容 = 往这个数组后面追加一辑，或往某一辑的 `topics` 末尾追加一个话题。
 * ⛔ 不重排辑、不重排辑内顺序——她记的是「打招呼在第一个」这种位置。
 */
export const PHRASE_VOLUMES: readonly PhraseVolume[] = [
  {
    id: 'vol1',
    name: '第一辑',
    badge: '1',
    hint: '见面就说得出的话',
    topics: VOLUME_1_TOPICS,
  },
  {
    id: 'vol2',
    name: '第二辑',
    badge: '2',
    hint: '指认身边的东西和人',
    topics: VOLUME_2_TOPICS,
  },
  {
    id: 'vol3',
    name: '第三辑',
    badge: '3',
    hint: '一天里用得上的话',
    topics: VOLUME_3_TOPICS,
  },
]

/** 全部话题，摊平。语音清单、测试与查找用 */
export const ALL_PHRASE_TOPICS: readonly PhraseTopic[] = PHRASE_VOLUMES.flatMap((v) => v.topics)

/**
 * 按 ID 找一个话题。
 *
 * @param id - 话题 ID
 * @returns 找到的话题；ID 不存在（乱输 hash）时返回 `undefined`
 *
 * @example
 * phraseTopicById('greetings')?.title   // '打招呼'
 * phraseTopicById('nope')               // undefined
 */
export function phraseTopicById(id: string): PhraseTopic | undefined {
  return ALL_PHRASE_TOPICS.find((topic) => topic.id === id)
}
