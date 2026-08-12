/**
 * @file 起名选择器 —— 从预录名单里给伙伴挑名字，全程无键盘
 * @layer features
 * @see src/data/seed/petNamePresets.ts  候选名清单与「绝不用多音字」的规矩
 * @see design/06-宠物系统.md            起名交互
 *
 * 键盘输入换成点选之后，起名从「要家长帮忙打字」变成孩子自己的事。
 *
 * 无障碍约束（一年级孩子不识字）：
 * - **点一下候选名 = 念出来 + 选中**，她听着挑，不用认字。
 *   这里点击**要发声**——它是试听与选择，不是提交答案，
 *   与 OptionButton「点击不朗读」的场景不同（那边点下去紧跟着就是反馈语）。
 * - 候选按钮触控区最小 88pt 高。
 *
 * @param defaultName - 这只伙伴的默认名，排在候选第一位（改回去也是一种选择）
 * @param current - 当前选中的名字，高亮显示
 * @param onPick - 点选回调；确认与取消由父组件的按钮触发
 */

import { BigButton } from '@/components/BigButton'
import { PET_NAME_PRESETS } from '@/data/seed/petNamePresets'
import { petNameClipKey } from '@/data/seed/voiceManifest'
import { plain, utter } from '@/domain/speech'
import { say } from '@/platform/speech'

interface PetNamePickerProps {
  defaultName: string
  current: string
  onPick: (name: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function PetNamePicker({
  defaultName,
  current,
  onPick,
  onCancel,
  onConfirm,
}: PetNamePickerProps) {
  // 默认名排第一（它不在共享池里，由 petNamePresets.test.ts 保证不重复）
  const options = [defaultName, ...PET_NAME_PRESETS.map((p) => p.text)]

  const pick = (name: string) => {
    onPick(name)
    const clip = petNameClipKey(name)
    // 候选名全部有片段（测试兜底）；plain 只是防御，绝不该走到
    say(clip === undefined ? plain(name) : utter([clip], name))
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <p className="text-base text-ink/50">点一点听一听，选个喜欢的名字</p>

      <div className="grid w-full grid-cols-3 gap-2">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => pick(name)}
            className={[
              'min-h-[88px] rounded-blob px-2 text-2xl font-bold transition-shadow',
              current === name
                ? 'bg-primary/20 text-ink shadow-card ring-4 ring-primary/50'
                : 'bg-surface text-ink/70 shadow-card',
            ].join(' ')}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <BigButton tone="neutral" onClick={onCancel}>
          算了
        </BigButton>
        <BigButton tone="primary" onClick={onConfirm}>
          就叫这个
        </BigButton>
      </div>
    </div>
  )
}
