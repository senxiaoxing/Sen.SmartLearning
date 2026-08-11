/**
 * @file 家长门禁 —— 用一年级做不出的算术挡住孩子
 * @layer features
 * @see design/03-技术方案.md §4.6 家长门禁
 *
 * 家长区能改学习设置、能覆盖全部进度，没有门禁的话孩子迟早会自己进来
 * 把每日时长改成 999，或者好奇点一下「恢复」把进度洗掉。
 *
 * 门槛刻意选**两位数进位加法**：正好在一年级上学期的能力之外
 * （她学的是 20 以内），家长却能心算。这是 Apple Kids Category 的标准做法。
 */

import { useState, type ReactNode } from 'react'
import { BigButton } from '@/components/BigButton'
import { useParentGateStore } from '@/stores/parentGateStore'

/** 两个加数各自的取值范围。两位数且必然进位，超出一年级上学期范围 */
const ADDEND_MIN = 23
const ADDEND_MAX = 79

interface Challenge {
  a: number
  b: number
}

/**
 * 这里用 `Math.random()` 是可以的：CLAUDE.md 那条「禁止 Math.random」
 * 针对的是 `domain/generators/*`，因为出题逻辑要靠固定种子做单测。
 * 门禁题目不参与任何业务计算，也没有需要复现的输出。
 */
function newChallenge(): Challenge {
  const pick = () => ADDEND_MIN + Math.floor(Math.random() * (ADDEND_MAX - ADDEND_MIN + 1))
  let a = pick()
  let b = pick()
  // 必须进位：不进位的两位数加法（如 21+34）孩子掰手指也能凑出来
  while ((a % 10) + (b % 10) < 10) b = pick()
  return { a, b }
}

interface ParentGateProps {
  children: ReactNode
  /** 家长放弃进入时的去处，通常是回主页 */
  onCancel: () => void
}

/**
 * 算术门禁。答对之后才渲染 `children`。
 *
 * 用键盘输入而不是四选一：选项只有 25% 的猜中门槛，
 * 一个有耐心的六岁孩子点四次就进来了，那这道门就没有意义。
 * 家长有键盘，孩子不识字也不会打字——这个不对称正是门禁成立的基础。
 *
 * ⚠️ 这里是全 App 唯一刻意使用系统键盘的地方，
 * 与 CLAUDE.md「全程无键盘」不冲突：那条约束针对的是孩子的使用路径。
 *
 * 通行状态存在 `parentGateStore` 而非组件内：家长区有多个页面，
 * 每跳一次子页面就重答一道算术题是无法接受的。
 *
 * @param onCancel - 点「返回」时调用
 *
 * @example
 * <ParentGate onCancel={() => navigate('/')}>
 *   <Backup />
 * </ParentGate>
 */
export function ParentGate({ children, onCancel }: ParentGateProps) {
  const [challenge, setChallenge] = useState(newChallenge)
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const unlocked = useParentGateStore((s) => s.unlocked)
  const unlock = useParentGateStore((s) => s.unlock)

  if (unlocked) return <>{children}</>

  const submit = () => {
    if (Number(input) === challenge.a + challenge.b) {
      unlock()
      return
    }
    // 换一道题，避免反复试同一题把答案试出来
    setChallenge(newChallenge())
    setInput('')
    setWrong(true)
  }

  return (
    <div className="safe-area flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">🔒</span>
        <h1 className="text-2xl font-bold">家长区</h1>
        <p className="text-base text-ink/50">请回答下面的问题</p>
      </div>

      <p className="text-5xl font-bold tabular-nums">
        {challenge.a} + {challenge.b} = ?
      </p>

      <input
        type="number"
        inputMode="numeric"
        autoFocus
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setWrong(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        aria-label="答案"
        className="w-48 rounded-blob bg-white px-6 py-4 text-center text-3xl font-bold tabular-nums shadow-[0_4px_0_#E8DFCC] outline-none"
      />

      {wrong && <p className="text-lg text-ink/50">不对哦，再算一次～</p>}

      <div className="flex gap-4">
        <BigButton tone="neutral" className="px-8 py-4 text-xl" onClick={onCancel}>
          返回
        </BigButton>
        <BigButton
          tone="primary"
          className="px-8 py-4 text-xl"
          disabled={input.trim().length === 0}
          onClick={submit}
        >
          进入
        </BigButton>
      </div>
    </div>
  )
}
