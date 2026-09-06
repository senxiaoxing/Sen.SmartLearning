/**
 * @file 英语词汇 180 —— 一年级要认的 180 个词，分 3 辑 × 6 组
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/englishCard.ts  类型与 key 规则（朗读文本怎么拼在那边）
 * @see src/features/english/WordWall.tsx  这面墙
 * @see src/data/seed/hanziCards.ts  识字 300，这一块处处对标它
 *
 * ## 它是英语区的「识字墙」
 *
 * 字母乐园认的是**字形**（26 个，学完就是学完），这面墙认的是**词**。
 * 与识字墙一样，它是「有边界、可数、摆得满一屏」的收集墙，
 * 而且同样是「教」不是「练」：全部可点、没有对错判定、随时可走。
 * ⛔ 不出题、不落 attempts、不记 mastery、不给积分、不影响宠物经验。
 *
 * ## 选词依据
 *
 * 骨架取自**剑桥少儿英语 Starters（Pre A1）词表**——那是全球通行的
 * 零起点英语词表，官方发布、覆盖 pre-A1 的全部话题；
 * 分组与顺序参考《牛津少儿英语 Let's Go》1~2 册的单元编排。
 *
 * ⚠️ 但**分组一律按孩子能指得出来的东西**，不按教材单元。理由与识字墙完全一致：
 * 这一页是先于入学玩的，按课次对还没上学的孩子没有意义，
 * 按「这些是动物」「这些能吃」「这些是我做的事」才有。
 *
 * 三辑的难度差别不在词的长短，而在**能不能画出来**：
 *
 * | 辑 | 装的是什么 | 配图 |
 * |---|---|---|
 * | 第一辑 | 看得见、指得着的东西（动物、水果、颜色、数字） | 几乎全有 |
 * | 第二辑 | 她身边的人、地方和物件（家人、身体、学校、家里、衣服、玩具） | 几乎全有 |
 * | 第三辑 | 动作、心情、大小快慢、一天里的事 | 形容词那组几乎全空 |
 *
 * ## ⚠️ 例句不是装饰，是朗读的一部分
 *
 * 每个词念出来是「Apple. A red apple.」——例句嵌在后半句。所以 `example` 必须：
 *
 * 1. **真的含有那个词**（允许复数、第三人称等词形变化），
 *    否则念出来是「Apple. I like bananas.」。由 `englishWordCards.test.ts` 逐张校验
 * 2. **短** —— 三到五个词。她听的是这个词怎么用，不是一段话
 * 3. **用她见过的词** —— 例句里的其他词尽量出自这张表、Dolch 高频词
 *    或她天天听的词
 *
 * ## ⛔ 同形异音词一律不收
 *
 * 这是中文那边「多音字一律改写」的英语版，但**手段更少**：中文可以换个同音字
 * 喂给 TTS（「曲项」→「屈项」），英语没有这条路——`read` 就是 `read`，
 * 念 /riːd/ 还是 /red/ 全看 TTS 的心情，而卡片的前半句正是**孤立的那个词**，
 * 上下文一个都没有。
 *
 * 孩子第一次听到的音会跟着她很久，所以宁可不收：
 *
 * ```
 * ⛔ read · live · wind · bow · tear · row · use   ——  一律不收
 * ✅ close                                        ——  收，见下
 * ```
 *
 * `close` 是唯一的例外：它的动词义（/kloʊz/ 关上）在孤立朗读时压倒性胜出，
 * 而形容词义（/kloʊs/ 近）这个年纪根本不教，例句「Close the door.」
 * 还会再锁一次。⚠️ 但它仍是**这 180 个里唯一需要人耳确认的一条**，
 * 换英语音色后要重听。
 *
 * ⚠️ `read` 被 `climb` 顶掉了，别看着「怎么没有 read」就顺手加回来。
 *
 * ## emoji 宁缺毋滥，但留空的代价比识字小
 *
 * 与识字卡、英语词表同一条规矩：**认不出的图会把认词变成猜谜**。
 * `big` `new` `fast` 这类词没有干净的图，一律留空——
 * 第三辑第四组几乎整组是空的，那是**内容本身的性质**，不是没配完。
 *
 * ⭐ 留空在这里比在识字墙上安全：卡上还有**中文释义**顶着。
 * 汉字本身带着意义，一串英文字母不带——这也正是中文释义在这张卡上不可省的原因。
 *
 * ⚠️ 同图撞车由测试拦，**形近撞车拦不住**：`doll` 一度想用 🧸，
 * 但那是泰迪熊，与 `bear` 的 🐻 摆在同一面墙上她分不清，最后换成了 `drum` 🥁。
 * 挑图时要自己想清楚。
 *
 * ## ⚠️ 加内容 = 追加第四辑
 *
 * ⛔ 不重排辑、不重排辑内顺序，也不把新词接在现有组后面——
 * 她记的是「动物在第一组」这种位置，理由与识字分辑完全一致。
 * 加辑之后要同步改三处数量断言：`englishWordCards.test.ts` ·
 * `scripts/generate-voices.mjs` 的 `EXPECTED_WORDCARD_COUNT` ·
 * design/07 §3.5b 的条数，然后 `npm run voices`。
 */

import type { EnglishCard, EnglishCardGroup, EnglishCardVolume } from '@/domain/englishCard'

/** 组内一个词的原始声明。`groupId` 由 {@link WORD_VOLUMES} 组装时补上 */
type CardSpec = Omit<EnglishCard, 'groupId'>

/** 一组的原始声明。`cards` 里的 `groupId` 同样由组装时补上 */
interface GroupSpec {
  id: string
  name: string
  emoji: string
  cards: readonly CardSpec[]
}

/**
 * 声明一个词。
 *
 * ⚠️ 参数顺序固定为「词, 中文, 例句, 图」——`scripts/generate-voices.mjs`
 * 的 `loadWordCards()` 按这个顺序用正则扫，调换参数会让音频**静默地念错**。
 * 那个正则还锚定行首，所以每次调用必须**独占一行**。
 */
function w(word: string, zh: string, example: string, emoji = ''): CardSpec {
  return { word, zh, example, emoji }
}

/**
 * 第一辑：看得见、指得着的东西。
 *
 * 全部是名词，且每一个都配得出一眼认得的图——这一辑她可以完全靠图学，
 * 中文释义只是确认。
 */
const VOLUME_1_GROUPS: readonly GroupSpec[] = [
  {
    id: 'animals',
    name: '小动物',
    emoji: '🐾',
    cards: [
      w('cat', '猫', 'A little cat.', '🐱'),
      w('dog', '狗', 'A big dog.', '🐶'),
      w('bird', '小鸟', 'The bird sings.', '🐦'),
      w('fish', '鱼', 'A fish in the water.', '🐟'),
      w('rabbit', '兔子', 'A white rabbit.', '🐰'),
      w('duck', '鸭子', 'A yellow duck.', '🦆'),
      w('pig', '猪', 'A pink pig.', '🐷'),
      w('cow', '奶牛', 'The cow is big.', '🐮'),
      w('horse', '马', 'A brown horse.', '🐴'),
      w('sheep', '绵羊', 'The sheep is white.', '🐑'),
    ],
  },
  {
    id: 'zooanimals',
    name: '动物园',
    emoji: '🦁',
    cards: [
      w('lion', '狮子', 'The lion is strong.', '🦁'),
      w('tiger', '老虎', 'The tiger runs fast.', '🐯'),
      w('elephant', '大象', 'An elephant is very big.', '🐘'),
      w('monkey', '猴子', 'The monkey can jump.', '🐵'),
      w('panda', '熊猫', 'A panda eats bamboo.', '🐼'),
      w('bear', '熊', 'A big brown bear.', '🐻'),
      w('giraffe', '长颈鹿', 'The giraffe is tall.', '🦒'),
      w('zebra', '斑马', 'A zebra has stripes.', '🦓'),
      w('frog', '青蛙', 'A little green frog.', '🐸'),
      w('bee', '蜜蜂', 'The bee likes flowers.', '🐝'),
    ],
  },
  {
    id: 'fruit',
    name: '水果',
    emoji: '🍏',
    cards: [
      w('apple', '苹果', 'A red apple.', '🍎'),
      w('banana', '香蕉', 'I like bananas.', '🍌'),
      w('orange', '橘子', 'An orange is round.', '🍊'),
      w('pear', '梨', 'A green pear.', '🍐'),
      w('grape', '葡萄', 'Grapes are purple.', '🍇'),
      w('watermelon', '西瓜', 'A big watermelon.', '🍉'),
      w('strawberry', '草莓', 'Little red strawberries.', '🍓'),
      w('lemon', '柠檬', 'A yellow lemon.', '🍋'),
      w('peach', '桃子', 'A sweet peach.', '🍑'),
      w('mango', '芒果', 'I like mangoes.', '🥭'),
    ],
  },
  {
    id: 'food',
    name: '吃的喝的',
    emoji: '🍽',
    cards: [
      w('bread', '面包', 'I eat bread.', '🍞'),
      w('rice', '米饭', 'I like rice.', '🍚'),
      w('egg', '鸡蛋', 'One white egg.', '🥚'),
      w('cake', '蛋糕', 'A birthday cake.', '🍰'),
      w('milk', '牛奶', 'I drink milk.', '🥛'),
      w('water', '水', 'A glass of water.', '💧'),
      w('juice', '果汁', 'Orange juice.', '🧃'),
      w('noodles', '面条', 'Hot noodles.', '🍜'),
      w('candy', '糖果', 'I like candy.', '🍬'),
      w('cheese', '奶酪', 'Yellow cheese.', '🧀'),
    ],
  },
  {
    id: 'colors',
    name: '颜色',
    emoji: '🎨',
    cards: [
      w('red', '红色', 'My red bag.', '🟥'),
      w('blue', '蓝色', 'The sky is blue.', '🟦'),
      w('yellow', '黄色', 'The sun is yellow.', '🟨'),
      w('green', '绿色', 'A green tree.', '🟩'),
      w('purple', '紫色', 'A purple flower.', '🟪'),
      w('brown', '棕色', 'Brown shoes.', '🟫'),
      w('black', '黑色', 'A black cat.', '⬛'),
      w('white', '白色', 'My white shoes.', '⬜'),
      // ⚠️ 粉色和灰色**没有色块 emoji**（🩷🩶 是 Unicode 15，老系统上是空方框），
      //    所以 pink 只能借一样粉色的东西，grey 干脆不收
      w('pink', '粉色', 'A pink ribbon.', '🎀'),
      w('rainbow', '彩虹', 'A big rainbow.', '🌈'),
    ],
  },
  {
    id: 'numbers',
    name: '数字',
    emoji: '🔢',
    cards: [
      w('one', '一', 'One little cat.', '1️⃣'),
      w('two', '二', 'Two big dogs.', '2️⃣'),
      w('three', '三', 'Three red apples.', '3️⃣'),
      w('four', '四', 'Four yellow ducks.', '4️⃣'),
      w('five', '五', 'Five little birds.', '5️⃣'),
      w('six', '六', 'Six green pears.', '6️⃣'),
      w('seven', '七', 'Seven white eggs.', '7️⃣'),
      w('eight', '八', 'Eight brown bears.', '8️⃣'),
      w('nine', '九', 'Nine little bees.', '9️⃣'),
      w('ten', '十', 'Ten little sheep.', '🔟'),
    ],
  },
]

/**
 * 第二辑：她身边的人、地方和物件。
 *
 * 仍然全是名词、几乎全有图，但从「指得着的东西」扩到了
 * 「她生活里的东西」——家人、身体、学校、家里、衣服、玩具，
 * 正好是她一天里会碰到的六个场景。
 */
const VOLUME_2_GROUPS: readonly GroupSpec[] = [
  {
    id: 'family',
    name: '我的家人',
    emoji: '👨‍👩‍👧',
    cards: [
      w('mom', '妈妈', 'I love my mom.', '👩'),
      w('dad', '爸爸', 'This is my dad.', '👨'),
      w('brother', '哥哥', 'I have a brother.', '👦'),
      w('sister', '姐姐', 'My sister is little.', '👧'),
      w('grandpa', '爷爷', 'Grandpa is old.', '👴'),
      w('grandma', '奶奶', 'I love grandma.', '👵'),
      w('baby', '宝宝', 'A little baby.', '👶'),
      w('family', '家人', 'This is my family.', '👪'),
      w('friend', '朋友', 'You are my friend.', '👫'),
      w('teacher', '老师', 'My teacher is nice.', '👩‍🏫'),
    ],
  },
  {
    id: 'body',
    name: '我的身体',
    emoji: '🖐',
    cards: [
      w('eye', '眼睛', 'Two big eyes.', '👁️'),
      w('ear', '耳朵', 'I have two ears.', '👂'),
      w('nose', '鼻子', 'A little nose.', '👃'),
      w('mouth', '嘴巴', 'Open your mouth.', '👄'),
      w('face', '脸', 'Wash your face.', '🙂'),
      w('hand', '手', 'Clap your hands.', '✋'),
      w('foot', '脚', 'A big foot.', '🦶'),
      w('arm', '胳膊', 'My arm is long.', '💪'),
      w('leg', '腿', 'Two long legs.', '🦵'),
      // ⚠️ head 不用笑脸：`face` 已经是 🙂，两张脸摆在一起她分不出是两个词
      w('head', '头', 'Touch your head.', '👤'),
    ],
  },
  {
    id: 'school',
    name: '在学校',
    emoji: '🏫',
    cards: [
      w('school', '学校', 'I go to school.', '🏫'),
      w('book', '书', 'A new book.', '📕'),
      w('pen', '钢笔', 'A blue pen.', '🖊️'),
      w('pencil', '铅笔', 'A long pencil.', '✏️'),
      w('bag', '书包', 'My school bag.', '🎒'),
      w('ruler', '尺子', 'A yellow ruler.', '📏'),
      w('eraser', '橡皮', 'A little eraser.', '🧽'),
      w('crayon', '蜡笔', 'Six crayons.', '🖍️'),
      w('chair', '椅子', 'Sit on the chair.', '🪑'),
      w('clock', '钟', 'Look at the clock.', '🕐'),
    ],
  },
  {
    id: 'home',
    name: '在家里',
    emoji: '🏡',
    cards: [
      w('house', '房子', 'My house is here.', '🏠'),
      w('door', '门', 'Open the door.', '🚪'),
      w('bed', '床', 'My little bed.', '🛏️'),
      w('cup', '杯子', 'A cup of milk.', '☕'),
      w('spoon', '勺子', 'A small spoon.', '🥄'),
      w('key', '钥匙', 'Where is my key?', '🔑'),
      w('box', '盒子', 'A big box.', '📦'),
      w('phone', '电话', 'A new phone.', '📱'),
      w('TV', '电视', 'Watch TV.', '📺'),
      w('light', '灯', 'The light is on.', '💡'),
    ],
  },
  {
    id: 'clothes',
    name: '穿的',
    emoji: '👚',
    cards: [
      w('shirt', '衬衫', 'A blue shirt.', '👕'),
      w('coat', '外套', 'A warm coat.', '🧥'),
      w('shoes', '鞋', 'New shoes.', '👟'),
      w('socks', '袜子', 'Red socks.', '🧦'),
      w('hat', '帽子', 'A big hat.', '👒'),
      w('dress', '裙子', 'A pretty dress.', '👗'),
      w('pants', '裤子', 'Long pants.', '👖'),
      w('glasses', '眼镜', 'Black glasses.', '👓'),
      w('umbrella', '雨伞', 'Take an umbrella.', '☂️'),
      w('scarf', '围巾', 'A long scarf.', '🧣'),
    ],
  },
  {
    id: 'toys',
    name: '玩的',
    emoji: '🧸',
    cards: [
      w('ball', '球', 'Play with the ball.', '⚽'),
      w('kite', '风筝', 'Fly a kite.', '🪁'),
      w('drum', '鼓', 'Play the drum.', '🥁'),
      w('car', '小汽车', 'My little car.', '🚗'),
      w('bike', '自行车', 'Ride a bike.', '🚲'),
      w('train', '火车', 'The train is here.', '🚂'),
      w('plane', '飞机', 'The plane can fly.', '✈️'),
      w('boat', '船', 'A little boat.', '⛵'),
      w('balloon', '气球', 'A big balloon.', '🎈'),
      w('robot', '机器人', 'A new robot.', '🤖'),
    ],
  },
]

/**
 * 第三辑：她做的事和她的感觉。
 *
 * ⭐ 这一辑才是真正的台阶：前两辑全是名词（指着就能懂），
 * 这里出现动词、形容词和时间词——**它们大多指不出来**。
 * 所以第四组（大和小）几乎整组没有图，靠中文释义和例句立住，
 * 与识字第三辑方位虚词整组留空是同一回事。
 */
const VOLUME_3_GROUPS: readonly GroupSpec[] = [
  {
    id: 'actions',
    name: '我会做',
    emoji: '🏃',
    cards: [
      w('run', '跑', 'I can run fast.', '🏃'),
      w('jump', '跳', 'Jump up high.', '🤸'),
      w('walk', '走', 'Walk to school.', '🚶'),
      w('swim', '游泳', 'I like to swim.', '🏊'),
      w('fly', '飞', 'Birds can fly.', '🕊️'),
      w('sing', '唱歌', 'Sing a song.', '🎤'),
      w('dance', '跳舞', 'Let us dance.', '💃'),
      w('draw', '画画', 'Draw a cat.', '🎨'),
      // ⚠️ 这一格本来是 read，被换掉了：read 有两个读音而卡片前半句
      //    正是孤立的那个词，赌不起。见文件头
      w('climb', '爬', 'Climb a tree.', '🧗'),
      w('write', '写', 'Write your name.', '✍️'),
    ],
  },
  {
    id: 'everyday',
    name: '每天做的事',
    emoji: '🌞',
    cards: [
      w('eat', '吃', 'Eat an apple.', '🍴'),
      w('drink', '喝', 'Drink some water.', '🥤'),
      w('sleep', '睡觉', 'Sleep well.', '😴'),
      w('look', '看', 'Look at me.', '👀'),
      w('listen', '听', 'Listen to mom.', '🎧'),
      w('open', '打开', 'Open your book.', '🔓'),
      // ⚠️ 唯一一个收进来的同形异音词，孤立朗读时动词义压倒性胜出。
      //    换音色后要重听这一条，见文件头
      w('close', '关上', 'Close the door.', '🔒'),
      w('wash', '洗', 'Wash your hands.', '🧼'),
      w('help', '帮忙', 'Help me, please.', '🤝'),
      w('give', '给', 'Give me the ball.', '🎁'),
    ],
  },
  {
    id: 'feelings',
    name: '我的心情',
    emoji: '💗',
    cards: [
      w('happy', '开心', 'I am happy.', '😀'),
      w('sad', '难过', 'Do not be sad.', '😢'),
      w('angry', '生气', 'The bear is angry.', '😠'),
      w('tired', '累', 'I am tired.', '😪'),
      w('hungry', '饿', 'I am hungry.', '🤤'),
      w('love', '爱', 'I love you.', '❤️'),
      w('good', '好', 'Very good!', '👍'),
      w('bad', '不好', 'A bad day.', '👎'),
      w('hot', '热', 'The sun is hot.', '🔥'),
      w('cold', '冷', 'It is cold today.', '🧊'),
    ],
  },
  {
    id: 'opposites',
    name: '大和小',
    emoji: '📐',
    cards: [
      // ⚠️ 这一组**几乎整组没有图**，这是内容本身的性质：
      //    「大」「新」「快」指不出来，硬配一张图只会让她背错
      //    （配 🐘 表示 big，她记住的会是「大象」）。
      //    中文释义在这里顶大梁，见文件头
      w('big', '大', 'A big house.'),
      w('small', '小', 'A small cat.'),
      w('long', '长', 'A long train.'),
      w('short', '短', 'A short pencil.'),
      w('tall', '高', 'My dad is tall.'),
      w('new', '新', 'A new bag.'),
      w('old', '旧', 'An old book.'),
      w('fast', '快', 'A fast car.'),
      w('slow', '慢', 'The turtle is slow.', '🐢'),
      w('clean', '干净', 'Clean hands.'),
    ],
  },
  {
    id: 'myday',
    name: '一天里',
    emoji: '🕒',
    cards: [
      w('morning', '早上', 'Good morning!', '🌅'),
      w('afternoon', '下午', 'Good afternoon!', '🌤️'),
      w('evening', '傍晚', 'Good evening!', '🌆'),
      w('night', '夜晚', 'Good night!', '🌃'),
      w('breakfast', '早饭', 'Eat your breakfast.', '🥣'),
      w('lunch', '午饭', 'Time for lunch.', '🍱'),
      w('dinner', '晚饭', 'A big dinner.', '🍽️'),
      w('birthday', '生日', 'Happy birthday!', '🎂'),
      w('today', '今天', 'Today is my birthday.', '📅'),
      w('park', '公园', 'Go to the park.', '🏞️'),
    ],
  },
  {
    id: 'outside',
    name: '外面',
    emoji: '🌏',
    cards: [
      w('sun', '太阳', 'The sun is up.', '☀️'),
      w('moon', '月亮', 'Look at the moon.', '🌙'),
      w('star', '星星', 'Many little stars.', '⭐'),
      w('tree', '树', 'A big tree.', '🌳'),
      w('flower', '花', 'A pretty flower.', '🌺'),
      // 童谣里的那句，她多半在别处听过 —— 例句能直接接上已有的记忆最好
      w('rain', '雨', 'Rain, rain, go away.', '🌧️'),
      w('snow', '雪', 'White snow.', '❄️'),
      w('cloud', '云', 'A white cloud.', '☁️'),
      w('sea', '大海', 'The blue sea.', '🌊'),
      w('mountain', '山', 'A high mountain.', '⛰️'),
    ],
  },
]

/** 三辑的原始声明，顺序即难度梯度 */
const VOLUMES = [
  {
    id: 'vol1',
    name: '第一辑',
    badge: '1',
    hint: '看得见、指得着的东西',
    groups: VOLUME_1_GROUPS,
  },
  {
    id: 'vol2',
    name: '第二辑',
    badge: '2',
    hint: '身边的人、地方和物件',
    groups: VOLUME_2_GROUPS,
  },
  {
    id: 'vol3',
    name: '第三辑',
    badge: '3',
    hint: '做的事、心情和一天里',
    groups: VOLUME_3_GROUPS,
  },
] as const

/**
 * 全部词汇卡，按辑。组装时给每张卡补上 `groupId`。
 *
 * ⚠️ 加内容 = 往这个数组后面追加一辑。
 * ⛔ 不重排辑、不重排辑内顺序——她记的是「动物在第一组」这种位置。
 */
export const WORD_VOLUMES: readonly EnglishCardVolume[] = VOLUMES.map((volume) => ({
  id: volume.id,
  name: volume.name,
  badge: volume.badge,
  hint: volume.hint,
  groups: volume.groups.map((group) => ({
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    cards: group.cards.map((card) => ({ ...card, groupId: group.id })),
  })),
}))

/** 全部 18 组，摊平 */
export const WORD_GROUPS: readonly EnglishCardGroup[] = WORD_VOLUMES.flatMap((v) => v.groups)

/**
 * 全部 180 张卡，摊平。语音清单与测试用。
 *
 * ⚠️ **不要拿它去预取音频**：180 条一次性解码会在 iPad 上卡一下。
 * 墙面只预取当前那一辑的 60 条，见 `WordWall.tsx`。
 */
export const ALL_WORD_CARDS: readonly EnglishCard[] = WORD_GROUPS.flatMap((g) => g.cards)

/**
 * 这面墙上全部的词，小写。
 *
 * ⭐ 它是「她认得哪些英文词」的权威清单——英语短文的用词边界靠它撑起来，
 * 正如语文短文靠识字 300。见 `englishStories.ts`。
 */
export const WORD_CARD_WORDS: ReadonlySet<string> = new Set(
  ALL_WORD_CARDS.map((card) => card.word.toLowerCase()),
)
