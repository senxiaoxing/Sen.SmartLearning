/**
 * @file 科目的显示信息 —— 名称与展示顺序
 * @layer data  静态内容，随 App 版本内置
 * @see src/data/seed/pets.ts  OPENED_SUBJECTS（哪些科目已经有内容）
 *
 * ⚠️ 给**孩子**看的界面里，科目的真正识别方式是宠物形象而不是这两个字——
 * 一年级孩子不识字。这张表主要服务于家长区，以及孩子端的辅助标签。
 */

import type { Subject } from '@/domain/types'

/** 科目显示名 */
export const SUBJECT_LABEL: Record<Subject, string> = {
  math: '数学',
  pinyin: '拼音',
  english: '英语',
}

/**
 * 固定的展示顺序。
 *
 * ⚠️ 顺序**写死**而不是按题量或掌握度排序——
 * 按成绩排序等于给三科排名次，那和 CLAUDE.md 宠物红线第 3 条
 * 「三只宠物之间绝不比较」是同一个问题：会惩罚孩子对某一科的兴趣。
 * 家长区也照此办理，因为家长的反应最终会传导给孩子。
 */
export const SUBJECT_ORDER: readonly Subject[] = ['math', 'pinyin', 'english']
