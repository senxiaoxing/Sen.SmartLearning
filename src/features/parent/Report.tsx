/**
 * @file 家长区 · 学习报告 —— 三科分开看进度与薄弱点
 * @layer features
 * @see src/data/repositories/reportRepo.ts  数据来源
 * @see src/domain/report/subjectReport.ts   汇总算法
 *
 * 报告要回答的是「她学得怎么样、我能帮什么」，
 * 而不是「她考了多少分」。因此正确率只是背景数字，
 * 真正占篇幅的是每一科的**薄弱点与具体建议**。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import { loadReport, type FullReport } from '@/data/repositories/reportRepo'
import { SubjectReportCard } from '@/features/parent/SubjectReportCard'
import { useSessionStore } from '@/stores/sessionStore'

export function Report() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const [report, setReport] = useState<FullReport | null>(null)

  useEffect(() => {
    if (profileId === null) return
    void loadReport(profileId).then(setReport)
  }, [profileId])

  return (
    <div className="safe-area h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">学习报告</h1>
          <BigButton
            tone="neutral"
            className="px-5 py-3 text-base"
            onClick={() => navigate('/parent')}
          >
            返回
          </BigButton>
        </header>

        {report === null ? (
          <p className="rounded-blob bg-white/60 p-5 text-base text-ink/40">读取中…</p>
        ) : report.isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <StreakBanner streak={report.streak} />
            {report.sections.map((section) => (
              <SubjectReportCard key={section.report.subject} section={section} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="rounded-blob bg-white p-5 text-base leading-relaxed text-ink/50 shadow-[0_4px_0_#E8DFCC]">
      还没有练习记录。等她做完第一轮，这里就会显示三科各自的进度、
      专注时长，以及具体卡在哪些地方。
    </p>
  )
}

/**
 * 连续学习天数。
 *
 * ⚠️ 措辞保持中性陈述，断了也不写「很遗憾」「中断了」之类的话。
 * 这块屏幕孩子偶尔会瞥到，而 CLAUDE.md 的产品红线是不惩罚、不施压——
 * 打卡断了就是断了，重新开始即可。
 */
function StreakBanner({ streak }: { streak: number }) {
  if (streak === 0) {
    return <p className="px-1 text-base text-ink/50">最近这两天还没有练习。</p>
  }

  return (
    <p className="px-1 text-base text-ink/60">
      已经连续学习 <span className="text-xl font-bold tabular-nums text-honey">{streak}</span> 天
    </p>
  )
}
