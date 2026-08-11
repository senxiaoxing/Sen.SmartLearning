/**
 * @file 档案状态 —— 全 App 共享的「她叫什么」
 * @layer stores  Zustand，只做编排，业务计算一律委托给 domain
 * @see src/data/repositories/profileRepo.ts   读写
 * @see src/domain/encourage/pickNickname.ts   多个称呼怎么轮换
 *
 * 独立于 `sessionStore` 而不是塞进去：昵称与会话生命周期毫无关系，
 * 首页、宠物页、家长区都要用它，而那三个页面都可能在没有会话时被直接打开。
 * 见 CLAUDE.md 对 `sessionStore` 的登记说明——
 * 「出现与会话生命周期无关的职责，那部分该搬走」。
 */

import { create } from 'zustand'
import { bootstrap } from '@/data/bootstrap'
import {
  loadBirthDate,
  loadNicknames,
  loadParentMessage,
  markMessageRead,
  saveBirthDate,
  saveNicknames,
  saveParentMessage,
} from '@/data/repositories/profileRepo'
import type { Nickname } from '@/domain/encourage/addressed'
import type { ParentMessage } from '@/domain/types'

interface ProfileState {
  /**
   * 全部称呼，主昵称在最前。
   *
   * ⚠️ 存的是**列表**而不是「当前该用哪个」：轮换的粒度是一句话，
   * 由各使用处用 `pickNickname` 现挑（见它的文件头）。
   * 若在这里存一个「当前昵称」，所有页面会同时切换，反而像出了 bug。
   */
  nicknames: Nickname[]
  /** 生日 `'YYYY-MM-DD'`，没设置时 `undefined`。只用于生日当天的问候 */
  birthDate?: string
  /** 家长留言，没有则 `undefined`。孩子在首页点开听 */
  parentMessage?: ParentMessage
  /** 从数据库读入。幂等，重复调用无副作用 */
  load: () => Promise<void>
  /** 改称呼列表并立即生效。第一个是主昵称 */
  rename: (texts: string[]) => Promise<void>
  /** 设置生日，传空串表示取消 */
  setBirthDate: (birthDate: string) => Promise<void>
  /** 写一条新留言，替换上一条。传空串表示删除 */
  setParentMessage: (text: string) => Promise<void>
  /** 标记留言已被听过。卡片仍然留着，只是不再提示「新留言」 */
  markMessageHeard: () => Promise<void>
}

/**
 * 昵称 store。
 *
 * ⚠️ 初始值是空数组而不是某个默认名字：加载只要几毫秒，但如果先渲染
 * 「小朋友，今天想学点什么」再跳成「小恩宝，今天想学点什么」，
 * 那一帧的闪烁孩子是看得见的。没有称呼时的文案本身就是完整的一句话，
 * 不会有半成品状态。
 *
 * @example
 * const nicknames = useProfileStore((s) => s.nicknames)
 * const line = greetingLine(pickNickname(nicknames, Math.random()), timeOfDay(hour))
 */
export const useProfileStore = create<ProfileState>((set) => ({
  nicknames: [],

  // 自己调 bootstrap 取 profileId，不依赖 sessionStore 先初始化完——
  // bootstrap 本身幂等且防并发（见 data/bootstrap.ts 的 pending 说明）
  load: async () => {
    const profileId = await bootstrap()
    const [nicknames, birthDate, parentMessage] = await Promise.all([
      loadNicknames(profileId),
      loadBirthDate(profileId),
      loadParentMessage(profileId),
    ])
    set({ nicknames, birthDate, parentMessage })
  },

  rename: async (texts) => {
    set({ nicknames: await saveNicknames(await bootstrap(), texts) })
  },

  setBirthDate: async (birthDate) => {
    set({ birthDate: await saveBirthDate(await bootstrap(), birthDate) })
  },

  setParentMessage: async (text) => {
    set({ parentMessage: await saveParentMessage(await bootstrap(), text) })
  },

  markMessageHeard: async () => {
    set({ parentMessage: await markMessageRead(await bootstrap()) })
  },
}))
