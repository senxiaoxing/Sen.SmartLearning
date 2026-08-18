/**
 * @file 路由骨架
 * @layer features
 *
 * 层级刻意保持极浅：三个页面、无嵌套路由、无标签栏。
 * 一年级孩子的导航能力有限，任何深层结构都会让她迷路。
 */

import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/stores/profileStore'
import { useSessionStore } from '@/stores/sessionStore'
import { HanziWall } from '@/features/chinese/HanziWall'
import { PinyinWall } from '@/features/chinese/PinyinWall'
import { PoemLibrary } from '@/features/chinese/PoemLibrary'
import { PoemView } from '@/features/chinese/PoemView'
import { LetterWall } from '@/features/english/LetterWall'
import { HomePage } from '@/features/home/HomePage'
import { ExplainerLibrary } from '@/features/learning/ExplainerLibrary'
import { LearningSession } from '@/features/learning/LearningSession'
import { SessionSummary } from '@/features/learning/SessionSummary'
import { Assessment } from '@/features/onboarding/Assessment'
import { VoiceCacheGate } from '@/features/onboarding/VoiceCacheGate'
import { Backup } from '@/features/parent/Backup'
import { ParentGate } from '@/features/parent/ParentGate'
import { ParentHome } from '@/features/parent/ParentHome'
import { Report } from '@/features/parent/Report'
import { WrongBook } from '@/features/parent/WrongBook'
import { PetHome } from '@/features/pet/PetHome'
import { PetRoom } from '@/features/room/PetRoom'

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

  // 在这里初始化而不是首页：宠物页、讲解库都可能被直接打开
  // （刷新、从主屏图标进入某个 hash），每个页面各自 init 容易漏
  //
  // 昵称同理：首页、答题、小结、宠物页都要用它称呼孩子。
  // 两者各自调 bootstrap（幂等且防并发），不需要排先后
  useEffect(() => {
    void init()
    void loadProfile()
  }, [init, loadProfile])

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
        <Route path="/explain" element={<ExplainerLibrary />} />
        {/* 字母乐园：英语的第一站，先玩后练，不绑在答题流程里 */}
        <Route path="/letters" element={<LetterWall />} />
        {/* 语文三块，同样是「教」不是「练」：全部可点、没有对错判定。
            古诗是这里唯一有二级页的——诗单选一首再看那一首，
            点击深度仍是 2（首页 → 诗单 → 诗），与家长区的报告页同级 */}
        <Route path="/pinyin" element={<PinyinWall />} />
        <Route path="/hanzi" element={<HanziWall />} />
        <Route path="/poems" element={<PoemLibrary />} />
        <Route path="/poems/:id" element={<PoemView />} />
        <Route path="/pets" element={<PetHome />} />
        {/* 宠物小屋：三只一起住的地方，买来的家具摆在这里。
            与 /pets 分工不同——那里是「看这一只」，这里是「看这个家」 */}
        <Route path="/room" element={<PetRoom />} />
        <Route path="/summary" element={<SessionSummary />} />
        {/* 家长区。门禁包在路由这一层，任何直接跳 hash 的路径都绕不过去。
            通行状态存在 parentGateStore，因此子页面之间跳转不会重复验证 */}
        <Route path="/parent" element={<Gated><ParentHome /></Gated>} />
        <Route path="/parent/report" element={<Gated><Report /></Gated>} />
        <Route path="/parent/wrong" element={<Gated><WrongBook /></Gated>} />
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
