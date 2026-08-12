/**
 * @file 古诗 20 首 —— 一年级读得懂、背得下的那些
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/poem.ts  类型与 key 规则
 * @see src/features/chinese/PoemLibrary.tsx  诗单
 *
 * ## 选篇依据
 *
 * 前 13 首是**统编版语文一年级上下册**的全部古诗（课文与「日积月累」两处），
 * 后 7 首取自《义务教育语文课程标准（2022 年版）》附录 1
 * 「关于优秀诗文背诵推荐篇目」中排在最前、第一学段（1~2 年级）通行的篇目。
 *
 * 挑选时避开了长篇与说教篇（如《长歌行》）：这一页是给还没入学的孩子玩的，
 * **画面感**比训诫重要——她要能在脑子里看见鹅、看见月亮、看见牛羊。
 *
 * ## 拼音一律标**本调**，不标变调
 *
 * 「不用」标 `bù yòng` 而不是实际念出来的 `bú yòng`，「一道」标 `yī dào`。
 * 理由只有一条：**和课本一致**。变调是嘴上自然发生的，课本从不标，
 * 这里标了反而与她在学校看到的对不上。
 *
 * ## ⚠️ `spoken` —— 少数句子喂给 TTS 的文本与原文不同
 *
 * TTS 是文本转语音，遇到古诗里的特殊读音会按现代常用音念，而**发音教错比
 * 没有声音严重得多**（拼音那边已经付过学费，见 design/07-音频方案.md §3.3）。
 * 对几乎必然读错的字，改喂一个**同音字**——这与拼音用汉字载体是同一个手法：
 * 屏幕上显示的永远是原文，只有送去合成的那份被换了字。
 *
 * 目前有三处：曲项（qū，会读成 qǔ）· 见牛羊（xiàn，会读成 jiàn）·
 * 少小（shào，会读成 shǎo）。
 *
 * 另有两处**读音有分歧但风险较低**，保留原文、生成后值得人工听一遍：
 * 《小池》「才露尖尖角」的「露」（lù / lòu）、
 * 《回乡偶书》「鬓毛衰」的「衰」（教材注 shuāi）。
 */

import type { Poem, PoemLine } from '@/domain/poem'

/**
 * 声明一句诗。
 *
 * ⚠️ 必须**独占一行**书写：`scripts/generate-voices.mjs` 的 `loadPoems()`
 * 是逐行扫描并按出现顺序给句子编号的，折行会让编号错位，
 * 后果是「点第三句、念出第二句」。
 *
 * @param text - 原文，含标点
 * @param pinyin - 逐字拼音，空格分隔、不含标点
 * @param spoken - 仅当 TTS 会读错时填：改写成同音字后的句子
 */
function l(text: string, pinyin: string, spoken?: string): PoemLine {
  return { text, pinyin, ...(spoken === undefined ? {} : { spoken }) }
}

/**
 * 20 首诗，按「一上 → 一下 → 课标补充」的顺序。
 *
 * ⚠️ 顺序即难度梯度，不要按朝代或作者重排：前面几首每句 3~5 字、
 * 说的都是眼前能看见的东西，越往后句子越长、意思越远。
 */
export const POEMS: readonly Poem[] = [
  {
    id: 'jiangnan',
    title: '江南',
    dynasty: '汉',
    author: '汉乐府',
    lines: [
      l('江南可采莲，莲叶何田田。', 'jiāng nán kě cǎi lián lián yè hé tián tián'),
      l('鱼戏莲叶间。', 'yú xì lián yè jiān'),
      l('鱼戏莲叶东，鱼戏莲叶西，', 'yú xì lián yè dōng yú xì lián yè xī'),
      l('鱼戏莲叶南，鱼戏莲叶北。', 'yú xì lián yè nán yú xì lián yè běi'),
    ],
    meaning:
      '江南水乡又到了采莲的时候，莲叶长得又密又好看。小鱼在莲叶中间游来游去，一会儿游到东边，一会儿游到西边，一会儿游到南边，一会儿游到北边。',
  },
  {
    id: 'yonge',
    title: '咏鹅',
    dynasty: '唐',
    author: '骆宾王',
    lines: [
      l('鹅，鹅，鹅，', 'é é é'),
      // ⚠️「曲」在这里是弯曲的 qū，TTS 会念成歌曲的 qǔ，改喂同音的「屈」
      l('曲项向天歌。', 'qū xiàng xiàng tiān gē', '屈项向天歌。'),
      l('白毛浮绿水，', 'bái máo fú lǜ shuǐ'),
      l('红掌拨清波。', 'hóng zhǎng bō qīng bō'),
    ],
    meaning:
      '白鹅呀白鹅，弯着长长的脖子对着天空唱歌。雪白的羽毛浮在绿绿的水面上，红红的脚掌拨动着清清的水波。',
  },
  {
    id: 'hua',
    title: '画',
    dynasty: '唐',
    author: '王维',
    lines: [
      l('远看山有色，', 'yuǎn kàn shān yǒu sè'),
      l('近听水无声。', 'jìn tīng shuǐ wú shēng'),
      l('春去花还在，', 'chūn qù huā hái zài'),
      l('人来鸟不惊。', 'rén lái niǎo bù jīng'),
    ],
    meaning:
      '远远看过去，山是有颜色的；走近了听，水却没有声音。春天过去了，花还开着；人走过来，鸟儿也不飞走。原来呀，这是一幅画。',
  },
  {
    id: 'minnong',
    title: '悯农',
    dynasty: '唐',
    author: '李绅',
    lines: [
      l('锄禾日当午，', 'chú hé rì dāng wǔ'),
      l('汗滴禾下土。', 'hàn dī hé xià tǔ'),
      l('谁知盘中餐，', 'shuí zhī pán zhōng cān'),
      l('粒粒皆辛苦。', 'lì lì jiē xīn kǔ'),
    ],
    meaning:
      '农民在中午最热的时候在田里锄草，汗水一滴一滴落进禾苗下面的泥土里。谁知道盘子里的饭，每一粒都是这样辛苦种出来的。',
  },
  {
    id: 'gulangyuexing',
    title: '古朗月行',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('小时不识月，', 'xiǎo shí bù shí yuè'),
      l('呼作白玉盘。', 'hū zuò bái yù pán'),
      l('又疑瑶台镜，', 'yòu yí yáo tái jìng'),
      l('飞在青云端。', 'fēi zài qīng yún duān'),
    ],
    meaning:
      '小时候不认识月亮，把它叫作白玉做成的盘子。又觉得它像神仙住的地方的那面镜子，飞在青色的云彩上边。',
  },
  {
    id: 'feng',
    title: '风',
    dynasty: '唐',
    author: '李峤',
    lines: [
      l('解落三秋叶，', 'jiě luò sān qiū yè'),
      l('能开二月花。', 'néng kāi èr yuè huā'),
      l('过江千尺浪，', 'guò jiāng qiān chǐ làng'),
      l('入竹万竿斜。', 'rù zhú wàn gān xié'),
    ],
    meaning:
      '风能吹落秋天的树叶，也能吹开二月的鲜花。它吹过江面，能掀起千尺高的浪；吹进竹林，能让万根竹子都斜斜地弯下腰。',
  },
  {
    id: 'jingyesi',
    title: '静夜思',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('床前明月光，', 'chuáng qián míng yuè guāng'),
      l('疑是地上霜。', 'yí shì dì shàng shuāng'),
      l('举头望明月，', 'jǔ tóu wàng míng yuè'),
      l('低头思故乡。', 'dī tóu sī gù xiāng'),
    ],
    meaning:
      '明亮的月光洒在床前，好像地上结了一层白霜。抬起头看着天上的月亮，低下头就想起了自己的家乡。',
  },
  {
    id: 'chishang',
    title: '池上',
    dynasty: '唐',
    author: '白居易',
    lines: [
      l('小娃撑小艇，', 'xiǎo wá chēng xiǎo tǐng'),
      l('偷采白莲回。', 'tōu cǎi bái lián huí'),
      l('不解藏踪迹，', 'bù jiě cáng zōng jì'),
      l('浮萍一道开。', 'fú píng yī dào kāi'),
    ],
    meaning:
      '一个小孩撑着小船，偷偷采了白莲花回来。他还不懂得藏起自己的行踪，水面上的浮萍被小船分开，留下一道长长的痕迹。',
  },
  {
    id: 'xiaochi',
    title: '小池',
    dynasty: '宋',
    author: '杨万里',
    lines: [
      l('泉眼无声惜细流，', 'quán yǎn wú shēng xī xì liú'),
      l('树阴照水爱晴柔。', 'shù yīn zhào shuǐ ài qíng róu'),
      // ⚠️「露」这里读 lù，TTS 也可能念成 lòu —— 生成后值得单独听一遍
      l('小荷才露尖尖角，', 'xiǎo hé cái lù jiān jiān jiǎo'),
      l('早有蜻蜓立上头。', 'zǎo yǒu qīng tíng lì shàng tóu'),
    ],
    meaning:
      '泉眼悄悄地流出细细的水流，好像很舍不得。树荫倒映在水面上，喜欢这晴天里柔和的样子。小荷叶才刚刚露出尖尖的角，就已经有蜻蜓停在上面了。',
  },
  {
    id: 'chunxiao',
    title: '春晓',
    dynasty: '唐',
    author: '孟浩然',
    lines: [
      l('春眠不觉晓，', 'chūn mián bù jué xiǎo'),
      l('处处闻啼鸟。', 'chù chù wén tí niǎo'),
      l('夜来风雨声，', 'yè lái fēng yǔ shēng'),
      l('花落知多少。', 'huā luò zhī duō shǎo'),
    ],
    meaning:
      '春天里睡得很香，不知不觉天就亮了。到处都能听见小鸟在叫。想起昨天夜里的风声雨声，不知道有多少花被吹落了。',
  },
  {
    id: 'xunyinzhe',
    title: '寻隐者不遇',
    dynasty: '唐',
    author: '贾岛',
    lines: [
      l('松下问童子，', 'sōng xià wèn tóng zǐ'),
      l('言师采药去。', 'yán shī cǎi yào qù'),
      l('只在此山中，', 'zhǐ zài cǐ shān zhōng'),
      l('云深不知处。', 'yún shēn bù zhī chù'),
    ],
    meaning:
      '我在松树下问一个小孩，他说师父采药去了。就在这座山里面，可是云雾太深，不知道到底在哪里。',
  },
  {
    id: 'zengwanglun',
    title: '赠汪伦',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('李白乘舟将欲行，', 'lǐ bái chéng zhōu jiāng yù xíng'),
      l('忽闻岸上踏歌声。', 'hū wén àn shàng tà gē shēng'),
      l('桃花潭水深千尺，', 'táo huā tán shuǐ shēn qiān chǐ'),
      l('不及汪伦送我情。', 'bù jí wāng lún sòng wǒ qíng'),
    ],
    meaning:
      '李白坐上小船正要出发，忽然听见岸上传来踏着拍子唱歌的声音。桃花潭的水有千尺那么深，也比不上汪伦送我的这份情谊。',
  },
  {
    id: 'huaji',
    title: '画鸡',
    dynasty: '明',
    author: '唐寅',
    lines: [
      l('头上红冠不用裁，', 'tóu shàng hóng guān bù yòng cái'),
      l('满身雪白走将来。', 'mǎn shēn xuě bái zǒu jiāng lái'),
      l('平生不敢轻言语，', 'píng shēng bù gǎn qīng yán yǔ'),
      l('一叫千门万户开。', 'yī jiào qiān mén wàn hù kāi'),
    ],
    meaning:
      '大公鸡头上的红冠子不用裁剪就那么好看，它一身雪白地走过来。它平时不轻易开口，一叫起来，千家万户的门就都打开了。',
  },
  {
    id: 'dengguanquelou',
    title: '登鹳雀楼',
    dynasty: '唐',
    author: '王之涣',
    lines: [
      l('白日依山尽，', 'bái rì yī shān jìn'),
      l('黄河入海流。', 'huáng hé rù hǎi liú'),
      l('欲穷千里目，', 'yù qióng qiān lǐ mù'),
      l('更上一层楼。', 'gèng shàng yī céng lóu'),
    ],
    meaning:
      '太阳靠着大山慢慢落下去，黄河朝着大海奔流。想要看到更远的地方，那就再登上一层楼吧。',
  },
  {
    id: 'yongliu',
    title: '咏柳',
    dynasty: '唐',
    author: '贺知章',
    lines: [
      l('碧玉妆成一树高，', 'bì yù zhuāng chéng yī shù gāo'),
      l('万条垂下绿丝绦。', 'wàn tiáo chuí xià lǜ sī tāo'),
      l('不知细叶谁裁出，', 'bù zhī xì yè shuí cái chū'),
      l('二月春风似剪刀。', 'èr yuè chūn fēng sì jiǎn dāo'),
    ],
    meaning:
      '高高的柳树像是用碧玉打扮成的，垂下来的万千枝条像绿色的丝带。不知道这细细的叶子是谁裁出来的，原来二月的春风就像一把剪刀。',
  },
  {
    id: 'wanglushanpubu',
    title: '望庐山瀑布',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('日照香炉生紫烟，', 'rì zhào xiāng lú shēng zǐ yān'),
      l('遥看瀑布挂前川。', 'yáo kàn pù bù guà qián chuān'),
      l('飞流直下三千尺，', 'fēi liú zhí xià sān qiān chǐ'),
      l('疑是银河落九天。', 'yí shì yín hé luò jiǔ tiān'),
    ],
    meaning:
      '太阳照着香炉峰，升起紫色的云烟。远远望过去，瀑布像一条大河挂在山前。水流飞快地直冲下来，有三千尺那么长，让人怀疑是银河从天上掉了下来。',
  },
  {
    id: 'jiangxue',
    title: '江雪',
    dynasty: '唐',
    author: '柳宗元',
    lines: [
      l('千山鸟飞绝，', 'qiān shān niǎo fēi jué'),
      l('万径人踪灭。', 'wàn jìng rén zōng miè'),
      l('孤舟蓑笠翁，', 'gū zhōu suō lì wēng'),
      l('独钓寒江雪。', 'dú diào hán jiāng xuě'),
    ],
    meaning:
      '所有的山上都看不见鸟儿飞了，所有的小路上都没有人的脚印。江面上只有一条小船，船上坐着披蓑衣、戴斗笠的老爷爷，独自在下雪的江上钓鱼。',
  },
  {
    id: 'chilege',
    title: '敕勒歌',
    dynasty: '北朝',
    author: '北朝民歌',
    lines: [
      l('敕勒川，阴山下。', 'chì lè chuān yīn shān xià'),
      l('天似穹庐，笼盖四野。', 'tiān sì qióng lú lǒng gài sì yě'),
      l('天苍苍，野茫茫，', 'tiān cāng cāng yě máng máng'),
      // ⚠️「见」通「现」，读 xiàn。TTS 必然念成 jiàn，改喂「现」
      l('风吹草低见牛羊。', 'fēng chuī cǎo dī xiàn niú yáng', '风吹草低现牛羊。'),
    ],
    meaning:
      '敕勒人住的大平原，就在阴山脚下。天空像一顶大帐篷，把四面的原野都罩了起来。天蓝蓝的，原野望不到边。风吹过来，草低下头，就露出了成群的牛羊。',
  },
  {
    id: 'suojian',
    title: '所见',
    dynasty: '清',
    author: '袁枚',
    lines: [
      l('牧童骑黄牛，', 'mù tóng qí huáng niú'),
      l('歌声振林樾。', 'gē shēng zhèn lín yuè'),
      l('意欲捕鸣蝉，', 'yì yù bǔ míng chán'),
      l('忽然闭口立。', 'hū rán bì kǒu lì'),
    ],
    meaning:
      '放牛的小孩骑在黄牛背上，唱歌的声音传遍了整个树林。他忽然想去捉那只正在叫的知了，就赶紧闭上嘴巴，一动不动地站住了。',
  },
  {
    id: 'huixiangoushu',
    title: '回乡偶书',
    dynasty: '唐',
    author: '贺知章',
    lines: [
      // ⚠️「少」这里读 shào（年少），TTS 会念成多少的 shǎo，改喂同音的「绍」
      l('少小离家老大回，', 'shào xiǎo lí jiā lǎo dà huí', '绍小离家老大回，'),
      l('乡音无改鬓毛衰。', 'xiāng yīn wú gǎi bìn máo shuāi'),
      l('儿童相见不相识，', 'ér tóng xiāng jiàn bù xiāng shí'),
      l('笑问客从何处来。', 'xiào wèn kè cóng hé chù lái'),
    ],
    meaning:
      '我很小的时候就离开了家，年纪大了才回来。家乡的口音没有变，两边的头发却已经白了。村里的小孩看见我都不认识，笑着问：客人您是从哪里来的呀？',
  },
]

/**
 * 每首诗在诗单上的封面图，键是 `poem.id`。
 *
 * ⭐ 挑图规矩与识字卡、英语词表一致：**必须一眼认得出，且指向这首诗真正写的东西**。
 * 《所见》是骑牛的牧童、《江南》是"鱼戏莲叶间"的鱼——
 * 认不出的图会让诗单退化成一列看不懂的方块，那她就只会点第一个。
 *
 * ⚠️ **不要用 Unicode 13 及以后的新 emoji**。它们在 Windows 与旧版 iOS 上
 * 渲染成空方框：莲花 🪷（14.0）就这么栽过一次，江南与小池两首同时变成方框。
 * 由 `poems.test.ts` 卡住码点上限。
 *
 * ⚠️ 放在 data 层而不是 `PoemLibrary.tsx` 里：封面是**内容**不是 UI。
 * 当初写在组件里，正是它躲过全部测试的原因。
 */
export const POEM_COVERS: Readonly<Record<string, string>> = {
  jiangnan: '🐟', // 鱼戏莲叶间
  yonge: '🦢',
  hua: '🖼️',
  minnong: '🌾',
  gulangyuexing: '🌕',
  feng: '🍃',
  jingyesi: '🌙',
  chishang: '🛶',
  xiaochi: '🌱', // 小荷才露尖尖角
  chunxiao: '🌸',
  xunyinzhe: '🌲',
  zengwanglun: '⛵',
  huaji: '🐓',
  dengguanquelou: '🏯',
  yongliu: '🌿',
  wanglushanpubu: '⛰️',
  jiangxue: '🎣',
  chilege: '🐑',
  suojian: '🐂',
  huixiangoushu: '🏡',
}

/** 按 id 查一首诗。详情页用 */
export function poemById(id: string): Poem | undefined {
  return POEMS.find((poem) => poem.id === id)
}
