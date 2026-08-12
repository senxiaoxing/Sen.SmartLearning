/**
 * @file 拼音表 —— 拼音乐园那面墙上摆的 63 张卡，按教学单元分组
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/pinyinSyllables.ts  音节与发音载体（**读音的事实源在那边**）
 * @see src/features/chinese/PinyinWall.tsx  这面墙
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
 * ## ⚠️ 四个韵母念的是例词，不是韵母本身
 *
 * `ei` `ün` `eng` `ong` 没有干净的汉字载体（详见 pinyinSyllables.ts），
 * 硬念拼音串会读错声调。课本的做法就是拿一个含它的词来教（"eng，台灯的 eng"），
 * 这里照办：它们的 `carrier` 指向例词的音节，卡面把那个字显示出来，
 * 保证**看到的就是听到的**。
 */

import { ALL_SYLLABLES } from '@/data/seed/pinyinSyllables'
import { syllableKey } from '@/domain/pinyin'
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
   * 只有 `ei` `ün` `eng` `ong` 四张卡有——它们借例词发音。
   * UI 必须把它显示出来，否则就成了「卡面写 eng、耳朵听到 fēng」的错位。
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
 * 造一张卡。`base`/`tone` 指向音节表里的发音载体。
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
 * @param base - 载体音节的不带调形式，如 `'bo'`
 * @param tone - 载体音节的声调
 * @param carrier - 借例词发音时，实际念出来的那个汉字
 * @throws 音节表里没有这个音节时
 */
function card(
  form: string,
  mnemonic: string,
  base: string,
  tone: Tone,
  carrier?: string,
): PinyinChartCard {
  const clipKey = syllableKey(base, tone)
  const syllable = SYLLABLE_BY_KEY.get(clipKey)
  if (syllable === undefined) {
    throw new Error(`拼音表的「${form}」引用了音节表里不存在的 ${clipKey}`)
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
 * 六张单韵母卡。
 *
 * ⚠️ `form` 一律**不标声调**——这一组教的是元音音色不是声调，
 * 标了调就等于对声调作了声明，而 P1.3 才教声调。与音节表的 `toneless` 同一个道理。
 */
const SINGLE_FINALS: readonly PinyinChartCard[] = [
  card('a', '嘴巴张大', 'a', 1),
  card('o', '嘴巴圆圆', 'o', 1),
  card('e', '嘴巴扁扁', 'e', 2),
  card('i', '牙齿对齐', 'i', 1),
  card('u', '嘴巴突出', 'u', 1),
  card('ü', '小鱼吐泡', 'ü', 2),
]

/**
 * 二十三张声母卡，按课本顺序（b p m f → d t n l → g k h → j q x → z c s → zh ch sh r → y w）。
 *
 * 口诀全是**字形**口诀。一年级最高频的错误是 b/d、p/q 认反（见 P7.1、P7.2），
 * 那是字形问题不是发音问题，所以记忆的抓手必须落在「半圆朝哪边」上。
 */
const INITIALS: readonly PinyinChartCard[] = [
  card('b', '右下半圆', 'bo', 1),
  card('p', '右上半圆', 'po', 1),
  card('m', '两个门洞', 'mo', 1),
  card('f', '一根拐棍', 'fo', 2),
  // ⚠️ 这四个念的是含该声母的常用字，不是呼读音（dē tē nē lē）——
  //    后三者在汉语里没有干净的单音字（得/讷/乐 不是多音就是生僻），
  //    见 pinyinSyllables.ts 的 INITIALS。所以和 ei 一样把字标出来
  card('d', '左下半圆', 'di', 4, '弟'),
  card('t', '伞把朝下', 'te', 4, '特'),
  card('n', '一个门洞', 'ni', 3, '你'),
  card('l', '一根小棍', 'li', 3, '里'),
  card('g', '鸽子的头', 'ge', 1),
  card('k', '小小蝌蚪', 'ke', 1),
  card('h', '一把椅子', 'he', 1),
  card('j', '竖弯加点', 'ji', 1),
  card('q', '气球带线', 'qi', 1),
  card('x', '一把剪刀', 'xi', 1),
  card('z', '像个二字', 'zi', 1),
  card('c', '像个半圆', 'ci', 2),
  card('s', '像条丝带', 'si', 1),
  card('zh', 'z 加椅子', 'zhi', 1),
  card('ch', 'c 加椅子', 'chi', 1),
  card('sh', 's 加椅子', 'shi', 1),
  card('r', '一棵幼苗', 'ri', 4),
  card('y', '一个树杈', 'yi', 1),
  card('w', '两个屋顶', 'wu', 1),
]

/**
 * 九张复韵母卡。
 *
 * 口诀是**谐音词**：复韵母没有字形上的抓手，课本一律用「阿姨 ai」这样的词来带。
 * ⚠️ `ei` 借「飞」发音，见文件头。
 */
const COMPOUND_FINALS: readonly PinyinChartCard[] = [
  card('ai', '阿姨', 'ai', 1),
  card('ei', '飞机', 'fei', 1, '飞'),
  card('ui', '围巾', 'ui', 1),
  card('ao', '奥运', 'ao', 1),
  card('ou', '海鸥', 'ou', 1),
  card('iu', '邮票', 'iu', 1),
  card('ie', '椰子', 'ie', 1),
  card('üe', '月亮', 'üe', 1),
  card('er', '耳朵', 'er', 2),
]

/** 五张前鼻韵母卡。⚠️ `ün` 借「云」发音，见文件头 */
const FRONT_NASALS: readonly PinyinChartCard[] = [
  card('an', '天安门', 'an', 1),
  card('en', '摁门铃', 'en', 1),
  card('in', '树荫', 'in', 1),
  card('un', '蚊子', 'un', 1),
  card('ün', '白云', 'yun', 2, '云'),
]

/**
 * 四张后鼻韵母卡。⚠️ 四个里有两个（`eng` `ong`）借例词发音，见文件头。
 *
 * 前后鼻音是南方孩子最高频的难点（P5.3 是重点知识点），
 * 所以前鼻与后鼻**分成两组并排摆**，而不是混在一张「鼻韵母」表里——
 * 摆位本身就是一次对比。
 */
const BACK_NASALS: readonly PinyinChartCard[] = [
  card('ang', '山羊', 'ang', 1),
  card('eng', '台灯', 'feng', 1, '风'),
  card('ing', '老鹰', 'ing', 1),
  card('ong', '闹钟', 'song', 1, '松'),
]

/**
 * 十六个整体认读音节。
 *
 * ⭐ 口诀统一是「不用拼，直接读」——这正是它们与其他音节的唯一区别，
 * 也正是 `spell_integral` 误区的来源（孩子把 zhi 拆成 zh-i 去拼）。
 * 每张卡的 `carrier` 都填了：这一组念的是载体字（zhi → 知），
 * 显示出来孩子才知道自己听到的是哪个字。
 */
const INTEGRALS: readonly PinyinChartCard[] = [
  card('zhi', '直接读', 'zhi', 1, '知'),
  card('chi', '直接读', 'chi', 1, '吃'),
  card('shi', '直接读', 'shi', 1, '诗'),
  card('ri', '直接读', 'ri', 4, '日'),
  card('zi', '直接读', 'zi', 1, '资'),
  card('ci', '直接读', 'ci', 2, '词'),
  card('si', '直接读', 'si', 1, '思'),
  card('yi', '直接读', 'yi', 1, '衣'),
  card('wu', '直接读', 'wu', 1, '屋'),
  card('yu', '直接读', 'yu', 2, '鱼'),
  card('ye', '直接读', 'ye', 4, '叶'),
  card('yue', '直接读', 'yue', 4, '月'),
  card('yuan', '直接读', 'yuan', 3, '远'),
  card('yin', '直接读', 'yin', 1, '音'),
  card('yun', '直接读', 'yun', 2, '云'),
  card('ying', '直接读', 'ying', 1, '英'),
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
