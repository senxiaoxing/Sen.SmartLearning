/**
 * @file 浏览页「现在在哪一批」的记忆 —— 返回时停在她离开的那一批
 * @layer stores  Zustand，只做编排，不含业务计算
 * @see src/components/VolumePicker.tsx  各页那排切换按钮
 *
 * ## 它解决的问题
 *
 * 上机反馈：**在短文乐园点了第三辑 → 点进一篇 → 返回，结果回到了第一辑。**
 *
 * 根因是各页把选中的辑放在自己的 `useState` 里，而返回是导航到另一个路由，
 * 组件卸载、状态随之消失，再进来就是默认值。
 *
 * ⚠️ 原先 `StoryLibrary` / `PoemLibrary` 的注释里写着「选中哪一辑不落库——
 * 每次从第一辑打开也没什么损失」。**那个判断错了**，而且错在把两件事混成一件：
 *
 * | | 要什么 |
 * |---|---|
 * | 跨会话记住上次看到哪 | 要落库（一张新表），确实不值得 |
 * | **同一次浏览里返回还在原地** | 只要一份内存状态 —— 就是这个 store |
 *
 * 后者不是「记住偏好」，是**导航的基本正确性**：她刚从那儿点进去的，
 * 退回来当然该在那儿。第一辑对她而言等于「我刚才翻的东西不见了」。
 *
 * ## 为什么不落库
 *
 * 刷新整页、重开 App 之后回到默认辑是**对的**：那是新的一次浏览。
 * 这个 store 活在内存里，正好是「一次浏览」的生命周期。
 */

import { create } from 'zustand'

interface BrowseVolumeState {
  /**
   * 页面 → 她选中的那一批的 id。
   *
   * ⚠️ 键**统一用该页的路由路径**（`'/stories'`、`'/poems'`…）：
   * 路由天然唯一，不会两个页面撞同一个键，也不必再维护一张常量表。
   */
  selected: Readonly<Record<string, string>>
  /**
   * 记下某一页当前选中的那一批。
   *
   * ⚠️ 传**空串表示「回到默认」**。`PetHome` 需要这个：点回当前年级时不能存下
   * 那个年级值，否则家长在别处改了档案年级，这一页就不会跟着变了。
   * 读的一方用 `|| undefined` 把空串和「没记过」归成同一种情况。
   */
  select: (page: string, id: string) => void
}

/**
 * 各浏览页当前选中的那一批。
 *
 * @example
 * // 读：没记过就用调用方给的默认值
 * const volumeId = useBrowseVolumeStore((s) => s.selected['/stories']) ?? FIRST_VOLUME.id
 * // 写
 * const select = useBrowseVolumeStore((s) => s.select)
 * select('/stories', 'vol3')
 */
export const useBrowseVolumeStore = create<BrowseVolumeState>((set) => ({
  selected: {},
  select: (page, id) => set((s) => ({ selected: { ...s.selected, [page]: id } })),
}))
