/**
 * @file 家长门禁的通行状态
 * @layer stores  Zustand
 * @see src/features/parent/ParentGate.tsx  门禁本身
 *
 * 门禁通过与否必须存在**组件之外**：家长区有报告、错题本、备份多个页面，
 * 状态若留在 `ParentGate` 组件里，每次跳子页面组件重新挂载就要重答一次算术题。
 *
 * ⚠️ 刻意不做持久化（不写 localStorage/IndexedDB）：
 * 通行证只在本次会话内有效，刷新或重开 App 就失效。
 * 把它存下来等于门禁只拦得住第一次。
 */

import { create } from 'zustand'

interface ParentGateState {
  unlocked: boolean
  unlock: () => void
  /** 离开家长区时调用，下次进入需要重新验证 */
  lock: () => void
}

export const useParentGateStore = create<ParentGateState>((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}))
