/**
 * @file 英语词表 —— 每个知识点出题用哪些词、念什么、显示成什么图
 * @layer data  静态内容，随 App 版本内置，备份时不导出
 * @see design/01-知识点图谱.md §5 英语（English）
 * @see src/domain/english.ts          词条类型与片段 key 规则
 * @see src/data/seed/englishLetters.ts 字母（E10）
 *
 * ## ⭐ 为什么图形面是 emoji
 *
 * 英语题只有一种考法站得住：**听英文 → 选图**。
 * 孩子一个英文字母都不认识，看字选、拼写、跟读都有额外门槛，
 * 只有「听到一串声音、指出那个东西」是纯粹在考英语本身。
 *
 * 而本项目没有任何美术资源（宠物都是手绘 SVG），115 个词不可能配 115 张图。
 * emoji 恰好解决这件事：iPad 上是彩色矢量、放多大都不糊、离线自带，
 * 而且 `🍎` 表达「苹果」比自绘图标更准确。这让英语成为三科中**内容成本最低**的一科。
 *
 * ## 挑 emoji 的两条规矩
 *
 * 1. **组内绝不重复** —— 同一道题的四个选项若有两个长得一样，
 *    孩子点哪个都说不清对错。由 `englishWords.test.ts` 强制校验。
 * 2. **宁可换词也不用勉强的图** —— 认不出的 emoji 会把「听力题」变成「猜谜题」，
 *    诊断数据也跟着失真。`desk` 找不到干净的 emoji（🪑 已给 chair），直接不收。
 */

import { LETTERS, lettersFrom } from '@/data/seed/englishLetters'
import type { EnglishWord } from '@/domain/english'

/**
 * 构造一个词条。
 *
 * @param id - 片段 key 的标识部分，ASCII camelCase
 * @param en - 英文原文，喂给 TTS 的文本
 * @param zh - 中文释义，显示在图形面下方的小字
 * @param face - 选项上显示的 emoji / 数字 / 字母
 * @param family - 同族标记，见 {@link EnglishWord.family}
 */
const w = (
  id: string,
  en: string,
  zh: string,
  face: string,
  family?: string,
): EnglishWord => ({ id, en, zh, face, ...(family === undefined ? {} : { family }) })

// ── E1 问候与日常用语 ────────────────────────────────────────────────
// ⚠️ 这三组是全表**唯一没有实物可指**的词。emoji 只能表达场景（🌅 = 早上），
// 所以中文小字在这里不是辅助而是主要信息——孩子多半认得「你好」「谢谢」，
// 认不得的也能点一下听中文。

const GREETINGS: readonly EnglishWord[] = [
  w('hello', 'Hello!', '你好', '🙋'),
  w('goodMorning', 'Good morning!', '早上好', '🌅'),
  w('goodAfternoon', 'Good afternoon!', '下午好', '☀️'),
  w('goodEvening', 'Good evening!', '晚上好', '🌆'),
  w('goodNight', 'Good night!', '晚安', '🌙'),
  w('goodbye', 'Goodbye!', '再见', '👋'),
]

const SELF_INTRO: readonly EnglishWord[] = [
  w('howAreYou', 'How are you?', '你好吗', '😊'),
  w('imFine', "I'm fine.", '我很好', '👍'),
  w('whatsYourName', "What's your name?", '你叫什么名字', '❓'),
  w('myNameIs', 'My name is Anna.', '我叫安娜', '🪪'),
  w('niceToMeetYou', 'Nice to meet you!', '很高兴认识你', '🤝'),
]

const POLITE_WORDS: readonly EnglishWord[] = [
  w('thankYou', 'Thank you!', '谢谢', '🙏'),
  w('sorry', "I'm sorry.", '对不起', '😔'),
  w('please', 'Please.', '请', '🥺'),
  w('youreWelcome', "You're welcome!", '不客气', '🤗'),
  w('excuseMe', 'Excuse me.', '打扰一下', '🚶'),
]

// ── E2 数字 ──────────────────────────────────────────────────────────
// 图形面用阿拉伯数字而不是 emoji 数字键（1️⃣）：孩子早就认识 1~20 这些符号，
// 而且与数学题的字形保持一致——同一个「7」在两个科目里长得不一样是没道理的。

const NUMBERS_1_10: readonly EnglishWord[] = [
  w('one', 'One', '一', '1', 'digit'),
  w('two', 'Two', '二', '2', 'digit'),
  w('three', 'Three', '三', '3', 'digit'),
  w('four', 'Four', '四', '4', 'digit'),
  w('five', 'Five', '五', '5', 'digit'),
  w('six', 'Six', '六', '6', 'digit'),
  w('seven', 'Seven', '七', '7', 'digit'),
  w('eight', 'Eight', '八', '8', 'digit'),
  w('nine', 'Nine', '九', '9', 'digit'),
  w('ten', 'Ten', '十', '10', 'digit'),
]

/**
 * 11~20。
 *
 * ⭐ 这一组是英语启蒙最容易出错的地方，误区 `number_teen_ty` 就为它而设：
 * `fourteen` 与 `four` 只差一个轻读的词尾，孩子听 `fourteen` 选 `4` 是常态。
 * 干扰项因此**必须**把对应的个位数摆进来（见 `confusableEnglish.ts`），
 * 否则这个知识点等于没考。
 */
const NUMBERS_11_20: readonly EnglishWord[] = [
  w('eleven', 'Eleven', '十一', '11', 'teen'),
  w('twelve', 'Twelve', '十二', '12', 'teen'),
  w('thirteen', 'Thirteen', '十三', '13', 'teen'),
  w('fourteen', 'Fourteen', '十四', '14', 'teen'),
  w('fifteen', 'Fifteen', '十五', '15', 'teen'),
  w('sixteen', 'Sixteen', '十六', '16', 'teen'),
  w('seventeen', 'Seventeen', '十七', '17', 'teen'),
  w('eighteen', 'Eighteen', '十八', '18', 'teen'),
  w('nineteen', 'Nineteen', '十九', '19', 'teen'),
  w('twenty', 'Twenty', '二十', '20', 'teen'),
]

/**
 * E2.3「数量 + 名词」。
 *
 * ⭐ 同一个名词配不同数量（🍎🍎 / 🍎🍎🍎 / …），这是刻意的：
 * 如果四个选项是「三个苹果 / 两只猫 / 四只鸭」，孩子听见 `apples` 就选中了，
 * 数字根本没参与。同族里数量是**唯一的变量**，才逼她听清 two 还是three。
 * `family` 就是为这条规则存在的——生成器优先从同族取干扰项。
 */
const COUNTED_THINGS: readonly EnglishWord[] = [
  w('twoApples', 'Two apples.', '两个苹果', '🍎🍎', 'apples'),
  w('threeApples', 'Three apples.', '三个苹果', '🍎🍎🍎', 'apples'),
  w('fourApples', 'Four apples.', '四个苹果', '🍎🍎🍎🍎', 'apples'),
  w('fiveApples', 'Five apples.', '五个苹果', '🍎🍎🍎🍎🍎', 'apples'),
  w('twoCats', 'Two cats.', '两只猫', '🐱🐱', 'cats'),
  w('threeCats', 'Three cats.', '三只猫', '🐱🐱🐱', 'cats'),
  w('fourCats', 'Four cats.', '四只猫', '🐱🐱🐱🐱', 'cats'),
  w('fiveCats', 'Five cats.', '五只猫', '🐱🐱🐱🐱🐱', 'cats'),
]

// ── E3 颜色 ──────────────────────────────────────────────────────────
// 用纯色方块而不是有颜色的实物（🍎 代表红）：实物会引入「这是苹果还是红色」的歧义，
// 而色块只表达颜色本身。

const BASIC_COLORS: readonly EnglishWord[] = [
  w('red', 'Red', '红色', '🟥', 'color'),
  w('blue', 'Blue', '蓝色', '🟦', 'color'),
  w('yellow', 'Yellow', '黄色', '🟨', 'color'),
  w('green', 'Green', '绿色', '🟩', 'color'),
  w('black', 'Black', '黑色', '⬛', 'color'),
  w('white', 'White', '白色', '⬜', 'color'),
]

const MORE_COLORS: readonly EnglishWord[] = [
  // ⚠️ 与水果 orange 是两个词条：图形面不同（🟧 色块 vs 🍊 橘子），
  //    而一个词条只能有一个图形面。多出来的那条音频（同样念 orange）是可接受的代价。
  w('orangeColor', 'Orange', '橙色', '🟧', 'color'),
  w('pink', 'Pink', '粉色', '🩷', 'color'),
  w('purple', 'Purple', '紫色', '🟪', 'color'),
  w('brown', 'Brown', '棕色', '🟫', 'color'),
  w('grey', 'Grey', '灰色', '🩶', 'color'),
]

// ── E4 动物 ──────────────────────────────────────────────────────────

const PETS: readonly EnglishWord[] = [
  w('cat', 'Cat', '猫', '🐱', 'animal'),
  w('dog', 'Dog', '狗', '🐶', 'animal'),
  w('bird', 'Bird', '鸟', '🐦', 'animal'),
  w('fish', 'Fish', '鱼', '🐟', 'animal'),
  w('rabbit', 'Rabbit', '兔子', '🐰', 'animal'),
]

const FARM_ANIMALS: readonly EnglishWord[] = [
  w('cow', 'Cow', '奶牛', '🐮', 'animal'),
  w('pig', 'Pig', '猪', '🐷', 'animal'),
  w('duck', 'Duck', '鸭子', '🦆', 'animal'),
  w('chicken', 'Chicken', '小鸡', '🐔', 'animal'),
  w('horse', 'Horse', '马', '🐴', 'animal'),
  w('sheep', 'Sheep', '绵羊', '🐑', 'animal'),
]

const WILD_ANIMALS: readonly EnglishWord[] = [
  w('lion', 'Lion', '狮子', '🦁', 'animal'),
  w('tiger', 'Tiger', '老虎', '🐯', 'animal'),
  w('elephant', 'Elephant', '大象', '🐘', 'animal'),
  w('monkey', 'Monkey', '猴子', '🐵', 'animal'),
  w('panda', 'Panda', '熊猫', '🐼', 'animal'),
  w('bear', 'Bear', '熊', '🐻', 'animal'),
  w('giraffe', 'Giraffe', '长颈鹿', '🦒', 'animal'),
  w('zebra', 'Zebra', '斑马', '🦓', 'animal'),
]

// ── E5 食物与水果 ────────────────────────────────────────────────────

const FRUITS: readonly EnglishWord[] = [
  w('apple', 'Apple', '苹果', '🍎', 'food'),
  w('banana', 'Banana', '香蕉', '🍌', 'food'),
  w('orangeFruit', 'Orange', '橘子', '🍊', 'food'),
  w('pear', 'Pear', '梨', '🍐', 'food'),
  w('grape', 'Grape', '葡萄', '🍇', 'food'),
  w('watermelon', 'Watermelon', '西瓜', '🍉', 'food'),
  w('strawberry', 'Strawberry', '草莓', '🍓', 'food'),
]

const FOODS: readonly EnglishWord[] = [
  w('bread', 'Bread', '面包', '🍞', 'food'),
  w('rice', 'Rice', '米饭', '🍚', 'food'),
  w('noodles', 'Noodles', '面条', '🍜', 'food'),
  w('egg', 'Egg', '鸡蛋', '🥚', 'food'),
  w('cake', 'Cake', '蛋糕', '🍰', 'food'),
  w('milk', 'Milk', '牛奶', '🥛', 'food'),
  w('water', 'Water', '水', '💧', 'food'),
  w('juice', 'Juice', '果汁', '🧃', 'food'),
]

// ── E6 身体部位 ──────────────────────────────────────────────────────

const FACE_PARTS: readonly EnglishWord[] = [
  w('eye', 'Eye', '眼睛', '👁️', 'body'),
  w('ear', 'Ear', '耳朵', '👂', 'body'),
  w('nose', 'Nose', '鼻子', '👃', 'body'),
  w('mouth', 'Mouth', '嘴巴', '👄', 'body'),
  w('face', 'Face', '脸', '😀', 'body'),
]

const BODY_PARTS: readonly EnglishWord[] = [
  // head 没有干净的 emoji（🧠 是大脑、😀 已给 face），用人形剪影 + 中文小字表达
  w('head', 'Head', '头', '👤', 'body'),
  w('hand', 'Hand', '手', '✋', 'body'),
  w('arm', 'Arm', '胳膊', '💪', 'body'),
  w('leg', 'Leg', '腿', '🦵', 'body'),
  w('foot', 'Foot', '脚', '🦶', 'body'),
]

// ── E7 家庭成员 ──────────────────────────────────────────────────────

const FAMILY: readonly EnglishWord[] = [
  w('dad', 'Dad', '爸爸', '👨', 'family'),
  w('mom', 'Mom', '妈妈', '👩', 'family'),
  w('brother', 'Brother', '哥哥', '👦', 'family'),
  w('sister', 'Sister', '姐姐', '👧', 'family'),
  w('grandpa', 'Grandpa', '爷爷', '👴', 'family'),
  w('grandma', 'Grandma', '奶奶', '👵', 'family'),
  w('me', 'Me', '我', '🧒', 'family'),
]

// ── E8 学习用品 ──────────────────────────────────────────────────────

const SCHOOL_THINGS: readonly EnglishWord[] = [
  w('pen', 'Pen', '钢笔', '🖊️', 'school'),
  w('pencil', 'Pencil', '铅笔', '✏️', 'school'),
  w('book', 'Book', '书', '📖', 'school'),
  w('bag', 'Bag', '书包', '🎒', 'school'),
  w('ruler', 'Ruler', '尺子', '📏', 'school'),
  w('eraser', 'Eraser', '橡皮', '🧽', 'school'),
  w('crayon', 'Crayon', '蜡笔', '🖍️', 'school'),
  w('chair', 'Chair', '椅子', '🪑', 'school'),
]

// ── E9 简单句型 ──────────────────────────────────────────────────────
// 句子与单词共用同一套结构和同一个生成器：对孩子来说两者都是
// 「听到一串声音，选出对应的图」，区别只在这串声音长一点。
// 关键词落在句尾（It's a **cat**），所以听不到头也能做——这正是句型题该练的。

const WHATS_THIS: readonly EnglishWord[] = [
  w('itsACat', "What's this? It's a cat.", '这是一只猫', '🐱', 'animal'),
  w('itsADog', "What's this? It's a dog.", '这是一只狗', '🐶', 'animal'),
  w('itsABird', "What's this? It's a bird.", '这是一只鸟', '🐦', 'animal'),
  w('itsAFish', "What's this? It's a fish.", '这是一条鱼', '🐟', 'animal'),
  w('itsARabbit', "What's this? It's a rabbit.", '这是一只兔子', '🐰', 'animal'),
]

const I_LIKE: readonly EnglishWord[] = [
  w('iLikeApples', 'I like apples.', '我喜欢苹果', '🍎', 'food'),
  w('iLikeBananas', 'I like bananas.', '我喜欢香蕉', '🍌', 'food'),
  w('iLikeOranges', 'I like oranges.', '我喜欢橘子', '🍊', 'food'),
  w('iLikeGrapes', 'I like grapes.', '我喜欢葡萄', '🍇', 'food'),
  w('iLikeStrawberries', 'I like strawberries.', '我喜欢草莓', '🍓', 'food'),
]

const ITS_COLOR: readonly EnglishWord[] = [
  w('itsRed', "It's red.", '它是红色的', '🟥', 'color'),
  w('itsBlue', "It's blue.", '它是蓝色的', '🟦', 'color'),
  w('itsYellow', "It's yellow.", '它是黄色的', '🟨', 'color'),
  w('itsGreen', "It's green.", '它是绿色的', '🟩', 'color'),
]

/** E9.4 全部用 dogs，让数字成为唯一变量——理由同 {@link COUNTED_THINGS} */
const HOW_MANY: readonly EnglishWord[] = [
  w('howManyDogsTwo', 'How many dogs? Two.', '两只狗', '🐶🐶', 'dogs'),
  w('howManyDogsThree', 'How many dogs? Three.', '三只狗', '🐶🐶🐶', 'dogs'),
  w('howManyDogsFour', 'How many dogs? Four.', '四只狗', '🐶🐶🐶🐶', 'dogs'),
  w('howManyDogsFive', 'How many dogs? Five.', '五只狗', '🐶🐶🐶🐶🐶', 'dogs'),
]

/**
 * 知识点 → 出题词组。
 *
 * ⚠️ 覆盖 30 个英语知识点中的 27 个。未列出的三个都需要新题型，等各自的组件就位：
 * - `E1.6` 大小写配对 → `drag_match`（现有组件只支持数字配对）
 * - `E1.7` 字母歌 → 需要整首歌的音频
 * - `E1.9` 首字母对应单词 → 题干播单词、选项是字母，
 *   而现在的生成器题干与答案取自同一个词条
 *
 * 缺模板的知识点调度器会自动跳过（见 `buildSessionItems`），不会排出无法组装的题。
 */
export const ENGLISH_WORDS_BY_KP: Readonly<Record<string, readonly EnglishWord[]>> = {
  // ⭐ E1 字母是零基础的起点，排在最前，见 englishKnowledgePoints.ts 的说明
  'E1.1': lettersFrom('A', 'E'),
  'E1.2': lettersFrom('F', 'J'),
  'E1.3': lettersFrom('K', 'O'),
  'E1.4': lettersFrom('P', 'T'),
  'E1.5': lettersFrom('U', 'Z'),
  // 听音辨字母：范围是全部 26 个，难度正来自「候选池是整张字母表」
  'E1.8': LETTERS,

  'E2.1': PETS,
  'E2.2': FARM_ANIMALS,
  'E2.3': WILD_ANIMALS,

  'E3.1': FRUITS,
  'E3.2': FOODS,

  'E4.1': BASIC_COLORS,
  'E4.2': MORE_COLORS,

  'E5.1': NUMBERS_1_10,
  'E5.2': NUMBERS_11_20,
  'E5.3': COUNTED_THINGS,

  'E6.1': FACE_PARTS,
  'E6.2': BODY_PARTS,
  'E7.1': FAMILY,
  'E8.1': SCHOOL_THINGS,

  'E9.1': GREETINGS,
  'E9.2': SELF_INTRO,
  'E9.3': POLITE_WORDS,

  'E10.1': WHATS_THIS,
  'E10.2': I_LIKE,
  'E10.3': ITS_COLOR,
  'E10.4': HOW_MANY,
}

/**
 * 全部词条，按 id 去重。语音清单与生成脚本读它。
 *
 * 去重是因为字母在 E10.1~E10.5 和 E10.8 里出现了两次——
 * 同一个词条对象，不该生成两份音频。
 */
export const ALL_ENGLISH_WORDS: readonly EnglishWord[] = [
  ...new Map(
    Object.values(ENGLISH_WORDS_BY_KP)
      .flat()
      .map((word) => [word.id, word] as const),
  ).values(),
]
