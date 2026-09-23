/**
 * @file 拼音表 —— 拼音乐园那面墙上摆的 63 张卡，按教学单元分组
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/pinyinSyllables.ts  音节与发音载体（**读音的事实源在那边**）
 * @see src/features/chinese/PinyinWall.tsx  这面墙
 * @see design/11-拼音真人录音方案.md §3.2 声母韵母念本音、整体认读念音节
 * @see design/01-知识点图谱.md §4 汉语拼音
 *
 * ## 这张表管「怎么摆、怎么记」，不管「怎么读」
 *
 * 读音一律由 {@link syllableKey} 从音节表推出来，本文件**不写任何音频文本**。
 * 两处各写一份的话，改了载体字这边不会跟着变，表现是「卡面写 ai、听到的是别的音」。
 *
 * ## 口诀是抄课堂的，不是自己编的
 *
 * `mnemonic` 全部取自人教/统编版拼音教学的通行口诀（单韵母看口型、声母看字形、
 * 复韵母用谐音词）。**必须和老师教的一致**——孩子在学校听一套、在这里看另一套，
 * 记忆会互相干扰，而这一页存在的意义恰恰是给课堂做复习。
 *
 * ## ⭐ 声母韵母念**本音**，不再念呼读音（2026-09）
 *
 * 声母卡的卡面写的是字母 `f`，而卡面下播的曾经是呼读音「佛 fó」——
 * 那是 TTS 拿汉字载体凑出来的音（Edge TTS 是文本转语音，喂 `f` 只能靠它猜）。
 * 实测「佛」的人声段里 **84% 是元音**，孩子听到的是一个**完整音节**，
 * 而人教版教材要的是「**读得轻短些**」。
 *
 * 现在 47 张声母/韵母卡改走 `pinyinbare.*`：真人录的**本音**，无调、轻短。
 * 卡面写 `f`，耳朵里就是 /f/。`ong` 顺带不再借例词「松」——
 * 它一直只是「汉语里找不到呼读字」的将就，现在有了干净录音。
 *
 * ## ⭐ 2026-09-23：63 张卡整体换成权威音源 `pinyinv3.*`
 *
 * 素材是教材点读的朗读，一次录成（`authenticKey`）。与上一版的区别有三处：
 *
 * ```
 * 片段      一张卡一条，声母韵母与整体认读不再分两条轨道，也没有共用
 * 整体认读   念音节本身、16 条全是一声 → ⛔ 整组不再标载体字
 * 来源      cmguo 那 47 条 `pinyinbare.*` 不再被任何地方引用（文件保留）
 * ```
 *
 * 经过（含两条走不通的路：声音转换、截短 TTS）记在小程序项目
 * `Sen.MiniProgram/design/02` §2 与 `design/09`——那边先做，这边跟随。
 *
 * ⚠️ **题目那边仍然念带调音节**（选项显示 `fó`、播的就是 `fó`）。
 * 两条轨道是刻意的：`pinyin.fo2` 同时被 `itemTemplates.ts` 的
 * P2.x / P8.1 / P8.3 当作「一个音节」使用，就地换成纯辅音会让那些题
 * 变成没有正确答案。见 design/11-拼音真人录音方案.md §3.1。
 */

import { ALL_SYLLABLES } from '@/data/seed/pinyinSyllables'
import { authenticKey, syllableKey } from '@/domain/pinyin'
import type { Tone } from '@/domain/pinyin'

/** 拼音墙上的一张卡 */
export interface PinyinChartCard {
  /** 卡面主体：声母/韵母/整体认读音节本身，如 `'b'` `'ai'` `'zhi'` */
  form: string
  /**
   * 教学口诀。声母是字形口诀（「右下半圆 bbb」），
   * 单韵母是口型口诀（「嘴巴张大」），复韵母与鼻韵母是谐音词（「阿姨」）。
   */
  mnemonic: string
  /** 三连读，如 `'a a a'`。课堂上就是这么带读的 */
  chant: string
  /** 语音片段 key，由音节表推出 */
  clipKey: string
  /**
   * 片段缺失时走 TTS 念的文本 —— 载体汉字，**不是 form**。
   *
   * ⚠️ 拿 `form` 兜底会念出灾难：`'b'` 会被中文引擎念成英文字母 bee，
   * `'ai'` 更是不知道会读成什么。而载体字（玻、哀）必然读对。
   */
  spoken: string
  /**
   * 当音频念的**不是这张卡的 form** 时，这里放实际念出来的那个字。
   *
   * 只剩 16 张整体认读卡有：卡面写 `zhi`、念的是「知」。
   * UI 必须把它显示出来，否则就成了「卡面写 zhi、耳朵听到别的字」的错位。
   *
   * ⚠️ 声母/韵母卡**刻意不标**——它们念的就是卡面那个音（`f` → /f/），
   * 标出载体字反而让孩子以为在学那个字。
   */
  carrier?: string
}

/** 一个教学单元的卡片组 */
export interface PinyinChartGroup {
  id: string
  name: string
  /** 分组标题前的图标。⚠️ 只是装饰，语义不靠它承载 */
  emoji: string
  /**
   * 这一组对应的知识点。用于给已经开始学的组加高亮圈。
   * ⚠️ 是**信息不是门槛**：没学到的组照样能点能听，见 PinyinWall 文件头。
   */
  kpIds: readonly string[]
  cards: readonly PinyinChartCard[]
}

/** 音节表按片段 key 建索引，`card()` 据此取载体字 */
const SYLLABLE_BY_KEY = new Map(
  ALL_SYLLABLES.map((syllable) => [syllableKey(syllable.base, syllable.tone), syllable]),
)

/**
 * 造一张卡。`base`/`tone` 指向音节表里的那一条——**兜底文本由它而来**。
 *
 * ⭐ **查不到音节就直接抛错**，不静默降级。
 *
 * 这里错一个 `base`/`tone` 的后果是「卡面写 ai、播出来是别的音」——
 * 而它不会报任何错，只有懂拼音的人凑巧听到才会发现。
 * 与其留一个静默的坑，不如在模块加载时就崩掉：任何一个 import 这张表的
 * 测试或页面都会立刻暴露它。这和 `lettersFrom()` 对越界区间抛错是同一个判断。
 *
 * @param form - 卡面显示的声母/韵母
 * @param mnemonic - 教学口诀
 * @param clipKey - 实际播放的片段
 * @param base - 音节表里的不带调形式，如 `'bo'`。**兜底文本与校验都靠它**
 * @param tone - 声调
 * @param carrier - 借例词发音时，实际念出来的那个汉字
 * @throws 音节表里没有这个音节时
 */
function buildCard(
  form: string,
  mnemonic: string,
  clipKey: string,
  base: string,
  tone: Tone,
  carrier?: string,
): PinyinChartCard {
  const syllable = SYLLABLE_BY_KEY.get(syllableKey(base, tone))
  if (syllable === undefined) {
    throw new Error(`拼音表的「${form}」引用了音节表里不存在的 ${syllableKey(base, tone)}`)
  }

  return {
    form,
    mnemonic,
    // 三个之间留空格：不留的话 `iii` 看起来像一个陌生的长单词，
    // 而课堂上带读本来就是「i—i—i」三声分开的
    chant: `${form} ${form} ${form}`,
    clipKey,
    spoken: syllable.char ?? syllable.pinyin,
    ...(carrier === undefined ? {} : { carrier }),
  }
}

/**
 * ⭐ 造一张墙上的卡 —— 片段直接由**卡面写法**推出（`authenticKey('f')` → `pinyinv3.f`）。
 *
 * 2026-09-23 起 63 张卡全走这条：一张卡一条权威音源录音，
 * 不再有「声母走 pinyinbare、整体认读走 pinyin」的分岔，也没有任何共用片段。
 *
 * `base`/`tone` 不参与发声，只做两件事：在音节表里校验这张卡写得对不对，
 * 以及取 `spoken`（片段缺失时的兜底文本）——拿 `'b'` 去念会得到英文字母 bee，
 * 而载体字「玻」必然读对。
 */
function wallCard(form: string, mnemonic: string, base: string, tone: Tone): PinyinChartCard {
  return buildCard(form, mnemonic, authenticKey(form), base, tone)
}

/**
 * 六张单韵母卡。
 *
 * ⚠️ `form` 一律**不标声调**——这一组教的是元音音色不是声调，
 * 标了调就等于对声调作了声明，而 P1.3 才教声调。与音节表的 `toneless` 同一个道理。
 */
const SINGLE_FINALS: readonly PinyinChartCard[] = [
  wallCard('a', '嘴巴张大', 'a', 1),
  wallCard('o', '嘴巴圆圆', 'o', 1),
  wallCard('e', '嘴巴扁扁', 'e', 2),
  wallCard('i', '牙齿对齐', 'i', 1),
  wallCard('u', '嘴巴突出', 'u', 1),
  wallCard('ü', '小鱼吐泡', 'ü', 2),
]

/**
 * 二十三张声母卡，按课本顺序（b p m f → d t n l → g k h → j q x → z c s → zh ch sh r → y w）。
 *
 * 口诀全是**字形**口诀。一年级最高频的错误是 b/d、p/q 认反（见 P7.1、P7.2），
 * 那是字形问题不是发音问题，所以记忆的抓手必须落在「半圆朝哪边」上。
 */
const INITIALS: readonly PinyinChartCard[] = [
  // ⭐ 全部走 bareCard：卡面写 `b`，念的就是声母本身（轻短、无调），
  //    不再借「玻 bō」那类呼读音——孩子在这面墙上要认的是**声母**。
  //    `base` 只用来取兜底文本（片段缺失时念载体字），不参与发声。
  wallCard('b', '右下半圆', 'bo', 1),
  wallCard('p', '右上半圆', 'po', 1),
  wallCard('m', '两个门洞', 'mo', 1),
  wallCard('f', '一根拐棍', 'fo', 2),
  wallCard('d', '左下半圆', 'de', 1),
  wallCard('t', '伞把朝下', 'te', 4),
  wallCard('n', '一个门洞', 'ne', 4),
  wallCard('l', '一根小棍', 'le', 4),
  wallCard('g', '鸽子的头', 'ge', 1),
  wallCard('k', '小小蝌蚪', 'ke', 1),
  wallCard('h', '一把椅子', 'he', 1),
  wallCard('j', '竖弯加点', 'ji', 1),
  wallCard('q', '气球带线', 'qi', 1),
  wallCard('x', '一把剪刀', 'xi', 1),
  wallCard('z', '像个二字', 'zi', 1),
  wallCard('c', '像个半圆', 'ci', 1),
  wallCard('s', '像条丝带', 'si', 1),
  wallCard('zh', 'z 加椅子', 'zhi', 1),
  wallCard('ch', 'c 加椅子', 'chi', 1),
  wallCard('sh', 's 加椅子', 'shi', 1),
  wallCard('r', '一棵幼苗', 'ri', 4),
  wallCard('y', '一个树杈', 'yi', 1),
  wallCard('w', '两个屋顶', 'wu', 1),
]

/**
 * 九张复韵母卡。
 *
 * 口诀是**谐音词**：复韵母没有字形上的抓手，课本一律用「阿姨 ai」这样的词来带。
 * ⚠️ 口诀只是记忆的抓手，念出来的是**韵母本身的音**（`ei` 念 ēi 不是「飞」）——
 * 那正是 `bareCard` 走的 `pinyinbare.*`。
 */
const COMPOUND_FINALS: readonly PinyinChartCard[] = [
  wallCard('ai', '阿姨', 'ai', 1),
  wallCard('ei', '飞机', 'ei', 1),
  wallCard('ui', '围巾', 'ui', 1),
  wallCard('ao', '奥运', 'ao', 1),
  wallCard('ou', '海鸥', 'ou', 1),
  wallCard('iu', '邮票', 'iu', 1),
  wallCard('ie', '椰子', 'ie', 1),
  wallCard('üe', '月亮', 'üe', 1),
  wallCard('er', '耳朵', 'er', 2),
]

/**
 * 五张前鼻韵母卡。
 *
 * ⚠️ `ün` 曾经念呼读音「韵」（那是**四声**，而韵母这一组不教声调）——
 * 现在走 `pinyinbare.vn`，录的是无调的本音，卡面与耳朵终于对得上。
 */
const FRONT_NASALS: readonly PinyinChartCard[] = [
  wallCard('an', '天安门', 'an', 1),
  wallCard('en', '摁门铃', 'en', 1),
  wallCard('in', '树荫', 'in', 1),
  wallCard('un', '蚊子', 'un', 1),
  wallCard('ün', '白云', 'ün', 4),
]

/**
 * 四张后鼻韵母卡。
 *
 * ⭐ `ong` 不再借例词「松」：汉语里它确实不能独立成音节、也没有呼读字，
 * 但那一直是「拿不到干净录音」的将就。现在 `pinyinbare.ong` 有真人录的
 * 韵母本音，卡面写 `ong`、念的就是 ong。
 *
 * 前后鼻音是南方孩子最高频的难点（P5.3 是重点知识点），
 * 所以前鼻与后鼻**分成两组并排摆**，而不是混在一张「鼻韵母」表里——
 * 摆位本身就是一次对比。
 */
const BACK_NASALS: readonly PinyinChartCard[] = [
  wallCard('ang', '山羊', 'ang', 1),
  wallCard('eng', '台灯', 'eng', 1),
  wallCard('ing', '老鹰', 'ing', 1),
  wallCard('ong', '闹钟', 'ong', 1),
]

/**
 * 十六个整体认读音节。
 *
 * ⭐ 口诀统一是「不用拼，直接读」——这正是它们与其他音节的唯一区别，
 * 也正是 `spell_integral` 误区的来源（孩子把 zhi 拆成 zh-i 去拼）。
 * ## ⭐ 2026-09-23 起整组不标载体字
 *
 * 从前这一组念的是**某一个字**（zhi 念「知」、ri 念「日」rì），字必须显示出来。
 * 换成权威音源之后念的是**音节本身**，而且 16 条实测全是一声——
 * 再标「日 rì」就成了卡面四声、耳朵一声的错位；换一声同音字又补不齐
 * （`ri` 的一声根本没有汉字）。于是与声母韵母卡一样：不标。
 *
 * `base`/`tone` 保留原来那个字的声调，只用于音节表校验与兜底文本。
 */
const INTEGRALS: readonly PinyinChartCard[] = [
  wallCard('zhi', '直接读', 'zhi', 1),
  wallCard('chi', '直接读', 'chi', 1),
  wallCard('shi', '直接读', 'shi', 1),
  wallCard('ri', '直接读', 'ri', 4),
  wallCard('zi', '直接读', 'zi', 1),
  wallCard('ci', '直接读', 'ci', 1),
  wallCard('si', '直接读', 'si', 1),
  wallCard('yi', '直接读', 'yi', 1),
  wallCard('wu', '直接读', 'wu', 1),
  wallCard('yu', '直接读', 'yu', 2),
  wallCard('ye', '直接读', 'ye', 4),
  wallCard('yue', '直接读', 'yue', 4),
  wallCard('yuan', '直接读', 'yuan', 3),
  wallCard('yin', '直接读', 'yin', 1),
  wallCard('yun', '直接读', 'yun', 2),
  wallCard('ying', '直接读', 'ying', 1),
]

/**
 * 拼音墙的全部分组，**按教学顺序**：先单韵母，再声母，然后拼出来的各类韵母，
 * 最后是不用拼的整体认读。
 *
 * ⚠️ 顺序就是课本的顺序，不要按数量或难度重排——
 * 孩子在学校学到哪，就该在这面墙上从上往下找到哪。
 */
export const PINYIN_CHART: readonly PinyinChartGroup[] = [
  {
    id: 'single',
    name: '单韵母',
    emoji: '⭐',
    kpIds: ['P1.1', 'P1.2'],
    cards: SINGLE_FINALS,
  },
  {
    id: 'initial',
    name: '声母',
    emoji: '🎵',
    kpIds: ['P2.1', 'P2.2', 'P2.3', 'P2.4', 'P2.5', 'P2.6', 'P2.7'],
    cards: INITIALS,
  },
  {
    id: 'compound',
    name: '复韵母',
    emoji: '🌈',
    kpIds: ['P4.1', 'P4.2', 'P4.3'],
    cards: COMPOUND_FINALS,
  },
  {
    id: 'front-nasal',
    name: '前鼻韵母',
    emoji: '🌸',
    kpIds: ['P5.1'],
    cards: FRONT_NASALS,
  },
  {
    id: 'back-nasal',
    name: '后鼻韵母',
    emoji: '🍀',
    kpIds: ['P5.2'],
    cards: BACK_NASALS,
  },
  {
    id: 'integral',
    name: '整体认读音节',
    emoji: '🎈',
    kpIds: ['P6.1', 'P6.2', 'P6.3', 'P6.4', 'P6.5'],
    cards: INTEGRALS,
  },
]

/** 全部卡片，摊平。预取音频与测试用 */
export const ALL_CHART_CARDS: readonly PinyinChartCard[] = PINYIN_CHART.flatMap(
  (group) => group.cards,
)
