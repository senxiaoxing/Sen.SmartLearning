/**
 * @file 古诗 60 首 —— 一年级读得懂、背得下的那些，分 3 辑 × 20
 * @layer data  静态内容，随 App 版本内置
 * @see src/domain/poem.ts  类型与 key 规则
 * @see src/features/chinese/PoemLibrary.tsx  诗单
 *
 * ## 为什么分辑（与识字 300 同一条理由）
 *
 * 原来是 20 首排成一片。她把这 20 首都听熟之后要加诗，如果继续往后接，
 * 新的那些会排在滚过两屏之后——**她看到的永远是已经会背的那几首**，
 * 而点开的永远是第一排。那正是「像幼儿园小朋友做的题目」那句话的另一种形态
 * （见 CLAUDE.md 产品红线）。
 *
 * 分辑之后每一辑仍是 20 首，一屏半就能翻完，
 * 而「第二辑」「第三辑」这两个按钮本身就是「这里有你没听过的诗」的信号。
 * 做法照搬 `hanziCards.ts`，连按钮上的 1️⃣2️⃣3️⃣ 都是同一套——
 * 她在识字墙上已经学会「按数字换一批」这个动作了。
 *
 * ⚠️ **辑的顺序与辑内顺序都不要重排**，理由同识字：她记的是
 * 「那首鹅在第一辑最前面」这种位置。新内容只能**往后加辑**。
 *
 * ## 选篇依据
 *
 * **第一辑**：前 13 首是**统编版语文一年级上下册**的全部古诗
 * （课文与「日积月累」两处），后 7 首取自《义务教育语文课程标准（2022 年版）》
 * 附录 1「关于优秀诗文背诵推荐篇目」中排在最前、第一学段（1~2 年级）通行的篇目。
 *
 * **第二辑**：统编版二年级上下册的古诗，加上第一学段推荐篇目里剩下的那些。
 * 难度是自然承接的——仍以五言、七言绝句为主，写的还是眼前看得见的东西。
 * 《山村咏怀》（一去二三里）刻意排在这一辑：她那时正在数学里练 20 以内的数，
 * 一首诗从一数到十，两边能对上。
 *
 * **第三辑**：统编版三、四年级课本里**画面感最强**的那些。句子更长、
 * 出现了她还没见过的季节与地名，但每一首都能一句话说清「在看什么」——
 * 桃花、鸭子、萤火虫、满山的红叶。
 *
 * 三辑通篇避开长篇与说教篇（如《长歌行》）：这一页是给还没入学的孩子玩的，
 * **画面感**比训诫重要——她要能在脑子里看见鹅、看见月亮、看见牛羊。
 * 出于同一个理由，也避开了写战事与宫怨的篇目。
 *
 * ## ⚠️ 60 首写在同一个文件里，不要拆
 *
 * `scripts/generate-voices.mjs` 的 `loadPoems()` 是**逐行扫描这一个文件**
 * 攒出全部片段文本的（见那个函数的说明）。拆成三个文件就要同步改脚本的读取，
 * 而漏改的表现是「第三辑整辑没有声音」——这一页的全部内容都是听的，
 * 等于那一辑作废。
 *
 * ## 拼音一律标**本调**，不标变调
 *
 * 「不用」标 `bù yòng` 而不是实际念出来的 `bú yòng`，「一道」标 `yī dào`。
 * 理由只有一条：**和课本一致**。变调是嘴上自然发生的，课本从不标，
 * 这里标了反而与她在学校看到的对不上。
 *
 * ## ⭐ 多音字一律改写 —— 这条是拿错音换来的
 *
 * TTS 是文本转语音，遇到多音字只能按上下文猜。对策是改喂一个**同音字**：
 * 屏幕上显示的永远是原文，只有送去合成的那份被换了字
 * （`PoemLine.spoken` 承载诗句，`Poem.headSpoken` 承载报诗名那一句）。
 *
 * ⚠️ 这里原本的方针是「只改几乎必然读错的，其余保留原文、留待人工听」。
 * **实测把它推翻了**：《回乡偶书》「鬓毛衰」念出来是 cuī ——
 * 那是这首诗的古押韵音，而教材注 shuāi。也就是说，这套 TTS 念古诗时
 * 会主动往**古音**上靠，「此处读的正是现代最高频音」根本不能当作安全。
 *
 * 所以现在的规矩是：**只要是多音字，就改写**，能换字的一个不留。
 * 孩子第一次听到的音会跟着她很久，改回来比教对一次难得多。
 *
 * 换字的三条要求，按优先级：
 *
 * ```
 * 1. 同音同调             —— 这是全部意义所在
 * 2. 换上去的必须是单音字  —— 拿一个多音字换另一个多音字，等于没换
 * 3. 尽量让句子仍读得通    —— 「万崇山」比「万虫山」好，但读得通让位于读得准
 * ```
 *
 * 目前改写 34 处（诗句 29 · 诗题 5），`npm run poem:check` 那一页可以逐条听。
 *
 * ## 三处**没有同音字可换**，保留原文
 *
 * 汉语里 `sàn` 只有「散」、`mǒ` 只有「抹」，找不到第二个字：
 * 《村居》「儿童散学」（sàn）· 《饮湖上初晴后雨》「淡妆浓抹」（mǒ）。
 * 另有《敕勒歌》诗题里的「勒」（lè）——同音字只有生僻的「泐」，
 * 换上去 TTS 更可能按声旁乱读，反而更糟。
 *
 * ✅ **2026-08-24 全部听过一遍（`npm run poem:check`），无一读错**——
 * 34 处改写都生效了，这三处 TTS 自己也读对了。
 * 所以「换不出同音字」不等于「一定读错」：下次遇到同类情况，
 * 先听一遍再决定要不要为它冒改写的风险（改写本身会打散韵律）。
 *
 * ⚠️ 但**加诗之后仍要重听**：这一遍验的是当前这 60 首在当前音色下的结果，
 * 换音色（`npm run voices -- --force`）或加新篇目都会让结论失效。
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

/** 一辑 = 20 首。诗单顶部的分辑按钮一个对应一个，做法与识字墙完全一致 */
export interface PoemVolume {
  id: string
  /** 「第一辑」这类序号标签，家长看的 */
  name: string
  /** ⭐ 孩子真正认的东西：1️⃣2️⃣3️⃣，与识字墙上是同一套图 */
  badge: string
  /** 这一辑装了什么，家长看的一句话 */
  hint: string
  poems: readonly Poem[]
}

/**
 * 第一辑：最先听的 20 首，按「一上 → 一下 → 课标补充」的顺序。
 *
 * ⚠️ 顺序即难度梯度，不要按朝代或作者重排：前面几首每句 3~5 字、
 * 说的都是眼前能看见的东西，越往后句子越长、意思越远。
 */
const VOLUME_1_POEMS: readonly Poem[] = [
  {
    id: 'jiangnan',
    title: '江南',
    dynasty: '汉',
    author: '汉乐府',
    // ⚠️「乐府」的乐读 yuè，TTS 会念成快乐的 lè，改喂同音的「月」
    headSpoken: '江南。汉，汉月府。',
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
    // ⚠️ 诗题的「行」是乐府歌行的 xíng，TTS 会念成一行的 háng，改喂同音的「形」
    headSpoken: '古朗月形。唐，李白。',
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
    // ⚠️ 人名「李峤」读 qiáo，TTS 会念成 jiào，改喂同音的「桥」
    headSpoken: '风。唐，李桥。',
    lines: [
      l('解落三秋叶，', 'jiě luò sān qiū yè'),
      l('能开二月花。', 'néng kāi èr yuè huā'),
      l('过江千尺浪，', 'guò jiāng qiān chǐ làng'),
      // ⚠️「斜」读 xié。古诗里它有 xiá 的旧读，TTS 念古诗时会走那个音，改喂同音的「协」
      l('入竹万竿斜。', 'rù zhú wàn gān xié', '入竹万竿协。'),
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
      // ⚠️「露」这里读 lù，动词位置上 TTS 容易念成 lòu，改喂同音的「路」
      l('小荷才露尖尖角，', 'xiǎo hé cái lù jiān jiān jiǎo', '小荷才路尖尖角，'),
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
      // ⚠️「觉」这里读 jué（察觉），前面又是「眠」，TTS 极易念成睡觉的 jiào，改喂「绝」
      l('春眠不觉晓，', 'chūn mián bù jué xiǎo', '春眠不绝晓，'),
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
      // ⚠️「冠」这里是名词的 guān（帽子），TTS 会念成冠军的 guàn，改喂同音的「官」
      l('头上红冠不用裁，', 'tóu shàng hóng guān bù yòng cái', '头上红官不用裁，'),
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
      // ⚠️「笼」这里读 lǒng（笼罩），TTS 会念成笼子的 lóng，改喂同音的「拢」
      l('天似穹庐，笼盖四野。', 'tiān sì qióng lú lǒng gài sì yě', '天似穹庐，拢盖四野。'),
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
      // ⚠️ 实测读成了 cuī —— 那是这首诗的古押韵音。教材注 shuāi，改喂同音的「摔」
      l('乡音无改鬓毛衰。', 'xiāng yīn wú gǎi bìn máo shuāi', '乡音无改鬓毛摔。'),
      l('儿童相见不相识，', 'ér tóng xiāng jiàn bù xiāng shí'),
      l('笑问客从何处来。', 'xiào wèn kè cóng hé chù lái'),
    ],
    meaning:
      '我很小的时候就离开了家，年纪大了才回来。家乡的口音没有变，两边的头发却已经白了。村里的小孩看见我都不认识，笑着问：客人您是从哪里来的呀？',
  },
]

/**
 * 第二辑：统编版二年级上下册的古诗，加上第一学段推荐篇目里剩下的那些。
 *
 * 仍以五言、七言绝句为主，写的还是眼前看得见的东西——梅花、风筝、爆竹、蝴蝶。
 * ⭐《山村咏怀》（一去二三里）刻意排在这一辑：她那时正在数学里练 20 以内的数，
 * 一首诗从一数到十，两边能对上。
 */
const VOLUME_2_POEMS: readonly Poem[] = [
  {
    id: 'meihua',
    title: '梅花',
    dynasty: '宋',
    author: '王安石',
    lines: [
      // ⚠️「数枝」的数读 shù，TTS 会念成数数的 shǔ，改喂同音的「树」
      l('墙角数枝梅，', 'qiáng jiǎo shù zhī méi', '墙角树枝梅，'),
      l('凌寒独自开。', 'líng hán dú zì kāi'),
      l('遥知不是雪，', 'yáo zhī bù shì xuě'),
      // ⚠️「为」这里读 wèi（因为），TTS 会念成 wéi，改喂同音的「未」
      l('为有暗香来。', 'wèi yǒu àn xiāng lái', '未有暗香来。'),
    ],
    meaning:
      '墙角有几枝梅花，天那么冷，它自己就开了。远远看过去，就知道那白白的不是雪——因为有一股淡淡的香味飘过来。',
  },
  {
    id: 'xiaoerchuidiao',
    title: '小儿垂钓',
    dynasty: '唐',
    author: '胡令能',
    lines: [
      l('蓬头稚子学垂纶，', 'péng tóu zhì zǐ xué chuí lún'),
      l('侧坐莓苔草映身。', 'cè zuò méi tái cǎo yìng shēn'),
      l('路人借问遥招手，', 'lù rén jiè wèn yáo zhāo shǒu'),
      // ⚠️ 一句里两个坑：「得」读 dé（TTS 会读成轻声的 de）、
      //    「应」读 yìng（答应，TTS 会读成应该的 yīng）。分别改喂「德」「映」
      l('怕得鱼惊不应人。', 'pà dé yú jīng bù yìng rén', '怕德鱼惊不映人。'),
    ],
    meaning:
      '一个头发乱蓬蓬的小孩在学钓鱼，侧着身子坐在青苔上，长长的草把他挡住了一半。有人路过想问路，他老远就摆摆手——怕说话把鱼吓跑了，连答话都不敢。',
  },
  {
    id: 'yesushansi',
    title: '夜宿山寺',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('危楼高百尺，', 'wēi lóu gāo bǎi chǐ'),
      l('手可摘星辰。', 'shǒu kě zhāi xīng chén'),
      l('不敢高声语，', 'bù gǎn gāo shēng yǔ'),
      l('恐惊天上人。', 'kǒng jīng tiān shàng rén'),
    ],
    meaning:
      '山上这座楼好高好高，站在上面一伸手，好像就能摘到星星。我不敢大声说话，怕吵醒了天上住的人。',
  },
  {
    id: 'cunju',
    title: '村居',
    dynasty: '清',
    author: '高鼎',
    lines: [
      // ⚠️「草长」的长读 zhǎng（长高），TTS 会念成长短的 cháng，改喂同音的「涨」
      l('草长莺飞二月天，', 'cǎo zhǎng yīng fēi èr yuè tiān', '草涨莺飞二月天，'),
      l('拂堤杨柳醉春烟。', 'fú dī yáng liǔ zuì chūn yān'),
      l('儿童散学归来早，', 'ér tóng sàn xué guī lái zǎo'),
      l('忙趁东风放纸鸢。', 'máng chèn dōng fēng fàng zhǐ yuān'),
    ],
    meaning:
      '二月里草长高了，黄莺飞来飞去，柳条垂下来拂着河堤，像喝醉了一样在春天的雾里摇。小朋友放学回来得早，赶紧趁着东风去放风筝。',
  },
  {
    id: 'cao',
    title: '草',
    dynasty: '唐',
    author: '白居易',
    lines: [
      l('离离原上草，', 'lí lí yuán shàng cǎo'),
      l('一岁一枯荣。', 'yī suì yī kū róng'),
      l('野火烧不尽，', 'yě huǒ shāo bù jìn'),
      l('春风吹又生。', 'chūn fēng chuī yòu shēng'),
    ],
    meaning:
      '原野上的草长得又密又高，每年黄一次，又绿一次。野火怎么烧也烧不完，春风一吹，它又长出来了。',
  },
  {
    id: 'xiaochujingcisi',
    title: '晓出净慈寺送林子方',
    dynasty: '宋',
    author: '杨万里',
    lines: [
      l('毕竟西湖六月中，', 'bì jìng xī hú liù yuè zhōng'),
      l('风光不与四时同。', 'fēng guāng bù yǔ sì shí tóng'),
      l('接天莲叶无穷碧，', 'jiē tiān lián yè wú qióng bì'),
      l('映日荷花别样红。', 'yìng rì hé huā bié yàng hóng'),
    ],
    meaning:
      '六月的西湖啊，跟别的时候就是不一样。荷叶一片连着一片，绿得一直铺到天边；荷花被太阳一照，红得特别好看。',
  },
  {
    id: 'shancunyonghuai',
    title: '山村咏怀',
    dynasty: '宋',
    author: '邵雍',
    lines: [
      l('一去二三里，', 'yī qù èr sān lǐ'),
      l('烟村四五家。', 'yān cūn sì wǔ jiā'),
      l('亭台六七座，', 'tíng tái liù qī zuò'),
      l('八九十枝花。', 'bā jiǔ shí zhī huā'),
    ],
    meaning:
      '往前走了两三里路，看见炊烟里有四五户人家。路边有六七座小亭子，还开着八九十枝花。',
  },
  {
    id: 'mutong',
    title: '牧童',
    dynasty: '唐',
    author: '吕岩',
    lines: [
      l('草铺横野六七里，', 'cǎo pū héng yě liù qī lǐ'),
      l('笛弄晚风三四声。', 'dí nòng wǎn fēng sān sì shēng'),
      l('归来饱饭黄昏后，', 'guī lái bǎo fàn huáng hūn hòu'),
      l('不脱蓑衣卧月明。', 'bù tuō suō yī wò yuè míng'),
    ],
    meaning:
      '青草像铺开的毯子，铺满了六七里的原野。晚风里送来几声笛子响。放牛的小孩回来吃饱了饭，天已经黑了，他连蓑衣都不脱，就躺在月光里。',
  },
  {
    id: 'yuanri',
    title: '元日',
    dynasty: '宋',
    author: '王安石',
    lines: [
      l('爆竹声中一岁除，', 'bào zhú shēng zhōng yī suì chú'),
      l('春风送暖入屠苏。', 'chūn fēng sòng nuǎn rù tú sū'),
      l('千门万户曈曈日，', 'qiān mén wàn hù tóng tóng rì'),
      l('总把新桃换旧符。', 'zǒng bǎ xīn táo huàn jiù fú'),
    ],
    meaning:
      '噼里啪啦的爆竹声里，旧的一年过去了。春风把暖气送进屋子，大家一起喝过年的酒。太阳出来照着家家户户，人们把去年的桃符取下来，换上新的。',
  },
  {
    id: 'qingming',
    title: '清明',
    dynasty: '唐',
    author: '杜牧',
    lines: [
      l('清明时节雨纷纷，', 'qīng míng shí jié yǔ fēn fēn'),
      l('路上行人欲断魂。', 'lù shàng xíng rén yù duàn hún'),
      l('借问酒家何处有？', 'jiè wèn jiǔ jiā hé chù yǒu'),
      l('牧童遥指杏花村。', 'mù tóng yáo zhǐ xìng huā cūn'),
    ],
    meaning:
      '清明这天雨下个不停，赶路的人心里闷闷的。他问：哪儿有能歇脚的酒家呀？放牛的小孩伸手一指——远处就是杏花村。',
  },
  {
    id: 'xiangsi',
    title: '相思',
    dynasty: '唐',
    author: '王维',
    lines: [
      l('红豆生南国，', 'hóng dòu shēng nán guó'),
      l('春来发几枝。', 'chūn lái fā jǐ zhī'),
      l('愿君多采撷，', 'yuàn jūn duō cǎi xié'),
      l('此物最相思。', 'cǐ wù zuì xiāng sī'),
    ],
    meaning:
      '红豆长在南方，春天一到就抽出好几枝。希望你多采一些回去——看见它，就会想起想念的人。',
  },
  {
    id: 'zaofabaidicheng',
    title: '早发白帝城',
    dynasty: '唐',
    author: '李白',
    lines: [
      // ⚠️「朝」这里读 zhāo（早晨），TTS 会念成朝代的 cháo，改喂同音的「招」
      l('朝辞白帝彩云间，', 'zhāo cí bái dì cǎi yún jiān', '招辞白帝彩云间，'),
      // ⚠️「还」这里读 huán（回到），TTS 会念成还是的 hái，改喂同音的「环」
      l('千里江陵一日还。', 'qiān lǐ jiāng líng yī rì huán', '千里江陵一日环。'),
      l('两岸猿声啼不住，', 'liǎng àn yuán shēng tí bù zhù'),
      // ⚠️「重」这里读 chóng（一重又一重），改喂同音的「崇」——崇山本身也是词，句子仍读得通
      l('轻舟已过万重山。', 'qīng zhōu yǐ guò wàn chóng shān', '轻舟已过万崇山。'),
    ],
    meaning:
      '早上告别彩云围着的白帝城，一千多里路的江陵，一天就到了。两岸的猿猴叫声还没停，轻快的小船已经穿过了一重又一重的大山。',
  },
  {
    id: 'yonghuashan',
    title: '咏华山',
    dynasty: '宋',
    author: '寇准',
    // ⚠️ 山名「华山」读 huà，TTS 会念成中华的 huá，改喂同音的「化」
    headSpoken: '咏化山。宋，寇准。',
    lines: [
      l('只有天在上，', 'zhǐ yǒu tiān zài shàng'),
      l('更无山与齐。', 'gèng wú shān yǔ qí'),
      l('举头红日近，', 'jǔ tóu hóng rì jìn'),
      l('回首白云低。', 'huí shǒu bái yún dī'),
    ],
    meaning:
      '华山高得只有天在它上头，再没有别的山能跟它一样高。抬起头，红红的太阳好像就在旁边；回过头一看，白云都在脚底下了。',
  },
  {
    id: 'dalinsitaohua',
    title: '大林寺桃花',
    dynasty: '唐',
    author: '白居易',
    lines: [
      l('人间四月芳菲尽，', 'rén jiān sì yuè fāng fēi jìn'),
      l('山寺桃花始盛开。', 'shān sì táo huā shǐ shèng kāi'),
      l('长恨春归无觅处，', 'cháng hèn chūn guī wú mì chù'),
      l('不知转入此中来。', 'bù zhī zhuǎn rù cǐ zhōng lái'),
    ],
    meaning:
      '四月里，山下的花都谢了，山上寺庙里的桃花才刚刚开。我总是可惜春天走了没处找，没想到它是转到这里来了。',
  },
  {
    id: 'yijiangnan',
    title: '忆江南',
    dynasty: '唐',
    author: '白居易',
    lines: [
      l('江南好，风景旧曾谙。', 'jiāng nán hǎo fēng jǐng jiù céng ān'),
      l('日出江花红胜火，', 'rì chū jiāng huā hóng shèng huǒ'),
      l('春来江水绿如蓝。', 'chūn lái jiāng shuǐ lǜ rú lán'),
      l('能不忆江南？', 'néng bù yì jiāng nán'),
    ],
    meaning:
      '江南真好啊，那里的景色我早就熟悉了。太阳出来的时候，江边的花红得像火；春天一到，江水绿得像蓝色的染料。你说，我怎么能不想念江南呢？',
  },
  {
    id: 'mifeng',
    title: '蜂',
    dynasty: '唐',
    author: '罗隐',
    lines: [
      l('不论平地与山尖，', 'bù lùn píng dì yǔ shān jiān'),
      // ⚠️「占」这里读 zhàn（占有），TTS 会念成占卜的 zhān，改喂同音的「站」
      l('无限风光尽被占。', 'wú xiàn fēng guāng jìn bèi zhàn', '无限风光尽被站。'),
      l('采得百花成蜜后，', 'cǎi dé bǎi huā chéng mì hòu'),
      // ⚠️ 两个「为」都读 wèi（为了谁），改喂同音的「喂」—— 恰好也是喂给谁的意思
      l('为谁辛苦为谁甜？', 'wèi shuí xīn kǔ wèi shuí tián', '喂谁辛苦喂谁甜？'),
    ],
    meaning:
      '不管是平平的地上还是高高的山尖，只要有花的地方，蜜蜂都去过。它采了百花酿成蜜，可这些甜甜的蜜，是为谁辛苦、又是给谁甜的呢？',
  },
  {
    id: 'suxinshi',
    title: '宿新市徐公店',
    dynasty: '宋',
    author: '杨万里',
    lines: [
      l('篱落疏疏一径深，', 'lí luò shū shū yī jìng shēn'),
      l('树头新绿未成阴。', 'shù tóu xīn lǜ wèi chéng yīn'),
      l('儿童急走追黄蝶，', 'ér tóng jí zǒu zhuī huáng dié'),
      l('飞入菜花无处寻。', 'fēi rù cài huā wú chù xún'),
    ],
    meaning:
      '稀稀疏疏的篱笆边有一条小路，一直伸到远处。树上刚长出新叶子，还遮不出树荫。小孩子飞快地跑着去追一只黄蝴蝶，蝴蝶飞进金黄的菜花里，就再也找不着了。',
  },
  {
    id: 'xunhuyinjun',
    title: '寻胡隐君',
    dynasty: '明',
    author: '高启',
    lines: [
      l('渡水复渡水，', 'dù shuǐ fù dù shuǐ'),
      l('看花还看花。', 'kàn huā hái kàn huā'),
      l('春风江上路，', 'chūn fēng jiāng shàng lù'),
      l('不觉到君家。', 'bù jué dào jūn jiā'),
    ],
    meaning:
      '过了一条河又过一条河，看了一片花又看一片花。春风吹着江边的小路，不知不觉就走到你家门口了。',
  },
  {
    id: 'jueju',
    title: '绝句',
    dynasty: '唐',
    author: '杜甫',
    lines: [
      l('两个黄鹂鸣翠柳，', 'liǎng gè huáng lí míng cuì liǔ'),
      // ⚠️「一行」的行读 háng（排成一行），TTS 会念成行走的 xíng，改喂同音的「航」
      l('一行白鹭上青天。', 'yī háng bái lù shàng qīng tiān', '一航白鹭上青天。'),
      l('窗含西岭千秋雪，', 'chuāng hán xī lǐng qiān qiū xuě'),
      // ⚠️「泊」这里读 bó（停船），TTS 会念成湖泊的 pō，改喂同音的「舶」——也是船
      l('门泊东吴万里船。', 'mén bó dōng wú wàn lǐ chuán', '门舶东吴万里船。'),
    ],
    meaning:
      '两只黄鹂在绿柳枝上叫，一行白鹭排着队飞上蓝天。从窗口望出去，能看见西岭上一年到头不化的雪；门外的江上，停着要开往东吴的大船。',
  },
  {
    id: 'jiangnanchun',
    title: '江南春',
    dynasty: '唐',
    author: '杜牧',
    lines: [
      l('千里莺啼绿映红，', 'qiān lǐ yīng tí lǜ yìng hóng'),
      l('水村山郭酒旗风。', 'shuǐ cūn shān guō jiǔ qí fēng'),
      l('南朝四百八十寺，', 'nán cháo sì bǎi bā shí sì'),
      l('多少楼台烟雨中。', 'duō shǎo lóu tái yān yǔ zhōng'),
    ],
    meaning:
      '千里江南到处是黄莺在叫，绿树映着红花。靠水的村子、靠山的城墙边，酒店的旗子在风里飘。从前留下来的好多好多寺庙，一座座楼台都笼在蒙蒙的烟雨里。',
  },
]

/**
 * 第三辑：统编版三、四年级课本里**画面感最强**的那些。
 *
 * 句子更长，出现了她还没见过的季节与地名，但每一首都能一句话说清「在看什么」——
 * 满山的红叶、先知道水暖的鸭子、篱笆下逗蟋蟀的灯、敲碎在地上的冰。
 * 意思远一点没关系，那是译文那一条的事；**看不见东西的诗才不该进这一页**。
 *
 * ⚠️《游子吟》是六句，不是四句。`lines` 本来就不限长度，
 * 但砍成四句会把「谁言寸草心」那两句丢掉——这首诗的主旨全在那里。
 */
const VOLUME_3_POEMS: readonly Poem[] = [
  {
    id: 'shanxing',
    title: '山行',
    dynasty: '唐',
    author: '杜牧',
    lines: [
      // ⚠️「斜」读 xié。这一句正是 xiá 旧读争议最出名的地方，TTS 极可能走古音，改喂「协」
      l('远上寒山石径斜，', 'yuǎn shàng hán shān shí jìng xié', '远上寒山石径协，'),
      l('白云生处有人家。', 'bái yún shēng chù yǒu rén jiā'),
      l('停车坐爱枫林晚，', 'tíng chē zuò ài fēng lín wǎn'),
      l('霜叶红于二月花。', 'shuāng yè hóng yú èr yuè huā'),
    ],
    meaning:
      '一条石头小路弯弯曲曲地伸向远处的山上，白云飘着的地方还住着人家。我把车停下来，是因为喜欢这傍晚的枫树林——被霜打过的叶子，比二月的花还要红。',
  },
  {
    id: 'zengliujingwen',
    title: '赠刘景文',
    dynasty: '宋',
    author: '苏轼',
    lines: [
      l('荷尽已无擎雨盖，', 'hé jìn yǐ wú qíng yǔ gài'),
      l('菊残犹有傲霜枝。', 'jú cán yóu yǒu ào shuāng zhī'),
      l('一年好景君须记，', 'yī nián hǎo jǐng jūn xū jì'),
      l('最是橙黄橘绿时。', 'zuì shì chéng huáng jú lǜ shí'),
    ],
    meaning:
      '荷花谢了，连那把像雨伞一样的荷叶也没有了；菊花残了，枝条还挺立着，一点都不怕霜。一年里最好的景致你要记住呀——就是橙子黄了、橘子还绿着的这个时候。',
  },
  {
    id: 'yeshusuojian',
    title: '夜书所见',
    dynasty: '宋',
    author: '叶绍翁',
    lines: [
      l('萧萧梧叶送寒声，', 'xiāo xiāo wú yè sòng hán shēng'),
      l('江上秋风动客情。', 'jiāng shàng qiū fēng dòng kè qíng'),
      // ⚠️「挑」这里读 tiǎo（用细棍拨），TTS 会念成挑选的 tiāo，改喂同音的「窕」
      l('知有儿童挑促织，', 'zhī yǒu ér tóng tiǎo cù zhī', '知有儿童窕促织，'),
      l('夜深篱落一灯明。', 'yè shēn lí luò yī dēng míng'),
    ],
    meaning:
      '梧桐叶被风吹得沙沙响，送来一阵阵凉意，江上的秋风让离家的人想起了家。忽然看见远处篱笆下有一盏灯还亮着——准是有小孩在那儿逗蟋蟀玩呢。',
  },
  {
    id: 'wangtianmenshan',
    title: '望天门山',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('天门中断楚江开，', 'tiān mén zhōng duàn chǔ jiāng kāi'),
      l('碧水东流至此回。', 'bì shuǐ dōng liú zhì cǐ huí'),
      l('两岸青山相对出，', 'liǎng àn qīng shān xiāng duì chū'),
      l('孤帆一片日边来。', 'gū fān yī piàn rì biān lái'),
    ],
    meaning:
      '天门山从中间断开，长江水从那里冲了过去。碧绿的江水往东流，到这里打了个转。两岸的青山一座对着一座迎上来，一只孤单的小船，正从太阳那边慢慢驶过来。',
  },
  {
    id: 'yinhushang',
    title: '饮湖上初晴后雨',
    dynasty: '宋',
    author: '苏轼',
    lines: [
      l('水光潋滟晴方好，', 'shuǐ guāng liàn yàn qíng fāng hǎo'),
      l('山色空蒙雨亦奇。', 'shān sè kōng méng yǔ yì qí'),
      l('欲把西湖比西子，', 'yù bǎ xī hú bǐ xī zǐ'),
      l('淡妆浓抹总相宜。', 'dàn zhuāng nóng mǒ zǒng xiāng yí'),
    ],
    meaning:
      '晴天的时候，西湖的水波亮闪闪的，好看极了；下起雨来，山被雾蒙住，又是另一种好看。要是把西湖比作美人西施，那她化淡妆也好、化浓妆也好，怎么样都好看。',
  },
  {
    id: 'wangdongting',
    title: '望洞庭',
    dynasty: '唐',
    author: '刘禹锡',
    lines: [
      // ⚠️「和」这里读 hé（和谐），古诗里「相和」常读成应和的 hè，改喂同音的「河」
      l('湖光秋月两相和，', 'hú guāng qiū yuè liǎng xiāng hé', '湖光秋月两相河，'),
      l('潭面无风镜未磨。', 'tán miàn wú fēng jìng wèi mó'),
      l('遥望洞庭山水翠，', 'yáo wàng dòng tíng shān shuǐ cuì'),
      l('白银盘里一青螺。', 'bái yín pán lǐ yī qīng luó'),
    ],
    meaning:
      '湖水的光和秋天的月亮合在一起，安安静静。没有风的湖面，像一面还没磨亮的镜子。远远望过去，洞庭湖的山和水都是青翠的，那座山就像白银盘子里放着的一只小青螺。',
  },
  {
    id: 'jiuyuejiuri',
    title: '九月九日忆山东兄弟',
    dynasty: '唐',
    author: '王维',
    lines: [
      l('独在异乡为异客，', 'dú zài yì xiāng wéi yì kè'),
      l('每逢佳节倍思亲。', 'měi féng jiā jié bèi sī qīn'),
      l('遥知兄弟登高处，', 'yáo zhī xiōng dì dēng gāo chù'),
      l('遍插茱萸少一人。', 'biàn chā zhū yú shǎo yī rén'),
    ],
    meaning:
      '一个人在别的地方做客，每到过节的时候就特别想家里人。我知道今天哥哥弟弟们一定去爬山了，他们头上都插着茱萸，可是数一数，少了我一个。',
  },
  {
    id: 'chunri',
    title: '春日',
    dynasty: '宋',
    author: '朱熹',
    lines: [
      l('胜日寻芳泗水滨，', 'shèng rì xún fāng sì shuǐ bīn'),
      l('无边光景一时新。', 'wú biān guāng jǐng yī shí xīn'),
      l('等闲识得东风面，', 'děng xián shí dé dōng fēng miàn'),
      l('万紫千红总是春。', 'wàn zǐ qiān hóng zǒng shì chūn'),
    ],
    meaning:
      '天气好的日子到泗水边上去找春天，一眼望不到边的景色全都变新了。随便走走就认出了春风的样子——满眼的红红紫紫，那都是春天呀。',
  },
  {
    id: 'huichongchunjiang',
    title: '惠崇春江晚景',
    dynasty: '宋',
    author: '苏轼',
    lines: [
      l('竹外桃花三两枝，', 'zhú wài táo huā sān liǎng zhī'),
      l('春江水暖鸭先知。', 'chūn jiāng shuǐ nuǎn yā xiān zhī'),
      l('蒌蒿满地芦芽短，', 'lóu hāo mǎn dì lú yá duǎn'),
      l('正是河豚欲上时。', 'zhèng shì hé tún yù shàng shí'),
    ],
    meaning:
      '竹林外面开了三两枝桃花。春天江水暖了没有？水里的鸭子最先知道。岸上长满了蒌蒿，芦苇刚冒出短短的芽——这正是河豚要顺着江水游上来的时候。',
  },
  {
    id: 'duzuojingtingshan',
    title: '独坐敬亭山',
    dynasty: '唐',
    author: '李白',
    lines: [
      l('众鸟高飞尽，', 'zhòng niǎo gāo fēi jìn'),
      l('孤云独去闲。', 'gū yún dú qù xián'),
      l('相看两不厌，', 'xiāng kàn liǎng bù yàn'),
      l('只有敬亭山。', 'zhǐ yǒu jìng tíng shān'),
    ],
    meaning:
      '鸟儿都飞得高高的，飞走了；天上最后一片云也慢悠悠地飘远了。这时候还愿意和我互相看着、怎么看都不烦的，就只剩下敬亭山了。',
  },
  {
    id: 'qiqiao',
    title: '乞巧',
    dynasty: '唐',
    author: '林杰',
    lines: [
      l('七夕今宵看碧霄，', 'qī xī jīn xiāo kàn bì xiāo'),
      l('牵牛织女渡河桥。', 'qiān niú zhī nǚ dù hé qiáo'),
      l('家家乞巧望秋月，', 'jiā jiā qǐ qiǎo wàng qiū yuè'),
      l('穿尽红丝几万条。', 'chuān jìn hóng sī jǐ wàn tiáo'),
    ],
    meaning:
      '七月初七这天晚上，大家都抬头看碧蓝的天空——牛郎和织女要过桥相会了。家家户户望着秋天的月亮穿针引线，红丝线穿了好几万条。',
  },
  {
    id: 'chuzhouxijian',
    title: '滁州西涧',
    dynasty: '唐',
    author: '韦应物',
    // ⚠️ 人名「应物」的应读 yìng，TTS 会念成应该的 yīng，改喂同音的「映」
    headSpoken: '滁州西涧。唐，韦映物。',
    lines: [
      l('独怜幽草涧边生，', 'dú lián yōu cǎo jiàn biān shēng'),
      l('上有黄鹂深树鸣。', 'shàng yǒu huáng lí shēn shù míng'),
      l('春潮带雨晚来急，', 'chūn cháo dài yǔ wǎn lái jí'),
      l('野渡无人舟自横。', 'yě dù wú rén zhōu zì héng'),
    ],
    meaning:
      '我最喜欢涧边那些静静长着的小草，头顶的深树里还有黄鹂在叫。傍晚下起雨来，春天的潮水涨得很急；没有人的渡口上，一只小船自己横在水面上。',
  },
  {
    id: 'youziyin',
    title: '游子吟',
    dynasty: '唐',
    author: '孟郊',
    lines: [
      l('慈母手中线，', 'cí mǔ shǒu zhōng xiàn'),
      l('游子身上衣。', 'yóu zǐ shēn shàng yī'),
      // ⚠️「缝」这里读 féng（缝衣服），TTS 会念成缝隙的 fèng，改喂同音的「逢」
      l('临行密密缝，', 'lín xíng mì mì féng', '临行密密逢，'),
      l('意恐迟迟归。', 'yì kǒng chí chí guī'),
      l('谁言寸草心，', 'shuí yán cùn cǎo xīn'),
      l('报得三春晖。', 'bào dé sān chūn huī'),
    ],
    meaning:
      '慈祥的妈妈手里拿着针线，给要出远门的孩子缝衣裳。走之前一针一针缝得密密的，怕他很久很久才回来。小草那么小的一点心意，怎么报答得了春天太阳的温暖呢？',
  },
  {
    id: 'jiangpanxunhua',
    title: '江畔独步寻花',
    dynasty: '唐',
    author: '杜甫',
    lines: [
      l('黄四娘家花满蹊，', 'huáng sì niáng jiā huā mǎn xī'),
      l('千朵万朵压枝低。', 'qiān duǒ wàn duǒ yā zhī dī'),
      l('留连戏蝶时时舞，', 'liú lián xì dié shí shí wǔ'),
      l('自在娇莺恰恰啼。', 'zì zài jiāo yīng qià qià tí'),
    ],
    meaning:
      '黄四娘家的小路上开满了花，千朵万朵把枝条都压弯了。蝴蝶舍不得走，一直在花间飞来飞去；自由自在的黄莺，恰好在这时候唱起歌来。',
  },
  {
    id: 'niaomingjian',
    title: '鸟鸣涧',
    dynasty: '唐',
    author: '王维',
    lines: [
      l('人闲桂花落，', 'rén xián guì huā luò'),
      l('夜静春山空。', 'yè jìng chūn shān kōng'),
      l('月出惊山鸟，', 'yuè chū jīng shān niǎo'),
      l('时鸣春涧中。', 'shí míng chūn jiàn zhōng'),
    ],
    meaning:
      '人安安静静的，桂花轻轻地落下来。夜里很静，春天的山空荡荡的。月亮出来了，把山里的鸟儿惊醒，它们在春天的山涧里时不时叫上一声。',
  },
  {
    id: 'yugezi',
    title: '渔歌子',
    dynasty: '唐',
    author: '张志和',
    lines: [
      // ⚠️ 地名「西塞山」的塞读 sài，TTS 会念成瓶塞的 sāi，改喂同音的「赛」
      l('西塞山前白鹭飞，', 'xī sài shān qián bái lù fēi', '西赛山前白鹭飞，'),
      l('桃花流水鳜鱼肥。', 'táo huā liú shuǐ guì yú féi'),
      l('青箬笠，绿蓑衣，', 'qīng ruò lì lǜ suō yī'),
      // ⚠️「斜」读 xié，同《山行》那一句，改喂同音的「协」
      l('斜风细雨不须归。', 'xié fēng xì yǔ bù xū guī', '协风细雨不须归。'),
    ],
    meaning:
      '西塞山前面白鹭在飞，桃花开了，江水涨起来，鳜鱼长得正肥。戴着青色的斗笠、穿着绿色的蓑衣，在斜斜的风、细细的雨里钓鱼，一点也不想回家。',
  },
  {
    id: 'zhizinongbing',
    title: '稚子弄冰',
    dynasty: '宋',
    author: '杨万里',
    lines: [
      l('稚子金盆脱晓冰，', 'zhì zǐ jīn pén tuō xiǎo bīng'),
      // ⚠️「当」这里读 dàng（当作），TTS 会念成应当的 dāng，改喂同音的「荡」
      l('彩丝穿取当银铮。', 'cǎi sī chuān qǔ dàng yín zhēng', '彩丝穿取荡银铮。'),
      l('敲成玉磬穿林响，', 'qiāo chéng yù qìng chuān lín xiǎng'),
      l('忽作玻璃碎地声。', 'hū zuò bō lí suì dì shēng'),
    ],
    meaning:
      '一大早，小孩把铜盆里冻的冰整块脱出来，用彩色的丝线穿上，当作小锣来敲。敲起来像玉磬一样，声音穿过树林；忽然啪的一声，冰掉在地上碎了，像玻璃碎掉的响声。',
  },
  {
    id: 'cunwan',
    title: '村晚',
    dynasty: '宋',
    author: '雷震',
    lines: [
      // ⚠️「陂」这里读 bēi（池塘岸），TTS 会念成 pō，改喂同音的「杯」——「水满杯」也读得通
      l('草满池塘水满陂，', 'cǎo mǎn chí táng shuǐ mǎn bēi', '草满池塘水满杯，'),
      l('山衔落日浸寒漪。', 'shān xián luò rì jìn hán yī'),
      l('牧童归去横牛背，', 'mù tóng guī qù héng niú bèi'),
      l('短笛无腔信口吹。', 'duǎn dí wú qiāng xìn kǒu chuī'),
    ],
    meaning:
      '池塘里长满了草，水涨得满满的。太阳落到山边，像被山衔住了，倒映在带着凉意的水波里。放牛的小孩回家了，横坐在牛背上，拿着短笛随口乱吹，也没有个调子。',
  },
  {
    id: 'tixilinbi',
    title: '题西林壁',
    dynasty: '宋',
    author: '苏轼',
    lines: [
      l('横看成岭侧成峰，', 'héng kàn chéng lǐng cè chéng fēng'),
      l('远近高低各不同。', 'yuǎn jìn gāo dī gè bù tóng'),
      l('不识庐山真面目，', 'bù shí lú shān zhēn miàn mù'),
      l('只缘身在此山中。', 'zhǐ yuán shēn zài cǐ shān zhōng'),
    ],
    meaning:
      '横着看，庐山是一道长长的山岭；侧着看，又变成了一座高高的山峰。远处近处、高处低处，看到的样子都不一样。看不清庐山到底长什么样，只因为我自己就站在这座山里面呀。',
  },
  {
    id: 'sujiandejiang',
    title: '宿建德江',
    dynasty: '唐',
    author: '孟浩然',
    lines: [
      // ⚠️「泊」这里读 bó（停船），TTS 会念成湖泊的 pō，改喂同音的「舶」——也是船
      l('移舟泊烟渚，', 'yí zhōu bó yān zhǔ', '移舟舶烟渚，'),
      l('日暮客愁新。', 'rì mù kè chóu xīn'),
      l('野旷天低树，', 'yě kuàng tiān dī shù'),
      l('江清月近人。', 'jiāng qīng yuè jìn rén'),
    ],
    meaning:
      '把小船停到烟雾蒙蒙的小沙洲边，天黑下来，离家的人心里又添了一点愁。旷野上，天空显得比树还低；江水清清的，水里的月亮好像离人特别近。',
  },
]

/**
 * 三辑的声明。⚠️ 只能往后加，不能重排——她记的是位置，见文件头
 */
export const POEM_VOLUMES: readonly PoemVolume[] = [
  {
    id: 'vol1',
    name: '第一辑',
    badge: '1',
    hint: '一年级课本里的那些',
    poems: VOLUME_1_POEMS,
  },
  {
    id: 'vol2',
    name: '第二辑',
    badge: '2',
    hint: '二年级课本 + 数字诗、过年、放风筝',
    poems: VOLUME_2_POEMS,
  },
  {
    id: 'vol3',
    name: '第三辑',
    badge: '3',
    hint: '三四年级课本里画面最好看的',
    poems: VOLUME_3_POEMS,
  },
]

/**
 * 全部 60 首，摊平。语音清单、测试与 `poemById` 用。
 *
 * ⚠️ **不要拿它去预取音频**：60 首的全部句子一次解码会在 iPad 上卡一下。
 * 诗单只预取当前那一辑的诗题，见 `PoemLibrary.tsx`。
 */
export const POEMS: readonly Poem[] = POEM_VOLUMES.flatMap((volume) => volume.poems)

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
 *
 * ⚠️ 查重是**全表**的（由 `poems.test.ts` 拦），比实际需要严一点：
 * 分辑之后一次只摆一辑，撞车只在同一辑内才看得见。严着来是故意的——
 * 加第四辑时不必回头翻前三辑用过什么，测试会直接告诉你。
 */
export const POEM_COVERS: Readonly<Record<string, string>> = {
  // ── 第一辑 ──
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

  // ── 第二辑 ──
  meihua: '❄️', // 凌寒独自开
  xiaoerchuidiao: '🧒',
  yesushansi: '⭐', // 手可摘星辰
  cunju: '🪁', // 忙趁东风放纸鸢
  cao: '🍀',
  xiaochujingcisi: '🌺', // 荷花。⚠️ 不能用莲花 🪷，见上面的码点上限
  shancunyonghuai: '🔢', // 一去二三里 —— 她在数学里正数到这些数
  mutong: '🎵', // 笛弄晚风三四声
  yuanri: '🧨', // 爆竹声中一岁除
  qingming: '☔',
  xiangsi: '❤️', // 红豆
  zaofabaidicheng: '🐒', // 两岸猿声啼不住
  yonghuashan: '🗻',
  dalinsitaohua: '🍑', // 山寺桃花始盛开
  yijiangnan: '🌅', // 日出江花红胜火
  mifeng: '🐝',
  suxinshi: '🦋', // 儿童急走追黄蝶
  xunhuyinjun: '🌊', // 渡水复渡水
  jueju: '🐦', // 两个黄鹂鸣翠柳
  jiangnanchun: '🏘️', // 水村山郭酒旗风

  // ── 第三辑 ──
  shanxing: '🍁', // 霜叶红于二月花
  zengliujingwen: '🍊', // 最是橙黄橘绿时
  yeshusuojian: '🦗', // 儿童挑促织
  wangtianmenshan: '🏞️',
  yinhushang: '🌦️', // 晴方好、雨亦奇 —— 一半晴一半雨，正是这首诗
  wangdongting: '🐚', // 白银盘里一青螺
  jiuyuejiuri: '🏔️', // 兄弟登高处
  chunri: '🌼', // 万紫千红总是春
  huichongchunjiang: '🦆', // 春江水暖鸭先知
  duzuojingtingshan: '🕊️', // 众鸟高飞尽
  qiqiao: '🧵', // 穿尽红丝几万条
  chuzhouxijian: '🚣', // 野渡无人舟自横
  youziyin: '🧶', // 慈母手中线
  jiangpanxunhua: '🌷', // 千朵万朵压枝低
  niaomingjian: '🌛', // 月出惊山鸟
  yugezi: '🐠', // 鳜鱼肥。与第一辑《江南》的 🐟 是两条不同的鱼，且不同辑
  zhizinongbing: '🧊', // 金盆脱晓冰
  cunwan: '🌇', // 山衔落日
  tixilinbi: '🌄', // 横看成岭侧成峰
  sujiandejiang: '🌫️', // 移舟泊烟渚
}

/** 按 id 查一首诗。详情页用 */
export function poemById(id: string): Poem | undefined {
  return POEMS.find((poem) => poem.id === id)
}
