/**
 * @file 生日设置 —— 家长区里填孩子的生日
 * @layer features
 * @see src/domain/encourage/birthdayLine.ts  当天说什么、闰日怎么算
 *
 * 生日当天首页标题变成「小恩宝，生日快乐！」，三只伙伴头上多一个蛋糕。
 *
 * ⚠️ **不给任何奖励**——不加积分、不送经验、不解锁内容。
 * 挂上奖励它就从「今天是你的日子」变成又一个每日任务，
 * 而且第二年孩子会记得来领。
 */

import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { isBirthday } from '@/domain/encourage/birthdayLine'
import { todayLocal } from '@/domain/time'
import { useProfileStore } from '@/stores/profileStore'

export function BirthdaySetting() {
  const birthDate = useProfileStore((s) => s.birthDate)
  const setBirthDate = useProfileStore((s) => s.setBirthDate)
  const [draft, setDraft] = useState('')

  // 依赖已保存的值而不是 []：加载是异步的，首帧还是空
  useEffect(() => {
    setDraft(birthDate ?? '')
  }, [birthDate])

  const dirty = draft !== (birthDate ?? '')

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">孩子的生日</h2>
        <p className="text-sm leading-relaxed text-ink/50">
          只用来在生日当天换一句问候、给伙伴戴顶蛋糕。不加积分、不送经验。
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-blob bg-surface p-5 shadow-card">
        <div className="flex gap-3">
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="孩子的生日"
            className="min-w-0 flex-1 rounded-blob border-4 border-primary/30 bg-canvas px-4 py-3 text-lg font-bold text-ink outline-none focus:border-primary/60"
          />
          <BigButton
            tone={dirty ? 'primary' : 'neutral'}
            disabled={!dirty}
            className="shrink-0 px-5 py-3 text-base"
            onClick={() => void setBirthDate(draft)}
          >
            {dirty ? '保存' : '已保存'}
          </BigButton>
        </div>

        {birthDate !== undefined && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink/50">
              {isBirthday(birthDate, todayLocal())
                ? '🎂 就是今天！首页已经在庆祝了。'
                : '已设置，到那天首页会自动变。'}
            </p>
            <button
              type="button"
              onClick={() => void setBirthDate('')}
              className="shrink-0 rounded-full bg-canvas px-4 py-2 text-sm text-ink/50"
            >
              取消生日
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
