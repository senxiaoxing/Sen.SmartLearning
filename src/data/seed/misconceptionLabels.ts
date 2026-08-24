/**
 * @file 认知误区的家长可读说明 —— 把 `misconceptionTag` 翻译成人话
 * @layer data  静态内容，随 App 版本内置
 * @see design/01-知识点图谱.md  各知识点的认知误区清单
 * @see src/domain/types.ts  MisconceptionTag 定义
 *
 * ⭐ 这张表是整个诊断系统对家长的**唯一出口**。
 * 系统内部知道孩子犯的是 `carry_lost`，但家长看到这个词毫无意义；
 * 只有「凑十之后忘了把剩下的加回去」才能让家长知道该在旁边说什么。
 *
 * 用 `Record<MisconceptionTag, …>` 而非 `Partial<>`：新增误区标签时若忘记
 * 补文案，编译期就会失败。漏一条的后果是报告里出现一个家长看不懂的英文词。
 */

import type { MisconceptionTag } from '@/domain/types'

export interface MisconceptionLabel {
  /** 短名，用于列表与标签 */
  label: string
  /** 具体表现，让家长认得出「对，她就是这样错的」 */
  example: string
  /** 家长可以怎么帮。⚠️ 写成具体动作，不写「多加练习」这种废话 */
  advice: string
}

export const MISCONCEPTION_LABELS: Record<MisconceptionTag, MisconceptionLabel> = {
  // —— 数学：计数与数感
  count_skip: {
    label: '数数会跳数',
    example: '数着数着漏掉一个，或者同一个数了两遍',
    advice: '让她用手指点着实物数，一个一个碰到再数，不要用眼睛扫',
  },
  ordinal_cardinal_confusion: {
    label: '「第几个」和「几个」分不清',
    example: '问「第 3 个」，她圈出了 3 个',
    advice: '排一队玩具，轮流问「一共几个」和「第几个是谁」，把两个问法对照着问',
  },
  symbol_reversed: {
    label: '大于小于号方向反',
    example: '3 < 5 写成了 3 > 5',
    advice: '把符号想成张开的嘴，大嘴永远朝着大的那个数',
  },
  off_by_one: {
    label: '差一个',
    example: '数出来比实际多 1 或少 1',
    advice: '多半是起点数错了（从 0 开始数）或最后一个漏了，看她数的时候手停在哪',
  },
  order_reversed: {
    label: '排序方向反了',
    example: '要求从小到大，她排成了从大到小',
    advice: '她其实会排序，只是没听清方向。排之前先请她说一遍「从小到大」',
  },

  // —— 数学：位置
  lr_mirror: {
    label: '左右弄反',
    example: '图里的人面朝自己时，左右判断反了',
    advice: '先固定用她自己的左右手当基准，图中人物的视角以后再说',
  },

  // —— 数学：加减法
  op_confusion: {
    label: '看错加减号',
    example: '把 8 - 3 做成了 8 + 3',
    advice: '这是审题习惯不是能力问题，让她做题前先用手指点一下运算符念出来',
  },
  zero_rule: {
    label: '0 的运算搞混',
    example: '认为 5 - 0 = 0 或者 5 + 0 = 0',
    advice: '用实物演示：盘子里 5 颗糖，一颗都不拿走，还剩几颗',
  },
  whole_part_confusion: {
    label: '整体和部分混淆',
    example: '「5 可以分成 2 和几」答成了 5',
    advice: '用 5 颗豆子实际分成两堆，让她看见「合起来才是 5」',
  },
  no_carry: {
    label: '忘记进位',
    example: '9 + 5 算成 13，凑十的时候丢了 1',
    advice: '回到十格阵：9 再要 1 个才满十，那 1 个必须从 5 里拿',
  },
  carry_lost: {
    label: '凑十后忘了加剩下的',
    example: '9 + 5 算成 10，凑满十就停下了',
    advice: '强调凑十只是第一步，问她「5 拿走 1 给 9，还剩几个没加」',
  },
  ten_split_wrong: {
    label: '⭐ 补数算错（10 的分与合没打牢）',
    example: '知道要拆，但把 5 拆成 2 和 3 去补 9',
    advice: '这是地基问题，先别练进位。回去把「10 的分与合」练熟：9 和几凑成 10',
  },
  digit_concat: {
    label: '把数字直接拼起来',
    example: '9 + 5 答成 95',
    advice: '她把加号理解成了「放在一起」，用实物合并演示什么叫「一共多少个」',
  },
  place_value_swap: {
    label: '十位个位说反',
    example: '问 15 的十位是几，答成了 5',
    advice: '拿小棒摆给她看：捆成一捆的是十位，散着的是个位。先只问「有几捆」',
  },
  sub_instead: {
    label: '该加做成了减',
    example: '9 + 5 答成 4',
    advice: '先确认她认得加号，再看是不是题目念太快没听清',
  },
  add_instead: {
    label: '该减做成了加',
    example: '13 - 9 答成 22',
    advice: '同上，多半是审题问题。让她复述一遍题目再动笔',
  },
  no_borrow: {
    label: '不会退位',
    example: '13 - 9 答成 6，用大数减小数凑出来的',
    advice: '回到破十法：13 拆成 10 和 3，先用 10 减 9',
  },
  borrow_lost: {
    label: '破十后忘了加个位',
    example: '13 - 9 只算了 10 - 9，把剩下的 3 忘了',
    advice: '强调破十后还有两部分要合起来：1 和 3',
  },

  // —— 数学：图形与钟表
  solid_plane_confusion: {
    label: '立体和平面混淆',
    example: '把正方体叫成正方形',
    advice: '拿实物对比：积木能拿起来（立体），画在纸上的（平面）',
  },
  hand_swap: {
    label: '时针分针看反',
    example: '把长针当成时针',
    advice: '记「短针胖胖走得慢，是时针」，先只认整点',
  },
  wrong_operation: {
    label: '应用题选错运算',
    example: '求剩余却用了加法',
    advice: '题目读完先问她「东西是变多了还是变少了」，再决定加还是减',
  },

  // —— 数学·二年级：笔算与混合运算
  column_misaligned: {
    label: '竖式没对齐',
    example: '35 + 7 把 7 写在了十位下面，算成了 35 + 70',
    advice: '用方格纸列竖式，一格一个数字。先只盯住一件事：末位对末位',
  },
  op_order: {
    label: '没有先乘除后加减',
    example: '2 + 3 × 4 从左往右算成了 20',
    advice: '让她先用笔圈出乘除那一步，圈好再动手算。圈这个动作比背口诀管用',
  },
  paren_ignored: {
    label: '无视括号',
    example: '(3 + 2) × 4 仍然从左往右算',
    advice: '告诉她括号是「先算我」的记号，看到括号先把里面算出来写在旁边',
  },

  // —— 数学·二年级：乘除法
  mul_as_add: {
    label: '⭐ 乘法当成了加法',
    example: '3 × 4 答成 7',
    advice: '这是概念没建立，练口诀没用。拿糖果摆 4 堆、每堆 3 颗，让她数一共几颗',
  },
  table_confusion: {
    label: '口诀背串了',
    example: '7 × 8 答成 54，串到了「六九五十四」',
    advice: '别整张表一起背。挑错的那一句单独念，配上手指比出「七八五十六」',
  },
  mul_extra_group: {
    label: '多数或少数了一组',
    example: '3 × 4 答成 15，多算了一组',
    advice: '她概念是对的，只是组数数错了。让她用笔把每一组圈起来再数圈的个数',
  },
  div_as_sub: {
    label: '除法做成了减法',
    example: '12 ÷ 3 答成 9',
    advice: '回到分东西：12 颗糖分给 3 个人，一人几颗？让她真的分一次',
  },
  div_as_mul: {
    label: '除法做成了乘法',
    example: '12 ÷ 3 答成 36',
    advice: '问她「分完之后每人拿到的，会比原来多还是少」，先把方向定下来',
  },
  remainder_ignored: {
    label: '余数丢了',
    example: '13 ÷ 4 只答 3，剩下的 1 没说',
    advice: '分完之后追问一句「还剩下几个」，让「还剩」成为她的固定动作',
  },
  remainder_too_big: {
    label: '余数比除数还大',
    example: '13 ÷ 4 答成「2 余 5」',
    advice: '剩下 5 个还能再分一轮。告诉她余数必须比除数小，不然就是没分完',
  },
  quotient_remainder_swap: {
    label: '商和余数写反了',
    example: '13 ÷ 4 答成「1 余 3」',
    advice: '她算对了，只是位置放错。念一遍「每人分到几个」是商，「剩下几个」是余数',
  },

  // —— 数学·二年级：数与单位
  zero_placeholder_lost: {
    label: '中间的 0 漏写了',
    example: '三千零五写成了 305',
    advice: '画出千百十个四个格子，把数一格一格填进去，让她看见空着的那两位要写 0',
  },
  unit_conversion: {
    label: '单位换算记错',
    example: '认为 1 米 = 10 厘米',
    advice: '拿卷尺把 1 米拉出来，让她数上面有多少厘米。数一次比背十次管用',
  },
  unit_sense_weak: {
    label: '对单位大小没概念',
    example: '给铅笔选了「米」，给一个苹果选了「千克」',
    advice: '找几样身边的东西当尺子：一根手指宽约 1 厘米、一袋盐 500 克，让她拿在手上比',
  },
  ruler_start_wrong: {
    label: '量长度没从 0 开始',
    example: '把物体左端对在刻度 1 上，直接读了右端的数',
    advice: '每次量之前先念一句「左边对准 0」。她读的数没错，错在起点',
  },

  // —— 数学·二年级：时间与图形
  minute_misread: {
    label: '⭐ 把格数当成了分钟',
    example: '分针指向 3，读成「3 分」而不是「15 分」',
    advice: '带她绕钟面数一遍：一大格是 5 分，5、10、15 地数过去',
  },
  hour_overread: {
    label: '时针读快了一格',
    example: '3:55 读成了 4:55',
    advice: '强调「时针走过谁就是谁」，还没走到 4 就仍然是 3 时',
  },
  angle_side_length: {
    label: '⭐ 以为边长的角就大',
    example: '两个角开口一样大，边画得长的那个被判成更大',
    advice: '用两根小棒做一个活动角，把边推长推短给她看：边变了，开口没变',
  },
  view_direction_confusion: {
    label: '看的方向弄混了',
    example: '把「从上面看」当成了「从正面看」',
    advice: '拿真的积木摆一个，让她自己蹲下去、站起来各看一次，再对照图',
  },
  symmetry_axis_wrong: {
    label: '对称轴认错',
    example: '把不对称的图形判成对称，或把对称轴画歪了',
    advice: '把图形画在纸上剪下来，对折——能完全重合才是对称，折痕就是对称轴',
  },

  // —— 数学·二年级：数学广角
  combination_missed: {
    label: '漏掉了一种搭配',
    example: '3 件上衣配 2 条裤子，只数出 5 种',
    advice: '教她固定一件上衣、把裤子全配一遍，再换下一件。有顺序才不会漏',
  },
  logic_first_only: {
    label: '只看了一个条件',
    example: '听到「小明不是第一」就答小明是第二，没再看后面的条件',
    advice: '把条件一条条写下来，读完全部再下结论。可以画表格打勾划叉',
  },

  // —— 拼音：拼读规则
  u_umlaut_kept: {
    label: 'ü 的两点没去掉',
    example: '把 ju 写成 jü',
    advice: '口诀「小 ü 见到 j q x，摘掉墨镜笑嘻嘻」',
  },
  tone_wrong_position: {
    label: '声调标错位置',
    example: '把 hǎo 标成 haǒ',
    advice: '口诀「有 a 找 a，没 a 找 o e，i u 并列标在后」',
  },
  tone_confusion: {
    label: '听不出是几声',
    example: '把 wú 听成 wǔ',
    advice: '这是听力不是规则问题，先用手势把四声比划出来，一个一个念给她听',
  },
  three_syllable_missing_medial: {
    label: '三拼音节漏掉中间的音',
    example: 'jia 拼成了 ja',
    advice: '拆成三块慢慢拼：j - i - a，中间那个不能省',
  },
  spell_integral: {
    label: '整体认读音节还在拼',
    example: '把 zhi 拆成 zh 和 i 去拼',
    advice: '整体认读音节要直接记住读音，不能拆，告诉她这几个是「一口气读出来的」',
  },

  // —— 拼音：韵母混淆
  ui_iu_swap: {
    label: 'ui 和 iu 混淆',
    example: 'shuǐ 和 liù 的韵母搞反',
    advice: '按写的顺序念：u-i 是 ui，i-u 是 iu，念的时候拖长一点',
  },
  ei_ie_swap: {
    label: 'ei 和 ie 混淆',
    example: 'bēi 和 biē 分不清',
    advice: '同样按顺序念，前一个字母先出声',
  },
  nasal_confusion: {
    label: '前后鼻音不分',
    example: 'in 和 ing、en 和 eng 听成一样',
    advice: '让她摸着鼻子念，后鼻音鼻子震动更明显。方言影响的话不必急',
  },

  // —— 拼音：字形混淆
  pinyin_form_unlinked: {
    label: '音和拼音写法对不上',
    example: '认得图上是猫、也会念 māo，但选不出「māo」这串拼音',
    advice: '把音节拆开拼一遍：m—āo—māo。她缺的不是听力，是从音想到写法的那一步',
  },
  bd_confusion: {
    label: 'b 和 d 分不清',
    example: 'bà 听成 dà',
    advice: '左手比 b 右手比 d，或者记「b 的肚子在右边」',
  },
  pq_confusion: {
    label: 'p 和 q 分不清',
    example: 'pí 听成 qí',
    advice: '和 b/d 一样是镜像问题，用手势固定方向',
  },
  ft_confusion: {
    label: 'f 和 t 分不清',
    example: 'fā 听成 tā',
    advice: '记「f 像拐棍朝右，t 像伞柄朝左」',
  },
  nl_confusion: {
    label: 'n 和 l 分不清',
    example: 'nǎi 听成 lǎi',
    advice: '受方言影响很常见。让她捏住鼻子念 n，念不出来才对',
  },
  flat_curl_confusion: {
    label: '平翘舌不分',
    example: 'zi 和 zhi、si 和 shi 混淆',
    advice: '翘舌音舌尖要卷起来碰上颚，对着镜子看舌头位置',
  },

  // —— 英语
  similar_sound: {
    label: '音近词混淆',
    example: 'cat 和 cake、bear 和 pear 听混',
    advice: '把两个词连着念给她听，让她指出不一样的地方',
  },
  letter_mirror: {
    label: '字母镜像混淆',
    example: '大写 b/d、p/q 分不清',
    advice: '和拼音的 b/d 是同一个问题，用同一套手势帮她固定方向',
  },
  letter_pairing_weak: {
    label: '字母对应关系不熟',
    example: '把 A 和 a 当成两个不同的字母，或不知道 apple 以 A 开头',
    advice: '回字母乐园看「Aa」并列的卡片，念一遍「A is for apple」，先把一两个字母认牢再往下走',
  },
  number_teen_ty: {
    label: '没听见 teen 词尾',
    example: '听 fourteen 选了 4',
    advice: '把 four 和 fourteen 连着念，让她注意后面多出来的那个音',
  },
}
