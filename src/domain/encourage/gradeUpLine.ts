/**
 * @file 升年级过场说的那一句话
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see design/08-年级分区与内容扩展.md §6.3  升年级是仪式，不是断崖
 * @see src/features/home/GradeUpCeremony.tsx  演它的地方
 *
 * ## ⭐ 升年级会一次性换掉三件事，必须有人跟她说
 *
 * 改 `Profile.grade` 同时触发：换三只新伙伴、内容范围整体前移，
 * 二升三还要再叠一个「声音没了」。而改这个开关的地方是**家长区**，
 * 孩子看不到那一下——不说的话，她下次打开 App 只会发现企鹅变成了猫。
 *
 * ## ⛔ 必须说清上一批伙伴去了哪里
 *
 * §5.2 造出「我的伙伴」的往届存档，就是因为养到满级的团团在升年级那天
 * 凭空消失比任何别的改动都伤人。但**存档存在**和**她知道存档存在**是两回事：
 * 她不识字，翻不到那一页，那存档等于不存在。这句话是那两者之间唯一的桥。
 *
 * ## 一次只说一句话
 *
 * 两件事拼进**同一句** `SpokenLine`，不拆成两次 `say()`。
 * 后者是打断式的，第二句必然把第一句掐掉——升级横幅就这么踩过
 * （见 CLAUDE.md「一次只说一句话」）。
 */

import { addressed, type Nickname, type SpokenLine } from '@/domain/encourage/addressed'
import type { ClipKey } from '@/domain/speech'
import type { GradeLevel } from '@/domain/types'

/** 年级 → 「你已经是 N 年级的大孩子啦」那半句的片段 */
const GRADE_UP_CLIPS: Partial<Record<GradeLevel, ClipKey>> = {
  G2: 'ceremony.gradeUpG2',
}

/** 年级中文名。只用于这句话，与 `GRADE_NAME` 各自独立——那个是 data 层的显示信息 */
const GRADE_WORD: Record<GradeLevel, string> = {
  G1: '一年级',
  G2: '二年级',
  G3: '三年级',
  G4: '四年级',
  G5: '五年级',
  G6: '六年级',
}

/**
 * 上一批伙伴的去向。
 *
 * ⚠️ 文本里**不写书名号**：这句话是要念出来的，而「『我的伙伴』」念出来
 * 就是「我的伙伴」——引号是给识字的人看的，对她只是屏幕上多两个看不懂的符号。
 */
const OLD_PETS_STAY = '以前的伙伴没有走，去我的伙伴那里就能看到它们'
const OLD_PETS_STAY_CLIP: ClipKey = 'ceremony.oldPetsStay'

/**
 * 造一句升年级过场的话。
 *
 * ⛔ **不说「再见」、不说「长大了就不能……」**：这一句的全部任务是把
 * 「失去」讲成「长大」。任何暗示旧伙伴离开了的说法，都会把 §5.2
 * 辛苦保住的那批伙伴重新推下悬崖。
 *
 * ⚠️ 二升三还要额外加一句「题目可以自己读了」，那属于阶段 5（语音按年级分流），
 * 这里**故意不做**——现在加进来，会在语音还没按年级门控时就承诺一件没发生的事。
 *
 * @param nickname - 当前称呼。升年级是最正向的语境，必须叫名字
 *                   （CLAUDE.md：昵称只出现在正向语境）
 * @param gradeLevel - 升到了哪个年级
 * @returns 显示文字 + 待播语句。片段缺失的年级整句降级为 TTS，
 *          由 `addressed()` 保证不会念出半句就没了
 *
 * @example
 * gradeUpLine({ text: '小恩宝', clipKey: 'name.xiaoenbao' }, 'G2')
 * // → text: '小恩宝，你已经是二年级的大孩子啦！以前的伙伴没有走，去我的伙伴那里就能看到它们'
 * //   utterance.parts: ['name.xiaoenbao', 'ceremony.gradeUpG2', 'ceremony.oldPetsStay']
 *
 * @example
 * // 还没做语音的年级：parts 为空，addressed() 让整句走 TTS
 * gradeUpLine(nickname, 'G5').utterance.parts   // []
 */
export function gradeUpLine(nickname: Nickname, gradeLevel: GradeLevel): SpokenLine {
  const headClip = GRADE_UP_CLIPS[gradeLevel]
  const sentence = `你已经是${GRADE_WORD[gradeLevel]}的大孩子啦！${OLD_PETS_STAY}`

  // 缺一条就整句走 TTS：只塞半边片段会让 say() 以为片段齐全，
  // 于是念完前半句就没了（见 addressed() 的说明）
  const parts: ClipKey[] = headClip === undefined ? [] : [headClip, OLD_PETS_STAY_CLIP]

  return addressed(nickname, parts, sentence)
}
