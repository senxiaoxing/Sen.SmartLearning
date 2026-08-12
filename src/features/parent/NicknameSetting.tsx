/**
 * @file 昵称设置 —— 家长区里改「App 该怎么称呼孩子」
 * @layer features
 * @see src/data/seed/nicknamePresets.ts       预设昵称清单（唯一的新增途径）
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
 * ⭐ **只能从预设里挑，不再自由输入**：预设之外的昵称没有语音片段，
 * 整句问候都会降级成机器音——「叫对了名字但换了个人的声音」比不叫更怪。
 * 想加新称呼：在 `nicknamePresets.ts` 登记一条、跑 `npm run voices` 重新构建。
 * 改版前存下的自由昵称仍会显示（标「合成音」），删掉后无法再加回。
 *
 * ⚠️ 这一屏在家长门禁之后，受众是成年人，不受孩子端「不识字 / 88pt」约束。
 */

import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { Icon } from '@/components/Icon'
import { NICKNAME_MAX_COUNT } from '@/data/repositories/profileRepo'
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
 * 换行在昵称文本里不可能出现，所以拆回来一定还是原样。
 * 换成空格的话「小 恩宝」会被拆成两个称呼。
 */
const JOINER = '\n'

export function NicknameSetting() {
  const nicknames = useProfileStore((s) => s.nicknames)
  const rename = useProfileStore((s) => s.rename)
  const [draft, setDraft] = useState<string[]>([])

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
    if (full || draft.includes(text)) return
    setDraft([...draft, text])
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
          用在问候、鼓励和小结里，并且会念出来。从下面的预设里挑几个，App 会换着叫；
          第一个是主昵称，备份文件名用它。全部删掉则不称呼。
          想加新称呼要先在 nicknamePresets.ts 登记并重新生成语音——
          预设之外的昵称只能用机器音念，等于换了个人在叫她。
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

        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
          <span className="text-sm text-ink/40">{full ? `最多 ${NICKNAME_MAX_COUNT} 个：` : '点击添加：'}</span>
          {NICKNAME_PRESETS.map((preset) => (
            <button
              key={preset.clipKey}
              type="button"
              disabled={full || draft.includes(preset.text)}
              onClick={() => add(preset.text)}
              className="rounded-full bg-canvas px-4 py-2 text-base font-bold text-ink/70 disabled:opacity-30"
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
