/**
 * @file 识字乐园 —— 一年级要认的 300 个字，分 3 辑摆开
 * @layer features
 * @see src/data/seed/hanziCards.ts  选字依据、分辑理由与卡面内容
 *
 * ## 与拼音乐园、字母乐园是同一类页面
 *
 * 都是「有边界、可数、摆得满一屏」的收集墙：300 个字学完就是学完。
 * 三条体验约束照旧——全部可点、没有对错、随时可走。
 *
 * ## ⭐ 为什么要分辑，而不是一条长滚动
 *
 * 她把第一辑的 100 个字全认下来之后要加内容。如果直接往后接，
 * 新字会埋在滚了三屏之后的地方——**她看到的永远是已经会了的那一百个**，
 * 而那正是「像幼儿园小朋友做的题目」那句话的另一种形态（见 CLAUDE.md 产品红线）。
 *
 * 分辑之后每一辑仍是 10 组 100 字，滚动长度和原来一样，
 * 而顶部那两个新按钮本身就是「这里有你没见过的字」的信号。
 *
 * ## ⚠️ 这一页刻意**没有**进度与收藏
 *
 * 参考里的识字应用会给每个字挂「今日 1/5」和收藏星标，这里没做，
 * 因为那需要一张新的用户数据表，而新表要连带处理导出/导入与
 * `schemaVersion` 迁移（见 design/02-数据库Schema.md）。
 * 在没有题库、无法自动判定「认识了没有」之前，那个星标只能靠她自己点——
 * 那记录的是「她点过什么」，不是「她认识什么」，反而会让家长误读。
 *
 * 分辑同理：**选中哪一辑不落库**。记住上次的选择需要用户数据表，
 * 而每次从第一辑打开也没什么损失——那一屏她全认得，翻过去只要一下。
 *
 * 想加进度的话，正确的顺序是先有识字题库（产出 mastery），再让这面墙读 mastery，
 * 与拼音乐园的高亮圈完全一致。
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { HANZI_VOLUMES } from '@/data/seed/hanziCards'
import { hanziClipKey } from '@/domain/hanzi'
import { prefetchClips } from '@/platform/speech'
import { VolumePicker } from '@/components/VolumePicker'
import { HanziCard } from '@/features/chinese/HanziCard'
import { useBrowseVolumeStore } from '@/stores/browseVolumeStore'

/** 兜底用的第一辑。字表是静态内容，这个分支实际走不到 */
const FIRST_VOLUME = HANZI_VOLUMES[0]

/** 这一页在 `browseVolumeStore` 里的键，用路由路径 */
const PAGE = '/hanzi'

export function HanziWall() {
  const navigate = useNavigate()
  // ⚠️ 不能用 useState：离开这一页（去乐园、去写字墙）组件就卸载，
  //    再进来会退回第一辑，而她记的是自己刚翻到哪一辑
  const volumeId = useBrowseVolumeStore((s) => s.selected[PAGE])
  const select = useBrowseVolumeStore((s) => s.select)

  const volume = HANZI_VOLUMES.find((v) => v.id === volumeId) ?? FIRST_VOLUME

  /**
   * ⭐ 只预取**当前这一辑**的 100 条，不是全部 300 条。
   *
   * 理由与字母乐园一样：按需加载时孩子连着点会排队，表现为「后面的字有延迟」
   * （见 platform/speech.ts 的 prefetchClips）。但 300 条一次性解码
   * 会在 iPad 上卡一下，而她在一次停留里几乎不会翻完三辑——
   * 切辑时再取那一辑就够，成本与原来的单辑版本完全一致。
   */
  const clipKeys = useMemo(
    () => volume?.groups.flatMap((group) => group.cards.map((card) => hanziClipKey(card.char))) ?? [],
    [volume],
  )

  useEffect(() => {
    prefetchClips(clipKeys)
  }, [clipKeys])

  return (
    <AppShell width="wide" layout="stack">
      {/* ⚠️ 回**学习乐园**不是首页（首页 → 乐园 → 这一页），理由见 PoemLibrary 同处注释：
          返回键是逐级的 ←，而 `navigate(-1)` 在直接打开 hash 时会退出 App */}
      <PageHeader onBack={() => navigate('/playground')} backLabel="返回">
        <span className="flex-1 text-center">
          <span className="rounded-full bg-accent/15 px-4 py-2 text-lg font-bold text-accent">
            识字乐园
          </span>
        </span>
        {/* 占位，抵消左侧返回键的宽度，让标题落在真正的中线上 */}
        <span className="h-12 w-12 shrink-0" />
      </PageHeader>

      <VolumePicker
        volumes={HANZI_VOLUMES}
        activeId={volume?.id ?? ''}
        countLabel="100 个字"
        onSelect={(id) => select(PAGE, id)}
      />

      <p className="py-3 text-center text-lg text-ink/60">点一下字，听听它念什么</p>

      <div className="flex flex-col gap-6 pb-6">
        {volume?.groups.map((group, index) => (
          <motion.section
            // ⭐ key 里带上辑：切辑时整片重新挂载，十组卡会再错开入场一次。
            // 那一下动效就是「换了一批新字」的信号，比任何文字提示都直接
            key={`${volume.id}-${group.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // 逐组错开入场，上限 0.2s —— 再久孩子会觉得页面卡住了
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 24,
              delay: Math.min(index * 0.04, 0.2),
            }}
            className="rounded-blob bg-surface/60 p-3 sm:p-4"
          >
            <h2 className="flex items-center gap-2 px-1 pb-3 text-xl font-bold">
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.name}</span>
              <span className="ml-auto text-base font-normal tabular-nums text-ink/40">
                {group.cards.length} 个
              </span>
            </h2>

            {/* 每排 3 张（宽屏 4 张）：字号是这一页的主角，排太密就看不清笔画了 */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {group.cards.map((card) => (
                <HanziCard key={card.char} card={card} />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </AppShell>
  )
}
