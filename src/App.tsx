/**
 * @file 路由骨架
 * @layer features
 *
 * ## 层级：主线两层，浏览三层
 *
 * 做题主线（首页 → 答题）**永远只有两层**——一年级孩子的导航能力有限，
 * 在通往主要功能的路上多一道门就会流失一部分。
 *
 * 浏览类内容（首页 → 乐园 → 拼音）放宽到三层，换来的是**首页高度恒定**：
 * 内容一直在加，把每一块都摆在首页只会让首页越滚越长，
 * 而她最需要的三个科目入口会被挤出第一屏。见 CLAUDE.md UI 约束。
 */

import { useEffect, useState, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ensureOpen } from '@/data/db'
import { applyPendingUpdate, watchForUpdate } from '@/platform/appUpdate'
import { onPageResume } from '@/platform/onPageResume'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import { HanziWall } from '@/features/chinese/HanziWall'
import { StrokeWall } from '@/features/chinese/StrokeWall'
import { PinyinWall } from '@/features/chinese/PinyinWall'
import { PoemLibrary } from '@/features/chinese/PoemLibrary'
import { PoemView } from '@/features/chinese/PoemView'
import { LetterWall } from '@/features/english/LetterWall'
import { HomePage } from '@/features/home/HomePage'
import { LearningSession } from '@/features/learning/LearningSession'
import { SessionSummary } from '@/features/learning/SessionSummary'
import { Assessment } from '@/features/onboarding/Assessment'
import { VoiceCacheGate } from '@/features/onboarding/VoiceCacheGate'
import { Backup } from '@/features/parent/Backup'
import { ParentGate } from '@/features/parent/ParentGate'
import { ParentHome } from '@/features/parent/ParentHome'
import { ParentShop } from '@/features/parent/ParentShop'
import { Report } from '@/features/parent/Report'
import { WrongBook } from '@/features/parent/WrongBook'
import { PetHome } from '@/features/pet/PetHome'
import { PlaygroundPage } from '@/features/playground/PlaygroundPage'
import { PetRoom } from '@/features/room/PetRoom'
import { ShopPage } from '@/features/shop/ShopPage'

/**
 * 用 `HashRouter` 而非 `BrowserRouter`：
 * PWA 添加到主屏幕后走的是静态托管，History 路由需要服务端 fallback 配置，
 * 而 Hash 路由在任何静态托管上都能直接工作，少一个出错环节。
 */
export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

/**
 * 路由表。
 *
 * 拆成独立组件是因为家长区需要 `useNavigate` 做「取消门禁 → 回主页」，
 * 而这个 hook 必须在 `HashRouter` 内部才能用。
 */
function AppRoutes() {
  const init = useSessionStore((s) => s.init)
  const loadProfile = useProfileStore((s) => s.load)
  const sessionStatus = useSessionStore((s) => s.status)
  const [updateReady, setUpdateReady] = useState(false)

  // 在这里初始化而不是首页：宠物页、乐园里的任何一页都可能被直接打开
  // （刷新、从主屏图标进入某个 hash），每个页面各自 init 容易漏
  //
  // 昵称同理：首页、答题、小结、宠物页都要用它称呼孩子。
  // 两者各自调 bootstrap（幂等且防并发），不需要排先后
  useEffect(() => {
    void init()
    void loadProfile()
  }, [init, loadProfile])

  // ⭐ 切出去再回来时把数据库连接接活。iOS 会在页面转入后台时关掉
  // IndexedDB 连接，而 Dexie 被动关闭后不再自动重开——之后每一次读写都
  // 静默失败到整页重载为止。孩子中途看一眼别的 App、家长去「文件」App
  // 挑备份，都会走到这一步。见 data/db.ts 的 ensureOpen()
  useEffect(() => onPageResume(() => void ensureOpen()), [])

  // ⭐ 让新版本真的能装上。旧配置把新 Service Worker 下载完就搁在 waiting 里，
  // 等一个「所有页面都关闭」的时机——那个时机在 iOS 的 PWA 上几乎不会到来，
  // 于是 iPad 上永远是旧版本。见 platform/appUpdate.ts
  useEffect(() => watchForUpdate(() => setUpdateReady(true)), [])

  // 接管会整页刷新，因此只在会话空闲时下手：
  // 答题中（active/feedback）刷新会冲掉整段题目，小结页（finished）刷新会丢掉刚做完的成绩。
  useEffect(() => {
    if (updateReady && sessionStatus === 'idle') void applyPendingUpdate()
  }, [updateReady, sessionStatus])

  return (
    <>
      {/* ⭐ 启动自检：语音包缺失时盖住整个 App 先补全（design/07 §2.5d）。
          齐全（绝大多数启动）时它什么也不渲染。
          ⚠️ 首屏预热（WARMUP_CLIPS）也归它管——预热会连带下载整个语音包，
          在预缓存跑完之前发起会让同一个包下两遍，首装最慢时多花一倍流量 */}
      <VoiceCacheGate />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/learn" element={<LearningSession />} />
        {/* ⭐ 学习乐园：全部「教」不是「练」的内容都收在这里，首页只留一扇门。
            首页 → 乐园 → 拼音，浏览类内容允许三层（CLAUDE.md UI 约束），
            换来的是首页高度恒定：以后加内容只往乐园的分区里加，首页一格不动 */}
        <Route path="/playground" element={<PlaygroundPage />} />
        {/* 字母乐园：英语的第一站，先玩后练，不绑在答题流程里 */}
        <Route path="/letters" element={<LetterWall />} />
        {/* 语文三块，同样是「教」不是「练」：全部可点、没有对错判定 */}
        <Route path="/pinyin" element={<PinyinWall />} />
        <Route path="/hanzi" element={<HanziWall />} />
        <Route path="/strokes" element={<StrokeWall />} />
        <Route path="/poems" element={<PoemLibrary />} />
        <Route path="/poems/:id" element={<PoemView />} />
        <Route path="/pets" element={<PetHome />} />
        {/* 宠物小屋：三只一起住的地方，买来的家具摆在这里。
            与 /pets 分工不同——那里是「看这一只」，这里是「看这个家」 */}
        <Route path="/room" element={<PetRoom />} />
        {/* 商店只从小屋进：买完东西直接看到它摆进屋里，那个瞬间是整个功能的高光。
            ⚠️ 刻意**不放**在首页和小结页——每轮做完都被引导去花钱，
            会把学习变成打工（与「升级提示不在答题中途弹窗」同一个道理） */}
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/summary" element={<SessionSummary />} />
        {/* 家长区。门禁包在路由这一层，任何直接跳 hash 的路径都绕不过去。
            通行状态存在 parentGateStore，因此子页面之间跳转不会重复验证 */}
        <Route path="/parent" element={<Gated><ParentHome /></Gated>} />
        <Route path="/parent/report" element={<Gated><Report /></Gated>} />
        <Route path="/parent/wrong" element={<Gated><WrongBook /></Gated>} />
        <Route path="/parent/shop" element={<Gated><ParentShop /></Gated>} />
        <Route path="/parent/backup" element={<Gated><Backup /></Gated>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

/**
 * 家长区页面的统一包装：门禁 + 放弃时回主页。
 *
 * ⚠️ 必须是模块级组件，不能写成 `AppRoutes` 内部的箭头函数——
 * 那样每次渲染都会产生新的组件类型，React 会把整棵子树卸载重建。
 */
function Gated({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return <ParentGate onCancel={() => navigate('/')}>{children}</ParentGate>
}
