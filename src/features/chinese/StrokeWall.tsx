/**
 * @file 写字乐园 —— 识字 300 字，分 3 辑，点一下看它怎么写
 * @layer features
 * @see src/features/chinese/StrokeSheet.tsx  点开之后的演示浮层
 * @see src/data/seed/strokeOrder.json  笔顺数据（npm run stroke:data 生成）
 * @see design/09-竞品借鉴.md §2.3 · §6
 *
 * ## ⭐ 为什么和识字墙分开，而不是在识字卡上加个按钮
 *
 * 认字和写字是两件事，教学上本来就分开练。而识字卡上那点地方已经装着
 * 拼音、字、图、组词，再塞一个 88pt 的按钮进去，挤掉的正是要看的字形本身。
 *
 * 更要紧的是洪恩识字那条教训（design/09 §7）：把太多环节堆在一个入口里，
 * 孩子会在其中最好玩的那个上过度停留，而不是把该学的学完。
 *
 * ## ⭐ 分辑，与识字墙同一条规矩
 *
 * 三辑 300 字都已人工核对通过（第一辑 2026-09-04、第二三辑 2026-09-05）。
 *
 * ⛔ **不能一片 300 格排下去**——那正是识字墙分辑要避免的事：
 * 新字埋在滚三屏之后，她看到的永远是已经会了的那一百个
 * （见 `hanziCards.ts` 文件头）。这一屏还比识字墙重得多，
 * 300 个田字格同屏是三千多个 SVG path。
 *
 * ⚠️ 只显示 `strokeOrder.json` 里有的字。没核对通过的字**根本不在数据里**，
 * 墙上也就不会出现——见 design/09 §6.4：笔顺写错要靠手上的肌肉记忆去改，
 * 代价比读音还高，宁可少给。
 *
 * ## 与识字墙、拼音墙同一类
 *
 * 全部可点、没有对错判定、随时可走。不出题、不落 attempts、不记 mastery、
 * 不给积分、不影响宠物经验（CLAUDE.md「语文三块是教不是练」）。
 */

import { motion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { TianGrid } from '@/components/TianGrid'
import { VolumePicker } from '@/components/VolumePicker'
import { HANZI_VOLUMES } from '@/data/seed/hanziCards'
import { hanziClipKey, type HanziCard, type StrokeOrder } from '@/domain/hanzi'
import { prefetchClips } from '@/platform/speech'
import { StrokeSheet } from '@/features/chinese/StrokeSheet'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

type StrokeMap = Record<string, StrokeOrder>

/** 兜底用的第一辑。字表是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = HANZI_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/strokes'

export function StrokeWall() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<StrokeMap | null>(null)
  const [openChar, setOpenChar] = useState<string | null>(null)

  // ⚠️ 不能用 useState：去乐园或识字墙再回来，她翻到的那一辑会丢
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)
  const volume = HANZI_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  /**
   * ⭐ 笔顺数据走**动态 import**，不进首屏。
   *
   * 167KB 只有这一页用得上，静态 import 会把它压进主 bundle。
   * 而 Vite 把它切成独立的 `.js` chunk 之后，正好落进 Workbox 的
   * `globPatterns`（含 js、**不含 json**，见 vite.config.ts），
   * 装到主屏幕后离线一样能用。
   */
  useEffect(() => {
    let alive = true
    void import('@/data/seed/strokeOrder.json').then((mod) => {
      if (alive) setOrders(mod.default as StrokeMap)
    })
    return () => {
      alive = false
    }
  }, [])

  /**
   * 当前这一辑里**有笔顺数据**的字，按识字墙的分组摆开。
   *
   * ⚠️ 过滤不能省：没核对通过的字不在 `strokeOrder.json` 里，
   * 而字表本身仍然有它们（识字墙照常显示）。数据文件就是白名单，见文件头。
   */
  const groups = useMemo(() => {
    if (orders === null) return []
    return (volume?.groups ?? [])
      .map((group) => ({
        ...group,
        cards: group.cards.filter((card) => orders[card.char] !== undefined),
      }))
      .filter((group) => group.cards.length > 0)
  }, [orders, volume])

  const allCards = useMemo(() => groups.flatMap((g) => g.cards), [groups])

  // 浮层里有喇叭，进页面就把这些字的读音备好，免得点下去要等
  useEffect(() => {
    prefetchClips(allCards.map((card) => hanziClipKey(card.char)))
  }, [allCards])

  const openCard: HanziCard | undefined = allCards.find((c) => c.char === openChar)
  const openOrder = openChar === null ? undefined : orders?.[openChar]
  // 稳定引用，否则每次渲染都会让 memo 化的格子全部失效
  const closeSheet = useCallback(() => setOpenChar(null), [])

  return (
    <AppShell width="wide" layout="stack">
      {/* ⚠️ 回**学习乐园**不是首页（首页 → 乐园 → 这一页）：返回键是逐级的 ←，
          而 navigate(-1) 在直接打开 hash 时会退出 App。与识字墙、诗单一致 */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-correct/15 px-4 py-2 text-lg font-bold text-correct">
            写字乐园
          </span>
        </span>
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      {/* 与识字墙、诗单共用同一个切换条，连徽记都是同一套 1️⃣2️⃣3️⃣ ——
          她在那边学会的动作，到这里要能原样再用一次 */}
      <VolumePicker
        volumes={HANZI_VOLUMES}
        activeId={volume?.id ?? ''}
        countLabel="100 个字"
        onSelect={(id) => select(PAGE, id)}
      />

      <p className="py-3 text-center text-lg text-ink/60">点一下字，看看它怎么写</p>

      {orders === null ? (
        <p className="py-10 text-center text-lg text-ink/40">正在准备…</p>
      ) : (
        /* ⭐ 演示浮层开着时，整面墙**不参与绘制**。

           浮层的半透明遮罩压在 100 个田字格上，而笔画描画是 paint 属性的过渡：
           每一帧都要连着底下这一大片 SVG 一起重新合成。主线程与合成器一直忙着，
           点击事件就被拖在后面 —— 上机反馈「点空白处关窗时卡一下，过一会才关掉」。

           ⚠️ 用 `visibility` 而不是卸载或 `display:none`：布局与**滚动位置**都留着，
           关掉浮层她还在原来那一组。隐藏的子树也点不到，顺带免了误触。 */
        <div
          style={{ visibility: openChar === null ? 'visible' : 'hidden' }}
          className="flex flex-col gap-6 pb-6"
        >
          {groups.map((group, index) => (
            <motion.section
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              // 逐组错开入场，上限 0.2s —— 再久孩子会觉得页面卡住了
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 24,
                delay: Math.min(index * 0.04, 0.2),
              }}
              // ⭐ 屏幕外的组交给浏览器跳过渲染。这一页同屏挂着 100 个田字格、
              //    上千个 SVG path，是全 App 最重的一屏；`contain-intrinsic-size`
              //    给个高度估计，免得跳过渲染时滚动条乱跳。
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' }}
              className="rounded-blob bg-surface/60 p-3 sm:p-4"
            >
              <h2 className="flex items-center gap-2 px-1 pb-3 text-xl font-bold">
                <span aria-hidden="true">{group.emoji}</span>
                <span>{group.name}</span>
                <span className="ml-auto text-base font-normal tabular-nums text-ink/40">
                  {group.cards.length} 个
                </span>
              </h2>

              {/* 每排 3 张（宽屏 5 张）：田字格是方的，排太密笔画就看不清了 */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {group.cards.map((card) => (
                  <WallCell
                    key={card.char}
                    char={card.char}
                    strokes={orders[card.char]!.strokes}
                    onOpen={setOpenChar}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      {openCard !== undefined && openOrder !== undefined && (
        <StrokeSheet card={openCard} order={openOrder} onClose={closeSheet} />
      )}
    </AppShell>
  )
}

/**
 * 墙上的一格。
 *
 * ⭐ `memo` 不是过度优化：这一页同屏 100 格、上千个 SVG path，
 * 而每开一次演示浮层就会让 `StrokeWall` 重渲染一次。不 memo 的话，
 * 那一下要把 100 个田字格全部 reconcile 一遍——**这一屏是全 App 最重的**。
 */
const WallCell = memo(function WallCell({
  char,
  strokes,
  onOpen,
}: {
  char: string
  strokes: readonly string[]
  onOpen: (char: string) => void
}) {
  return (
    <motion.button
      type="button"
      aria-label={`${char}，看看怎么写`}
      onClick={() => onOpen(char)}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="rounded-blob bg-surface p-1.5 text-ink shadow-drop-surface"
    >
      <TianGrid strokes={strokes} grid className="w-full" />
    </motion.button>
  )
})
