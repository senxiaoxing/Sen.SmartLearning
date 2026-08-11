/**
 * @file 首页问候语 —— 「小恩宝，早上好呀，今天想学点什么？」
 * @layer domain  纯函数层，禁止 import React / Dexie / 浏览器 API
 * @see src/domain/encourage/addressed.ts  昵称怎么拼进去
 * @see src/domain/encourage/timeOfDay.ts  时段怎么分
 * @see src/features/home/HomePage.tsx     使用者，点标题可重听
 *
 * 这是打开 App 后看到（听到）的第一句话。
 * 叫名字的位置里它最重要：孩子还没开始做任何事，
 * App 就先认出了她是谁；再加上时段，早上和睡前听到的也不是同一句。
 */

import { addressed, type Nickname, type SpokenLine } from '@/domain/encourage/addressed'
import { greetingOf, type TimeOfDay } from '@/domain/encourage/timeOfDay'

/** 问候语的落点。整句由「时段词 + 这一句」拼成 */
const WHAT_TO_LEARN_CLIP = 'phrase.whatToLearn'

/** ⚠️ 与 `phrase.whatToLearn` 念的内容一致，改一处要改两处 */
const WHAT_TO_LEARN_TEXT = '今天想学点什么'

/**
 * 首页问候语。
 *
 * @param nickname - 当前昵称。没设置时退回不带称呼的说法
 * @param when - 时段。省略则不带时段词，退回「今天想学点什么」
 * @returns 显示文字与待播语句。`text` **不带问号**，由展示方按版式决定
 *
 * @example
 * greetingLine({ text: '小恩宝', clipKey: 'name.xiaoenbao' }, 'morning')
 * // → { text: '小恩宝，早上好呀，今天想学点什么',
 * //     utterance: { parts: ['name.xiaoenbao', 'phrase.goodMorning', 'phrase.whatToLearn'], … } }
 *
 * @example
 * greetingLine(NO_NICKNAME)   // → { text: '今天想学点什么', … }
 */
export function greetingLine(nickname: Nickname, when?: TimeOfDay): SpokenLine {
  if (when === undefined) {
    return addressed(nickname, [WHAT_TO_LEARN_CLIP], WHAT_TO_LEARN_TEXT)
  }

  const hello = greetingOf(when)
  return addressed(
    nickname,
    [hello.clipKey, WHAT_TO_LEARN_CLIP],
    `${hello.text}，${WHAT_TO_LEARN_TEXT}`,
  )
}
