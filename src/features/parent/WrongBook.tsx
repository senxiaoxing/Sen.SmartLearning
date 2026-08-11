/**
 * @file 家长区 · 错题本 —— 按科目分开列出还没改对的题
 * @layer features
 * @see src/data/repositories/reportRepo.ts  loadWrongBook
 * @see src/domain/report/wrongBook.ts       筛选与去重规则
 *
 * 只列**还没改对**的题：改对了的自动消失，让这个清单始终是一份待办，
 * 而不是一本越积越厚、看了让人发怵的错误档案。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/components/BigButton'
import {
  loadWrongBook,
  WRONG_BOOK_DAYS,
  type WrongBookSection,
} from '@/data/repositories/reportRepo'
import { SUBJECT_LABEL } from '@/data/seed/subjects'
import { WrongEntryCard } from '@/features/parent/WrongEntryCard'
import { useSessionStore } from '@/stores/sessionStore'

export function WrongBook() {
  const navigate = useNavigate()
  const profileId = useSessionStore((s) => s.profileId)
  const [sections, setSections] = useState<WrongBookSection[] | null>(null)

  useEffect(() => {
    if (profileId === null) return
    void loadWrongBook(profileId).then(setSections)
  }, [profileId])

  const total = sections?.reduce((n, s) => n + s.items.length, 0) ?? 0

  return (
    <div className="safe-area h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">错题本</h1>
          <BigButton
            tone="neutral"
            className="px-5 py-3 text-base"
            onClick={() => navigate('/parent')}
          >
            返回
          </BigButton>
        </header>

        {sections === null ? (
          <p className="rounded-blob bg-white/60 p-5 text-base text-ink/40">读取中…</p>
        ) : total === 0 ? (
          <p className="rounded-blob bg-white p-5 text-base leading-relaxed text-ink/50 shadow-[0_4px_0_#E8DFCC]">
            最近 {WRONG_BOOK_DAYS} 天没有待订正的错题。
            错过但后来改对的题不会留在这里。
          </p>
        ) : (
          <>
            <p className="px-1 text-sm text-ink/40">
              最近 {WRONG_BOOK_DAYS} 天错过、且还没改对的题，共 {total} 道
            </p>
            {sections.map((section) => (
              <SubjectGroup key={section.subject} section={section} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/** 一个科目的错题分组。⚠️ 没有错题的科目直接不渲染，不占版面 */
function SubjectGroup({ section }: { section: WrongBookSection }) {
  if (section.items.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink/70">
        {SUBJECT_LABEL[section.subject]}
        <span className="ml-2 text-sm font-normal text-ink/40">{section.items.length} 道</span>
      </h2>
      {section.items.map((item) => (
        <WrongEntryCard key={item.attemptId} item={item} />
      ))}
    </section>
  )
}
