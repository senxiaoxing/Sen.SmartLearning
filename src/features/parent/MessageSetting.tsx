/**
 * @file 家长留言 —— 写一句话，孩子下次打开时伙伴念给她听
 * @layer features
 * @see src/features/home/ParentMessageCard.tsx  孩子那一端
 *
 * ⭐ 这是全 App 唯一由另一个人产生的内容，也是最便宜的一个功能——
 * 不联网、不建表、就一个输入框，但它把 App 从「一个人练」变成「有人在看着我」。
 *
 * ⚠️ 留言用系统合成音朗读：家长手写的文本没法预生成录音。
 * 想要真人声音的话，那是「家长录自己的声音」那一步的事。
 */

import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { MESSAGE_MAX_LENGTH } from '@/data/repositories/profileRepo'
import { primaryNickname } from '@/domain/encourage/pickNickname'
import { plain } from '@/domain/speech'
import { say, unlockSpeechPlayback } from '@/platform/speech'
import { unlockSpeech } from '@/platform/tts'
import { useProfileStore } from '@/stores/profileStore'

export function MessageSetting() {
  const parentMessage = useProfileStore((s) => s.parentMessage)
  const nicknames = useProfileStore((s) => s.nicknames)
  const setParentMessage = useProfileStore((s) => s.setParentMessage)
  const [draft, setDraft] = useState('')

  const saved = parentMessage?.text ?? ''
  // 依赖已保存的值而不是 []：加载是异步的，首帧还是空
  useEffect(() => {
    setDraft(saved)
  }, [saved])

  const trimmed = draft.trim()
  const dirty = trimmed !== saved
  const who = primaryNickname(nicknames).text

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">给孩子留一句话</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          她下次打开首页会看到一封信，点开由伙伴念出来。只保留最新一条。
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-blob bg-surface p-5 shadow-card">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={2}
          aria-label="给孩子的留言"
          placeholder={
            who.length > 0 ? `比如：妈妈说，${who}昨天的拼音做得特别好` : '比如：妈妈today很想你'
          }
          className="w-full resize-none rounded-blob border-4 border-primary/30 bg-canvas px-4 py-3 text-lg leading-relaxed text-ink outline-none focus:border-primary/60"
        />

        <div className="flex items-center gap-3">
          <BigButton
            tone={dirty ? 'primary' : 'neutral'}
            disabled={!dirty}
            className="px-5 py-3 text-base"
            onClick={() => void setParentMessage(trimmed)}
          >
            {dirty ? (trimmed.length === 0 ? '删掉留言' : '留给她') : '已保存'}
          </BigButton>

          {trimmed.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // ⚠️ 家长区没经过「开始学习」，iOS 音频通道还锁着，
                //    必须在这个同步栈里解锁，否则点了没声音
                unlockSpeech()
                unlockSpeechPlayback()
                say(plain(trimmed))
              }}
              className="rounded-full bg-canvas px-4 py-2 text-sm text-ink/60"
            >
              ▶ 听听念出来什么样
            </button>
          )}

          <span className="ml-auto shrink-0 text-sm tabular-nums text-ink/35">
            {draft.length}/{MESSAGE_MAX_LENGTH}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-ink/50">
          {parentMessage === undefined
            ? '现在没有留言。'
            : parentMessage.readAt === undefined
              ? '✉️ 还没被听过，首页上的信封正在提示她。'
              : '✓ 她已经听过了，卡片还留着，可以再听。'}
        </p>
      </div>
    </section>
  )
}
