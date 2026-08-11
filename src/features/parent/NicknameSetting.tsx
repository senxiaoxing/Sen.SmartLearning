/**
 * @file 昵称设置 —— 家长区里改「App 该怎么称呼孩子」
 * @layer features
 * @see src/data/seed/nicknamePresets.ts       哪些昵称有专属语音
 * @see src/domain/encourage/pickNickname.ts   多个称呼怎么轮换
 * @see src/stores/profileStore.ts             读写
 *
 * 昵称会出现在首页问候、答对鼓励、一轮小结、宠物见面语里，
 * 而且都是**念出来**的——一年级孩子不识字，写在屏幕上等于没写。
 *
 * ⭐ 可以设**多个**称呼，随机轮换。固定一个叫法听十遍之后就不再是「在叫我」，
 * 而是提示音的一部分；真实的家长本来也不会一天到晚只用一个称呼。
 * 第一个是主昵称，备份文件名用的是它。
 *
 * ⚠️ 这一屏在家长门禁之后，受众是成年人，因此不受孩子端那套
 * 「不识字 / 无键盘 / 88pt 触控区」的约束限制。
 */

import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { NICKNAME_MAX_COUNT, NICKNAME_MAX_LENGTH } from '@/data/repositories/profileRepo'
import { NICKNAME_PRESETS, toNickname } from '@/data/seed/nicknamePresets'
import { greetingLine } from '@/domain/encourage/greetingLine'
import { pickNickname } from '@/domain/encourage/pickNickname'
import { timeOfDay } from '@/domain/encourage/timeOfDay'
import { say, unlockSpeechPlayback } from '@/platform/speech'
import { unlockSpeech } from '@/platform/tts'
import { useProfileStore } from '@/stores/profileStore'

/**
 * 草稿列表压成单个字符串时用的分隔符。
 *
 * 换行是单行输入框打不出来的字符，昵称里也不可能有，
 * 所以拆回来一定还是原样。换成空格的话「小 恩宝」会被拆成两个称呼。
 */
const JOINER = '\n'

export function NicknameSetting() {
  const nicknames = useProfileStore((s) => s.nicknames)
  const rename = useProfileStore((s) => s.rename)
  const [draft, setDraft] = useState<string[]>([])
  const [typing, setTyping] = useState('')

  /** 已保存的列表。压成字符串是为了当 effect 依赖，数组每次渲染都是新引用 */
  const savedKey = nicknames.map((n) => n.text).join(JOINER)

  // 依赖已保存的内容而不是 []：首帧拿到的还是空数组，
  // 那时同步进去家长会看到「还没设置」，以为昵称丢了
  useEffect(() => {
    setDraft(savedKey.length === 0 ? [] : savedKey.split(JOINER))
  }, [savedKey])

  const dirty = draft.join(JOINER) !== savedKey
  const full = draft.length >= NICKNAME_MAX_COUNT

  const add = (text: string) => {
    // 顺手去掉中间的空白：昵称要被念出来，「小 恩宝」在语音里是个突兀的停顿
    const clean = text.replace(/\s+/g, '').slice(0, NICKNAME_MAX_LENGTH)
    if (clean.length === 0 || full || draft.includes(clean)) return
    setDraft([...draft, clean])
    setTyping('')
  }

  /**
   * 试听。每次抽一个称呼，正好演示轮换的效果。
   *
   * ⚠️ 进家长区走的是长按热区 → 门禁，全程没碰过「开始学习」，
   * iOS 的两个音频通道都还锁着。必须在这个同步栈里解锁，
   * 否则家长点了试听什么也听不到，只会以为昵称功能坏了。
   */
  const preview = () => {
    unlockSpeech()
    unlockSpeechPlayback()
    const picked = pickNickname(draft.map(toNickname), Math.random())
    say(greetingLine(picked, timeOfDay(new Date().getHours())).utterance)
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">孩子的昵称</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          用在问候、鼓励和小结里，并且会念出来。可以设几个，App 会换着叫；
          第一个是主昵称，备份文件名用它。全部删掉则不称呼。
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-blob bg-surface p-5 shadow-card">
        {draft.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {draft.map((text, i) => (
              <li
                key={text}
                className={[
                  'flex items-center gap-1.5 rounded-full py-1.5 pl-4 pr-2 text-lg font-bold',
                  i === 0 ? 'bg-primary/20 text-ink' : 'bg-canvas text-ink/70',
                ].join(' ')}
              >
                {text}
                {i === 0 && <span className="text-xs font-normal text-ink/40">主</span>}
                {/* 没有专属录音的会用系统合成音念，标出来省得家长以为坏了 */}
                {toNickname(text).clipKey === undefined && (
                  <span className="text-xs font-normal text-ink/40">合成音</span>
                )}
                <button
                  type="button"
                  aria-label={`删掉 ${text}`}
                  onClick={() => setDraft(draft.filter((t) => t !== text))}
                  className="rounded-full p-1 text-ink/40"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-ink/40">还没有称呼，所有文案会退回不带称呼的说法。</p>
        )}

        <div className="flex gap-3 border-t border-ink/10 pt-3">
          <input
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add(typing)}
            maxLength={NICKNAME_MAX_LENGTH}
            disabled={full}
            aria-label="新增昵称"
            placeholder={full ? `最多 ${NICKNAME_MAX_COUNT} 个` : '比如：小恩宝'}
            className="min-w-0 flex-1 rounded-blob border-4 border-primary/30 bg-canvas px-4 py-3 text-xl font-bold text-ink outline-none focus:border-primary/60 disabled:opacity-40"
          />
          <BigButton
            tone="neutral"
            disabled={typing.trim().length === 0 || full}
            className="shrink-0 px-5 py-3 text-base"
            onClick={() => add(typing)}
          >
            加上
          </BigButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink/40">有专属录音：</span>
          {NICKNAME_PRESETS.map((preset) => (
            <button
              key={preset.clipKey}
              type="button"
              disabled={full || draft.includes(preset.text)}
              onClick={() => add(preset.text)}
              className="rounded-full bg-canvas px-3 py-1.5 text-sm text-ink/60 disabled:opacity-30"
            >
              ＋{preset.text}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-ink/10 pt-3">
          <BigButton
            tone={dirty ? 'primary' : 'neutral'}
            disabled={!dirty}
            className="px-5 py-3 text-base"
            onClick={() => void rename(draft)}
          >
            {dirty ? '保存' : '已保存'}
          </BigButton>
          {/* 昵称的重点是「听起来对不对」，光看文字判断不了 */}
          <button
            type="button"
            onClick={preview}
            className="rounded-full bg-canvas px-4 py-2 text-sm text-ink/60"
          >
            ▶ 听听效果
          </button>
        </div>
      </div>
    </section>
  )
}
