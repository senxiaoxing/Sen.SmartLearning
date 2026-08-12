/**
 * @file 拼音音节表 —— 每个音节念什么、用哪个汉字发音
 * @layer data  静态内容，随 App 版本内置
 * @see design/07-音频方案.md §3.3 拼音音频
 * @see design/01-知识点图谱.md §P 拼音 35 个知识点
 *
 * ⭐⭐ **这张表的正确性 = 孩子学到的发音是否正确。**
 * 表里错一个字，她就会把那个音节念错，而且是**反复练错**。
 * 这比 App 里任何一个 bug 都严重——改代码能修好，学错的发音要花很久纠正。
 *
 * ## 为什么每个音节都要挂一个汉字
 *
 * Edge TTS 是**文本**转语音，不是拼音转语音。直接喂 `bā` 它会去猜这串字符怎么读，
 * 猜得对不对无从保证；喂**汉字**「八」则必然读对——常用字的读音是 TTS 的看家本领。
 *
 * 实测确认：SSML 的 `<phoneme>` 音标覆盖在 msedge-tts 里不可用（标签会被转义），
 * 所以「挑一个读音正确的汉字」是目前唯一可靠的路子。
 *
 * ## 选字的三条硬规矩
 *
 * 1. **绝不用多音字** —— 「和」有 hé/huó/hè/huo 四读，TTS 挑哪个全凭运气。
 *    这是本表最大的风险来源。
 * 2. **优先常用字** —— 生僻字 TTS 也可能读错，且无法靠常识复核。
 * 3. **`char` 与 `pinyin` 必须真的对应** —— 这一列就是给人复核用的：
 *    懂拼音的人扫一眼「bā → 八」就知道对不对，不必听音频。
 *
 * 找不到合适汉字的音节，`char` 留空，生成时退回念拼音本身，
 * 并在校验页里标红——那些是**必须人工听一遍**的。
 */

// 类型与 key 规则在 domain 层，这里只放数据 —— 见 domain/pinyin.ts 的说明
import {
  displayForm,
  isUsable,
  syllableKey,
  type BlendSyllable,
  type Syllable,
  type TripleSyllable,
} from '@/domain/pinyin'

export { displayForm, isUsable, syllableKey }
export type { BlendSyllable, Syllable, TripleSyllable }

/**
 * 声母表。
 *
 * 念的是**呼读音**（b 念「玻」bo，不是英文字母 bee）——
 * 这是课堂上的读法，孩子听到的必须和老师一致。
 *
 * ⚠️ 传统教学用字里有几个是多音字或生僻字（得 dé/de/děi、勒 lè/lēi、蚩 生僻），
 * 能换的一律换成同音的常用单音字。
 *
 * ⭐ **d n l c 只能用教学惯用字**（的 讷 乐 呲）——它们是多音或生僻，
 * 但呼读音必须和老师教的一模一样，这一点压倒「用常用字」的偏好。
 * 全部标 `soundOnly`：只负责发音，绝不进「听音选字」的选项（见 domain/pinyin.ts）。
 */
export const INITIALS: readonly Syllable[] = [
  { pinyin: 'bō', base: 'bo', tone: 1, char: '玻' },
  { pinyin: 'pō', base: 'po', tone: 1, char: '坡' },
  { pinyin: 'mō', base: 'mo', tone: 1, char: '摸' },
  { pinyin: 'fó', base: 'fo', tone: 2, char: '佛' },
  { pinyin: 'dē', base: 'de', tone: 1, char: '的', soundOnly: true },
  { pinyin: 'tè', base: 'te', tone: 4, char: '特' },
  { pinyin: 'nè', base: 'ne', tone: 4, char: '讷', soundOnly: true },
  { pinyin: 'lè', base: 'le', tone: 4, char: '乐', soundOnly: true },
  { pinyin: 'gē', base: 'ge', tone: 1, char: '哥' },
  { pinyin: 'kē', base: 'ke', tone: 1, char: '科' },
  { pinyin: 'hē', base: 'he', tone: 1, char: '喝' },
  { pinyin: 'jī', base: 'ji', tone: 1, char: '鸡' },
  { pinyin: 'qī', base: 'qi', tone: 1, char: '七' },
  { pinyin: 'xī', base: 'xi', tone: 1, char: '西' },
  { pinyin: 'zhī', base: 'zhi', tone: 1, char: '知' },
  { pinyin: 'chī', base: 'chi', tone: 1, char: '吃' },
  { pinyin: 'shī', base: 'shi', tone: 1, char: '诗' },
  { pinyin: 'rì', base: 'ri', tone: 4, char: '日' },
  { pinyin: 'zī', base: 'zi', tone: 1, char: '资' },
  // ⭐ c 的呼读音是 cī（呲）不是 cí（词）——与 z(zī 资)、s(sī 思) 同为一声，
  //    原来这里是唯一的例外，念出来与老师带读的 z-c-s 三连不齐
  { pinyin: 'cī', base: 'ci', tone: 1, char: '呲', soundOnly: true },
  { pinyin: 'sī', base: 'si', tone: 1, char: '思' },
  { pinyin: 'yī', base: 'yi', tone: 1, char: '衣' },
  { pinyin: 'wū', base: 'wu', tone: 1, char: '屋' },
]

/**
 * 单韵母。P1.1 / P1.2 用这一组，**不带声调**。
 *
 * ⭐ 这是对「声调读错」问题的结构性修复。
 *
 * 原来这一组是 `ā á ǎ à ō ó ǒ ò ē ě è`——即把四声压在裸元音上。
 * 但裸拼音串没有汉字载体，TTS 只能猜怎么读，实测**大面积读错声调**
 * （`á` 读成 `ā`、`ā` 读成 `à`、`ē` 读成 `è`……）。
 * 而选项上明明标着 `ā`，播出来却是 `à`，这是在**明确地教错**。
 *
 * 修法不是去找更好的字（`a o e` 的四声在汉语里本就没有干净的单音字，
 * 「啊」「哦」「呃」全是多音字），而是**把声调从这一组里拿掉**：
 * 课本introduce 单韵母时本来就写作不带调的 `a o e`，声调是 P1.3 才教的东西。
 * 于是这里不再对声调作任何声明，也就无所谓读错。
 *
 * 声调教学移到 {@link TONE_SET}，那里用的是四个干净的常用字。
 */
export const SINGLE_FINALS: readonly Syllable[] = [
  // ⚠️ 「啊」「哦」是多音字，但这一组**不教声调**，只教元音音色，
  //    读成第几声都不影响这个知识点。列在这里的 pinyin 仅用于生成音频。
  { pinyin: 'ā', base: 'a', tone: 1, char: '啊', toneless: 'a' },
  { pinyin: 'ō', base: 'o', tone: 1, char: '噢', toneless: 'o' },
  { pinyin: 'é', base: 'e', tone: 2, char: '鹅', toneless: 'e' },
  { pinyin: 'yī', base: 'i', tone: 1, char: '衣', toneless: 'i' },
  { pinyin: 'wū', base: 'u', tone: 1, char: '屋', toneless: 'u' },
  { pinyin: 'yú', base: 'ü', tone: 2, char: '鱼', toneless: 'ü' },
]

/**
 * ⭐ 四声调教学专用（P1.3）。
 *
 * 用「**妈麻马骂**」——这是汉语教学里教声调的标准范例，几乎每本教材都用它。
 * 四个字全是**常用单音字**，TTS 必然读对，声调也必然分明。
 *
 * 相比原来的 `ā á ǎ à`：
 * - 原方案：裸拼音，TTS 靠猜，实测读错
 * - 现方案：四个常用字，读音有保证，而且孩子还认识这几个字，更有意义
 *
 * 这不是退而求其次——用有意义的最小对立组教声调本来就比裸元音好。
 */
export const TONE_SET: readonly Syllable[] = [
  { pinyin: 'mā', base: 'ma', tone: 1, char: '妈' },
  { pinyin: 'má', base: 'ma', tone: 2, char: '麻' },
  { pinyin: 'mǎ', base: 'ma', tone: 3, char: '马' },
  { pinyin: 'mà', base: 'ma', tone: 4, char: '骂' },
]

/**
 * 复韵母与鼻韵母。
 *
 * 只收**能独立成音节**的读法（即零声母形式），因为孩子要单独听它们的音。
 * `ui` / `iu` / `un` 单独不成音节，用它们的独立形式 wei / you / wen 发音——
 * 这也正是课本教「ui 读作 wei」的道理。
 */
export const COMPOUND_FINALS: readonly Syllable[] = [
  { pinyin: 'āi', base: 'ai', tone: 1, char: '哀' },
  { pinyin: 'wēi', base: 'ui', tone: 1, char: '威' },
  { pinyin: 'āo', base: 'ao', tone: 1, char: '凹' },
  { pinyin: 'ōu', base: 'ou', tone: 1, char: '欧' },
  { pinyin: 'yōu', base: 'iu', tone: 1, char: '优' },
  { pinyin: 'yē', base: 'ie', tone: 1, char: '椰' },
  { pinyin: 'yuē', base: 'üe', tone: 1, char: '约' },
  { pinyin: 'ér', base: 'er', tone: 2, char: '儿' },
  { pinyin: 'ān', base: 'an', tone: 1, char: '安' },
  { pinyin: 'ēn', base: 'en', tone: 1, char: '恩' },
  { pinyin: 'yīn', base: 'in', tone: 1, char: '音' },
  { pinyin: 'wēn', base: 'un', tone: 1, char: '温' },
  { pinyin: 'āng', base: 'ang', tone: 1, char: '肮' },
  { pinyin: 'yīng', base: 'ing', tone: 1, char: '英' },

  // —— ⭐ 以下三个用的是**教学惯用字**，不是常用单音字。
  //    「诶」是多音字（ēi/éi/ěi/èi）、「鞥」生僻、「韵」的调与韵母写法不一致，
  //    但课堂上韵母 ei / ün / eng 就念这几个音，孩子听到的必须和老师一致。
  //    全部标 soundOnly：只负责发声，不进「听音选字」的选项。
  //    ⚠️ 这几条**必须人工复听**（npm run pinyin:check）——多音字与生僻字
  //    正是 TTS 最容易读错的两类，读错就是在教错。
  { pinyin: 'ēi', base: 'ei', tone: 1, char: '诶', soundOnly: true },
  { pinyin: 'yùn', base: 'ün', tone: 4, char: '韵', soundOnly: true },
  { pinyin: 'ēng', base: 'eng', tone: 1, char: '鞥', soundOnly: true },
  // ong 仍**没有**干净载体：汉语里它不能独立成音节，也没有对应的呼读字。
  // 拼音墙上它继续借例词「松」发音，等真人录音补上再启用
  { pinyin: 'ōng', base: 'ong', tone: 1 },
]

/**
 * 整体认读音节（16 个）。
 *
 * ⚠️ 它们**不能拼读**，只能整体记忆——这正是 `spell_integral` 误区的由来
 * （孩子把 `zhi` 拆成 zh-i 去拼）。音频必须是完整音节。
 */
export const INTEGRAL_SYLLABLES: readonly Syllable[] = [
  { pinyin: 'zhī', base: 'zhi', tone: 1, char: '知' },
  { pinyin: 'chī', base: 'chi', tone: 1, char: '吃' },
  { pinyin: 'shī', base: 'shi', tone: 1, char: '诗' },
  { pinyin: 'rì', base: 'ri', tone: 4, char: '日' },
  { pinyin: 'zī', base: 'zi', tone: 1, char: '资' },
  // ⭐ 与声母 c 同一个音：整体认读音节 ci 念 cī（呲），不是 cí（词）
  { pinyin: 'cī', base: 'ci', tone: 1, char: '呲', soundOnly: true },
  { pinyin: 'sī', base: 'si', tone: 1, char: '思' },
  { pinyin: 'yī', base: 'yi', tone: 1, char: '衣' },
  { pinyin: 'wū', base: 'wu', tone: 1, char: '屋' },
  { pinyin: 'yú', base: 'yu', tone: 2, char: '鱼' },
  { pinyin: 'yè', base: 'ye', tone: 4, char: '叶' },
  { pinyin: 'yuè', base: 'yue', tone: 4, char: '月' },
  { pinyin: 'yuǎn', base: 'yuan', tone: 3, char: '远' },
  { pinyin: 'yīn', base: 'yin', tone: 1, char: '音' },
  { pinyin: 'yún', base: 'yun', tone: 2, char: '云' },
  { pinyin: 'yīng', base: 'ying', tone: 1, char: '英' },
]

/**
 * 两拼音节示例（P3.1 拼读练习用）。
 *
 * 每条都是「声母 + 韵母 → 音节」，且都挑了常用单音字，
 * 孩子拼出来之后能立刻听到一个她认识的词。
 */
export const BLEND_SYLLABLES: readonly BlendSyllable[] = [
  { pinyin: 'bā', base: 'ba', tone: 1, char: '八', initial: 'b', final: 'a' },
  { pinyin: 'mā', base: 'ma', tone: 1, char: '妈', initial: 'm', final: 'a' },
  { pinyin: 'dà', base: 'da', tone: 4, char: '大', initial: 'd', final: 'a' },
  { pinyin: 'hé', base: 'he', tone: 2, char: '禾', initial: 'h', final: 'e' },
  { pinyin: 'mǐ', base: 'mi', tone: 3, char: '米', initial: 'm', final: 'i' },
  // ⭐ 以下四个是为 P2.2 与 P7.1/P7.4 的**辨析**加的。
  // d/n/l 的呼读音（dē nè lè）没有干净的汉字载体，只能念拼音串、声调靠猜；
  // 改用真实音节「弟 你 里 笔」既保证读音正确，教学上也更自然——
  // 孩子在词里听声母，比听孤立的「呃」更接近真实语言。
  { pinyin: 'bǐ', base: 'bi', tone: 3, char: '笔', initial: 'b', final: 'i' },
  { pinyin: 'dì', base: 'di', tone: 4, char: '弟', initial: 'd', final: 'i' },
  { pinyin: 'nǐ', base: 'ni', tone: 3, char: '你', initial: 'n', final: 'i' },
  { pinyin: 'lǐ', base: 'li', tone: 3, char: '里', initial: 'l', final: 'i' },
  { pinyin: 'tǔ', base: 'tu', tone: 3, char: '土', initial: 't', final: 'u' },
  { pinyin: 'lù', base: 'lu', tone: 4, char: '路', initial: 'l', final: 'u' },
  { pinyin: 'pí', base: 'pi', tone: 2, char: '皮', initial: 'p', final: 'i' },
  { pinyin: 'gǔ', base: 'gu', tone: 3, char: '鼓', initial: 'g', final: 'u' },
  { pinyin: 'kè', base: 'ke', tone: 4, char: '课', initial: 'k', final: 'e' },
  { pinyin: 'hǎi', base: 'hai', tone: 3, char: '海', initial: 'h', final: 'ai' },
  { pinyin: 'bái', base: 'bai', tone: 2, char: '白', initial: 'b', final: 'ai' },
  { pinyin: 'māo', base: 'mao', tone: 1, char: '猫', initial: 'm', final: 'ao' },
  { pinyin: 'gǒu', base: 'gou', tone: 3, char: '狗', initial: 'g', final: 'ou' },
  { pinyin: 'shān', base: 'shan', tone: 1, char: '山', initial: 'sh', final: 'an' },
  { pinyin: 'fēng', base: 'feng', tone: 1, char: '风', initial: 'f', final: 'eng' },
  { pinyin: 'máng', base: 'mang', tone: 2, char: '忙', initial: 'm', final: 'ang' },
  { pinyin: 'xīng', base: 'xing', tone: 1, char: '星', initial: 'x', final: 'ing' },

  /**
   * ⭐⭐ 以下这批是为**辨析题的题量**加的，全部经过多音字排查。
   *
   * 起因：P7「找不同」题需要凑「3 个同声母 + 1 个异声母」，
   * 而原表里 n 只有 `nǐ`、zh 只有 `zhī`——一组都凑不出来，
   * 于是那些题退化成「随便четыре 个音节」，**没有正确答案可言**。
   * 由 `pinyinOddOne.test.ts` 强制校验每条模板的池子确实凑得出。
   *
   * 选字仍守本文件开头那三条规矩，尤其是**绝不用多音字**：
   * 「长」cháng/zhǎng、「色」sè/shǎi、「和」hé/huó 之类一律排除。
   */
  // n / l 辨析（P7.4）—— 各凑够 3 个以上
  // base 写 `nü`（不是 `nv`）—— 转 v 是 syllableKey 生成文件名时才做的事
  { pinyin: 'nǚ', base: 'nü', tone: 3, char: '女', initial: 'n', final: 'ü' },
  { pinyin: 'niú', base: 'niu', tone: 2, char: '牛', initial: 'n', final: 'iu' },
  { pinyin: 'nán', base: 'nan', tone: 2, char: '南', initial: 'n', final: 'an' },
  { pinyin: 'lán', base: 'lan', tone: 2, char: '蓝', initial: 'l', final: 'an' },
  { pinyin: 'lǎo', base: 'lao', tone: 3, char: '老', initial: 'l', final: 'ao' },

  // 平翘舌辨析（P7.5）—— z/c/s 与 zh/ch/sh 各凑够 3 个
  { pinyin: 'zǎo', base: 'zao', tone: 3, char: '早', initial: 'z', final: 'ao' },
  { pinyin: 'zǒu', base: 'zou', tone: 3, char: '走', initial: 'z', final: 'ou' },
  { pinyin: 'zhǎo', base: 'zhao', tone: 3, char: '找', initial: 'zh', final: 'ao' },
  { pinyin: 'zhū', base: 'zhu', tone: 1, char: '猪', initial: 'zh', final: 'u' },
  { pinyin: 'cài', base: 'cai', tone: 4, char: '菜', initial: 'c', final: 'ai' },
  { pinyin: 'cǎo', base: 'cao', tone: 3, char: '草', initial: 'c', final: 'ao' },
  { pinyin: 'chē', base: 'che', tone: 1, char: '车', initial: 'ch', final: 'e' },
  { pinyin: 'chàng', base: 'chang', tone: 4, char: '唱', initial: 'ch', final: 'ang' },
  { pinyin: 'sān', base: 'san', tone: 1, char: '三', initial: 's', final: 'an' },
  { pinyin: 'sōng', base: 'song', tone: 1, char: '松', initial: 's', final: 'ong' },
  { pinyin: 'shū', base: 'shu', tone: 1, char: '书', initial: 'sh', final: 'u' },
  { pinyin: 'shuǐ', base: 'shui', tone: 3, char: '水', initial: 'sh', final: 'ui' },

  // 前后鼻辨析（P5.3 / P7.6）—— an/ang/in/ing 各凑够 3 个
  { pinyin: 'xīn', base: 'xin', tone: 1, char: '心', initial: 'x', final: 'in' },
  { pinyin: 'jīn', base: 'jin', tone: 1, char: '金', initial: 'j', final: 'in' },
  { pinyin: 'qīng', base: 'qing', tone: 1, char: '青', initial: 'q', final: 'ing' },
  { pinyin: 'bāng', base: 'bang', tone: 1, char: '帮', initial: 'b', final: 'ang' },

  /**
   * ⭐ 「飞」是为**拼音墙上的 ei** 加的，不是为出题。
   *
   * `ei` 没有干净的汉字载体（诶 ēi/éi/ěi/èi 四读），因此不进题库；
   * 但拼音墙是「教」的地方，缺一个韵母孩子会问「ei 呢」。
   * 解法与课本一致：**不念孤立的韵母，念一个含它的词**——「飞机」的「飞」。
   * 见 `pinyinChart.ts` 的 `example` 字段。
   */
  { pinyin: 'fēi', base: 'fei', tone: 1, char: '飞', initial: 'f', final: 'ei' },

  // 常用字，主要服务 P8.3 听音选字
  { pinyin: 'huǒ', base: 'huo', tone: 3, char: '火', initial: 'h', final: 'uo' },
  // 与整体认读的 yú（鱼，二声）同 base 不同调 —— 正好给 P8.3 当声调干扰项
  { pinyin: 'yǔ', base: 'yu', tone: 3, char: '雨', initial: 'y', final: 'u' },
]

/**
 * 三拼音节（P3.2）—— 声母 + 介母 + 韵母。
 *
 * ⭐ 介母（`i` `u` `ü`）是拼音里最容易被漏掉的部件：
 * 孩子把 `jiā` 拼成 `jā`，就是 `three_syllable_missing_medial`。
 * 所以这张表的每一条都要能清楚地拆成三段，供拖拽题摆出来。
 *
 * ⚠️ 与 {@link BLEND_SYLLABLES} **不重叠**：那边是两拼，
 * 混进三拼会让 P3.1 出现还没教的内容。选字同样排查过多音字
 * （「说」shuō/shuì 已排除）。
 */
export const TRIPLE_SYLLABLES: readonly TripleSyllable[] = [
  { pinyin: 'jiā', base: 'jia', tone: 1, char: '家', initial: 'j', medial: 'i', final: 'a' },
  { pinyin: 'huā', base: 'hua', tone: 1, char: '花', initial: 'h', medial: 'u', final: 'a' },
  { pinyin: 'guā', base: 'gua', tone: 1, char: '瓜', initial: 'g', medial: 'u', final: 'a' },
  { pinyin: 'xiě', base: 'xie', tone: 3, char: '写', initial: 'x', medial: 'i', final: 'e' },
  { pinyin: 'guó', base: 'guo', tone: 2, char: '国', initial: 'g', medial: 'u', final: 'o' },
  { pinyin: 'duō', base: 'duo', tone: 1, char: '多', initial: 'd', medial: 'u', final: 'o' },
  { pinyin: 'zhuō', base: 'zhuo', tone: 1, char: '桌', initial: 'zh', medial: 'u', final: 'o' },
  { pinyin: 'xiǎo', base: 'xiao', tone: 3, char: '小', initial: 'x', medial: 'i', final: 'ao' },
  { pinyin: 'niǎo', base: 'niao', tone: 3, char: '鸟', initial: 'n', medial: 'i', final: 'ao' },
  { pinyin: 'jiǎo', base: 'jiao', tone: 3, char: '脚', initial: 'j', medial: 'i', final: 'ao' },
  { pinyin: 'tiān', base: 'tian', tone: 1, char: '天', initial: 't', medial: 'i', final: 'an' },
  { pinyin: 'qiū', base: 'qiu', tone: 1, char: '秋', initial: 'q', medial: 'i', final: 'u' },
  { pinyin: 'liàng', base: 'liang', tone: 4, char: '亮', initial: 'l', medial: 'i', final: 'ang' },
  { pinyin: 'xióng', base: 'xiong', tone: 2, char: '熊', initial: 'x', medial: 'i', final: 'ong' },
  { pinyin: 'huài', base: 'huai', tone: 4, char: '坏', initial: 'h', medial: 'u', final: 'ai' },
]

/**
 * 有图形面的音节（P8.2 看图选音节）。键是 `${base}${tone}`。
 *
 * ⭐ 挑 emoji 的规矩与英语词表完全一致（见 englishWords.ts 文件头）：
 * **必须一眼认得出，且指向的正是那个字**。认不出的图会把「看图选音节」
 * 变成猜谜，诊断数据也跟着失真。
 *
 * ⚠️ 因此收得很克制——「天」「白」「大」这类抽象字没有干净的 emoji，
 * 宁可不收也不用勉强的图。
 */
export const SYLLABLE_PICTURES: Readonly<Record<string, string>> = {
  mao1: '🐱', // 猫
  gou3: '🐶', // 狗
  yu2: '🐟', // 鱼
  niao3: '🐦', // 鸟
  niu2: '🐮', // 牛
  zhu1: '🐷', // 猪
  e2: '🦢', // 鹅
  hua1: '🌸', // 花
  cao3: '🌿', // 草
  cai4: '🥬', // 菜
  huo3: '🔥', // 火
  shui3: '💧', // 水
  shan1: '⛰️', // 山
  xing1: '⭐', // 星
  yue4: '🌙', // 月
  yun2: '☁️', // 云
  yu3: '🌧️', // 雨
  shu1: '📖', // 书
  bi3: '✏️', // 笔
  che1: '🚗', // 车
  mi3: '🍚', // 米
  yi1: '👕', // 衣
  jia1: '🏠', // 家
  ba1: '8️⃣', // 八
  san1: '3️⃣', // 三
  qi1: '7️⃣', // 七
}

/** 全部音节，按 key 去重后的列表。生成脚本与校验页都读它 */
export const ALL_SYLLABLES: readonly Syllable[] = dedupe([
  ...INITIALS,
  ...SINGLE_FINALS,
  ...TONE_SET,
  ...COMPOUND_FINALS,
  ...INTEGRAL_SYLLABLES,
  ...BLEND_SYLLABLES,
  ...TRIPLE_SYLLABLES,
])

/**
 * ⭐ **可进题库的音节** —— 有汉字载体、发音有保证的那些。
 *
 * 所有出题模板都必须从这里取，绝不能直接用 {@link ALL_SYLLABLES}：
 * 没有载体字的音节只能念拼音串，实测会读错声调，
 * 而**发音教错比没有内容严重得多**——错的读音孩子以后很难改过来。
 */
export const USABLE_SYLLABLES: readonly Syllable[] = ALL_SYLLABLES.filter(isUsable)

/**
 * 从一组音节里筛出可用的。模板里包一层，避免忘记过滤。
 *
 * 泛型保留具体类型：`usable(TRIPLE_SYLLABLES)` 仍是 `TripleSyllable[]`，
 * 否则调用方拿不到 `medial` / `final` 这些扩展字段。
 */
export function usable<T extends Syllable>(list: readonly T[]): T[] {
  return list.filter(isUsable)
}

function dedupe(list: readonly Syllable[]): Syllable[] {
  const seen = new Map<string, Syllable>()
  for (const s of list) {
    const key = syllableKey(s.base, s.tone)
    // 先出现的优先：声母表在最前，它的用字是教学惯例，不该被后面覆盖
    if (!seen.has(key)) seen.set(key, s)
  }
  return [...seen.values()]
}

/**
 * 缺汉字载体、**必须录真人音频**才能启用的音节。
 *
 * 它们目前不进题库（见 {@link USABLE_SYLLABLES}）。录好同名 mp3 放进
 * `public/audio/voice/` 后，在这里补上 `char` 或改用录音标记即可启用。
 * 录音工具：`npm run pinyin:record`
 */
export const SYLLABLES_NEEDING_RECORDING: readonly Syllable[] = ALL_SYLLABLES.filter(
  (s) => !isUsable(s),
)
